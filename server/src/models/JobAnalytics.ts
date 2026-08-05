import mongoose, { Schema, Document } from "mongoose"

export interface IJobAnalytics extends Document {
  org_id: string
  job_id: string
  date: Date
  views: number
  applications: number
  sources: Record<string, number> // e.g., { "linkedin": 5, "direct": 10 }
  conversion_rate: number
  created_at: Date
  updated_at: Date
}

const JobAnalyticsSchema = new Schema<IJobAnalytics>(
  {
    org_id: { type: String, required: true, index: true },
    job_id: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    views: { type: Number, default: 0 },
    applications: { type: Number, default: 0 },
    sources: { type: Schema.Types.Mixed, default: {} },
    conversion_rate: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
)

// Compound index for unique daily analytics per job
JobAnalyticsSchema.index({ org_id: 1, job_id: 1, date: 1 }, { unique: true })

export default mongoose.model<IJobAnalytics>("JobAnalytics", JobAnalyticsSchema)
