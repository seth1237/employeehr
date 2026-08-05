import mongoose, { Schema } from "mongoose"

// Suggestion Schema
const suggestionSchema = new Schema(
  {
    org_id: { type: String, required: true },
    user_id: { type: String }, // Optional for anonymous suggestions
    is_anonymous: { type: Boolean, default: false },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ["workplace", "culture", "process", "benefits", "technology", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["submitted", "under_review", "approved", "implemented", "rejected"],
      default: "submitted",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    upvotes: { type: Number, default: 0 },
    upvoted_by: [{ type: String }], // Array of user IDs who upvoted
    admin_response: { type: String },
    responded_by: { type: String },
    responded_at: { type: Date },
  },
  { timestamps: true }
)

suggestionSchema.index({ org_id: 1, status: 1 })
suggestionSchema.index({ org_id: 1, user_id: 1 })

export const Suggestion = mongoose.model("Suggestion", suggestionSchema)
