import mongoose, { Schema, type Document } from "mongoose"

export interface IStockLocation extends Document {
  _id?: string
  org_id: string
  branchId?: string
  name: string
  code: string
  locationType: string
  parentId?: string
  x: number
  y: number
  width: number
  height: number
  color?: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

const stockLocationSchema = new Schema<IStockLocation>(
  {
    org_id: { type: String, required: true, index: true },
    branchId: { type: String, required: false, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    locationType: { type: String, required: true, trim: true, default: "bin" },
    parentId: { type: String, default: null },
    x: { type: Number, required: true, min: 0, max: 100, default: 0 },
    y: { type: Number, required: true, min: 0, max: 100, default: 0 },
    width: { type: Number, required: true, min: 1, max: 100, default: 20 },
    height: { type: Number, required: true, min: 1, max: 100, default: 10 },
    color: { type: String, default: "#38bdf8" },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

stockLocationSchema.index({ org_id: 1, branchId: 1, code: 1 }, { unique: true })
stockLocationSchema.index({ org_id: 1, branchId: 1, locationType: 1 })

export const StockLocation = mongoose.model<IStockLocation>("StockLocation", stockLocationSchema)
