import rateLimit from "express-rate-limit"
import type { Request } from "express"

function isLocalRequest(req: Request) {
  const origin = String(req.get("origin") || "").toLowerCase()
  const referer = String(req.get("referer") || "").toLowerCase()
  const ip = String(req.ip || req.socket?.remoteAddress || "")
  const combined = `${origin} ${referer}`

  return (
    combined.includes("localhost") ||
    combined.includes("127.0.0.1") ||
    combined.includes("[::1]") ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    process.env.NODE_ENV === "development"
  )
}

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // Local/dev needs headroom for retries; production stays stricter.
  max: (req) => (isLocalRequest(req) ? 200 : 30),
  message: {
    success: false,
    message: "Too many login attempts, please try again later",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isLocalRequest(req),
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
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
})
