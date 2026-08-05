import type { Request, Response, NextFunction } from "express"

/**
 * Middleware to authenticate public API requests from websites
 * Public endpoints require either:
 * 1. orgId (for multi-tenant access)
 * 2. Future: Website API Key authentication
 */
export const publicApiAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract orgId from query, body, or headers
    const orgId =
      req.query?.orgId ||
      req.query?.tenantId ||
      req.body?.orgId ||
      req.body?.tenantId ||
      req.headers?.["x-org-id"] ||
      req.headers?.["x-tenant-id"]

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message:
          "orgId is required for public API access. Pass it as query param (?orgId=xxx) or X-Org-Id header",
      })
    }

    // Store orgId in request for downstream handlers
    ;(req as any).publicOrgId = String(orgId).trim()
    next()
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Invalid public API request",
    })
  }
}
