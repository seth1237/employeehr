import mongoose, { Schema, Document } from "mongoose"

export interface ISupplier extends Document {
  org_id: string
  name: string
  registrationNumber?: string // NEW
  category?: string // NEW: medical, equipment, general, etc
  contactPersons: Array<{  // NEW: array of contacts
    name: string
    role: string
    email: string
    phone: string
  }>
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
  // NEW: Compliance & Performance
  compliance?: {
    taxCompliant: boolean
    licensesValid: boolean
    isoCertified: boolean
    agpoCertified: boolean // Access to Government Procurement Opportunities (Kenya)
  }
  performance?: {
    deliveryRating: number // 1-5
    qualityRating: number // 1-5
    riskRating: "low" | "medium" | "high"
  }
  status: "prospect" | "pending_verification" | "active" | "suspended" | "blacklisted" | "inactive" // UPDATED
  createdBy?: string
  createdAt: Date
  updatedAt: Date
}

const supplierSchema = new Schema<ISupplier>(
  {
    org_id: { type: String, required: true },
    name: { type: String, required: true },
    registrationNumber: { type: String },
    category: { type: String },
    contactPersons: [
      {
        name: { type: String },
        role: { type: String },
        email: { type: String },
        phone: { type: String },
      }
    ],
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
    compliance: {
      taxCompliant: { type: Boolean, default: false },
      licensesValid: { type: Boolean, default: false },
      isoCertified: { type: Boolean, default: false },
      agpoCertified: { type: Boolean, default: false },
    },
    performance: {
      deliveryRating: { type: Number, min: 0, max: 5, default: 0 },
      qualityRating: { type: Number, min: 0, max: 5, default: 0 },
      riskRating: { type: String, enum: ["low", "medium", "high"], default: "medium" },
    },
    status: { 
      type: String, 
      enum: ["prospect", "pending_verification", "active", "suspended", "blacklisted", "inactive"], 
      default: "prospect" 
    },
    createdBy: { type: String }
  },
  { timestamps: true }
)

export const Supplier = mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", supplierSchema)
