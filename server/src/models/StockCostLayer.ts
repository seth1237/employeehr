import mongoose, { Schema } from "mongoose"

export type CostLayerSource = "opening" | "receipt" | "adjustment" | "return"

export interface IStockCostLayer {
  _id?: string
  org_id: string
  productId: string
  quantityRemaining: number
  originalQuantity: number
  unitCost: number
  receivedAt: Date
  source: CostLayerSource
  sourceId?: string
  branchId?: string
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

const stockCostLayerSchema = new Schema<IStockCostLayer>(
  {
    org_id: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },
    quantityRemaining: { type: Number, required: true, min: 0, default: 0 },
    originalQuantity: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0, default: 0 },
    receivedAt: { type: Date, required: true, default: Date.now, index: true },
    source: {
      type: String,
      enum: ["opening", "receipt", "adjustment", "return"],
      default: "receipt",
    },
    sourceId: { type: String },
    branchId: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true },
)

stockCostLayerSchema.index({ org_id: 1, productId: 1, receivedAt: 1 })
stockCostLayerSchema.index({ org_id: 1, productId: 1, quantityRemaining: 1 })

export const StockCostLayer = mongoose.model<IStockCostLayer>(
  "StockCostLayer",
  stockCostLayerSchema,
)
