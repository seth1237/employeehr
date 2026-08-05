import mongoose, { Schema } from "mongoose"

export interface IStockSale {
  _id?: string
  org_id: string
  productId: string
  quantitySold: number
  soldPrice: number
  soldBy?: string
  buyerName?: string
  buyerNumber?: string
  buyerLocation?: string
  isWalkInClient: boolean
  isSalesCompany: boolean
  salesEmployeeId?: string
  quotationId?: string
  invoiceId?: string
  receiptNumber: string
  remainingQuantity: number
  createdAt?: Date
  updatedAt?: Date
}

const stockSaleSchema = new Schema<IStockSale>(
  {
    org_id: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    quantitySold: { type: Number, required: true, min: 1 },
    soldPrice: { type: Number, required: true, min: 0 },
    soldBy: { type: String },
    buyerName: { type: String },
    buyerNumber: { type: String },
    buyerLocation: { type: String },
    isWalkInClient: { type: Boolean, default: false },
    isSalesCompany: { type: Boolean, default: false },
    salesEmployeeId: { type: String },
    quotationId: { type: String },
    invoiceId: { type: String },
    receiptNumber: { type: String, required: true, index: true },
    remainingQuantity: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
)

stockSaleSchema.index({ org_id: 1, productId: 1, createdAt: -1 })
stockSaleSchema.index({ org_id: 1, soldBy: 1, createdAt: -1 })

export const StockSale = mongoose.model<IStockSale>("StockSale", stockSaleSchema)
