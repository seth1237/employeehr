import mongoose, { Schema, Document } from "mongoose"

export interface ISupplier extends Document {
  org_id: string
  name: string
  contactName?: string
  email?: string
  phone?: string
  address?: string
  taxPin?: string
  paymentTerms?: string
  bankDetails?: {
    bankName: string
    accountName: string
    accountNumber: string
    branch?: string
  }
  status: "active" | "inactive"
  createdAt: Date
  updatedAt: Date
}

const supplierSchema = new Schema<ISupplier>(
  {
    org_id: { type: String, required: true },
    name: { type: String, required: true },
    contactName: { type: String },
    email: { type: String },
    phone: { type: String },
    address: { type: String },
    taxPin: { type: String },
    paymentTerms: { type: String },
    bankDetails: {
      bankName: { type: String },
      accountName: { type: String },
      accountNumber: { type: String },
      branch: { type: String },
    },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
)

export const Supplier = mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", supplierSchema)
