import type { Request, Response } from "express"
import { StockExpense } from "../models/StockExpense"

function parseStkCallback(body: any) {
  const stkCallback = body?.Body?.stkCallback
  const merchantRequestId = String(stkCallback?.MerchantRequestID || "").trim()
  const checkoutRequestId = String(stkCallback?.CheckoutRequestID || "").trim()
  const resultCode = Number(stkCallback?.ResultCode)
  const resultDesc = String(stkCallback?.ResultDesc || "").trim()

  const items = Array.isArray(stkCallback?.CallbackMetadata?.Item)
    ? stkCallback.CallbackMetadata.Item
    : []

  const findValue = (name: string) => items.find((item: any) => item?.Name === name)?.Value

  const mpesaReceiptNumber = String(findValue("MpesaReceiptNumber") || "").trim()

  return {
    merchantRequestId,
    checkoutRequestId,
    resultCode,
    resultDesc,
    mpesaReceiptNumber,
    rawPayload: body,
  }
}

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

      const expense = await StockExpense.findOne({ mpesaCheckoutRequestId: parsed.checkoutRequestId })

      if (!expense) {
        console.warn("[mpesa-callback] Expense not found", {
          checkoutRequestId: parsed.checkoutRequestId,
          merchantRequestId: parsed.merchantRequestId,
        })
        return res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" })
      }

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

      console.log("[mpesa-callback] Processed", {
        expenseId: String(expense._id),
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
