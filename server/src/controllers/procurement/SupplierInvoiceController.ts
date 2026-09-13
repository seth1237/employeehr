import { Response } from "express"
import { AuthenticatedRequest } from "../../middleware/auth"
import { SupplierInvoice } from "../../models/SupplierInvoice"
import { PurchaseOrder } from "../../models/PurchaseOrder"
import { GoodsReceiptNote } from "../../models/GoodsReceiptNote"

export class SupplierInvoiceController {
  
  static async getInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const invoices = await SupplierInvoice.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: invoices })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async getInvoiceById(req: AuthenticatedRequest, res: Response) {
    try {
      const invoice = await SupplierInvoice.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })
      return res.json({ success: true, data: invoice })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async createInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { items } = req.body
      
      let subTotal = 0
      let taxAmount = 0
      
      const processedItems = items.map((item: any) => {
        const lineTotal = Number(item.quantity) * Number(item.unitPrice)
        const itemTax = lineTotal * (Number(item.taxRate || 0) / 100)
        
        subTotal += lineTotal
        taxAmount += itemTax
        
        return { ...item, lineTotal }
      })

      const discount = Number(req.body.discountAmount || 0)
      const grandTotal = (subTotal - discount) + taxAmount

      const invoice = await SupplierInvoice.create({
        ...req.body,
        org_id: req.org_id,
        items: processedItems,
        subTotal,
        taxAmount,
        discountAmount: discount,
        grandTotal,
        balanceRemaining: grandTotal,
        matchStatus: "pending",
        status: "draft",
        createdBy: req.user?._id
      })

      return res.status(201).json({ success: true, data: invoice })
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: "This invoice number already exists for this supplier." })
      }
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // Enterprise Feature: Three-Way Matching (PO vs GRN vs Invoice)
  static async performThreeWayMatch(req: AuthenticatedRequest, res: Response) {
    try {
      const invoice = await SupplierInvoice.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      if (!invoice.purchaseOrderId || !invoice.grnId) {
        invoice.matchStatus = "mismatch"
        invoice.mismatchReason = "Missing PO or GRN reference for matching"
        await invoice.save()
        return res.json({ success: true, data: invoice, matched: false })
      }

      const po = await PurchaseOrder.findOne({ _id: invoice.purchaseOrderId, org_id: req.org_id })
      const grn = await GoodsReceiptNote.findOne({ _id: invoice.grnId, org_id: req.org_id })

      if (!po || !grn) {
        invoice.matchStatus = "mismatch"
        invoice.mismatchReason = "Referenced PO or GRN not found in system"
        await invoice.save()
        return res.json({ success: true, data: invoice, matched: false })
      }

      let isMatch = true
      let mismatchReason = ""

      // 1. Check Totals (Invoice Grand Total vs PO Grand Total)
      // Allow for a small variance (e.g. 1 KES for rounding)
      if (Math.abs(invoice.grandTotal - po.grandTotal) > 2) {
        isMatch = false
        mismatchReason += `Invoice Total (${invoice.grandTotal}) does not match PO Total (${po.grandTotal}). `
      }

      // 2. Check Quantities (Invoice vs GRN)
      for (const invItem of invoice.items) {
        const grnItem = grn.items.find(g => String(g.productId) === String(invItem.productId) || g.productName === invItem.productName)
        if (!grnItem) {
          isMatch = false
          mismatchReason += `Item ${invItem.productName} on Invoice is not on GRN. `
        } else if (invItem.quantity > grnItem.receivedQuantity) {
          isMatch = false
          mismatchReason += `Billed quantity for ${invItem.productName} (${invItem.quantity}) exceeds received quantity (${grnItem.receivedQuantity}). `
        }
      }

      if (isMatch) {
        invoice.matchStatus = "matched"
        invoice.mismatchReason = ""
        invoice.status = "pending_matching" // Proceeding to approval
      } else {
        invoice.matchStatus = "mismatch"
        invoice.mismatchReason = mismatchReason.trim()
      }

      await invoice.save()
      return res.json({ success: true, data: invoice, matched: isMatch })

    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Finance approves invoice for payment (after successful match or manual override)
  static async approveForPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const invoice = await SupplierInvoice.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })

      if (invoice.matchStatus === "mismatch" && !req.body.overrideMismatch) {
        return res.status(400).json({ success: false, message: "Cannot approve mismatched invoice without explicit override" })
      }

      if (req.body.overrideMismatch) {
        invoice.matchStatus = "override_approved"
      }

      invoice.status = "approved_for_payment"
      // Accounts Payable integration happens here - it is now ready to be paid
      
      await invoice.save()
      return res.json({ success: true, data: invoice })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }
}
