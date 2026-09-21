import mongoose, { Schema } from "mongoose"

interface IEmailRecipient {
  key: string
  name: string
  email: string
  location?: string
  contactName?: string
  contactRole?: string
  status: "sent" | "delivered" | "failed" | "skipped" | "opened" | "clicked" | "bounced"
  skipReason?: "duplicate" | "invalid_email" | "other"
  duplicateOfKey?: string
  duplicateOfName?: string
  providerMessageId?: string
  providerRawResponse?: string
  errorMessage?: string
  sentAt?: Date
  deliveredAt?: Date
  openedAt?: Date
  clickedAt?: Date
  clickCount?: number
  clickedUrls?: string[]
}

export interface IEmailCampaign {
  _id?: string
  org_id: string
  name: string
  subject: string
  htmlBody: string
  blocks?: any[]
  templateId?: string
  filters?: Record<string, any>
  audienceCount: number
  sentCount: number
  deliveredCount?: number
  openedCount?: number
  clickedCount?: number
  uniqueClickedCount?: number
  linkClicks?: Array<{ url: string; clicks: number }>
  bouncedCount?: number
  failedCount: number
  skippedCount: number
  duplicateCount?: number
  status: "draft" | "scheduled" | "sending" | "completed" | "completed_with_errors" | "failed"
  recipients: IEmailRecipient[]
  createdBy: string
  scheduledAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

const emailRecipientSchema = new Schema<IEmailRecipient>(
  {
    key: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    location: { type: String },
    contactName: { type: String },
    contactRole: { type: String },
    status: {
      type: String,
      enum: ["sent", "delivered", "failed", "skipped", "opened", "clicked", "bounced"],
      required: true,
    },
    skipReason: { type: String, enum: ["duplicate", "invalid_email", "other"] },
    duplicateOfKey: { type: String },
    duplicateOfName: { type: String },
    providerMessageId: { type: String, index: true },
    providerRawResponse: { type: String },
    errorMessage: { type: String },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    openedAt: { type: Date },
    clickedAt: { type: Date },
    clickCount: { type: Number, default: 0, min: 0 },
    clickedUrls: { type: [String], default: [] },
  },
  { _id: false },
)

const emailCampaignSchema = new Schema<IEmailCampaign>(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    subject: { type: String, required: true },
    htmlBody: { type: String, required: true },
    blocks: { type: Schema.Types.Mixed, default: [] },
    templateId: { type: String },
    filters: { type: Schema.Types.Mixed },
    audienceCount: { type: Number, default: 0, min: 0 },
    sentCount: { type: Number, default: 0, min: 0 },
    deliveredCount: { type: Number, default: 0, min: 0 },
    openedCount: { type: Number, default: 0, min: 0 },
    clickedCount: { type: Number, default: 0, min: 0 },
    uniqueClickedCount: { type: Number, default: 0, min: 0 },
    linkClicks: {
      type: [
        {
          url: { type: String, required: true },
          clicks: { type: Number, default: 0, min: 0 },
        },
      ],
      default: [],
    },
    bouncedCount: { type: Number, default: 0, min: 0 },
    failedCount: { type: Number, default: 0, min: 0 },
    skippedCount: { type: Number, default: 0, min: 0 },
    duplicateCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "completed", "completed_with_errors", "failed"],
      default: "draft",
      index: true,
    },
    recipients: { type: [emailRecipientSchema], default: [] },
    createdBy: { type: String, required: true },
    scheduledAt: { type: Date },
  },
  { timestamps: true },
)

emailCampaignSchema.index({ org_id: 1, createdAt: -1 })
emailCampaignSchema.index({ "recipients.providerMessageId": 1 })
emailCampaignSchema.index({ "recipients.email": 1 })

export const EmailCampaign = mongoose.model<IEmailCampaign>(
  "EmailCampaign",
  emailCampaignSchema,
)