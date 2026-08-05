import mongoose, { Schema } from "mongoose"

export interface IStockCheck {
  _id?: string
  org_id: string
  stockCheckNumber: string
  warehouseId: string
  warehouse?: {
    _id: string
    name: string
  }
  checkType: "full" | "partial" | "cycle" | "emergency"
  status:
    | "draft"
    | "assigned"
    | "in_progress"
    | "submitted"
    | "under_review"
    | "approved"
    | "adjusted"
    | "closed"
  createdBy: string
  supervisor?: string
  assignedCounters: string[]
  categories?: string[]
  countedItems?: Array<{
    productId: string
    productName?: string
    categoryId?: string
    expiryDate?: Date
    warehouseQuantity?: number
    expectedQuantity?: number
    countedQuantity?: number
    variance?: number
  }>
  itemsTotal: number
  itemsCounted: number
  varianceCount: number
  totalVarianceValue: number
  startTime?: Date
  endTime?: Date
  notes?: string
  closedAt?: Date
  closedBy?: string
  createdAt?: Date
  updatedAt?: Date
}

const stockCheckSchema = new Schema<IStockCheck>(
  {
    org_id: { type: String, required: true, index: true },
    stockCheckNumber: { type: String, required: true, trim: true, index: true },
    warehouseId: { type: String, required: true, index: true },
    warehouse: {
      _id: { type: String },
      name: { type: String },
    },
    checkType: {
      type: String,
      enum: ["full", "partial", "cycle", "emergency"],
      default: "full",
    },
    status: {
      type: String,
      enum: [
        "draft",
        "assigned",
        "in_progress",
        "submitted",
        "under_review",
        "approved",
        "adjusted",
        "closed",
      ],
      default: "draft",
    },
    createdBy: { type: String, required: true },
    supervisor: { type: String },
    assignedCounters: [{ type: String }],
    categories: [{ type: String }],
    countedItems: [
      {
        productId: { type: String, required: true },
        productName: { type: String },
        categoryId: { type: String },
        expiryDate: { type: Date },
        warehouseQuantity: { type: Number, min: 0, default: 0 },
        expectedQuantity: { type: Number, min: 0, default: 0 },
        countedQuantity: { type: Number, min: 0, default: 0 },
        variance: { type: Number, default: 0 },
      },
    ],
    itemsTotal: { type: Number, min: 0, default: 0 },
    itemsCounted: { type: Number, min: 0, default: 0 },
    varianceCount: { type: Number, min: 0, default: 0 },
    totalVarianceValue: { type: Number, min: 0, default: 0 },
    startTime: { type: Date },
    endTime: { type: Date },
    notes: { type: String, trim: true },
    closedAt: { type: Date },
    closedBy: { type: String },
  },
  { timestamps: true },
)

stockCheckSchema.index({ org_id: 1, warehouseId: 1 })
stockCheckSchema.index({ org_id: 1, status: 1 })
stockCheckSchema.index({ org_id: 1, stockCheckNumber: 1 })

export const StockCheck = mongoose.model<IStockCheck>("StockCheck", stockCheckSchema)
