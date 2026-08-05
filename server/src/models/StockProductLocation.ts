import mongoose, { Schema, type Document } from "mongoose"

export interface IStockProductLocation extends Document {
  _id?: string
  org_id: string
  branchId?: string
  productId: string
  locationId: string
  quantity: number
  createdAt?: Date
  updatedAt?: Date
}

const stockProductLocationSchema = new Schema<IStockProductLocation>(
  {
    org_id: { type: String, required: true, index: true },
    branchId: { type: String, required: false, index: true },
    productId: { type: String, required: true, index: true },
    locationId: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true },
)

stockProductLocationSchema.index({ org_id: 1, productId: 1, locationId: 1 }, { unique: true })
stockProductLocationSchema.index({ org_id: 1, branchId: 1, productId: 1 })

export const StockProductLocation = mongoose.model<IStockProductLocation>("StockProductLocation", stockProductLocationSchema)
