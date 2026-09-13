import mongoose, { Schema, Document } from "mongoose"

export interface IPurchaseOrder extends Document {
  org_id: string
  poNumber: string
  purchaseRequestId?: string // Link to PR if applicable
  rfqId?: string // NEW: link to RFQ if generated from quote comparison
  quotationId?: string // NEW: supplier's quotation ID
  supplierId: string
  orderDate: Date
  deliveryDate: Date
  deliveryAddress?: string // NEW
  warehouseId?: string // NEW: destination warehouse
  currency?: string // NEW
  items: {
    productId?: string
    productName: string
    quantity: number
    receivedQuantity: number // NEW: track partial fulfillments
    unitPrice: number
    taxRate: number // e.g. 0, 16 for VAT
    lineTotal: number
  }[]
  subTotal: number
  taxAmount: number
  grandTotal: number
  status: "draft" | "pending_approval" | "approved" | "sent" | "confirmed" | "partially_received" | "fulfilled" | "cancelled" // UPDATED
  termsAndConditions?: string
  paymentTerms?: string // NEW
  issuedBy: string // user id
  approvedBy?: string // NEW
  createdAt: Date
  updatedAt: Date
}

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    org_id: { type: String, required: true },
    poNumber: { type: String, required: true },
    purchaseRequestId: { type: String },
    rfqId: { type: String },
    quotationId: { type: String },
    supplierId: { type: String, required: true },
    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date, required: true },
    deliveryAddress: { type: String },
    warehouseId: { type: String },
    currency: { type: String, default: 'KES' },
    items: [
      {
        productId: { type: String },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        receivedQuantity: { type: Number, default: 0 },
        unitPrice: { type: Number, required: true, min: 0 },
        taxRate: { type: Number, default: 0 },
        lineTotal: { type: Number, required: true, min: 0 },
      },
    ],
    subTotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    status: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "sent", "confirmed", "partially_received", "fulfilled", "cancelled"],
      default: "draft",
    },
    termsAndConditions: { type: String },
    paymentTerms: { type: String },
    issuedBy: { type: String, required: true },
    approvedBy: { type: String },
  },
  { timestamps: true }
)

purchaseOrderSchema.index({ org_id: 1, poNumber: 1 }, { unique: true })

export const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>("PurchaseOrder", purchaseOrderSchema)
