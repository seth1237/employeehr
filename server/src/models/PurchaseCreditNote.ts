import mongoose, { Schema, Document } from "mongoose"

export interface IPurchaseCreditNote extends Document {
  org_id: string
  supplierId: string
  supplierName: string
  billId?: string
  date: Date
  amount: number
  reason: string
  reference?: string
  glPosted: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const purchaseCreditNoteSchema = new Schema<IPurchaseCreditNote>(
  {
    org_id: { type: String, required: true, index: true },
    supplierId: { type: String, required: true, index: true },
    supplierName: { type: String, required: true },
    billId: { type: String },
    date: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    reason: { type: String, required: true },
    reference: { type: String },
    glPosted: { type: Boolean, default: false },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

export const PurchaseCreditNote =
  mongoose.models.PurchaseCreditNote ||
  mongoose.model<IPurchaseCreditNote>("PurchaseCreditNote", purchaseCreditNoteSchema)
