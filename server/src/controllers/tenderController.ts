import { Request, Response } from "express"
import { StockTender } from "../models/StockTender"
import { StockInvoice } from "../models/StockInvoice"

function generateDocumentNumber(prefix: string) {
  const ts = Date.now().toString().slice(-8);
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${ts}-${rand}`;
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

      const normalizedItems = items.map((item: any) => {
        const price = Number(item.soldUnitPrice ?? item.unitPrice ?? 0)
        const qty = Number(item.quantity || 1)
        return {
          ...item,
          unitPrice: price,
          lineTotal: price * qty
        }
      })

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

      const normalizedItems = items.map((item: any) => {
        const price = Number(item.soldUnitPrice ?? item.unitPrice ?? 0)
        const qty = Number(item.quantity || 1)
        return {
          ...item,
          unitPrice: price,
          lineTotal: price * qty
        }
      })

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
