import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { buildBranchTransferPdf } from "../lib/branch-transfer-pdf"
import {
  cancelTransfer,
  catalogAssets,
  catalogEmployees,
  catalogProducts,
  createTransfer,
  getContext,
  getTransfer,
  issueTransfer,
  listTransfers,
  receiveTransfer,
  updateDraft,
} from "../services/branchTransfer.service"
import type { Actor } from "../services/branchTransfer.scope"

function actorFrom(req: AuthenticatedRequest): Actor {
  if (!req.user?.userId || !req.user.org_id) {
    throw Object.assign(new Error("Unauthorized"), { status: 401 })
  }
  return {
    userId: req.user.userId,
    org_id: req.user.org_id,
    role: req.user.role,
  }
}

function sendError(res: Response, error: unknown) {
  const status = typeof (error as { status?: number })?.status === "number"
    ? (error as { status: number }).status
    : 500
  return res.status(status).json({
    success: false,
    message: error instanceof Error ? error.message : "Transfer request failed",
  })
}

export class BranchTransferController {
  static async context(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await getContext(actorFrom(req))
      return res.json({ success: true, data })
    } catch (error) {
      return sendError(res, error)
    }
  }

  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await listTransfers(actorFrom(req), {
        status: String(req.query.status || ""),
        kind: String(req.query.kind || req.query.type || ""),
        branchId: String(req.query.branchId || ""),
      })
      return res.json({ success: true, data })
    } catch (error) {
      return sendError(res, error)
    }
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await getTransfer(actorFrom(req), String(req.params.id))
      return res.json({ success: true, data })
    } catch (error) {
      return sendError(res, error)
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await createTransfer(actorFrom(req), req.body || {})
      return res.status(201).json({ success: true, data })
    } catch (error) {
      return sendError(res, error)
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await updateDraft(actorFrom(req), String(req.params.id), req.body || {})
      return res.json({ success: true, data })
    } catch (error) {
      return sendError(res, error)
    }
  }

  static async issue(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await issueTransfer(actorFrom(req), String(req.params.id))
      return res.json({ success: true, data, message: "Transfer issued and document generated" })
    } catch (error) {
      return sendError(res, error)
    }
  }

  static async receive(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await receiveTransfer(
        actorFrom(req),
        String(req.params.id),
        req.body?.notes || req.body?.receiveNotes,
      )
      return res.json({ success: true, data, message: "Transfer received and items moved" })
    } catch (error) {
      return sendError(res, error)
    }
  }

  static async cancel(req: AuthenticatedRequest, res: Response) {
    try {
      const data = await cancelTransfer(
        actorFrom(req),
        String(req.params.id),
        req.body?.reason || req.body?.cancelReason,
      )
      return res.json({ success: true, data, message: "Transfer cancelled" })
    } catch (error) {
      return sendError(res, error)
    }
  }

  static async pdf(req: AuthenticatedRequest, res: Response) {
    try {
      const doc = await getTransfer(actorFrom(req), String(req.params.id))
      const pdf = await buildBranchTransferPdf(doc as any)
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${doc.documentNumber || "transfer"}.pdf"`,
      )
      return res.status(200).send(pdf)
    } catch (error) {
      return sendError(res, error)
    }
  }

  static async products(req: AuthenticatedRequest, res: Response) {
    try {
      const branchId = String(req.query.branchId || "")
      if (!branchId) {
        return res.status(400).json({ success: false, message: "branchId is required" })
      }
      const data = await catalogProducts(actorFrom(req), branchId)
      return res.json({ success: true, data })
    } catch (error) {
      return sendError(res, error)
    }
  }

  static async assets(req: AuthenticatedRequest, res: Response) {
    try {
      const branchId = String(req.query.branchId || "")
      if (!branchId) {
        return res.status(400).json({ success: false, message: "branchId is required" })
      }
      const data = await catalogAssets(actorFrom(req), branchId)
      return res.json({ success: true, data })
    } catch (error) {
      return sendError(res, error)
    }
  }

  static async employees(req: AuthenticatedRequest, res: Response) {
    try {
      const branchId = String(req.query.branchId || "")
      if (!branchId) {
        return res.status(400).json({ success: false, message: "branchId is required" })
      }
      const data = await catalogEmployees(actorFrom(req), branchId)
      return res.json({ success: true, data })
    } catch (error) {
      return sendError(res, error)
    }
  }
}
