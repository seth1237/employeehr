import type { Request, Response } from "express"
import { parseStkCallback } from "../lib/mpesaCallback"
import { StockExpense } from "../models/StockExpense"
import { applyPosMpesaCallback } from "../services/posMpesa.service"
import { applyWebsiteOrderCallback } from "../routes/websiteOrder.routes"
import { postExpenseToCashbook } from "../services/cashBankingPosting.service"

export class MpesaWebhookController {
  static async stkCallback(req: Request, res: Response) {
    try {
      const callbackToken = String(process.env.MPESA_CALLBACK_TOKEN || "").trim()
      const providedToken = String(req.headers["x-callback-token"] || req.query.token || req.body?.token || "").trim()

      if (callbackToken && callbackToken !== providedToken) {
        return res.status(403).json({ ResultCode: 1, ResultDesc: "Invalid callback token" })
      }

      const parsed = parseStkCallback(req.body)

      if (!parsed.checkoutRequestId) {
        console.warn("[mpesa-callback] Missing CheckoutRequestID", { payload: req.body })
        return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" })
      }

      const posPayment = await applyPosMpesaCallback(parsed)
      const websiteOrder = await applyWebsiteOrderCallback(parsed)
      const expense = await StockExpense.findOne({ mpesaCheckoutRequestId: parsed.checkoutRequestId })

      if (!posPayment && !expense && !websiteOrder) {
        console.warn("[mpesa-callback] Payment not found", {
          checkoutRequestId: parsed.checkoutRequestId,
          merchantRequestId: parsed.merchantRequestId,
        })
        return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" })
      }

      if (expense) {
        const isSuccess = parsed.resultCode === 0
        expense.status = isSuccess ? "completed" : "failed"
        expense.responseMessage = parsed.resultDesc || (isSuccess ? "Payment completed" : "Payment failed")

        if (parsed.mpesaReceiptNumber) {
          expense.mpesaReceiptNumber = parsed.mpesaReceiptNumber
        }

        if (parsed.merchantRequestId) {
          expense.mpesaMerchantRequestId = parsed.merchantRequestId
        }

        await expense.save()

        if (isSuccess) {
          await postExpenseToCashbook({
            orgId: String(expense.org_id),
            userId: String(expense.initiatedBy || "mpesa-webhook"),
            expense,
          })
        }
      }

      console.log("[mpesa-callback] Processed", {
        posPaymentId: posPayment ? String(posPayment._id) : undefined,
        expenseId: expense ? String(expense._id) : undefined,
        checkoutRequestId: parsed.checkoutRequestId,
        resultCode: parsed.resultCode,
        resultDesc: parsed.resultDesc,
      })

      return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" })
    } catch (error: any) {
      console.error("[mpesa-callback] Failed", {
        error: error?.message,
        payload: req.body,
      })
      return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" })
    }
  }
}
