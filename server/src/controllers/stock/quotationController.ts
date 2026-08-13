import type { Response } from "express"
import type { AuthenticatedRequest } from "../../middleware/auth"
import { Types } from "mongoose"
import { StockQuotation } from "../../models/StockQuotation"
import { QuotationFollowUp } from "../../models/QuotationFollowUp"
import { Branch } from "../../models/Branch"
import { User } from "../../models/User"
import { buildQuotationItems, generateDocumentNumber, isAdminRole, summarizeDocumentTotals } from "./stockShared"

function toValidObjectIds(values: Array<string | undefined | null>) {
  return [
    ...new Set(
      values
        .map((value) => String(value || "").trim())
        .filter((value) => value.length > 0 && Types.ObjectId.isValid(value)),
    ),
  ]
}

export class QuotationController {
  static async createQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const createdBy = req.user?.userId
      if (!org_id || !createdBy) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const {
        clientName,
        clientNumber,
        clientLocation,
        clientContactPerson,
        items,
        ownerUserId,
        branchId,
      } = req.body
      if (!clientName || !clientNumber) {
        return res.status(400).json({
          success: false,
          message: "Client name and phone number are required",
        })
      }

      if (ownerUserId) {
        const owner = await User.findOne({
          _id: String(ownerUserId).trim(),
          org_id,
        })
          .select("_id firstName lastName role")
          .lean()
        if (!owner) {
          return res.status(404).json({
            success: false,
            message: "Selected quotation owner not found",
          })
        }
      }

      if (branchId) {
        const branch = await Branch.findOne({
          _id: String(branchId).trim(),
          org_id,
        })
          .select("_id name code")
          .lean()
        if (!branch) {
          return res.status(404).json({ success: false, message: "Selected branch not found" })
        }
      }

      const normalizedLocation = String(clientLocation || "N/A").trim() || "N/A"
      const normalizedContactPerson = String(clientContactPerson || "").trim()
      const normalizedItems = await buildQuotationItems(org_id, items || [])
      const { subTotal, taxTotal, grandTotal } = summarizeDocumentTotals(normalizedItems)

      const quotation = await StockQuotation.create({
        org_id,
        quotationNumber: generateDocumentNumber("QTN"),
        client: {
          name: String(clientName).trim(),
          number: String(clientNumber).trim(),
          location: normalizedLocation,
          contactPerson: normalizedContactPerson || undefined,
        },
        items: normalizedItems,
        subTotal,
        taxTotal,
        grandTotal,
        status: req.user?.role === "employee" ? "pending_approval" : "draft",
        createdBy,
        ownerUserId: ownerUserId ? String(ownerUserId).trim() : undefined,
        branchId: branchId ? String(branchId).trim() : undefined,
      })

      return res.status(201).json({ success: true, data: quotation })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to create quotation"
      return res.status(500).json({ success: false, message })
    }
  }

  static async getQuotations(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      const role = req.user?.role
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const query: Record<string, unknown> = { org_id }
      if (role === "employee") {
        if (!userId) {
          return res.status(401).json({ success: false, message: "Unauthorized" })
        }
        query.createdBy = String(userId)
      }

      const quotations = await StockQuotation.find(query).sort({ createdAt: -1 }).lean()
      const creatorIds = toValidObjectIds(
        quotations.map((quotation) => quotation.createdBy),
      )
      const ownerIds = toValidObjectIds(
        quotations.map((quotation) => quotation.ownerUserId),
      )
      const branchIds = toValidObjectIds(
        quotations.map((quotation) => quotation.branchId),
      )

      const [creators, owners, branches] = await Promise.all([
        creatorIds.length
          ? User.find({ _id: { $in: creatorIds } }).select("firstName lastName").lean()
          : Promise.resolve([]),
        ownerIds.length
          ? User.find({ _id: { $in: ownerIds } }).select("firstName lastName").lean()
          : Promise.resolve([]),
        branchIds.length
          ? Branch.find({ _id: { $in: branchIds } }).select("name code").lean()
          : Promise.resolve([]),
      ])

      const creatorMap = new Map(
        creators.map((user) => [String(user._id), `${user.firstName || ""} ${user.lastName || ""}`.trim()]),
      )
      const ownerMap = new Map(
        owners.map((user) => [String(user._id), `${user.firstName || ""} ${user.lastName || ""}`.trim()]),
      )
      const branchMap = new Map(
        branches.map((branch) => [String(branch._id), `${branch.name || ""} (${branch.code || ""})`.trim()]),
      )

      const enriched = quotations.map((quotation) => {
        const createdByKey = String(quotation.createdBy || "")
        return {
          ...quotation,
          createdByName:
            creatorMap.get(createdByKey) ||
            (createdByKey === "website" ? "Website" : undefined),
          ownerUserName: ownerMap.get(String(quotation.ownerUserId || "")) || undefined,
          branchName: branchMap.get(String(quotation.branchId || "")) || undefined,
        }
      })

      return res.status(200).json({ success: true, data: enriched })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch quotations"
      return res.status(500).json({ success: false, message })
    }
  }

  static async getQuotationById(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      const role = req.user?.role
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { quotationId } = req.params
      const quotation = await StockQuotation.findOne({ _id: quotationId, org_id }).lean()
      if (!quotation) {
        return res.status(404).json({ success: false, message: "Quotation not found" })
      }

      if (role === "employee" && String(quotation.createdBy || "") !== String(userId || "")) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own quotation",
        })
      }

      const [creator, owner, branch] = await Promise.all([
        Types.ObjectId.isValid(String(quotation.createdBy || ""))
          ? User.findById(quotation.createdBy).select("firstName lastName").lean()
          : null,
        Types.ObjectId.isValid(String(quotation.ownerUserId || ""))
          ? User.findById(quotation.ownerUserId).select("firstName lastName").lean()
          : null,
        Types.ObjectId.isValid(String(quotation.branchId || ""))
          ? Branch.findById(quotation.branchId).select("name code").lean()
          : null,
      ])

      const websiteLabel =
        String(quotation.createdBy || "") === "website" ? "Website" : undefined

      return res.status(200).json({
        success: true,
        data: {
          ...quotation,
          createdByName: creator
            ? `${creator.firstName || ""} ${creator.lastName || ""}`.trim()
            : websiteLabel,
          ownerUserName: owner
            ? `${owner.firstName || ""} ${owner.lastName || ""}`.trim()
            : undefined,
          branchName: branch ? `${branch.name || ""} (${branch.code || ""})`.trim() : undefined,
        },
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch quotation"
      return res.status(500).json({ success: false, message })
    }
  }

  static async updateQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const role = req.user?.role
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { quotationId } = req.params
      const quotation = await StockQuotation.findOne({ _id: quotationId, org_id })
      if (!quotation) {
        return res.status(404).json({ success: false, message: "Quotation not found" })
      }

      if (!isAdminRole(role)) {
        return res.status(403).json({
          success: false,
          message: "Only admin/HR can edit quotations",
        })
      }

      if (quotation.status !== "draft" && quotation.status !== "pending_approval") {
        return res.status(400).json({
          success: false,
          message: "Only draft or pending quotations can be edited",
        })
      }

      const { clientName, clientNumber, clientLocation, clientContactPerson, items } = req.body
      if (!clientName || !clientNumber) {
        return res.status(400).json({
          success: false,
          message: "Client name and phone number are required",
        })
      }

      const normalizedLocation = String(clientLocation || "N/A").trim() || "N/A"
      const normalizedContactPerson = String(clientContactPerson || "").trim()
      const normalizedItems = await buildQuotationItems(org_id, items || [])
      const { subTotal, taxTotal, grandTotal } = summarizeDocumentTotals(normalizedItems)

      quotation.client = {
        name: String(clientName).trim(),
        number: String(clientNumber).trim(),
        location: normalizedLocation,
        contactPerson: normalizedContactPerson || undefined,
      }
      quotation.items = normalizedItems as typeof quotation.items
      quotation.subTotal = subTotal
      quotation.taxTotal = taxTotal
      quotation.grandTotal = grandTotal

      await quotation.save()
      return res.status(200).json({ success: true, data: quotation })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update quotation"
      return res.status(500).json({ success: false, message })
    }
  }

  static async approveQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: "Only admin/HR can approve quotations",
        })
      }

      const { quotationId } = req.params
      const quotation = await StockQuotation.findOne({ _id: quotationId, org_id })
      if (!quotation) {
        return res.status(404).json({ success: false, message: "Quotation not found" })
      }

      if (quotation.status === "converted" || quotation.status === "cancelled") {
        return res.status(400).json({
          success: false,
          message: `Cannot approve ${quotation.status} quotation`,
        })
      }

      quotation.status = "draft"
      quotation.approvedBy = String(req.user?.userId || "")
      quotation.approvedAt = new Date()
      await quotation.save()

      return res.status(200).json({
        success: true,
        message: "Quotation approved",
        data: quotation,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to approve quotation"
      return res.status(500).json({ success: false, message })
    }
  }

  static async rejectQuotation(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({
          success: false,
          message: "Only admin/HR can reject quotations",
        })
      }

      const { quotationId } = req.params
      const quotation = await StockQuotation.findOne({ _id: quotationId, org_id })
      if (!quotation) {
        return res.status(404).json({ success: false, message: "Quotation not found" })
      }

      if (quotation.status === "converted") {
        return res.status(400).json({
          success: false,
          message: "Cannot reject converted quotation",
        })
      }

      quotation.status = "cancelled"
      await quotation.save()

      return res.status(200).json({
        success: true,
        message: "Quotation rejected",
        data: quotation,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to reject quotation"
      return res.status(500).json({ success: false, message })
    }
  }

  static async addQuotationFollowUp(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { quotationId } = req.params
      const { note, callMade, outcome } = req.body || {}
      if (!note || String(note).trim().length === 0) {
        return res.status(400).json({ success: false, message: "Note is required" })
      }

      const quotation = await StockQuotation.findOne({ _id: quotationId, org_id })
      if (!quotation) {
        return res.status(404).json({ success: false, message: "Quotation not found" })
      }

      const doc = await QuotationFollowUp.create({
        org_id,
        quotationId: String(quotation._id),
        note: String(note).trim(),
        callMade: !!callMade,
        outcome: outcome ? String(outcome).trim() : undefined,
        createdBy: String(actorId),
      })

      return res.status(201).json({ success: true, data: doc })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to add follow up"
      return res.status(500).json({ success: false, message })
    }
  }

  static async getQuotationFollowUps(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { quotationId } = req.params
      const followups = await QuotationFollowUp.find({
        org_id,
        quotationId: String(quotationId),
      })
        .sort({ createdAt: -1 })
        .lean()

      return res.status(200).json({ success: true, data: followups })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to fetch follow ups"
      return res.status(500).json({ success: false, message })
    }
  }
}
