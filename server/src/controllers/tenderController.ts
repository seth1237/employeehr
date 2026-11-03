import { Request, Response } from "express"
import { StockTender } from "../models/StockTender"
import { StockInvoice } from "../models/StockInvoice"

function generateDocumentNumber(prefix: string) {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${ts}-${rand}`;
}

function normalizeTenderItem(item: any) {
  const price = Number(item.soldUnitPrice ?? item.unitPrice ?? 0)
  const qty = Number(item.quantity || 1)
  const catalogPrice = Number(item.productUnitPrice ?? 0)
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Sold price cannot be negative")
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Quantity must be at least 1")
  }
  return {
    productId: item.productId,
    productName: item.productName,
    quantity: qty,
    productUnitPrice: Number.isFinite(catalogPrice) ? catalogPrice : 0,
    soldUnitPrice: price,
    unitPrice: price,
    lineTotal: Number((price * qty).toFixed(2)),
    taxRate: item.taxRate,
    isOutsourced: Boolean(item.isOutsourced),
    description: item.description,
    imageUrl: item.imageUrl,
    showImageOnQuote: item.showImageOnQuote,
    categoryGroup: item.categoryGroup,
  }
}

export class TenderController {
  public static async createTender(req: Request, res: Response) {
    try {
      const org_id = (req as any).user?.org_id || (req as any).org_id
      const createdBy = (req as any).user?.userId

      if (!org_id) {
        return res.status(400).json({ success: false, message: "Organization ID is missing" })
      }

      const {
        tenderName,
        department,
        clientName,
        clientNumber,
        clientLocation,
        clientContactPerson,
        ownerUserId,
        branchId,
        items,
        categoryOrder
      } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "At least one item is required" })
      }

      const normalizedItems = items.map((item: any) => normalizeTenderItem(item))

      const subTotal = normalizedItems.reduce((acc: number, cur: any) => acc + cur.lineTotal, 0)

      const tenderRecord = {
        org_id,
        tenderNumber: generateDocumentNumber("TND"),
        tenderName,
        department,
        client: {
          name: clientName,
          number: clientNumber,
          location: clientLocation || "N/A",
          contactPerson: clientContactPerson || undefined,
        },
        items: normalizedItems,
        subTotal,
        categoryOrder: Array.isArray(categoryOrder) ? categoryOrder.filter(Boolean) : [],
        status: "draft",
        createdBy,
        ownerUserId: ownerUserId || undefined,
        branchId: branchId || undefined,
      }

      const newTender = new StockTender(tenderRecord)
      await newTender.save()

      return res.status(201).json({ success: true, data: newTender })
    } catch (error: any) {
      console.error("Error creating tender:", error)
      return res.status(500).json({ success: false, message: error.message || "Failed to create tender" })
    }
  }

  public static async getTenders(req: Request, res: Response) {
    try {
      const org_id = (req as any).user?.org_id || (req as any).org_id

      if (!org_id) {
        return res.status(400).json({ success: false, message: "Organization ID is missing" })
      }

      const tenders = await StockTender.find({ org_id }).sort({ createdAt: -1 })
      return res.status(200).json({ success: true, data: tenders })
    } catch (error: any) {
      console.error("Error fetching tenders:", error)
      return res.status(500).json({ success: false, message: error.message || "Failed to fetch tenders" })
    }
  }

  public static async updateTender(req: Request, res: Response) {
    try {
      const { tenderId } = req.params
      const org_id = (req as any).user?.org_id || (req as any).org_id

      const {
        tenderName,
        department,
        clientName,
        clientNumber,
        clientLocation,
        clientContactPerson,
        ownerUserId,
        branchId,
        items,
        categoryOrder
      } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "At least one item is required" })
      }

      const normalizedItems = items.map((item: any) => normalizeTenderItem(item))

      const subTotal = normalizedItems.reduce((acc: number, cur: any) => acc + cur.lineTotal, 0)

      const updateData = {
        tenderName,
        department,
        client: {
          name: clientName,
          number: clientNumber,
          location: clientLocation || "N/A",
          contactPerson: clientContactPerson || undefined,
        },
        items: normalizedItems,
        subTotal,
        categoryOrder: Array.isArray(categoryOrder) ? categoryOrder.filter(Boolean) : [],
        ownerUserId: ownerUserId || undefined,
        branchId: branchId || undefined,
      }

      const updatedTender = await StockTender.findOneAndUpdate(
        { _id: tenderId, org_id },
        { $set: updateData },
        { new: true }
      )

      if (!updatedTender) {
        return res.status(404).json({ success: false, message: "Tender not found" })
      }

      return res.status(200).json({ success: true, data: updatedTender })
    } catch (error: any) {
      console.error("Error updating tender:", error)
      return res.status(500).json({ success: false, message: error.message || "Failed to update tender" })
    }
  }

  public static async approveTender(req: Request, res: Response) {
    try {
      const { tenderId } = req.params
      const org_id = (req as any).user?.org_id || (req as any).org_id
      const approvedBy = (req as any).user?.userId

      const tender = await StockTender.findOneAndUpdate(
        { _id: tenderId, org_id },
        { $set: { status: "draft", approvedBy, approvedAt: new Date() } },
        { new: true }
      )

      if (!tender) {
        return res.status(404).json({ success: false, message: "Tender not found" })
      }

      return res.status(200).json({ success: true, data: tender })
    } catch (error: any) {
      console.error("Error approving tender:", error)
      return res.status(500).json({ success: false, message: error.message || "Failed to approve tender" })
    }
  }

  public static async rejectTender(req: Request, res: Response) {
    try {
      const { tenderId } = req.params
      const org_id = (req as any).user?.org_id || (req as any).org_id

      const tender = await StockTender.findOneAndUpdate(
        { _id: tenderId, org_id },
        { $set: { status: "cancelled" } },
        { new: true }
      )

      if (!tender) {
        return res.status(404).json({ success: false, message: "Tender not found" })
      }

      return res.status(200).json({ success: true, data: tender })
    } catch (error: any) {
      console.error("Error rejecting tender:", error)
      return res.status(500).json({ success: false, message: error.message || "Failed to reject tender" })
    }
  }

  public static async duplicateTender(req: Request, res: Response) {
    try {
      const { tenderId } = req.params
      const org_id = (req as any).user?.org_id || (req as any).org_id
      const createdBy = (req as any).user?.userId

      if (!org_id) {
        return res.status(400).json({ success: false, message: "Organization ID is missing" })
      }

      const source = await StockTender.findOne({ _id: tenderId, org_id })
      if (!source) {
        return res.status(404).json({ success: false, message: "Tender not found" })
      }

      const {
        clientName,
        clientNumber,
        clientLocation,
        clientContactPerson,
        tenderName,
      } = req.body || {}

      const nextClientName = String(clientName || "").trim()
      if (!nextClientName) {
        return res.status(400).json({
          success: false,
          message: "Choose another facility or client name for the duplicate",
        })
      }

      const items = (source.items || []).map((item: any) => {
        const plain = typeof item?.toObject === "function" ? item.toObject() : { ...item }
        delete plain._id
        return plain
      })

      if (!items.length) {
        return res.status(400).json({ success: false, message: "This tender has no items to duplicate" })
      }

      const duplicate = new StockTender({
        org_id,
        tenderNumber: generateDocumentNumber("TND"),
        tenderName: String(tenderName || source.tenderName || "").trim() || source.tenderName,
        department: source.department,
        client: {
          name: nextClientName,
          number: String(clientNumber || source.client?.number || "N/A").trim() || "N/A",
          location: String(clientLocation || source.client?.location || "N/A").trim() || "N/A",
          contactPerson: String(clientContactPerson || "").trim() || undefined,
        },
        items,
        subTotal: source.subTotal,
        categoryOrder: Array.isArray(source.categoryOrder) ? source.categoryOrder.filter(Boolean) : [],
        status: "draft",
        createdBy,
        ownerUserId: source.ownerUserId || createdBy,
        branchId: source.branchId || undefined,
      })

      await duplicate.save()

      return res.status(201).json({ success: true, data: duplicate })
    } catch (error: any) {
      console.error("Error duplicating tender:", error)
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to duplicate tender",
      })
    }
  }

  public static async convertTenderToInvoice(req: Request, res: Response) {
    try {
      const { tenderId } = req.params
      const org_id = (req as any).user?.org_id || (req as any).org_id

      const tender = await StockTender.findOne({ _id: tenderId, org_id })
      if (!tender) {
        return res.status(404).json({ success: false, message: "Tender not found" })
      }

      if (tender.status === "converted") {
        const existingInvoice = await StockInvoice.findById(tender.convertedInvoiceId).lean()
        if (existingInvoice) {
          return res.status(200).json({ success: true, data: existingInvoice })
        }
      }

      const invoiceNumber = generateDocumentNumber("INV")
      const deliveryNoteNumber = generateDocumentNumber("DN")

      const invoiceData = {
        org_id,
        invoiceNumber,
        deliveryNoteNumber,
        client: tender.client,
        items: tender.items,
        subTotal: tender.subTotal,
        createdBy: tender.createdBy,
        ownerUserId: tender.ownerUserId || tender.createdBy,
        branchId: tender.branchId,
        sourceType: "Tender",
        sourceId: String(tender._id),
        status: "issued",
        date: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }

      const newInvoice = new StockInvoice(invoiceData)
      await newInvoice.save()

      tender.status = "converted"
      tender.convertedInvoiceId = String(newInvoice._id)
      await tender.save()

      return res.status(200).json({ success: true, data: newInvoice })
    } catch (error: any) {
      console.error("Error converting tender to invoice:", error)
      return res.status(500).json({ success: false, message: error.message || "Failed to convert tender" })
    }
  }
}
