import mongoose, { Schema, Document } from "mongoose"

export interface IAppointment extends Document {
  org_id: string
  customer_id: string
  title: string
  type: "Visit" | "Demo" | "Maintenance" | "Training" | "Other"
  date: Date
  durationMinutes: number
  assignedTo: string // user_id
  createdBy: string // user_id
  status: "Scheduled" | "Completed" | "Cancelled" | "Rescheduled"
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const appointmentSchema = new Schema<IAppointment>(
  {
    org_id: { type: String, required: true },
    customer_id: { type: String, required: true, ref: "Customer" },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["Visit", "Demo", "Maintenance", "Training", "Other"],
      default: "Visit"
    },
    date: { type: Date, required: true },
    durationMinutes: { type: Number, default: 60 },
    assignedTo: { type: String, required: true },
    createdBy: { type: String, required: true },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled", "Rescheduled"],
      default: "Scheduled"
    },
    notes: { type: String }
  },
  { timestamps: true }
)

appointmentSchema.index({ org_id: 1 })
appointmentSchema.index({ customer_id: 1 })
appointmentSchema.index({ assignedTo: 1 })
appointmentSchema.index({ date: 1 })

export const Appointment = mongoose.model<IAppointment>("Appointment", appointmentSchema)
