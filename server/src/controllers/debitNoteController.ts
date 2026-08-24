import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { DebitNote, DEBIT_NOTE_REASONS } from "../models/DebitNote"
import { StockInvoice } from "../models/StockInvoice"
import { User } from "../models/User"
import { buildDebitNotePdfBuffer } from "../services/stockDocumentPdf.service"

function generateDebitNoteNumber(prefix = "DN") {
  const ts = Date.now().toString().slice(-8)
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `${prefix}-${ts}-${rand}`
}

export class DebitNoteController {
  static async getInvoicesForDebitNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const invoices = await StockInvoice.find({
        org_id: req.org_id,
        status: { $in: ["issued", "paid", "pending_approval"] },
      })
        .select("_id invoiceNumber client items subTotal grandTotal createdAt status")
        .sort({ createdAt: -1 })
        .limit(150)

      return res.json({ success: true, data: invoices })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch invoices",
      })
    }
  }

  static async getReasons(_req: AuthenticatedRequest, res: Response) {
    return res.json({ success: true, data: DEBIT_NOTE_REASONS })
  }

  static async createDebitNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { invoiceId, items, reason, reasonDetails } = req.body || {}
      if (!invoiceId) {
        return res.status(400).json({ success: false, message: "invoiceId is required" })
      }
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "At least one item is required" })
      }
      if (!reason || !(reason in DEBIT_NOTE_REASONS)) {
        return res.status(400).json({ success: false, message: "Valid reason is required" })
      }
      if (reason === "other" && !String(reasonDetails || "").trim()) {
        return res.status(400).json({
          success: false,
          message: "reasonDetails is required for 'other'",
        })
      }

      const invoice = await StockInvoice.findOne({ _id: invoiceId, org_id: req.org_id })
      if (!invoice) {
        return res.status(404).json({ success: false, message: "Invoice not found" })
      }

      const validatedItems = items.map((item: any) => {
        const qty = Number(item.quantity)
        const unitPrice = Number(item.unitPrice)
        if (!item.productName || !Number.isFinite(qty) || qty <= 0) {
          throw new Error("Each item needs a name and valid quantity")
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(`Invalid unit price for ${item.productName}`)
        }
        return {
          productId: String(item.productId || item.productName),
          productName: String(item.productName).trim(),
          quantity: qty,
          unitPrice,
          lineTotal: Number((qty * unitPrice).toFixed(2)),
          description: item.description ? String(item.description).trim() : undefined,
        }
      })

      const subTotal = validatedItems.reduce(
        (sum: number, item: { lineTotal: number }) => sum + item.lineTotal,
        0,
      )

      const debitNote = await DebitNote.create({
        org_id: req.org_id,
        debitNoteNumber: generateDebitNoteNumber(),
        invoiceId: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        client: {
          name: invoice.client.name,
          number: invoice.client.number,
          location: invoice.client.location,
        },
        items: validatedItems,
        subTotal: Number(subTotal.toFixed(2)),
        reason,
        reasonDetails: reason === "other" ? String(reasonDetails).trim() : undefined,
        status: "draft",
        createdBy: String(req.user.userId),
      })

      return res.status(201).json({ success: true, data: debitNote })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create debit note",
      })
    }
  }

  static async getAllDebitNotes(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }
      const { status, invoiceId } = req.query
      const query: any = { org_id: req.org_id }
      if (status && status !== "all") query.status = String(status)
      if (invoiceId) query.invoiceId = String(invoiceId)

      const notes = await DebitNote.find(query).sort({ createdAt: -1 }).lean()
      return res.json({ success: true, data: notes })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch debit notes",
      })
    }
  }

  static async getDebitNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }
      const note = await DebitNote.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!note) {
        return res.status(404).json({ success: false, message: "Debit note not found" })
      }
      return res.json({ success: true, data: note })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch debit note",
      })
    }
  }

  static async issueDebitNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }
      const note = await DebitNote.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!note) {
        return res.status(404).json({ success: false, message: "Debit note not found" })
      }
      if (note.status !== "draft") {
        return res.status(400).json({ success: false, message: "Only draft debit notes can be issued" })
      }

      note.status = "issued"
      note.issuedAt = new Date()
      await note.save()

      const invoice = await StockInvoice.findOne({ _id: note.invoiceId, org_id: req.org_id })
      if (invoice && invoice.status === "paid") {
        invoice.status = "issued"
        await invoice.save()
      }

      return res.json({
        success: true,
        message: "Debit note issued — customer balance increased",
        data: note,
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to issue debit note",
      })
    }
  }

  static async deleteDebitNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }
      const note = await DebitNote.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!note) {
        return res.status(404).json({ success: false, message: "Debit note not found" })
      }
      if (note.status !== "draft") {
        return res.status(400).json({ success: false, message: "Only draft debit notes can be deleted" })
      }
      await DebitNote.deleteOne({ _id: note._id })
      return res.json({ success: true, message: "Debit note deleted" })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to delete debit note",
      })
    }
  }

  static async generateDebitNotePdf(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const note = await DebitNote.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!note) {
        return res.status(404).json({ success: false, message: "Debit note not found" })
      }

      const invoice = await StockInvoice.findById(note.invoiceId)
      const reasonText =
        DEBIT_NOTE_REASONS[note.reason as keyof typeof DEBIT_NOTE_REASONS] || note.reason

      const creator = await User.findById(note.createdBy).select("firstName lastName email")
      const preparedBy = creator
        ? [creator.firstName, creator.lastName].filter(Boolean).join(" ") ||
          creator.email ||
          "System User"
        : "System User"

      const baseUrl = `${req.protocol}://${req.get("host")}`
      const buffer = await buildDebitNotePdfBuffer(note, req.org_id, {
        baseUrl,
        invoiceNumber: invoice?.invoiceNumber || note.invoiceNumber,
        reasonText,
        preparedBy,
      })

      res.setHeader("Content-Type", "application/pdf")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="debit-note-${note.debitNoteNumber}.pdf"`,
      )
      res.setHeader("Content-Length", buffer.length)
      return res.send(buffer)
    } catch (error: any) {
      console.error("Error generating debit note PDF:", error)
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to generate PDF",
      })
    }
  }
}
