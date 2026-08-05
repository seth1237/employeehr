import mongoose, { Schema } from "mongoose"
import type { IFeedback } from "../types/interfaces"

const feedbackSchema = new Schema<IFeedback>(
  {
    org_id: { type: String, required: true },
    from_user_id: { type: String, required: true },
    to_user_id: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    type: {
      type: String,
      enum: ["general", "praise", "constructive", "recognition"],
      default: "general",
    },
    feedback_text: { type: String, required: true },
    isAnonymous: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "delivered"],
      default: "delivered",
    },
  },
  { timestamps: true },
)

feedbackSchema.index({ org_id: 1, to_user_id: 1 })

export const Feedback = mongoose.model<IFeedback>("Feedback", feedbackSchema)
