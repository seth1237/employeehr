import mongoose, { Schema, Document } from "mongoose"

export interface ILead extends Document {
  org_id: string
  customer_id: string // reference to Customer
  title: string
  stage: "New" | "Contacted" | "Interested" | "Follow-up" | "Quotation Sent" | "Negotiation" | "Won" | "Lost"
  source?: string
  owner_id: string // assigned user
  value?: number
  expectedCloseDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const leadSchema = new Schema<ILead>(
  {
    org_id: { type: String, required: true },
    customer_id: { type: String, required: true, ref: "Customer" },
    title: { type: String, required: true },
    stage: {
      type: String,
      enum: ["New", "Contacted", "Interested", "Follow-up", "Quotation Sent", "Negotiation", "Won", "Lost"],
      default: "New"
    },
    source: { type: String },
    owner_id: { type: String, required: true },
    value: { type: Number, default: 0 },
    expectedCloseDate: { type: Date },
    notes: { type: String }
  },
  { timestamps: true }
)

leadSchema.index({ org_id: 1 })
leadSchema.index({ owner_id: 1 })
leadSchema.index({ customer_id: 1 })

export const Lead = mongoose.model<ILead>("Lead", leadSchema)
