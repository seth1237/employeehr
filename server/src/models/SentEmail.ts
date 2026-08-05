import { Schema, model, Document } from "mongoose"

export interface ISentEmail extends Document {
  org_id: string
  job_id: string
  sender_id: string
  subject: string
  body: string
  recipient_count: number
  sent_count: number
  failed_count: number
  failed_emails?: string[]
  recipient_emails: string[]
  include_notes: boolean
  created_at: Date
}

const sentEmailSchema = new Schema<ISentEmail>(
  {
    org_id: { type: String, required: true },
    job_id: { type: String, required: true },
    sender_id: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    recipient_count: { type: Number, required: true },
    sent_count: { type: Number, required: true },
    failed_count: { type: Number, required: true },
    failed_emails: [{ type: String }],
    recipient_emails: [{ type: String }],
    include_notes: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
)

// Indexes for fast lookups
sentEmailSchema.index({ org_id: 1, created_at: -1 })
sentEmailSchema.index({ job_id: 1 })
sentEmailSchema.index({ sender_id: 1 })

export default model<ISentEmail>("SentEmail", sentEmailSchema)
