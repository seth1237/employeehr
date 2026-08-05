import mongoose, { Schema } from "mongoose"

// Resource Booking Schema
const resourceBookingSchema = new Schema(
  {
    org_id: { type: String, required: true },
    user_id: { type: String, required: true },
    resource_type: {
      type: String,
      enum: ["desk", "car", "meeting_room", "parking", "equipment"],
      required: true,
    },
    resource_id: { type: String, required: true },
    resource_name: { type: String, required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed", "cancelled"],
      default: "pending",
    },
    purpose: { type: String },
    notes: { type: String },
    approved_by: { type: String },
    approved_at: { type: Date },
  },
  { timestamps: true }
)

resourceBookingSchema.index({ org_id: 1, user_id: 1 })
resourceBookingSchema.index({ org_id: 1, resource_id: 1, start_date: 1 })

export const ResourceBooking = mongoose.model("ResourceBooking", resourceBookingSchema)

// Resource Schema
const resourceSchema = new Schema(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["desk", "car", "meeting_room", "parking", "equipment"],
      required: true,
    },
    description: { type: String },
    location: { type: String },
    capacity: { type: Number },
    features: [{ type: String }], // e.g., ["WiFi", "Projector", "Whiteboard"]
    is_available: { type: Boolean, default: true },
    requires_approval: { type: Boolean, default: false },
  },
  { timestamps: true }
)

resourceSchema.index({ org_id: 1, type: 1 })

export const Resource = mongoose.model("Resource", resourceSchema)
