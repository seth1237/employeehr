import mongoose, { Schema, Document } from "mongoose"

export interface ISupplierPayment extends Document {
  org_id: string
  paymentNumber: string
  supplierId: string
  invoiceIds: string[] // One payment can cover multiple invoices
  paymentDate: Date
  amount: number
  currency: string
  paymentMethod: "bank_transfer" | "mpesa_b2b" | "cheque" | "cash"
  referenceNumber?: string // EFT Ref, Cheque No, M-Pesa Code
  bankAccountId?: string // Internal bank account paid from
  status: "draft" | "pending_approval" | "approved" | "processed" | "failed" | "cancelled"
  remarks?: string
  attachments?: {
    fileName: string
    fileUrl: string
  }[]
  createdBy: string
  approvedBy?: string
  glPosted: boolean // Flag for finance integration
  createdAt: Date
  updatedAt: Date
}

const supplierPaymentSchema = new Schema<ISupplierPayment>(
  {
    org_id: { type: String, required: true },
    paymentNumber: { type: String, required: true },
    supplierId: { type: String, required: true },
    invoiceIds: [{ type: String, required: true }],
    paymentDate: { type: Date, default: Date.now },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "KES" },
    paymentMethod: {
      type: String,
      enum: ["bank_transfer", "mpesa_b2b", "cheque", "cash"],
      required: true,
    },
    referenceNumber: { type: String },
    bankAccountId: { type: String },
    status: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "processed", "failed", "cancelled"],
      default: "draft",
    },
    remarks: { type: String },
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
      }
    ],
    createdBy: { type: String, required: true },
    approvedBy: { type: String },
    glPosted: { type: Boolean, default: false },
  },
  { timestamps: true }
)

supplierPaymentSchema.index({ org_id: 1, paymentNumber: 1 }, { unique: true })

export const SupplierPayment = mongoose.models.SupplierPayment || mongoose.model<ISupplierPayment>("SupplierPayment", supplierPaymentSchema)
