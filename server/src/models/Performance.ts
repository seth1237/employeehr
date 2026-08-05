import mongoose, { Schema } from "mongoose"
import type { IPerformance } from "../types/interfaces"

const performanceSchema = new Schema<IPerformance>(
  {
    org_id: { type: String, required: true },
    user_id: { type: String, required: true },
    period: { type: String, required: true },
    kpi_scores: [
      {
        kpi_id: { type: String, required: true },
        score: { type: Number, required: true },
        achieved: { type: Number },
        target: { type: Number },
      },
    ],
    overall_score: { type: Number, default: 0 },
    attendance_score: { type: Number, default: 0 },
    feedback_score: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "completed", "reviewed"],
      default: "pending",
    },
    reviewed_by: { type: String },
    reviewedAt: { type: Date },
  },
  { timestamps: true },
)

performanceSchema.index({ org_id: 1, user_id: 1 })

export const Performance = mongoose.model<IPerformance>("Performance", performanceSchema)
