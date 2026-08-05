import mongoose, { Schema } from "mongoose"

export interface IStockRepeatBill {
  _id?: string
  org_id: string
  payerPhone: string
  payeePhones: string[]
  amount: number
  purpose: string
  lastRunAt?: Date
  lastRunCount?: number
  createdBy: string
  updatedBy: string
  createdAt?: Date
  updatedAt?: Date
}

const stockRepeatBillSchema = new Schema<IStockRepeatBill>(
  {
    org_id: { type: String, required: true, index: true },
    payerPhone: { type: String, required: true },
    payeePhones: { type: [String], required: true, default: [] },
    amount: { type: Number, required: true, min: 1 },
    purpose: { type: String, required: true },
    lastRunAt: { type: Date },
    lastRunCount: { type: Number, min: 0 },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true },
)

stockRepeatBillSchema.index({ org_id: 1, createdAt: -1 })

export const StockRepeatBill = mongoose.model<IStockRepeatBill>("StockRepeatBill", stockRepeatBillSchema)
