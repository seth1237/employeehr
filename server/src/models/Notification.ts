import mongoose, { Schema } from "mongoose"
import type { INotification } from "../types/interfaces"

const notificationSchema = new Schema<INotification>(
  {
    org_id: { type: String, required: true },
    user_id: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["info", "alert", "reminder", "achievement"],
      default: "info",
    },
    related_entity_type: { type: String },
    related_entity_id: { type: String },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
)

notificationSchema.index({ org_id: 1, user_id: 1 })

export const Notification = mongoose.model<INotification>("Notification", notificationSchema)
