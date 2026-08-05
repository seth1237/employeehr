import mongoose, { Schema, Document } from "mongoose"

export interface IFormField {
  field_id: string
  label: string
  type: "text" | "email" | "phone" | "number" | "select" | "checkbox" | "textarea" | "file" | "date" | "time" | "datetime-local" | "url" | "password" | "radio" | "rating" | "slider" | "color" | "range" | "address" | "currency" | "percentage"
  required: boolean
  placeholder?: string
  options?: string[] // For select/checkbox/radio
  min_value?: number // For slider/range/number
  max_value?: number // For slider/range/number
  validation?: {
    min?: number
    max?: number
    pattern?: string
    accept?: string // For file type
  }
  order: number
}

export interface IApplicationForm extends Document {
  org_id: string
  job_id: string
  title: string
  description?: string
  fields: IFormField[]
  status: "active" | "inactive"
  created_by: string
  created_at: Date
  updated_at: Date
}

const FormFieldSchema = new Schema<IFormField>({
  field_id: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: [
      "text", "email", "phone", "number", "select", "checkbox", "textarea", "file", "date",
      "time", "datetime-local", "url", "password", "radio", "rating", "slider", "color",
      "range", "address", "currency", "percentage"
    ],
    required: true,
  },
  required: { type: Boolean, default: false },
  placeholder: { type: String },
  options: [{ type: String }],
  min_value: { type: Number },
  max_value: { type: Number },
  validation: {
    min: { type: Number },
    max: { type: Number },
    pattern: { type: String },
    accept: { type: String },
  },
  order: { type: Number, required: true },
})

const ApplicationFormSchema = new Schema<IApplicationForm>(
  {
    org_id: { type: String, required: true },
    job_id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    fields: [FormFieldSchema],
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    created_by: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
)

ApplicationFormSchema.index({ org_id: 1, job_id: 1 })

export default mongoose.model<IApplicationForm>("ApplicationForm", ApplicationFormSchema)
