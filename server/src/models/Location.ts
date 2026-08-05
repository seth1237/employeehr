import mongoose, { Schema } from "mongoose"

export interface ILocation {
  _id?: string
  org_id: string
  warehouseId: string
  row: number
  col: number
  code: string // e.g., "A1" or "R1C1"
  name?: string
  capacity?: number
  notes?: string
  x?: number
  y?: number
}

const locationSchema = new Schema<ILocation>(
  {
    org_id: { type: String, required: true, index: true },
    warehouseId: { type: String, required: true, index: true },
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    code: { type: String, required: true },
    name: { type: String },
    capacity: { type: Number },
    notes: { type: String },
    x: { type: Number },
    y: { type: Number },
  },
  { timestamps: true },
)

locationSchema.index({ warehouseId: 1, row: 1, col: 1 }, { unique: true })
locationSchema.index({ org_id: 1, code: 1 })

export const Location = mongoose.model<ILocation>("Location", locationSchema)
