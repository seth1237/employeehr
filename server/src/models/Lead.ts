import mongoose, { Schema, Document } from "mongoose"

export type LeadPipelineStage =
  | "New"
  | "Contacted"
  | "Interested"
  | "Follow-up"
  | "Quotation Sent"
  | "Negotiation"
  | "Won"
  | "Lost"

export type LeadTemperatureStatus = "Warm Lead" | "Cold Lead" | "Dropped"

export const LEAD_TEMPERATURE_STATUSES: LeadTemperatureStatus[] = [
  "Warm Lead",
  "Cold Lead",
  "Dropped",
]

export interface ILeadStatusHistoryEntry {
  from: LeadTemperatureStatus
  to: LeadTemperatureStatus
  changedBy: string
  changedAt: Date
  note?: string
  conversation_id?: string
}

export interface ILead extends Document {
  org_id: string
  customer_id: string
  title: string
  stage: LeadPipelineStage
  leadStatus?: LeadTemperatureStatus
  statusHistory?: ILeadStatusHistoryEntry[]
  source?: string
  owner_id: string
  value?: number
  expectedCloseDate?: Date
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const statusHistorySchema = new Schema<ILeadStatusHistoryEntry>(
  {
    from: {
      type: String,
      enum: LEAD_TEMPERATURE_STATUSES,
      required: true,
    },
    to: {
      type: String,
      enum: LEAD_TEMPERATURE_STATUSES,
      required: true,
    },
    changedBy: { type: String, required: true },
    changedAt: { type: Date, required: true, default: Date.now },
    note: { type: String },
    conversation_id: { type: String },
  },
  { _id: false },
)

const leadSchema = new Schema<ILead>(
  {
    org_id: { type: String, required: true },
    customer_id: { type: String, required: true, ref: "Customer" },
    title: { type: String, required: true },
    stage: {
      type: String,
      enum: [
        "New",
        "Contacted",
        "Interested",
        "Follow-up",
        "Quotation Sent",
        "Negotiation",
        "Won",
        "Lost",
      ],
      default: "New",
    },
    leadStatus: {
      type: String,
      enum: LEAD_TEMPERATURE_STATUSES,
      default: "Warm Lead",
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    source: { type: String },
    owner_id: { type: String, required: true },
    value: { type: Number, default: 0 },
    expectedCloseDate: { type: Date },
    notes: { type: String },
  },
  { timestamps: true },
)

leadSchema.index({ org_id: 1 })
leadSchema.index({ owner_id: 1 })
leadSchema.index({ customer_id: 1 })

export const Lead = mongoose.model<ILead>("Lead", leadSchema)
