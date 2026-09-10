import { Response } from "express"
import { AuthenticatedRequest } from "../middleware/auth"
import { Supplier } from "../models/Supplier"
import { PurchaseRequest } from "../models/PurchaseRequest"
import { PurchaseOrder } from "../models/PurchaseOrder"
import { GoodsReceiptNote } from "../models/GoodsReceiptNote"
import { SupplierInvoice } from "../models/SupplierInvoice"
import { CashTransaction } from "../models/CashTransaction"
import { CashBankAccount } from "../models/CashBankAccount"
import { GeneralLedgerService } from "../services/GeneralLedgerService"
import { Account } from "../models/Account"
import { StockProduct } from "../models/StockProduct"

export class ProcurementController {
  // ================= SUPPLIERS =================
  static async getSuppliers(req: AuthenticatedRequest, res: Response) {
    try {
      const suppliers = await Supplier.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: suppliers })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async createSupplier(req: AuthenticatedRequest, res: Response) {
    try {
      const supplier = await Supplier.create({ ...req.body, org_id: req.org_id })
      return res.status(201).json({ success: true, data: supplier })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // ================= PURCHASE REQUESTS =================
  static async getPurchaseRequests(req: AuthenticatedRequest, res: Response) {
    try {
      const requests = await PurchaseRequest.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: requests })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async createPurchaseRequest(req: AuthenticatedRequest, res: Response) {
    try {
      const count = await PurchaseRequest.countDocuments({ org_id: req.org_id })
      const requestNumber = `PR-${String(count + 1).padStart(4, "0")}`

      const pr = await PurchaseRequest.create({
        ...req.body,
        org_id: req.org_id,
        requestedBy: req.user?.userId,
        requestNumber,
      })
      return res.status(201).json({ success: true, data: pr })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  static async updatePurchaseRequestStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { status, rejectionReason } = req.body

      const pr = await PurchaseRequest.findOneAndUpdate(
        { _id: id, org_id: req.org_id },
        { status, rejectionReason, approvedBy: req.user?.userId, approvalDate: status === 'approved' ? new Date() : undefined },
        { new: true }
      )
      return res.json({ success: true, data: pr })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // ================= PURCHASE ORDERS =================
  static async getPurchaseOrders(req: AuthenticatedRequest, res: Response) {
    try {
      const orders = await PurchaseOrder.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: orders })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async createPurchaseOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const count = await PurchaseOrder.countDocuments({ org_id: req.org_id })
      const poNumber = `PO-${String(count + 1).padStart(4, "0")}`

      const po = await PurchaseOrder.create({
        ...req.body,
        org_id: req.org_id,
        issuedBy: req.user?.userId,
        poNumber,
      })

      // Update PR status if linked
      if (po.purchaseRequestId) {
        await PurchaseRequest.findByIdAndUpdate(po.purchaseRequestId, { status: "converted_to_po" })
      }

      return res.status(201).json({ success: true, data: po })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  
  static async updatePurchaseOrder(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const po = await PurchaseOrder.findOne({ _id: id, org_id: req.org_id })
      if (!po) return res.status(404).json({ success: false, message: "PO not found" })
      if (po.status !== "draft") return res.status(400).json({ success: false, message: "Only draft POs can be edited" })

      Object.assign(po, req.body)
      await po.save()
      return res.json({ success: true, data: po })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  static async updatePurchaseOrderStatus
(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { status } = req.body
      const po = await PurchaseOrder.findOneAndUpdate(
        { _id: id, org_id: req.org_id },
        { status },
        { new: true }
      )
      return res.json({ success: true, data: po })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // ================= GOODS RECEIPT NOTES =================
  static async getGRNs(req: AuthenticatedRequest, res: Response) {
    try {
      const grns = await GoodsReceiptNote.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: grns })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async createGRN(req: AuthenticatedRequest, res: Response) {
    try {
      const count = await GoodsReceiptNote.countDocuments({ org_id: req.org_id })
      const grnNumber = `GRN-${String(count + 1).padStart(4, "0")}`

      const grn = await GoodsReceiptNote.create({
        ...req.body,
        org_id: req.org_id,
        receivedBy: req.user?.userId,
        grnNumber,
      })

      return res.status(201).json({ success: true, data: grn })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  static async confirmGRN(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const grn = await GoodsReceiptNote.findOne({ _id: id, org_id: req.org_id })
      if (!grn) return res.status(404).json({ success: false, message: "GRN not found" })
      if (grn.status === "confirmed") return res.status(400).json({ success: false, message: "GRN already confirmed" })

      // Update stock
      for (const item of grn.items) {
        if (item.productId && item.receivedQuantity > 0) {
          await StockProduct.findByIdAndUpdate(item.productId, {
            $inc: { currentQuantity: item.receivedQuantity }
          })
        }
      }

      grn.status = "confirmed"
      grn.stockUpdated = true
      await grn.save()

      // Update PO status
      const po = await PurchaseOrder.findById(grn.purchaseOrderId)
      if (po) {
        po.status = "fulfilled" // Simplification: assume fulfilled
        await po.save()
      }

      return res.json({ success: true, data: grn })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // ================= SUPPLIER INVOICES (AP) =================
  static async getSupplierInvoices(req: AuthenticatedRequest, res: Response) {
    try {
      const invoices = await SupplierInvoice.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: invoices })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async createSupplierInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const invoice = await SupplierInvoice.create({
        ...req.body,
        org_id: req.org_id,
        balanceRemaining: req.body.grandTotal
      })
      return res.status(201).json({ success: true, data: invoice })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  static async postInvoiceToGL(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const invoice = await SupplierInvoice.findOne({ _id: id, org_id: req.org_id })
      
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })
      if (invoice.glPosted) return res.status(400).json({ success: false, message: "Invoice already posted to GL" })

      // Fetch the GL Accounts
      await GeneralLedgerService.initializeDefaultAccounts(req.org_id)
      
      const apAccount = await Account.findOne({ org_id: req.org_id, code: "2000" }) // Accounts Payable
      const invAccount = await Account.findOne({ org_id: req.org_id, code: "1300" }) // Inventory / COGS

      if (!apAccount || !invAccount) {
        return res.status(400).json({ success: false, message: "System accounts not configured correctly" })
      }

      await GeneralLedgerService.postJournalEntry(req.org_id, {
        date: invoice.invoiceDate,
        description: `Supplier Bill: ${invoice.invoiceNumber}`,
        reference: `AP-${invoice.invoiceNumber}`,
        source: "AP_INVOICE",
        lines: [
          { accountId: String(invAccount._id), debit: invoice.grandTotal, credit: 0, description: "Inventory / Expense" },
          { accountId: String(apAccount._id), debit: 0, credit: invoice.grandTotal, description: "Accounts Payable" }
        ]
      }, req.user?.userId || "system")

      invoice.glPosted = true
      invoice.postedBy = req.user?.userId
      invoice.status = "pending_payment"
      await invoice.save()

      return res.json({ success: true, data: invoice })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  static async paySupplierInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { accountId, amount, paymentDate, reference } = req.body
      
      const invoice = await SupplierInvoice.findOne({ _id: id, org_id: req.org_id })
      if (!invoice) return res.status(404).json({ success: false, message: "Invoice not found" })
      
      const payAmount = Number(amount)
      if (payAmount <= 0) return res.status(400).json({ success: false, message: "Amount must be greater than 0" })
      if (payAmount > invoice.balanceRemaining) return res.status(400).json({ success: false, message: "Amount exceeds remaining balance" })

      const account = await CashBankAccount.findOne({ _id: accountId, org_id: req.org_id })
      if (!account) return res.status(404).json({ success: false, message: "Bank account not found" })

      // Create transaction
      await CashTransaction.create({
        org_id: req.org_id,
        accountId: account._id,
        type: "expense",
        amount: payAmount,
        date: new Date(paymentDate || Date.now()),
        reference: reference || `Payment for Bill ${invoice.invoiceNumber}`,
        description: `Supplier Payment: ${invoice.invoiceNumber}`,
        status: "cleared",
        recordedBy: req.user?.userId
      })

      // Update account balance
      account.currentBalance -= payAmount
      await account.save()

      // GL Post for Payment
      await GeneralLedgerService.initializeDefaultAccounts(req.org_id)
      const apAccount = await Account.findOne({ org_id: req.org_id, code: "2000" })
      const cashAccount = await Account.findOne({ org_id: req.org_id, name: /Cash|Bank|M-Pesa/i }) // Simplified fallback
      
      if (apAccount && cashAccount) {
        await GeneralLedgerService.postJournalEntry(req.org_id, {
          date: new Date(paymentDate || Date.now()),
          description: `Payment for Bill: ${invoice.invoiceNumber}`,
          reference: reference || `PAY-${invoice.invoiceNumber}`,
          source: "AP_PAYMENT",
          lines: [
            { accountId: String(apAccount._id), debit: payAmount, credit: 0, description: "Accounts Payable (Reduction)" },
            { accountId: String(cashAccount._id), debit: 0, credit: payAmount, description: "Cash/Bank Payment" }
          ]
        }, req.user?.userId || "system")
      }

      // Update invoice
      invoice.paidAmount = (invoice.paidAmount || 0) + payAmount
      invoice.balanceRemaining = invoice.grandTotal - invoice.paidAmount
      if (invoice.balanceRemaining <= 0) {
        invoice.status = "paid"
      } else {
        invoice.status = "partially_paid"
      }
      await invoice.save()

      return res.json({ success: true, data: invoice })
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message })
    }
  }

}