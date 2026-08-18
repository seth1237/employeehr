import mongoose, { Schema, Document } from "mongoose"

export type SalesActivityType = "call" | "note" | "follow_up"
export type SalesCallOutcome =
  | "answered"
  | "no_answer"
  | "busy"
  | "voicemail"
  | "quote requested"
  | "follow-up needed"
  | "no interest"
  | "information only"

export interface ISalesClientActivity extends Document {
  org_id: string
  userId: string
  customer_id?: string
  clientName: string
  clientPhone?: string
  type: SalesActivityType
  purpose?: string
  outcome?: SalesCallOutcome
  notes?: string
  followUpDate?: Date
  durationSeconds?: number
  createdAt: Date
  updatedAt: Date
}

const salesClientActivitySchema = new Schema<ISalesClientActivity>(
  {
    org_id: { type: String, required: true },
    userId: { type: String, required: true },
    customer_id: { type: String, index: true },
    clientName: { type: String, required: true },
    clientPhone: { type: String },
    type: {
      type: String,
      enum: ["call", "note", "follow_up"],
      required: true,
    },
    purpose: { type: String },
    outcome: { type: String },
    notes: { type: String },
    followUpDate: { type: Date },
    durationSeconds: { type: Number },
  },
  { timestamps: true },
)

salesClientActivitySchema.index({ org_id: 1, userId: 1, createdAt: -1 })
salesClientActivitySchema.index({ org_id: 1, customer_id: 1, createdAt: -1 })

export const SalesClientActivity = mongoose.model<ISalesClientActivity>(
  "SalesClientActivity",
  salesClientActivitySchema,
)
