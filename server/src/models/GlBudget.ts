import mongoose, { Schema, Document } from "mongoose"

export interface IGlBudgetLine {
  accountId: string
  accountCode?: string
  accountName?: string
  month: number
  amount: number
}

export interface IGlBudget extends Document {
  org_id: string
  year: number
  name: string
  status: "draft" | "approved"
  currency: string
  lines: IGlBudgetLine[]
  createdBy: string
}

const glBudgetSchema = new Schema<IGlBudget>(
  {
    org_id: { type: String, required: true, index: true },
    year: { type: Number, required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ["draft", "approved"], default: "draft" },
    currency: { type: String, default: "KES" },
    lines: [
      {
        accountId: { type: String, required: true },
        accountCode: { type: String },
        accountName: { type: String },
        month: { type: Number, required: true, min: 1, max: 12 },
        amount: { type: Number, required: true, default: 0 },
      },
    ],
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

glBudgetSchema.index({ org_id: 1, year: 1, name: 1 }, { unique: true })

export const GlBudget = mongoose.model<IGlBudget>("GlBudget", glBudgetSchema)
