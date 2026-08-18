import mongoose, { Schema, Document } from "mongoose"

export type SalesDayType = "working_day" | "leave" | "holiday"
export type SalesReportStatus = "open" | "submitted" | "approved" | "revision_requested"

export interface ISalesGps {
  lat: number
  lng: number
  accuracy?: number
}

export interface ISalesDailyReport extends Document {
  org_id: string
  userId: string
  date: string
  dayType: SalesDayType
  dayStartAt?: Date
  dayEndAt?: Date
  dayStartGps?: ISalesGps
  dayEndGps?: ISalesGps
  plannedVisits?: number
  newLeads?: number
  ordersCount?: number
  ordersValue?: number
  expenses?: number
  mileage?: number
  blockers?: string
  notes?: string
  status: SalesReportStatus
  submittedAt?: Date
  reviewedAt?: Date
  reviewedBy?: string
  reviewNote?: string
  createdAt: Date
  updatedAt: Date
}

const gpsSchema = new Schema<ISalesGps>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    accuracy: { type: Number },
  },
  { _id: false },
)

const salesDailyReportSchema = new Schema<ISalesDailyReport>(
  {
    org_id: { type: String, required: true },
    userId: { type: String, required: true },
    date: { type: String, required: true },
    dayType: {
      type: String,
      enum: ["working_day", "leave", "holiday"],
      default: "working_day",
    },
    dayStartAt: { type: Date },
    dayEndAt: { type: Date },
    dayStartGps: { type: gpsSchema },
    dayEndGps: { type: gpsSchema },
    plannedVisits: { type: Number, default: 0 },
    newLeads: { type: Number, default: 0 },
    ordersCount: { type: Number, default: 0 },
    ordersValue: { type: Number, default: 0 },
    expenses: { type: Number, default: 0 },
    mileage: { type: Number, default: 0 },
    blockers: { type: String },
    notes: { type: String },
    status: {
      type: String,
      enum: ["open", "submitted", "approved", "revision_requested"],
      default: "open",
    },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    reviewNote: { type: String },
  },
  { timestamps: true },
)

salesDailyReportSchema.index({ org_id: 1, userId: 1, date: 1 }, { unique: true })
salesDailyReportSchema.index({ org_id: 1, status: 1, date: -1 })

export const SalesDailyReport = mongoose.model<ISalesDailyReport>(
  "SalesDailyReport",
  salesDailyReportSchema,
)
