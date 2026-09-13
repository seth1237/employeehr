import { Response } from "express"
import { AuthenticatedRequest } from "../../middleware/auth"
import { SupplierPayment } from "../../models/SupplierPayment"
import { SupplierInvoice } from "../../models/SupplierInvoice"
import { DepartmentBudget } from "../../models/DepartmentBudget"
import { GeneralLedgerService } from "../../services/GeneralLedgerService" // Integration with core Finance module

export class PaymentController {
  
  static async getPayments(req: AuthenticatedRequest, res: Response) {
    try {
      const payments = await SupplierPayment.find({ org_id: req.org_id }).sort({ createdAt: -1 })
      return res.json({ success: true, data: payments })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  static async getPaymentById(req: AuthenticatedRequest, res: Response) {
    try {
      const payment = await SupplierPayment.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!payment) return res.status(404).json({ success: false, message: "Payment not found" })
      return res.json({ success: true, data: payment })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Create a payment voucher (Draft state)
  static async createPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const count = await SupplierPayment.countDocuments({ org_id: req.org_id })
      const paymentNumber = `PAY-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`

      const payment = await SupplierPayment.create({
        ...req.body,
        org_id: req.org_id,
        paymentNumber,
        createdBy: req.user?._id,
        status: "draft"
      })

      return res.status(201).json({ success: true, data: payment })
    } catch (error: any) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: "Payment number collision." })
      }
      return res.status(400).json({ success: false, message: error.message })
    }
  }

  // Finalize payment, update invoices, and hit General Ledger
  static async processPayment(req: AuthenticatedRequest, res: Response) {
    try {
      const payment = await SupplierPayment.findOne({ _id: req.params.id, org_id: req.org_id })
      if (!payment) return res.status(404).json({ success: false, message: "Payment not found" })

      if (payment.status !== "draft" && payment.status !== "approved") {
        return res.status(400).json({ success: false, message: "Payment is already processed or cancelled" })
      }

      // Step 1: Update the related Supplier Invoices
      let totalApplied = 0
      
      for (const invoiceId of payment.invoiceIds) {
        const invoice = await SupplierInvoice.findOne({ _id: invoiceId, org_id: req.org_id })
        if (invoice && invoice.balanceRemaining > 0) {
          // Simplistic application: we apply the payment amount down the line until exhausted
          const amountToApply = Math.min(invoice.balanceRemaining, payment.amount - totalApplied)
          if (amountToApply <= 0) break

          invoice.paidAmount += amountToApply
          invoice.balanceRemaining -= amountToApply
          
          if (invoice.balanceRemaining <= 0) {
            invoice.status = "paid"
          } else {
            invoice.status = "partially_paid"
          }
          
          await invoice.save()
          totalApplied += amountToApply
        }
      }

      // Step 2: Post to General Ledger (Accounts Payable vs Cash/Bank)
      if (payment.bankAccountId && req.body.apAccountId) {
        try {
          await GeneralLedgerService.postJournalEntry({
            org_id: req.org_id,
            date: payment.paymentDate,
            description: `Supplier Payment ${payment.paymentNumber}`,
            reference: payment._id as string,
            referenceModel: "SupplierPayment",
            entries: [
              { accountId: req.body.apAccountId, type: "debit", amount: payment.amount, description: "Decrease AP" },
              { accountId: payment.bankAccountId, type: "credit", amount: payment.amount, description: "Decrease Bank" }
            ],
            postedBy: req.user?._id || "system"
          })
          payment.glPosted = true
        } catch (glError: any) {
          console.error("GL Posting failed during payment:", glError)
          // We don't fail the payment entirely, but we leave glPosted=false so it can be retried
        }
      }

      payment.status = "processed"
      payment.approvedBy = req.user?._id // The person executing the process
      await payment.save()

      return res.json({ success: true, data: payment })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }
}
