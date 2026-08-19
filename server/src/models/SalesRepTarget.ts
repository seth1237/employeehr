import mongoose from "mongoose"

const SalesRepTargetSchema = new mongoose.Schema(
  {
    org_id: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    weeklyAmount: { type: Number, default: 0, min: 0 },
    monthlyAmount: { type: Number, default: 0, min: 0 },
    quarterlyAmount: { type: Number, default: 0, min: 0 },
    setBy: { type: String },
  },
  { timestamps: true },
)

SalesRepTargetSchema.index({ org_id: 1, userId: 1 }, { unique: true })

export const SalesRepTarget =
  mongoose.models.SalesRepTarget || mongoose.model("SalesRepTarget", SalesRepTargetSchema)
