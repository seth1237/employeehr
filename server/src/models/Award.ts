import mongoose, { Schema } from "mongoose"
import type { IAward, IAwardNomination } from "../types/interfaces"

const awardSchema = new Schema<IAward>(
  {
    org_id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: ["monthly", "quarterly", "yearly", "special", "recognition"],
      default: "monthly",
    },
    criteria: { type: String },
    icon: { type: String },
  },
  { timestamps: true },
)

awardSchema.index({ org_id: 1 })

export const Award = mongoose.model<IAward>("Award", awardSchema)

const awardNominationSchema = new Schema<IAwardNomination>(
  {
    org_id: { type: String, required: true },
    award_id: { type: String, required: true },
    user_id: { type: String, required: true },
    nominator_id: { type: String },
    period: { type: String, required: true },
    score: { type: Number, required: true },
    reason: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    certificate_url: { type: String },
  },
  { timestamps: true },
)

awardNominationSchema.index({ org_id: 1, user_id: 1 })

export const AwardNomination = mongoose.model<IAwardNomination>("AwardNomination", awardNominationSchema)
