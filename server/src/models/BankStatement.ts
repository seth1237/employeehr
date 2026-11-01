import mongoose, { Schema, Document } from "mongoose"

export interface IBankStatementLine {
  date: Date
  description: string
  amount: number
  reference?: string
  matchedTransactionId?: string
  status: "unmatched" | "matched"
}

export interface IBankStatement extends Document {
  org_id: string
  accountId: string
  fileName?: string
  importedAt: Date
  importedBy: string
  lines: IBankStatementLine[]
}

const bankStatementSchema = new Schema<IBankStatement>(
  {
    org_id: { type: String, required: true, index: true },
    accountId: { type: String, required: true },
    fileName: { type: String },
    importedAt: { type: Date, default: Date.now },
    importedBy: { type: String, required: true },
    lines: [
      {
        date: { type: Date, required: true },
        description: { type: String, required: true },
        amount: { type: Number, required: true },
        reference: { type: String },
        matchedTransactionId: { type: String },
        status: { type: String, enum: ["unmatched", "matched"], default: "unmatched" },
      },
    ],
  },
  { timestamps: true },
)

bankStatementSchema.index({ org_id: 1, accountId: 1, importedAt: -1 })

export const BankStatement = mongoose.model<IBankStatement>("BankStatement", bankStatementSchema)
