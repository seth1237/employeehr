import mongoose, { Schema, Document } from "mongoose"

export interface IPurchaseOrder extends Document {
  org_id: string
  poNumber: string
  purchaseRequestId?: string // Link to PR if applicable
  supplierId: string
  orderDate: Date
  deliveryDate: Date
  items: {
    productId?: string
    productName: string
    quantity: number
    unitPrice: number
    taxRate: number // e.g. 0, 16 for VAT
    lineTotal: number
  }[]
  subTotal: number
  taxAmount: number
  grandTotal: number
  status: "draft" | "issued" | "partially_received" | "fulfilled" | "cancelled"
  termsAndConditions?: string
  issuedBy: string // user id
  createdAt: Date
  updatedAt: Date
}

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    org_id: { type: String, required: true },
    poNumber: { type: String, required: true, unique: true },
    purchaseRequestId: { type: String },
    supplierId: { type: String, required: true },
    orderDate: { type: Date, default: Date.now },
    deliveryDate: { type: Date, required: true },
    items: [
      {
        productId: { type: String },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
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
      enum: ["draft", "issued", "partially_received", "fulfilled", "cancelled"],
      default: "draft",
    },
    termsAndConditions: { type: String },
    issuedBy: { type: String, required: true },
  },
  { timestamps: true }
)

export const PurchaseOrder = mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>("PurchaseOrder", purchaseOrderSchema)
