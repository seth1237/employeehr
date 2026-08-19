import mongoose, { Schema, Document } from "mongoose"

export type SalesVisitType =
  | "scheduled"
  | "unscheduled"
  | "follow-up"
  | "cold call"
  | "service call"

export type SalesVisitOutcome = string

export interface ISalesVisit extends Document {
  org_id: string
  report_id: string
  userId: string
  clientName: string
  clientPhone?: string
  customer_id?: string
  plannerId?: string
  personMet?: string
  personRole?: string
  personPhone?: string
  personEmail?: string
  visitType: SalesVisitType
  purpose?: string
  outcome?: SalesVisitOutcome
  outcomeDetail?: string
  interestCategories?: Array<{
    categoryId: string
    categoryName: string
    note?: string
  }>
  checkInAt: Date
  gps?: { lat: number; lng: number; accuracy?: number }
  nextAction?: string
  followUpDate?: Date
  notes?: string
  quote_id?: string
  visitDate?: string
  status?: "locked" | "unlocked"
  revokedAt?: Date
  revokedBy?: string
  revokeNote?: string
  createdAt: Date
  updatedAt: Date
}

const salesVisitSchema = new Schema<ISalesVisit>(
  {
    org_id: { type: String, required: true },
    report_id: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    clientName: { type: String, required: true },
    clientPhone: { type: String },
    customer_id: { type: String },
    plannerId: { type: String },
    personMet: { type: String },
    personRole: { type: String },
    personPhone: { type: String },
    personEmail: { type: String },
    visitType: {
      type: String,
      enum: ["scheduled", "unscheduled", "follow-up", "cold call", "service call"],
      default: "scheduled",
    },
    purpose: { type: String },
    outcome: { type: String },
    outcomeDetail: { type: String },
    interestCategories: [
      {
        _id: false,
        categoryId: { type: String, required: true },
        categoryName: { type: String, required: true },
        note: { type: String },
      },
    ],
    checkInAt: { type: Date, required: true, default: Date.now },
    gps: {
      lat: { type: Number },
      lng: { type: Number },
      accuracy: { type: Number },
    },
    nextAction: { type: String },
    followUpDate: { type: Date },
    notes: { type: String },
    quote_id: { type: String },
    visitDate: { type: String, index: true },
    status: {
      type: String,
      enum: ["locked", "unlocked"],
      default: "locked",
    },
    revokedAt: { type: Date },
    revokedBy: { type: String },
    revokeNote: { type: String },
  },
  { timestamps: true },
)

salesVisitSchema.index({ org_id: 1, userId: 1, checkInAt: -1 })
salesVisitSchema.index({ org_id: 1, userId: 1, visitDate: 1 })
salesVisitSchema.index({ org_id: 1, followUpDate: 1 })

export const SalesVisit = mongoose.model<ISalesVisit>("SalesVisit", salesVisitSchema)
