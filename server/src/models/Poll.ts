import mongoose, { Schema } from "mongoose"

// Poll/Voting Schema
const pollSchema = new Schema(
  {
    org_id: { type: String, required: true },
    created_by: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    poll_type: {
      type: String,
      enum: ["employee_of_month", "policy_change", "event_date", "general", "department"],
      required: true,
    },
    is_anonymous: { type: Boolean, default: false },
    department_specific: { type: String }, // Optional: limit to specific department
    options: [
      {
        text: { type: String, required: true },
        votes: { type: Number, default: 0 },
        voted_by: [{ type: String }], // User IDs (only stored if not anonymous)
      },
    ],
    start_date: { type: Date, default: Date.now },
    end_date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["draft", "active", "closed", "cancelled"],
      default: "draft",
    },
    allow_multiple_votes: { type: Boolean, default: false },
    max_votes_per_user: { type: Number, default: 1 },
    total_votes: { type: Number, default: 0 },
    show_results_before_voting: { type: Boolean, default: false },
  },
  { timestamps: true }
)

pollSchema.index({ org_id: 1, status: 1 })
pollSchema.index({ org_id: 1, poll_type: 1 })
pollSchema.index({ org_id: 1, end_date: 1 })

export const Poll = mongoose.model("Poll", pollSchema)

// Vote Record Schema (for tracking individual votes)
const voteRecordSchema = new Schema(
  {
    org_id: { type: String, required: true, index: true },
    poll_id: { type: String, required: true },
    user_id: { type: String }, // Optional for anonymous votes
    option_index: { type: Number, required: true },
    voted_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

voteRecordSchema.index({ org_id: 1, poll_id: 1, user_id: 1 })

export const VoteRecord = mongoose.model("VoteRecord", voteRecordSchema)
