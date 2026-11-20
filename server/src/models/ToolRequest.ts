import mongoose, { Schema } from "mongoose"

export interface IToolRequest {
  _id?: string
  org_id: string
  requesterId: string
  requesterName: string
  itemName: string
  category: "equipment" | "tools" | "ppe" | "parts" | "vehicle" | "other"
  quantity: number
  reason: string
  neededBy?: Date
  status: "pending" | "approved" | "rejected" | "issued"
  adminComment?: string
  reviewedBy?: string
  reviewedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

const toolRequestSchema = new Schema<IToolRequest>(
  {
    org_id: { type: String, required: true, index: true },
    requesterId: { type: String, required: true, index: true },
    requesterName: { type: String, required: true },
    itemName: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ["equipment", "tools", "ppe", "parts", "vehicle", "other"],
      default: "tools",
    },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    reason: { type: String, required: true, trim: true },
    neededBy: { type: Date },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "issued"],
      default: "pending",
      index: true,
    },
    adminComment: { type: String },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
)

toolRequestSchema.index({ org_id: 1, requesterId: 1, createdAt: -1 })

export const ToolRequest = mongoose.model<IToolRequest>("ToolRequest", toolRequestSchema)
