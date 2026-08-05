import type { Request, Response, NextFunction } from "express"
import { verifyToken } from "../config/auth"
import type { IJWTPayload } from "../types/interfaces"
import { Types } from "mongoose"

export interface AuthenticatedRequest extends Request {
  user?: IJWTPayload
  org_id?: string
}

const isValidObjectId = (id: string): boolean => {
  try {
    return Types.ObjectId.isValid(id) && String(new Types.ObjectId(id)) === id
  } catch {
    return false
  }
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const isPublicRoute = req.path.includes("/public/") || req.path === "/api/quotes"
    if (isPublicRoute) {
      return next()
    }

    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided",
      })
    }

    const token = authHeader.substring(7)
    const decoded = verifyToken(token)

    // Validate that userId is a valid MongoDB ObjectId (reject guest IDs)
    if (!decoded.userId || !isValidObjectId(decoded.userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user ID in token",
      })
    }

    req.user = decoded
    req.org_id = decoded.org_id

    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      error: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

export const roleMiddleware = (...allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      })
    }

    const effectiveRole = req.user.role === "admin" ? "company_admin" : req.user.role

    if (!allowedRoles.includes(effectiveRole)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      })
    }

    next()
  }
}

export const orgMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const isPublicRoute = req.path.includes("/public/") || req.path === "/api/quotes"
  if (isPublicRoute) {
    return next()
  }

  if (!req.org_id) {
    return res.status(401).json({
      success: false,
      message: "Organization ID not found",
    })
  }
  next()
}
