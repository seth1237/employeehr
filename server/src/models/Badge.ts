import mongoose, { Schema } from "mongoose"

// Badge Schema
const badgeSchema = new Schema(
  {
    org_id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String }, // Emoji or icon name
    color: { type: String, default: "#3B82F6" },
    category: {
      type: String,
      enum: ["achievement", "behavior", "skill", "milestone", "recognition"],
      default: "recognition",
    },
    criteria: { type: String }, // How to earn this badge
    points: { type: Number, default: 0 }, // Optional points value
    is_active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

badgeSchema.index({ org_id: 1 })

export const Badge = mongoose.model("Badge", badgeSchema)

// User Badge Schema (tracks which users have which badges)
const userBadgeSchema = new Schema(
  {
    org_id: { type: String, required: true },
    user_id: { type: String, required: true },
    badge_id: { type: String, required: true },
    awarded_by: { type: String },
    awarded_at: { type: Date, default: Date.now },
    reason: { type: String },
  },
  { timestamps: true }
)

userBadgeSchema.index({ org_id: 1, user_id: 1 })
userBadgeSchema.index({ org_id: 1, badge_id: 1 })

export const UserBadge = mongoose.model("UserBadge", userBadgeSchema)
