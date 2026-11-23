/**
 * Token Cleanup Utility
 * Runs on app initialization to detect and remove invalid/corrupted tokens
 */

import { decodeJwtPayload } from "./jwt-payload"

const TOKEN_KEY = "elevate_auth_token"
const USER_KEY = "elevate_user"

export const cleanupTokens = () => {
  if (typeof window === "undefined") return

  const token = localStorage.getItem(TOKEN_KEY)
  if (!token) return

  const payload = decodeJwtPayload(token)
  if (!payload) {
    console.warn("Token: Invalid JWT format - leaving session in place until next authenticated request")
    return
  }

  const userId = payload.userId || payload.sub

  if (userId && typeof userId === "string") {
    if (userId.includes("guest_") || userId.startsWith("guest")) {
      console.warn("Token: Contains guest user ID - removing", { userId })
      cleanupInvalidToken()
      return
    }

    if (!/^[0-9a-f]{24}$/i.test(userId)) {
      console.warn("Token: Invalid ObjectId format - removing", { userId })
      cleanupInvalidToken()
      return
    }
  } else {
    console.warn("Token: Missing userId - removing")
    cleanupInvalidToken()
    return
  }

  if (payload.exp && typeof payload.exp === "number") {
    if (payload.exp * 1000 < Date.now()) {
      console.warn("Token: Expired token - removing")
      cleanupInvalidToken()
    }
  }
}

const cleanupInvalidToken = () => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export const forceCleanupTokens = () => {
  cleanupInvalidToken()
  if (typeof window !== "undefined" && window.location.pathname !== "/auth/login") {
    window.location.href = "/auth/login"
  }
}
