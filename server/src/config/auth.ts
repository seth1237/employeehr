import jwt from "jsonwebtoken"
import type { IJWTPayload } from "../types/interfaces"

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRY = "7d"

if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is required in production")
}

const resolvedSecret = JWT_SECRET || "dev-only-secret-change-me"

export const generateToken = (payload: IJWTPayload): string => {
  return jwt.sign(payload, resolvedSecret, { expiresIn: JWT_EXPIRY })
}

export const verifyToken = (token: string): IJWTPayload => {
  try {
    return jwt.verify(token, resolvedSecret) as IJWTPayload
  } catch {
    throw new Error("Invalid or expired token")
  }
}

export const decodeToken = (token: string): IJWTPayload | null => {
  try {
    return jwt.decode(token) as IJWTPayload
  } catch {
    return null
  }
}
