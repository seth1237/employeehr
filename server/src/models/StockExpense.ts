import mongoose, { Schema } from "mongoose"

export interface IStockExpense {
  _id?: string
  org_id: string
  payerPhone: string
  payeePhone: string
  amount: number
  purpose: string
  status: "pending" | "prompt_sent" | "completed" | "failed"
  mpesaCheckoutRequestId?: string
  mpesaMerchantRequestId?: string
  mpesaReceiptNumber?: string
  responseMessage?: string
  initiatedBy: string
  createdAt?: Date
  updatedAt?: Date
}

const stockExpenseSchema = new Schema<IStockExpense>(
  {
    org_id: { type: String, required: true, index: true },
    payerPhone: { type: String, required: true },
    payeePhone: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    purpose: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "prompt_sent", "completed", "failed"],
      default: "pending",
    },
    mpesaCheckoutRequestId: { type: String },
    mpesaMerchantRequestId: { type: String },
    mpesaReceiptNumber: { type: String },
    responseMessage: { type: String },
    initiatedBy: { type: String, required: true },
  },
  { timestamps: true },
)

stockExpenseSchema.index({ org_id: 1, createdAt: -1 })
stockExpenseSchema.index({ org_id: 1, payerPhone: 1, createdAt: -1 })

export const StockExpense = mongoose.model<IStockExpense>("StockExpense", stockExpenseSchema)
