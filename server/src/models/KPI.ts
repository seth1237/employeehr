import mongoose, { Schema } from "mongoose"
import type { IKPI } from "../types/interfaces"

const kpiSchema = new Schema<IKPI>(
  {
    org_id: { type: String, required: true },
    department_id: { type: String },
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    weight: { type: Number, required: true, min: 0, max: 100 },
    target: { type: Number, required: true },
    unit: { type: String, required: true },
  },
  { timestamps: true },
)

kpiSchema.index({ org_id: 1 })

export const KPI = mongoose.model<IKPI>("KPI", kpiSchema)
