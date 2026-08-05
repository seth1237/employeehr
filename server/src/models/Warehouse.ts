import mongoose, { Schema } from "mongoose"

export interface IWarehouse {
  _id?: string
  org_id: string
  name: string
  description?: string
  rows: number
  cols: number
  cellPrefix?: string // e.g., "A", optional
  backgroundImage?: string // URL to background image (uploads)
  layoutObjects?: any[]
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const warehouseSchema = new Schema<IWarehouse>(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    rows: { type: Number, required: true, min: 1 },
    cols: { type: Number, required: true, min: 1 },
    cellPrefix: { type: String },
    backgroundImage: { type: String },
    layoutObjects: { type: Schema.Types.Mixed, default: [] },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

export const Warehouse = mongoose.model<IWarehouse>("Warehouse", warehouseSchema)
