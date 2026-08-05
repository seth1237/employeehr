import type { Request, Response } from "express"
import { DispatchNotification } from "../models/DispatchNotification"

const SUCCESS_KEYWORDS = ["success", "sent", "delivered", "queued"]

const readField = (body: any, keys: string[]) => {
  for (const key of keys) {
    const value = body?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim()
    }
  }
  return ""
}

const toNotificationStatus = (providerStatus: string): "sent" | "failed" => {
  const status = String(providerStatus || "").toLowerCase()
  return SUCCESS_KEYWORDS.some((keyword) => status.includes(keyword)) ? "sent" : "failed"
}

export class SmsWebhookController {
  static async deliveryReport(req: Request, res: Response) {
    try {
      const callbackToken = String(process.env.AFRICASTALKING_CALLBACK_TOKEN || "").trim()
      const providedToken = String(req.headers["x-callback-token"] || req.query.token || req.body?.token || "").trim()

      if (callbackToken && providedToken !== callbackToken) {
        return res.status(403).json({ success: false, message: "Invalid callback token" })
      }

      const providerMessageId = readField(req.body, ["messageId", "id", "message_id"])
      const phoneNumber = readField(req.body, ["phoneNumber", "phone", "to", "number"])
      const providerStatus = readField(req.body, ["status", "deliveryStatus", "delivery_status", "messageStatus"]) || "unknown"
      const failureReason = readField(req.body, ["failureReason", "failure_reason", "errorMessage", "error"])

      let notification = null

      if (providerMessageId) {
        notification = await DispatchNotification.findOne({ providerMessageId }).sort({ createdAt: -1 })
      }

      if (!notification && phoneNumber) {
        notification = await DispatchNotification.findOne({ clientNumber: phoneNumber }).sort({ createdAt: -1 })
      }

      if (!notification) {
        console.warn("[sms-dlr] Notification not found for callback", {
          providerMessageId,
          phoneNumber,
          providerStatus,
          payload: req.body,
        })

        return res.status(200).json({ success: true, message: "Callback received (notification not matched)" })
      }

      const mappedStatus = toNotificationStatus(providerStatus)
      const now = new Date()

      notification.status = mappedStatus
      notification.lastAttemptAt = now
      if (mappedStatus === "sent" && !notification.sentAt) {
        notification.sentAt = now
      }

      notification.providerRawResponse = JSON.stringify(req.body || {})
      notification.errorMessage = mappedStatus === "failed"
        ? (failureReason || providerStatus || "Delivery failed")
        : undefined

      await notification.save()

      return res.status(200).json({ success: true, message: "Delivery report processed" })
    } catch (error: any) {
      console.error("[sms-dlr] Failed to process callback", {
        error: error?.message,
        payload: req.body,
      })
      return res.status(200).json({ success: true, message: "Callback received" })
    }
  }
}
