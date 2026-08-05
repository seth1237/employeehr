import mongoose, { Schema } from "mongoose"

export interface IStockManufacturer {
  _id?: string
  org_id: string
  type: "importer" | "local_supplier"
  companyName: string
  countryOrLocation?: string
  contactPerson?: string
  contactPhone?: string
  comments?: string
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const stockManufacturerSchema = new Schema<IStockManufacturer>(
  {
    org_id: { type: String, required: true, index: true },
    type: { type: String, enum: ["importer", "local_supplier"], required: true },
    companyName: { type: String, required: true, trim: true },
    countryOrLocation: { type: String, required: false },
    contactPerson: { type: String, required: false },
    contactPhone: { type: String, required: false },
    comments: { type: String, required: false },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

stockManufacturerSchema.index({ org_id: 1, companyName: 1 })

export const StockManufacturer = mongoose.model<IStockManufacturer>("StockManufacturer", stockManufacturerSchema)
