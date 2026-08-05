import mongoose, { Schema, Document } from "mongoose"

export interface IJobApplication extends Document {
  org_id: string
  job_id: string
  form_id: string
  applicant_name: string
  applicant_email: string
  applicant_phone?: string
  device_fingerprint?: string
  answers: Record<string, any>
  uploaded_files?: Record<string, string> // field_id -> file path mapping
  resume_url?: string
  cover_letter?: string
  status: "pending" | "reviewing" | "shortlisted" | "rejected" | "hired"
  source?: string // utm_source or referrer
  rating?: number
  notes: Array<{
    note: string
    created_by: string
    created_at: Date
    type: "private" | "public"
  }>
  timeline: Array<{
    status: string
    changed_by: string
    changed_at: Date
    comment?: string
  }>
  submitted_at: Date
  created_at: Date
  updated_at: Date
}

const JobApplicationSchema = new Schema<IJobApplication>(
  {
    org_id: { type: String, required: true },
    job_id: { type: String, required: true, index: true },
    form_id: { type: String, required: true },
    applicant_name: { type: String, required: true },
    applicant_email: { type: String, required: true },
    applicant_phone: { type: String },
    device_fingerprint: { type: String, index: true },
    answers: { type: Schema.Types.Mixed, required: true },
    uploaded_files: { type: Schema.Types.Mixed }, // Store file paths
    resume_url: { type: String },
    cover_letter: { type: String },
    status: {
      type: String,
      enum: ["pending", "reviewing", "shortlisted", "rejected", "hired"],
      default: "pending",
    },
    source: { type: String },
    rating: { type: Number, min: 1, max: 5 },
    notes: [
      {
        note: { type: String, required: true },
        created_by: { type: String, required: true },
        created_at: { type: Date, default: Date.now },
        type: { type: String, enum: ["private", "public"], default: "private" },
      },
    ],
    timeline: [
      {
        status: { type: String, required: true },
        changed_by: { type: String, required: true },
        changed_at: { type: Date, default: Date.now },
        comment: { type: String },
      },
    ],
    submitted_at: { type: Date, default: Date.now },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
)

JobApplicationSchema.index({ org_id: 1, job_id: 1 })
JobApplicationSchema.index({ org_id: 1, job_id: 1, applicant_email: 1 })
JobApplicationSchema.index({ org_id: 1, job_id: 1, device_fingerprint: 1 }, { sparse: true })
JobApplicationSchema.index({ applicant_email: 1 })
JobApplicationSchema.index({ status: 1 })
JobApplicationSchema.index({ submitted_at: -1 })

export default mongoose.model<IJobApplication>("JobApplication", JobApplicationSchema)
