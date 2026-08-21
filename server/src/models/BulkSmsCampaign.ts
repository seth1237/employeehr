import mongoose, { Schema } from "mongoose"

interface IBulkSmsRecipient {
  key: string
  name: string
  phone: string
  normalizedPhone?: string
  location?: string
  status: "sent" | "delivered" | "failed" | "skipped"
  skipReason?: "duplicate" | "invalid_phone" | "other"
  duplicateOfKey?: string
  duplicateOfName?: string
  providerMessageId?: string
  providerRawResponse?: string
  errorMessage?: string
  sentAt?: Date
  deliveredAt?: Date
}

export interface IBulkSmsCampaign {
  _id?: string
  org_id: string
  name: string
  message: string
  filters?: Record<string, any>
  audienceCount: number
  sentCount: number
  deliveredCount?: number
  failedCount: number
  skippedCount: number
  duplicateCount?: number
  status: "completed" | "completed_with_errors" | "failed"
  recipients: IBulkSmsRecipient[]
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const bulkSmsRecipientSchema = new Schema<IBulkSmsRecipient>(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    normalizedPhone: { type: String },
    location: { type: String },
    status: {
      type: String,
      enum: ["sent", "delivered", "failed", "skipped"],
      required: true,
    },
    skipReason: { type: String, enum: ["duplicate", "invalid_phone", "other"] },
    duplicateOfKey: { type: String },
    duplicateOfName: { type: String },
    providerMessageId: { type: String, index: true },
    providerRawResponse: { type: String },
    errorMessage: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
  },
  { _id: false },
)

const bulkSmsCampaignSchema = new Schema<IBulkSmsCampaign>(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    message: { type: String, required: true },
    filters: { type: Schema.Types.Mixed },
    audienceCount: { type: Number, default: 0, min: 0 },
    sentCount: { type: Number, default: 0, min: 0 },
    deliveredCount: { type: Number, default: 0, min: 0 },
    failedCount: { type: Number, default: 0, min: 0 },
    skippedCount: { type: Number, default: 0, min: 0 },
    duplicateCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["completed", "completed_with_errors", "failed"],
      default: "completed",
      index: true,
    },
    recipients: { type: [bulkSmsRecipientSchema], default: [] },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

bulkSmsCampaignSchema.index({ org_id: 1, createdAt: -1 })
bulkSmsCampaignSchema.index({ "recipients.providerMessageId": 1 })
bulkSmsCampaignSchema.index({ "recipients.normalizedPhone": 1 })

export const BulkSmsCampaign = mongoose.model<IBulkSmsCampaign>(
  "BulkSmsCampaign",
  bulkSmsCampaignSchema,
)
