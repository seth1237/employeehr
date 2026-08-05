import mongoose, { Schema } from "mongoose"

export interface IDispatchNotification {
  _id?: string
  org_id: string
  invoiceId: string
  invoiceNumber: string
  clientName?: string
  clientNumber: string
  courierName: string
  courierContactNumber: string
  officeContactNumber: string
  message: string
  provider: "africastalking" | "websms"
  notificationType?: "dispatch" | "delivery"
  status: "queued" | "sent" | "failed"
  providerMessageId?: string
  providerRawResponse?: string
  errorMessage?: string
  attempts: number
  lastAttemptAt?: Date
  sentAt?: Date
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const dispatchNotificationSchema = new Schema<IDispatchNotification>(
  {
    org_id: { type: String, required: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true },
    clientName: { type: String },
    clientNumber: { type: String, required: true },
    courierName: { type: String, required: true },
    courierContactNumber: { type: String, required: true },
    officeContactNumber: { type: String, required: true },
    message: { type: String, required: true },
    provider: { type: String, enum: ["africastalking", "websms"], default: "websms" },
    notificationType: { type: String, enum: ["dispatch", "delivery"], default: "dispatch", index: true },
    status: { type: String, enum: ["queued", "sent", "failed"], default: "queued", index: true },
    providerMessageId: { type: String },
    providerRawResponse: { type: String },
    errorMessage: { type: String },
    attempts: { type: Number, default: 0, min: 0 },
    lastAttemptAt: { type: Date },
    sentAt: { type: Date },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

dispatchNotificationSchema.index({ org_id: 1, invoiceId: 1, createdAt: -1 })

export const DispatchNotification = mongoose.model<IDispatchNotification>(
  "DispatchNotification",
  dispatchNotificationSchema,
)
