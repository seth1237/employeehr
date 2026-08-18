import mongoose, { Schema, Document } from "mongoose"

export type SalesQuoteStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "downloaded"

export interface ISalesQuoteItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  lineTotal: number
  availableQtySnapshot?: number
}

export interface ISalesQuote extends Document {
  org_id: string
  userId: string
  report_id?: string
  visit_id?: string
  quoteNumber: string
  clientName: string
  clientPhone?: string
  customer_id?: string
  items: ISalesQuoteItem[]
  subTotal: number
  taxTotal: number
  grandTotal: number
  status: SalesQuoteStatus
  notes?: string
  rejectionReason?: string
  submittedAt?: Date
  reviewedAt?: Date
  reviewedBy?: string
  downloadedAt?: Date
  downloadedBy?: string
  createdAt: Date
  updatedAt: Date
}

const itemSchema = new Schema<ISalesQuoteItem>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    taxRate: { type: Number, default: 16 },
    taxAmount: { type: Number, default: 0 },
    lineTotal: { type: Number, required: true },
    availableQtySnapshot: { type: Number },
  },
  { _id: false },
)

const salesQuoteSchema = new Schema<ISalesQuote>(
  {
    org_id: { type: String, required: true },
    userId: { type: String, required: true },
    report_id: { type: String },
    visit_id: { type: String },
    quoteNumber: { type: String, required: true },
    clientName: { type: String, required: true },
    clientPhone: { type: String },
    customer_id: { type: String },
    items: { type: [itemSchema], default: [] },
    subTotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected", "downloaded"],
      default: "draft",
    },
    notes: { type: String },
    rejectionReason: { type: String },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: String },
    downloadedAt: { type: Date },
    downloadedBy: { type: String },
  },
  { timestamps: true },
)

salesQuoteSchema.index({ org_id: 1, userId: 1, createdAt: -1 })
salesQuoteSchema.index({ org_id: 1, status: 1, createdAt: -1 })
salesQuoteSchema.index({ org_id: 1, quoteNumber: 1 }, { unique: true })

export const SalesQuote = mongoose.model<ISalesQuote>("SalesQuote", salesQuoteSchema)
