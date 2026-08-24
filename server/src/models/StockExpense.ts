import mongoose, { Schema } from "mongoose"

export interface IStockExpense {
  _id?: string
  org_id: string
  expenseNumber?: string
  expenseType?: "mpesa_prompt" | "manual" | "claim"
  payerPhone: string
  payeePhone: string
  amount: number
  vat?: number
  purpose: string
  description?: string
  category?: string
  categoryId?: string
  branch?: string
  department?: string
  paymentMethod?: string
  expenseDate?: Date
  receiptNote?: string
  isRecurring?: boolean
  recurDate?: Date
  proofUrl?: string
  proofFileName?: string
  proofOriginalName?: string
  workflowStatus?: "draft" | "submitted" | "approved" | "paid" | "posted"
  status: "pending" | "prompt_sent" | "completed" | "failed"
  mpesaCheckoutRequestId?: string
  mpesaMerchantRequestId?: string
  mpesaReceiptNumber?: string
  responseMessage?: string
  initiatedBy: string
  requestedByName?: string
  approvedBy?: string
  approvedAt?: Date
  claimId?: string
  invoiceId?: string
  quotationId?: string
  source?: "invoice_transport" | "manual" | "claim" | "mpesa"
  createdAt?: Date
  updatedAt?: Date
}

const stockExpenseSchema = new Schema<IStockExpense>(
  {
    org_id: { type: String, required: true, index: true },
    expenseNumber: { type: String, index: true },
    expenseType: {
      type: String,
      enum: ["mpesa_prompt", "manual", "claim"],
      default: "mpesa_prompt",
    },
    payerPhone: { type: String, required: true },
    payeePhone: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    vat: { type: Number, default: 0 },
    purpose: { type: String, required: true },
    description: { type: String },
    category: { type: String },
    categoryId: { type: String },
    branch: { type: String },
    department: { type: String },
    paymentMethod: { type: String, default: "mpesa" },
    expenseDate: { type: Date },
    receiptNote: { type: String },
    isRecurring: { type: Boolean, default: false },
    recurDate: { type: Date },
    proofUrl: { type: String },
    proofFileName: { type: String },
    proofOriginalName: { type: String },
    workflowStatus: {
      type: String,
      enum: ["draft", "submitted", "approved", "paid", "posted"],
      default: "submitted",
    },
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
    requestedByName: { type: String },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    claimId: { type: String },
    invoiceId: { type: String, index: true },
    quotationId: { type: String },
    source: { type: String },
  },
  { timestamps: true },
)

stockExpenseSchema.index({ org_id: 1, createdAt: -1 })
stockExpenseSchema.index({ org_id: 1, payerPhone: 1, createdAt: -1 })
stockExpenseSchema.index({ org_id: 1, expenseNumber: 1 })

export const StockExpense = mongoose.model<IStockExpense>("StockExpense", stockExpenseSchema)
