import mongoose, { Schema } from "mongoose"
import type { Document } from "mongoose"

export interface IReport extends Document {
  org_id: mongoose.Types.ObjectId
  user_id: mongoose.Types.ObjectId
  type: "daily" | "weekly" | "monthly" | "quarterly" | "annual"
  title: string
  content: string
  status: "draft" | "submitted" | "approved" | "rejected"
  submitted_at?: Date
  approved_at?: Date
  approved_by?: mongoose.Types.ObjectId
  rejection_reason?: string
  attachments?: string[]
  tags?: string[]
  based_on_reports?: mongoose.Types.ObjectId[]
  created_at?: Date
  updated_at?: Date
}

const reportSchema = new Schema<IReport>(
  {
    org_id: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["daily", "weekly", "monthly", "quarterly", "annual"],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
      index: true,
    },
    submitted_at: {
      type: Date,
      index: true,
    },
    approved_at: Date,
    approved_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    rejection_reason: String,
    attachments: [String],
    tags: [String],
    based_on_reports: [
      {
        type: Schema.Types.ObjectId,
        ref: "Report",
      },
    ],
  },
  { timestamps: true }
)

// Indexes for efficient queries
reportSchema.index({ org_id: 1, user_id: 1, type: 1 })
reportSchema.index({ org_id: 1, type: 1, status: 1 })
reportSchema.index({ org_id: 1, submitted_at: -1 })

export const Report = mongoose.model<IReport>("Report", reportSchema)
