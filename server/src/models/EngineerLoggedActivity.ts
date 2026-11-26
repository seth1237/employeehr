import mongoose, { Schema } from "mongoose"

export const ENGINEER_LOGGED_ACTIVITY_TYPES = [
  "cme",
  "sme_session",
  "in_office",
  "in_office_repair",
  "other",
] as const

export type EngineerLoggedActivityType = (typeof ENGINEER_LOGGED_ACTIVITY_TYPES)[number]

export interface IEngineerLoggedActivity {
  _id?: string
  org_id: string
  engineerId: string
  engineerName: string
  type: EngineerLoggedActivityType
  title?: string
  notes?: string
  hours?: number
  date: Date
  createdAt?: Date
  updatedAt?: Date
}

const engineerLoggedActivitySchema = new Schema<IEngineerLoggedActivity>(
  {
    org_id: { type: String, required: true, index: true },
    engineerId: { type: String, required: true, index: true },
    engineerName: { type: String, required: true },
    type: {
      type: String,
      enum: ENGINEER_LOGGED_ACTIVITY_TYPES,
      required: true,
      index: true,
    },
    title: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    hours: { type: Number, min: 0, max: 24 },
    date: { type: Date, required: true, index: true },
  },
  { timestamps: true },
)

engineerLoggedActivitySchema.index({ org_id: 1, engineerId: 1, date: -1 })
engineerLoggedActivitySchema.index({ org_id: 1, date: -1 })

export const EngineerLoggedActivity = mongoose.model<IEngineerLoggedActivity>(
  "EngineerLoggedActivity",
  engineerLoggedActivitySchema,
)
