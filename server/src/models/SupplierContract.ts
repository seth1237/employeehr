import mongoose, { Schema, Document } from "mongoose"

export interface ISupplierContract extends Document {
  org_id: string
  contractNumber: string
  supplierId: string
  title: string
  description?: string
  effectiveDate: Date
  expiryDate: Date
  renewalDate?: Date
  contractValue?: number
  currency: string
  status: "draft" | "active" | "expired" | "terminated" | "renewed"
  alertSent: boolean // To track if expiry alert has been sent
  attachments: {
    fileName: string
    fileUrl: string
  }[]
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const supplierContractSchema = new Schema<ISupplierContract>(
  {
    org_id: { type: String, required: true },
    contractNumber: { type: String, required: true },
    supplierId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    effectiveDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    renewalDate: { type: Date },
    contractValue: { type: Number },
    currency: { type: String, default: "KES" },
    status: {
      type: String,
      enum: ["draft", "active", "expired", "terminated", "renewed"],
      default: "draft",
    },
    alertSent: { type: Boolean, default: false },
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
      }
    ],
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
)

supplierContractSchema.index({ org_id: 1, contractNumber: 1 }, { unique: true })

export const SupplierContract = mongoose.models.SupplierContract || mongoose.model<ISupplierContract>("SupplierContract", supplierContractSchema)
