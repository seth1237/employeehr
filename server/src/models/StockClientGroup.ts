import mongoose, { Schema } from "mongoose"

export interface IStockClientGroup {
  _id?: string
  org_id: string
  name: string
  description?: string
  /** Client keys: name|number|location (lowercase) */
  memberKeys: string[]
  createdBy: string
  updatedBy: string
  createdAt?: Date
  updatedAt?: Date
}

const stockClientGroupSchema = new Schema<IStockClientGroup>(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    memberKeys: { type: [String], default: [] },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true },
)

stockClientGroupSchema.index({ org_id: 1, name: 1 }, { unique: true })

export const StockClientGroup = mongoose.model<IStockClientGroup>(
  "StockClientGroup",
  stockClientGroupSchema,
)
