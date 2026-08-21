import type { Request, Response } from "express"
import { DispatchNotification } from "../models/DispatchNotification"
import { BulkSmsCampaign } from "../models/BulkSmsCampaign"
import { smsService } from "../services/sms.service"

const readField = (source: any, keys: string[]) => {
  for (const key of keys) {
    const value = source?.[key]
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim()
    }
  }
  return ""
}

/** Merge query + body so Onfon GET and Africa's Talking POST both work. */
function readPayload(req: Request) {
  return {
    ...(typeof req.query === "object" ? req.query : {}),
    ...(typeof req.body === "object" && req.body ? req.body : {}),
  }
}

type DeliveryOutcome = "delivered" | "failed" | "pending"

function mapProviderStatus(providerStatus: string): DeliveryOutcome {
  const status = String(providerStatus || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")

  if (
    !status ||
    status === "unknown" ||
    status.includes("accept") ||
    status.includes("enroute") ||
    status.includes("buffer") ||
    status.includes("pending") ||
    status.includes("queued") ||
    status.includes("submitted") ||
    status === "sent"
  ) {
    return "pending"
  }

  if (
    status.includes("delivrd") ||
    status.includes("delivered") ||
    status === "success" ||
    status === "ok"
  ) {
    return "delivered"
  }

  return "failed"
}

function recountCampaign(recipients: Array<{ status?: string; skipReason?: string }>) {
  const sentCount = recipients.filter((r) => r.status === "sent").length
  const deliveredCount = recipients.filter((r) => r.status === "delivered").length
  const failedCount = recipients.filter((r) => r.status === "failed").length
  const skippedCount = recipients.filter((r) => r.status === "skipped").length
  const duplicateCount = recipients.filter(
    (r) => r.status === "skipped" && r.skipReason === "duplicate",
  ).length

  return {
    sentCount,
    deliveredCount,
    failedCount,
    skippedCount,
    duplicateCount,
    status:
      failedCount > 0
        ? sentCount + deliveredCount > 0
          ? ("completed_with_errors" as const)
          : ("failed" as const)
        : ("completed" as const),
  }
}

async function updateBulkSmsFromDlr(params: {
  providerMessageId: string
  phoneNumber: string
  outcome: DeliveryOutcome
  providerStatus: string
  failureReason: string
  rawPayload: any
}) {
  const { providerMessageId, phoneNumber, outcome, providerStatus, failureReason, rawPayload } =
    params

  if (outcome === "pending") {
    return { matched: false, reason: "pending_status" as const }
  }

  const normalizedPhone = phoneNumber ? smsService.normalizePhone(phoneNumber) : ""

  let campaign = null as Awaited<ReturnType<typeof BulkSmsCampaign.findOne>>

  if (providerMessageId) {
    campaign = await BulkSmsCampaign.findOne({
      "recipients.providerMessageId": providerMessageId,
    }).sort({ createdAt: -1 })
  }

  if (!campaign && normalizedPhone) {
    campaign = await BulkSmsCampaign.findOne({
      $or: [
        { "recipients.normalizedPhone": normalizedPhone },
        { "recipients.phone": phoneNumber },
      ],
      "recipients.status": { $in: ["sent", "delivered", "failed"] },
    }).sort({ createdAt: -1 })
  }

  if (!campaign) {
    return { matched: false, reason: "campaign_not_found" as const }
  }

  const recipients = Array.isArray(campaign.recipients) ? [...campaign.recipients] : []
  let index = -1

  if (providerMessageId) {
    index = recipients.findIndex(
      (recipient) => String(recipient.providerMessageId || "") === providerMessageId,
    )
  }

  if (index < 0 && normalizedPhone) {
    // Prefer an open "sent" row for this number on the latest matching campaign
    index = recipients.findIndex(
      (recipient) =>
        recipient.status === "sent" &&
        (String(recipient.normalizedPhone || "") === normalizedPhone ||
          smsService.normalizePhone(recipient.phone) === normalizedPhone),
    )
  }

  if (index < 0) {
    return { matched: false, reason: "recipient_not_found" as const }
  }

  const recipient = recipients[index] as any
  // Don't downgrade a delivered message
  if (recipient.status === "delivered" && outcome === "failed") {
    return { matched: true, reason: "already_delivered" as const }
  }
  if (recipient.status === outcome) {
    return { matched: true, reason: "unchanged" as const }
  }

  const now = new Date()
  recipient.status = outcome
  recipient.providerRawResponse = JSON.stringify(rawPayload || {})
  if (outcome === "delivered") {
    recipient.deliveredAt = now
    recipient.errorMessage = undefined
    if (!recipient.sentAt) recipient.sentAt = now
  } else {
    recipient.errorMessage =
      failureReason || providerStatus || "Delivery failed"
  }
  recipients[index] = recipient

  const counts = recountCampaign(recipients)
  campaign.recipients = recipients as any
  campaign.sentCount = counts.sentCount
  campaign.deliveredCount = counts.deliveredCount
  campaign.failedCount = counts.failedCount
  campaign.skippedCount = counts.skippedCount
  campaign.duplicateCount = counts.duplicateCount
  campaign.status = counts.status
  await campaign.save()

  return { matched: true, reason: "updated" as const, campaignId: String(campaign._id) }
}

async function updateDispatchNotificationFromDlr(params: {
  providerMessageId: string
  phoneNumber: string
  outcome: DeliveryOutcome
  providerStatus: string
  failureReason: string
  rawPayload: any
}) {
  const { providerMessageId, phoneNumber, outcome, providerStatus, failureReason, rawPayload } =
    params

  let notification = null

  if (providerMessageId) {
    notification = await DispatchNotification.findOne({ providerMessageId }).sort({
      createdAt: -1,
    })
  }

  if (!notification && phoneNumber) {
    notification = await DispatchNotification.findOne({ clientNumber: phoneNumber }).sort({
      createdAt: -1,
    })
  }

  if (!notification) {
    return { matched: false }
  }

  const now = new Date()
  // DispatchNotification schema only allows queued | sent | failed
  const mappedStatus = outcome === "failed" ? "failed" : "sent"
  notification.status = mappedStatus
  notification.lastAttemptAt = now
  if (mappedStatus === "sent" && !notification.sentAt) {
    notification.sentAt = now
  }
  notification.providerRawResponse = JSON.stringify(rawPayload || {})
  notification.errorMessage =
    mappedStatus === "failed"
      ? failureReason || providerStatus || "Delivery failed"
      : undefined
  await notification.save()

  return { matched: true }
}

export class SmsWebhookController {
  static async deliveryReport(req: Request, res: Response) {
    try {
      const payload = readPayload(req)
      const callbackToken = String(
        process.env.SMS_DLR_CALLBACK_TOKEN ||
          process.env.WEBSMS_CALLBACK_TOKEN ||
          process.env.AFRICASTALKING_CALLBACK_TOKEN ||
          "",
      ).trim()
      const providedToken = String(
        req.headers["x-callback-token"] ||
          req.query.token ||
          (payload as any)?.token ||
          "",
      ).trim()

      if (callbackToken && providedToken !== callbackToken) {
        return res.status(403).json({ success: false, message: "Invalid callback token" })
      }

      const providerMessageId = readField(payload, [
        "MessageId",
        "messageId",
        "message_id",
        "id",
        "msgid",
        "MsgId",
      ])
      const phoneNumber = readField(payload, [
        "mobile",
        "Mobile",
        "Number",
        "number",
        "phoneNumber",
        "phone",
        "to",
        "msisdn",
      ])
      const providerStatus =
        readField(payload, [
          "status",
          "Status",
          "deliveryStatus",
          "delivery_status",
          "messageStatus",
          "MessageStatus",
        ]) || "unknown"
      const failureReason = readField(payload, [
        "failureReason",
        "failure_reason",
        "errorMessage",
        "error",
        "errorCode",
        "ErrorCode",
        "ErrorDescription",
      ])

      const outcome = mapProviderStatus(providerStatus)

      const bulkResult = await updateBulkSmsFromDlr({
        providerMessageId,
        phoneNumber,
        outcome,
        providerStatus,
        failureReason,
        rawPayload: payload,
      })

      const dispatchResult = await updateDispatchNotificationFromDlr({
        providerMessageId,
        phoneNumber,
        outcome,
        providerStatus,
        failureReason,
        rawPayload: payload,
      })

      if (!bulkResult.matched && !dispatchResult.matched) {
        console.warn("[sms-dlr] Notification not matched", {
          providerMessageId,
          phoneNumber,
          providerStatus,
          outcome,
          payload,
        })
      } else {
        console.log("[sms-dlr] Processed", {
          providerMessageId,
          phoneNumber,
          providerStatus,
          outcome,
          bulk: bulkResult,
          dispatch: dispatchResult.matched,
        })
      }

      // Onfon expects a fast 200 OK
      return res.status(200).json({
        success: true,
        message: "Delivery report processed",
        data: {
          outcome,
          bulkSms: bulkResult,
          dispatch: dispatchResult.matched,
        },
      })
    } catch (error: any) {
      console.error("[sms-dlr] Failed to process callback", {
        error: error?.message,
        query: req.query,
        body: req.body,
      })
      // Still 200 so the provider does not keep retrying forever on our bugs
      return res.status(200).json({ success: true, message: "Callback received" })
    }
  }
}
