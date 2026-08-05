import mongoose, { Schema } from "mongoose"
import type { IAttendance } from "../types/interfaces"

const attendanceSchema = new Schema<IAttendance>(
  {
    org_id: { type: String, required: true },
    user_id: { type: String, required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ["present", "absent", "late", "half_day", "leave"],
      required: true,
    },
    checkIn: { type: Date },
    checkOut: { type: Date },
    hoursWorked: { type: Number },
    remarks: { type: String },
  },
  { timestamps: true },
)

attendanceSchema.index({ org_id: 1, user_id: 1, date: 1 })

export const Attendance = mongoose.model<IAttendance>("Attendance", attendanceSchema)
