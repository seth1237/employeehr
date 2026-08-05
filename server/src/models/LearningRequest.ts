import mongoose, { Schema } from "mongoose"
import type { ILearningRequest } from "../types/interfaces"

const learningRequestSchema = new Schema<ILearningRequest>(
  {
    org_id: { type: String, required: true, index: true },
    user_id: { type: String, required: true },
    course_name: { type: String, required: true },
    description: { type: String },
    budget_required: { type: Number, required: true },
    target_date: { type: Date, required: true },
    linked_pdp_goal: { type: String },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    approved_by: { type: String },
    approval_comments: { type: String },
    completion_certificate: { type: String },
  },
  { timestamps: true },
)

learningRequestSchema.index({ org_id: 1, user_id: 1 })

export const LearningRequest = mongoose.model<ILearningRequest>("LearningRequest", learningRequestSchema)
