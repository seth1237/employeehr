import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { isPlatformOwner } from "../utils/platformOwner"
import { getCftIngestStatus, runCftIngestCycle } from "../services/cft/cftIngestScheduler"
import { CFT_TARGET_ORG_ID } from "../services/cft/cftConfig"

function assertOwnerOrAccordAdmin(req: AuthenticatedRequest, res: Response): boolean {
  const role = String(req.user?.role || "")
  const orgId = String(req.user?.org_id || "")
  const targetOrg = process.env.CFT_TARGET_ORG_ID || CFT_TARGET_ORG_ID
  const ok =
    isPlatformOwner(req.user?.email, req.user?.role) ||
    ((role === "company_admin" || role === "admin") && orgId === targetOrg)

  if (!ok) {
    res.status(403).json({ success: false, message: "Forbidden" })
    return false
  }
  return true
}

export class CftIngestController {
  static status(req: AuthenticatedRequest, res: Response) {
    if (!assertOwnerOrAccordAdmin(req, res)) return
    return res.json({ success: true, data: getCftIngestStatus() })
  }

  static async runNow(req: AuthenticatedRequest, res: Response) {
    if (!assertOwnerOrAccordAdmin(req, res)) return
    try {
      const includeLines = req.body?.includeLines !== false
      const result = await runCftIngestCycle({ includeLines })
      return res.json({ success: true, data: result })
    } catch (error: any) {
      const status = String(error?.message || "").includes("already running") ? 409 : 500
      return res.status(status).json({
        success: false,
        message: error?.message || "CFT ingest failed",
      })
    }
  }
}
