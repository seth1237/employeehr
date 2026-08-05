import mongoose, { Schema, Document } from "mongoose"

export interface IJob extends Document {
  org_id: string
  company_name: string
  position_index: number
  title: string
  department: string
  location: string
  employment_type: "full-time" | "part-time" | "contract" | "internship"
  description: string
  requirements: string[]
  responsibilities: string[]
  salary_range?: {
    min: number
    max: number
    currency: string
  }
  benefits?: string[]
  application_deadline?: Date
  status: "draft" | "open" | "closed" | "filled"
  created_by: string
  share_link: string
  views: number
  applications_count: number
  created_at: Date
  updated_at: Date
}

const JobSchema = new Schema<IJob>(
  {
    org_id: { type: String, required: true },
    company_name: { type: String, required: true },
    position_index: { type: Number, required: true },
    title: { type: String, required: true },
    department: { type: String, required: true },
    location: { type: String, required: true },
    employment_type: {
      type: String,
      enum: ["full-time", "part-time", "contract", "internship"],
      default: "full-time",
    },
    description: { type: String, required: true },
    requirements: [{ type: String }],
    responsibilities: [{ type: String }],
    salary_range: {
      min: { type: Number },
      max: { type: Number },
      currency: { type: String, default: "KES" },
    },
    benefits: [{ type: String }],
    application_deadline: { type: Date },
    status: {
      type: String,
      enum: ["draft", "open", "closed", "filled"],
      default: "draft",
    },
    created_by: { type: String, required: true },
    share_link: { type: String, required: true, unique: true },
    views: { type: Number, default: 0 },
    applications_count: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
)

// Compound index for org_id and position_index (unique per company)
JobSchema.index({ org_id: 1, position_index: 1 }, { unique: true })
JobSchema.index({ status: 1 })

export default mongoose.model<IJob>("Job", JobSchema)
