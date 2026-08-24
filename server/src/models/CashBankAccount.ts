import mongoose, { Schema } from "mongoose"

export type CashAccountType = "cash" | "bank" | "mpesa"

export interface ICashBankAccount {
  _id?: string
  org_id: string
  type: CashAccountType
  name: string
  accountNumber?: string
  bankName?: string
  branchName?: string
  /** M-Pesa till / paybill / phone */
  mpesaIdentifier?: string
  mpesaMode?: "till" | "paybill" | "phone"
  currency: string
  openingBalance: number
  currentBalance: number
  isDefault?: boolean
  status: "active" | "inactive"
  notes?: string
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const cashBankAccountSchema = new Schema<ICashBankAccount>(
  {
    org_id: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["cash", "bank", "mpesa"],
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    accountNumber: { type: String, trim: true },
    bankName: { type: String, trim: true },
    branchName: { type: String, trim: true },
    mpesaIdentifier: { type: String, trim: true },
    mpesaMode: {
      type: String,
      enum: ["till", "paybill", "phone"],
    },
    currency: { type: String, default: "KES" },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    notes: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

cashBankAccountSchema.index({ org_id: 1, type: 1, status: 1 })
cashBankAccountSchema.index({ org_id: 1, name: 1 })

export const CashBankAccount = mongoose.model<ICashBankAccount>(
  "CashBankAccount",
  cashBankAccountSchema,
)
