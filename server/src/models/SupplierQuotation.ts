import mongoose, { Schema, Document } from "mongoose"

export interface ISupplierQuotation extends Document {
  org_id: string
  quotationNumber: string // Vendor's reference number
  rfqId?: string // Link to RFQ if applicable
  supplierId: string
  validUntil: Date
  items: {
    productId?: string
    productName: string
    quantity: number
    unitPrice: number
    taxRate: number
    lineTotal: number
    deliveryTimeDays?: number
    warrantyMonths?: number
    remarks?: string
  }[]
  subTotal: number
  taxAmount: number
  grandTotal: number
  currency: string
  deliveryTerms?: string
  paymentTerms?: string
  attachments: {
    fileName: string
    fileUrl: string
  }[]
  // Evaluation Matrix Scores
  evaluation?: {
    priceScore?: number // Weight: 35%
    deliveryScore?: number // Weight: 20%
    warrantyScore?: number // Weight: 15%
    supplierRatingScore?: number // Weight: 15%
    complianceScore?: number // Weight: 15%
    totalScore?: number
    rank?: number
    evaluatorNotes?: string
  }
  status: "draft" | "submitted" | "under_review" | "awarded" | "rejected"
  submittedBy?: string // supplier contact or internal user who uploaded it
  createdAt: Date
  updatedAt: Date
}

const supplierQuotationSchema = new Schema<ISupplierQuotation>(
  {
    org_id: { type: String, required: true },
    quotationNumber: { type: String, required: true },
    rfqId: { type: String },
    supplierId: { type: String, required: true },
    validUntil: { type: Date, required: true },
    items: [
      {
        productId: { type: String },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        taxRate: { type: Number, default: 0 },
        lineTotal: { type: Number, required: true, min: 0 },
        deliveryTimeDays: { type: Number },
        warrantyMonths: { type: Number },
        remarks: { type: String },
      },
    ],
    subTotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    currency: { type: String, default: "KES" },
    deliveryTerms: { type: String },
    paymentTerms: { type: String },
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
      }
    ],
    evaluation: {
      priceScore: { type: Number },
      deliveryScore: { type: Number },
      warrantyScore: { type: Number },
      supplierRatingScore: { type: Number },
      complianceScore: { type: Number },
      totalScore: { type: Number },
      rank: { type: Number },
      evaluatorNotes: { type: String },
    },
    status: {
      type: String,
      enum: ["draft", "submitted", "under_review", "awarded", "rejected"],
      default: "draft",
    },
    submittedBy: { type: String },
  },
  { timestamps: true }
)

supplierQuotationSchema.index({ org_id: 1, supplierId: 1, quotationNumber: 1 }, { unique: true })

export const SupplierQuotation = mongoose.models.SupplierQuotation || mongoose.model<ISupplierQuotation>("SupplierQuotation", supplierQuotationSchema)
