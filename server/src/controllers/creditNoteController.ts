import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { CreditNote } from "../models/CreditNote"
import { StockInvoice } from "../models/StockInvoice"
import { Company } from "../models/Company"
import { User } from "../models/User"
import { generateCreditNotePdf as generateCreditNotePdfLib } from "../utils/pdfGenerator"
import fs from "fs/promises"
import path from "path"

function generateCreditNoteNumber(prefix: string = "CN") {
  const ts = Date.now().toString().slice(-8)
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `${prefix}-${ts}-${rand}`
}

const CREDIT_NOTE_REASONS = {
  returned: "Goods are returned",
  overcharged: "Services were overcharged",
  incorrect_items: "Incorrect items were billed",
  discounts_applied: "Discounts are applied after invoicing",
  partial_cancel: "An order is partially canceled",
  other: "Other",
}

export class CreditNoteController {
  // Get available invoices for credit note creation
  static async getInvoicesForCreditNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const invoices = await StockInvoice.find({
        org_id: req.org_id,
        status: { $in: ["issued", "paid"] },
      })
        .select("_id invoiceNumber client items subTotal createdAt")
        .sort({ createdAt: -1 })
        .limit(100)

      return res.json({
        success: true,
        data: invoices,
      })
    } catch (error) {
      console.error("Error fetching invoices for credit note:", error)
      return res.status(500).json({ success: false, message: "Failed to fetch invoices" })
    }
  }

  // Create a credit note
  static async createCreditNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { invoiceId, items, reason, reasonDetails } = req.body

      // Validate required fields
      if (!invoiceId) {
        return res.status(400).json({ success: false, message: "invoiceId is required" })
      }
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "At least one item is required" })
      }
      if (!reason) {
        return res.status(400).json({ success: false, message: "reason is required" })
      }
      if (reason === "other" && !reasonDetails) {
        return res.status(400).json({ success: false, message: "reasonDetails is required for 'other' reason" })
      }

      // Fetch the original invoice
      const invoice = await StockInvoice.findById(invoiceId)
      if (!invoice) {
        return res.status(404).json({ success: false, message: "Invoice not found" })
      }
      if (invoice.org_id !== req.org_id) {
        return res.status(403).json({ success: false, message: "Unauthorized" })
      }

      // Validate items against invoice items
      const validatedItems = items.map((item: any) => {
        const invoiceItem = invoice.items.find((ii: any) => String(ii.productId) === String(item.productId))
        if (!invoiceItem) {
          throw new Error(`Product ${item.productId} not found in invoice`)
        }

        const qty = Number(item.quantity)
        if (qty <= 0 || qty > invoiceItem.quantity) {
          throw new Error(`Invalid quantity for ${item.productName}`)
        }

        return {
          productId: item.productId,
          productName: item.productName,
          quantity: qty,
          unitPrice: Number(item.unitPrice || invoiceItem.unitPrice),
          lineTotal: qty * Number(item.unitPrice || invoiceItem.unitPrice),
          originalInvoiceItemQty: invoiceItem.quantity,
        }
      })

      // Calculate subtotal
      const subTotal = validatedItems.reduce((sum: number, item: any) => sum + item.lineTotal, 0)

      // Create credit note
      const creditNoteNumber = generateCreditNoteNumber()
      const creditNote = new CreditNote({
        org_id: req.org_id,
        creditNoteNumber,
        invoiceId: String(invoiceId),
        invoiceNumber: invoice.invoiceNumber,
        client: {
          name: invoice.client.name,
          number: invoice.client.number,
          location: invoice.client.location,
        },
        items: validatedItems,
        subTotal,
        reason,
        reasonDetails: reason === "other" ? reasonDetails : undefined,
        status: "draft",
        createdBy: String(req.user?.userId),
      })

      await creditNote.save()

      return res.json({
        success: true,
        message: "Credit note created successfully",
        data: creditNote,
      })
    } catch (error: any) {
      console.error("Error creating credit note:", error)
      return res.status(500).json({ success: false, message: error.message || "Failed to create credit note" })
    }
  }

  // Get all credit notes
  static async getAllCreditNotes(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { status, page = 1, limit = 20 } = req.query
      const pageNum = Math.max(1, Number(page))
      const limitNum = Math.min(100, Math.max(1, Number(limit)))
      const skip = (pageNum - 1) * limitNum

      const query: any = { org_id: req.org_id }
      if (status && status !== "all") {
        query.status = status
      }

      const [creditNotes, total] = await Promise.all([
        CreditNote.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        CreditNote.countDocuments(query),
      ])

      return res.json({
        success: true,
        data: creditNotes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      })
    } catch (error) {
      console.error("Error fetching credit notes:", error)
      return res.status(500).json({ success: false, message: "Failed to fetch credit notes" })
    }
  }

  // Get a single credit note
  static async getCreditNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { id } = req.params
      const creditNote = await CreditNote.findById(id)

      if (!creditNote) {
        return res.status(404).json({ success: false, message: "Credit note not found" })
      }

      if (creditNote.org_id !== req.org_id) {
        return res.status(403).json({ success: false, message: "Unauthorized" })
      }

      return res.json({
        success: true,
        data: creditNote,
      })
    } catch (error) {
      console.error("Error fetching credit note:", error)
      return res.status(500).json({ success: false, message: "Failed to fetch credit note" })
    }
  }

  // Update credit note (only drafts can be updated)
  static async updateCreditNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { id } = req.params
      const { items, reason, reasonDetails, status } = req.body

      const creditNote = await CreditNote.findById(id)
      if (!creditNote) {
        return res.status(404).json({ success: false, message: "Credit note not found" })
      }

      if (creditNote.org_id !== req.org_id) {
        return res.status(403).json({ success: false, message: "Unauthorized" })
      }

      // Only drafts can be updated
      if (creditNote.status !== "draft") {
        return res.status(400).json({ success: false, message: "Only draft credit notes can be updated" })
      }

      // Update fields if provided
      if (items && Array.isArray(items)) {
        const invoice = await StockInvoice.findById(creditNote.invoiceId)
        if (!invoice) {
          return res.status(404).json({ success: false, message: "Original invoice not found" })
        }

        creditNote.items = items.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          lineTotal: Number(item.quantity) * Number(item.unitPrice),
          originalInvoiceItemQty: item.originalInvoiceItemQty,
        }))

        creditNote.subTotal = creditNote.items.reduce((sum: number, item: any) => sum + item.lineTotal, 0)
      }

      if (reason) {
        creditNote.reason = reason
        creditNote.reasonDetails = reason === "other" ? reasonDetails : undefined
      }

      if (status && ["draft", "issued", "applied"].includes(status)) {
        creditNote.status = status
      }

      await creditNote.save()

      return res.json({
        success: true,
        message: "Credit note updated successfully",
        data: creditNote,
      })
    } catch (error: any) {
      console.error("Error updating credit note:", error)
      return res.status(500).json({ success: false, message: error.message || "Failed to update credit note" })
    }
  }

  // Issue credit note (draft -> issued)
  static async issueCreditNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { id } = req.params
      const creditNote = await CreditNote.findById(id)

      if (!creditNote) {
        return res.status(404).json({ success: false, message: "Credit note not found" })
      }

      if (creditNote.org_id !== req.org_id) {
        return res.status(403).json({ success: false, message: "Unauthorized" })
      }

      if (creditNote.status !== "draft") {
        return res.status(400).json({ success: false, message: "Only draft credit notes can be issued" })
      }

      creditNote.status = "issued"
      await creditNote.save()

      return res.json({
        success: true,
        message: "Credit note issued successfully",
        data: creditNote,
      })
    } catch (error) {
      console.error("Error issuing credit note:", error)
      return res.status(500).json({ success: false, message: "Failed to issue credit note" })
    }
  }

  // Delete credit note (only drafts)
  static async deleteCreditNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { id } = req.params
      const creditNote = await CreditNote.findById(id)

      if (!creditNote) {
        return res.status(404).json({ success: false, message: "Credit note not found" })
      }

      if (creditNote.org_id !== req.org_id) {
        return res.status(403).json({ success: false, message: "Unauthorized" })
      }

      if (creditNote.status !== "draft") {
        return res.status(400).json({ success: false, message: "Only draft credit notes can be deleted" })
      }

      await CreditNote.deleteOne({ _id: id })

      return res.json({
        success: true,
        message: "Credit note deleted successfully",
      })
    } catch (error) {
      console.error("Error deleting credit note:", error)
      return res.status(500).json({ success: false, message: "Failed to delete credit note" })
    }
  }

  // Get credit note reasons
  static async getCreditNoteReasons(_req: AuthenticatedRequest, res: Response) {
    try {
      return res.json({
        success: true,
        data: CREDIT_NOTE_REASONS,
      })
    } catch (error) {
      console.error("Error fetching credit note reasons:", error)
      return res.status(500).json({ success: false, message: "Failed to fetch reasons" })
    }
  }

  // Generate PDF for credit note
  static async generateCreditNotePdf(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { id } = req.params
      const creditNote = await CreditNote.findById(id)

      if (!creditNote) {
        return res.status(404).json({ success: false, message: "Credit note not found" })
      }

      if (creditNote.org_id !== req.org_id) {
        return res.status(403).json({ success: false, message: "Unauthorized" })
      }

      // Fetch the original invoice for reference
      const invoice = await StockInvoice.findById(creditNote.invoiceId)

      if (!invoice) {
        return res.status(404).json({ success: false, message: "Reference invoice not found" })
      }

      // Prepare reason string
      const reasonText = CREDIT_NOTE_REASONS[creditNote.reason as keyof typeof CREDIT_NOTE_REASONS] || creditNote.reason

      // Fetch company branding and invoice settings
      const company = await Company.findById(req.org_id).select(
        "name logo primaryColor secondaryColor invoiceSettings email phone city state country"
      )

      // Prepare branding and ensure logo is a data URL (so jsPDF can embed it)
      let logoData: string | undefined = undefined
      if (company?.logo) {
        const raw = String(company.logo || "").trim()
        if (raw.startsWith("data:")) {
          logoData = raw
        } else if (raw.startsWith("http://") || raw.startsWith("https://")) {
          try {
            const resp = await fetch(raw)
            if (resp.ok) {
              const contentType = resp.headers.get("content-type") || "image/png"
              const buffer = Buffer.from(await resp.arrayBuffer())
              logoData = `data:${contentType};base64,${buffer.toString("base64")}`
            }
          } catch (e) {
            // ignore remote fetch failures
          }
        } else {
          try {
            const logoFileName = path.basename(raw)
            const candidatePaths = [
              path.join(process.cwd(), "uploads", "logos", logoFileName),
              path.join(process.cwd(), "server", "uploads", "logos", logoFileName),
              path.join(__dirname, "..", "..", "uploads", "logos", logoFileName),
            ]

            for (const filePath of candidatePaths) {
              try {
                const fileBuf = await fs.readFile(filePath)
                const ext = path.extname(logoFileName).toLowerCase()
                const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png"
                logoData = `data:${mime};base64,${fileBuf.toString("base64")}`
                break
              } catch {
                // try next candidate
              }
            }
          } catch (e) {
            // ignore fs read failures
          }
        }
      }

      const branding = company
        ? {
            name: company.name,
            logo: logoData || company.logo,
            primaryColor: company.primaryColor,
            secondaryColor: company.secondaryColor,
            email: company.email,
            phone: company.phone,
            city: company.city,
            state: company.state,
            country: company.country,
          }
        : undefined

      const creator = await User.findById(creditNote.createdBy).select("firstName lastName email")
      const preparedBy = creator
        ? [creator.firstName, creator.lastName].filter(Boolean).join(" ") || creator.email || "System User"
        : "System User"

      

      // Generate PDF using server-side generator (returns Buffer)
      const buffer = generateCreditNotePdfLib({
        creditNoteNumber: creditNote.creditNoteNumber,
        invoiceNumber: invoice.invoiceNumber,
        createdAt: creditNote.createdAt || new Date(),
        client: creditNote.client,
        items: creditNote.items.map((item: any) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          lineTotal: item.unitPrice * item.quantity,
        })),
        subTotal: creditNote.subTotal,
        reason: reasonText,
        reasonDetails: creditNote.reasonDetails,
        branding,
        preparedBy,
      })

      // Send PDF
      res.setHeader("Content-Type", "application/pdf")
      res.setHeader("Content-Disposition", `attachment; filename="credit-note-${creditNote.creditNoteNumber}.pdf"`)
      res.setHeader("Content-Length", buffer.length)

      return res.send(buffer)
    } catch (error) {
      console.error("Error generating credit note PDF:", error)
      return res.status(500).json({ success: false, message: "Failed to generate PDF" })
    }
  }
}
