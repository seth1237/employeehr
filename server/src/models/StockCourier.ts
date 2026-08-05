import mongoose, { Schema } from "mongoose"

export interface IStockCourier {
  _id?: string
  org_id: string
  name: string
  contactName: string
  contactNumber: string
  isActive: boolean
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const stockCourierSchema = new Schema<IStockCourier>(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

stockCourierSchema.index({ org_id: 1, name: 1 }, { unique: false })

export const StockCourier = mongoose.model<IStockCourier>("StockCourier", stockCourierSchema)
