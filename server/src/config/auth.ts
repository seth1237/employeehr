import jwt from "jsonwebtoken"
import type { IJWTPayload } from "../types/interfaces"

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRY = "7d"
const FIELD_JWT_EXPIRY = "365d"
const FIELD_ROLES = new Set(["sales_rep", "technical_service_engineer"])

if (!JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is required in production")
}

const resolvedSecret = JWT_SECRET || "dev-only-secret-change-me"

export const generateToken = (payload: IJWTPayload): string => {
  const expiresIn = FIELD_ROLES.has(String(payload.role || "")) ? FIELD_JWT_EXPIRY : JWT_EXPIRY
  return jwt.sign(payload, resolvedSecret, { expiresIn })
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
