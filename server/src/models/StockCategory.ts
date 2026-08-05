import mongoose, { Schema } from "mongoose"

export interface IStockCategory {
  _id?: string
  org_id: string
  name: string
  description?: string
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const stockCategorySchema = new Schema<IStockCategory>(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

stockCategorySchema.index({ org_id: 1, name: 1 }, { unique: true })

export const StockCategory = mongoose.model<IStockCategory>("StockCategory", stockCategorySchema)
