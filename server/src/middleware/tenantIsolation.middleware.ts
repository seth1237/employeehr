import type { Response, NextFunction } from "express"
import { AuditService } from "../services/audit.service"
import type { AuthenticatedRequest } from "./auth"

export const tenantIsolation = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const isPublicRoute = req.path.includes("/public/") || req.path === "/api/quotes"
  if (isPublicRoute) {
    return next()
  }

  if (!req.user || !req.user.org_id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized - no tenant context",
    })
  }

  // Set tenant context on request (already set by auth middleware, but reinforcing)
  req.org_id = req.user.org_id

  // Log tenant access
  AuditService.log({
    org_id: req.user.org_id,
    userId: req.user.userId,
    action: "API_ACCESS",
    resource: "endpoint",
    resourceId: req.path,
    status: "success",
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  }).catch(console.error)

  next()
}
