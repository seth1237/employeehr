import mongoose, { Schema } from "mongoose"

export interface IProductLocation {
  _id?: string
  org_id: string
  productId: string
  locationId: string
  quantity: number
  notes?: string
}

const productLocationSchema = new Schema<IProductLocation>(
  {
    org_id: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    locationId: { type: String, required: true, index: true },
    quantity: { type: Number, required: true, min: 0 },
    notes: { type: String },
  },
  { timestamps: true },
)

productLocationSchema.index({ productId: 1, locationId: 1 }, { unique: true })

export const ProductLocation = mongoose.model<IProductLocation>("ProductLocation", productLocationSchema)
