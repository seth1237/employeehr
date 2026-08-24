import mongoose, { Schema } from "mongoose"

export interface IStockExpenseClaimItem {
  description: string
  amount: number
  category?: string
}

export interface IStockExpenseClaim {
  _id?: string
  org_id: string
  claimNumber: string
  employeeId: string
  employeeName: string
  items: IStockExpenseClaimItem[]
  totalAmount: number
  purpose: string
  status: "draft" | "submitted" | "approved" | "rejected" | "reimbursed"
  submittedAt?: Date
  approvedBy?: string
  approvedAt?: Date
  rejectionReason?: string
  receiptNote?: string
  plannerId?: string
  plannerDate?: string
  source?: "manual" | "sales_planner"
  createdAt?: Date
  updatedAt?: Date
}

const claimItemSchema = new Schema<IStockExpenseClaimItem>(
  {
    description: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    category: { type: String },
  },
  { _id: false },
)

const stockExpenseClaimSchema = new Schema<IStockExpenseClaim>(
  {
    org_id: { type: String, required: true, index: true },
    claimNumber: { type: String, required: true },
    employeeId: { type: String, required: true, index: true },
    employeeName: { type: String, required: true },
    items: { type: [claimItemSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    purpose: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected", "reimbursed"],
      default: "draft",
    },
    submittedAt: { type: Date },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    receiptNote: { type: String },
    plannerId: { type: String, index: true },
    plannerDate: { type: String },
    source: {
      type: String,
      enum: ["manual", "sales_planner"],
      default: "manual",
    },
  },
  { timestamps: true },
)

stockExpenseClaimSchema.index({ org_id: 1, claimNumber: 1 }, { unique: true })
stockExpenseClaimSchema.index({ org_id: 1, plannerId: 1 }, { unique: true, sparse: true })

export const StockExpenseClaim = mongoose.model<IStockExpenseClaim>(
  "StockExpenseClaim",
  stockExpenseClaimSchema,
)
