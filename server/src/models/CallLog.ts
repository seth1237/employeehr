import mongoose, { Schema, Document } from "mongoose"

export interface ICallLog extends Document {
  org_id: string
  customer_id?: string
  agent_id: string // user making/receiving call
  direction: "Inbound" | "Outbound" | "Missed"
  extension?: string
  phoneNumber: string
  durationSeconds: number
  recordingLink?: string
  cdrReference?: string
  notes?: string
  status: "Answered" | "No Answer" | "Busy" | "Failed"
  createdAt: Date
  updatedAt: Date
}

const callLogSchema = new Schema<ICallLog>(
  {
    org_id: { type: String, required: true },
    customer_id: { type: String, ref: "Customer" },
    agent_id: { type: String, required: true },
    direction: { type: String, enum: ["Inbound", "Outbound", "Missed"], required: true },
    extension: { type: String },
    phoneNumber: { type: String, required: true },
    durationSeconds: { type: Number, default: 0 },
    recordingLink: { type: String },
    cdrReference: { type: String },
    notes: { type: String },
    status: { type: String, enum: ["Answered", "No Answer", "Busy", "Failed"], required: true }
  },
  { timestamps: true }
)

callLogSchema.index({ org_id: 1 })
callLogSchema.index({ agent_id: 1 })
callLogSchema.index({ customer_id: 1 })

export const CallLog = mongoose.model<ICallLog>("CallLog", callLogSchema)
