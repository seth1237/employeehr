import mongoose, { Schema } from "mongoose"

export type CashTxnDirection = "in" | "out"
export type CashTxnKind =
  | "opening"
  | "manual"
  | "payment"
  | "expense"
  | "payroll"
  | "transfer"
  | "adjustment"
  | "reconciliation"

export interface ICashTransaction {
  _id?: string
  org_id: string
  accountId: string
  accountName: string
  accountType: "cash" | "bank" | "mpesa"
  direction: CashTxnDirection
  kind: CashTxnKind
  amount: number
  balanceAfter: number
  occurredAt: Date
  description: string
  reference?: string
  counterparty?: string
  /** Paired transfer id shared by out + in legs */
  transferGroupId?: string
  relatedAccountId?: string
  relatedAccountName?: string
  sourceType?:
    | "invoice_payment"
    | "expense"
    | "payroll"
    | "transfer"
    | "manual"
    | "opening"
  sourceId?: string
  reconciled?: boolean
  reconciledAt?: Date
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const cashTransactionSchema = new Schema<ICashTransaction>(
  {
    org_id: { type: String, required: true, index: true },
    accountId: { type: String, required: true, index: true },
    accountName: { type: String, required: true },
    accountType: {
      type: String,
      enum: ["cash", "bank", "mpesa"],
      required: true,
      index: true,
    },
    direction: { type: String, enum: ["in", "out"], required: true },
    kind: {
      type: String,
      enum: [
        "opening",
        "manual",
        "payment",
        "expense",
        "payroll",
        "transfer",
        "adjustment",
        "reconciliation",
      ],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    balanceAfter: { type: Number, required: true },
    occurredAt: { type: Date, required: true, index: true },
    description: { type: String, required: true },
    reference: { type: String },
    counterparty: { type: String },
    transferGroupId: { type: String, index: true },
    relatedAccountId: { type: String },
    relatedAccountName: { type: String },
    sourceType: { type: String },
    sourceId: { type: String, index: true },
    reconciled: { type: Boolean, default: false },
    reconciledAt: { type: Date },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

cashTransactionSchema.index({ org_id: 1, occurredAt: -1 })
cashTransactionSchema.index({ org_id: 1, accountId: 1, occurredAt: -1 })
cashTransactionSchema.index(
  { org_id: 1, sourceType: 1, sourceId: 1 },
  { unique: true, partialFilterExpression: { sourceId: { $type: "string" } } },
)

export const CashTransaction = mongoose.model<ICashTransaction>(
  "CashTransaction",
  cashTransactionSchema,
)
