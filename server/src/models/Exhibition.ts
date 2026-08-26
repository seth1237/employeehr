import mongoose, { Schema, Document } from "mongoose"

export interface ICustomField {
  name: string
  label: string
  type: "text" | "number" | "date" | "select" | "boolean"
  options?: string[] // For select fields
  required: boolean
}

export interface IExhibition extends Document {
  org_id: string
  name: string
  location: string
  date: Date
  endDate?: Date
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
  assignedReps: string[] // Array of User IDs
  customFields: ICustomField[]
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const customFieldSchema = new Schema<ICustomField>({
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    enum: ["text", "number", "date", "select", "boolean"],
    required: true,
    default: "text",
  },
  options: [{ type: String }],
  required: { type: Boolean, default: false },
})

const exhibitionSchema = new Schema<IExhibition>(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    date: { type: Date, required: true },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ["upcoming", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
    assignedReps: [{ type: String }],
    customFields: { type: [customFieldSchema], default: [] },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

export const Exhibition = mongoose.model<IExhibition>("Exhibition", exhibitionSchema)
