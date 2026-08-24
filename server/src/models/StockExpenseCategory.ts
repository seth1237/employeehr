import mongoose, { Schema } from "mongoose"

export interface IStockExpenseCategory {
  _id?: string
  org_id: string
  name: string
  code?: string
  description?: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

const stockExpenseCategorySchema = new Schema<IStockExpenseCategory>(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    code: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

stockExpenseCategorySchema.index({ org_id: 1, name: 1 }, { unique: true })

export const StockExpenseCategory = mongoose.model<IStockExpenseCategory>(
  "StockExpenseCategory",
  stockExpenseCategorySchema,
)

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Internet",
  "Transport",
  "Fuel",
  "Accommodation",
  "Marketing",
  "Salaries",
  "Professional Fees",
  "Office Supplies",
  "Maintenance",
  "Other",
]
