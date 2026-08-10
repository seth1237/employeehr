import rateLimit from "express-rate-limit"
import type { Request, Response } from "express"

function clientIp(req: Request) {
  return String(req.ip || req.socket?.remoteAddress || "unknown")
}

function authKey(req: Request) {
  const email = String(req.body?.email || "")
    .trim()
    .toLowerCase()
  const ip = clientIp(req)
  // Prefer per-email buckets so one shared office/NAT IP does not lock everyone out.
  return email ? `${ip}:${email}` : ip
}

function rateLimitHandler(_req: Request, res: Response) {
  res.status(429).json({
    success: false,
    message:
      "Too many login attempts. Please wait a few minutes and try again.",
  })
}

/**
 * Applied to password login endpoints.
 * Successful logins do not count. Limits are per IP+email so offices sharing
 * one public IP are not blocked by each other.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: authKey,
  handler: rateLimitHandler,
  validate: false,
})

/**
 * Softer limiter for OTP verify/resend so users are not locked out after
 * entering the correct password.
 */
export const authOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: authKey,
  handler: rateLimitHandler,
  validate: false,
})

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500,
  message: {
    success: false,
    message: "Too many requests, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
})

export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
})
