import mongoose, { Schema, Document } from "mongoose"

export interface IPurchaseReturn extends Document {
  org_id: string
  returnNumber: string
  purchaseOrderId?: string
  goodsReceiptNoteId: string
  supplierId: string
  returnDate: Date
  items: {
    productId?: string
    productName: string
    returnedQuantity: number
    unitPrice: number
    lineTotal: number
    reason: "damaged" | "wrong_item" | "expired" | "quality_failed" | "other"
    batchNumber?: string
    serialNumber?: string
    remarks?: string
  }[]
  subTotal: number
  taxAmount: number
  grandTotal: number
  outcome: "credit_note" | "replacement" | "refund" | "pending"
  status: "draft" | "approved" | "dispatched_to_supplier" | "resolved" | "cancelled"
  stockReduced: boolean // Whether inventory has been decremented
  creditNoteId?: string // If a credit note was issued by the supplier
  createdBy: string // user id
  approvedBy?: string // user id
  createdAt: Date
  updatedAt: Date
}

const purchaseReturnSchema = new Schema<IPurchaseReturn>(
  {
    org_id: { type: String, required: true },
    returnNumber: { type: String, required: true },
    purchaseOrderId: { type: String },
    goodsReceiptNoteId: { type: String, required: true },
    supplierId: { type: String, required: true },
    returnDate: { type: Date, default: Date.now },
    items: [
      {
        productId: { type: String },
        productName: { type: String, required: true },
        returnedQuantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        lineTotal: { type: Number, required: true, min: 0 },
        reason: { 
          type: String, 
          enum: ["damaged", "wrong_item", "expired", "quality_failed", "other"],
          required: true
        },
        batchNumber: { type: String },
        serialNumber: { type: String },
        remarks: { type: String },
      },
    ],
    subTotal: { type: Number, required: true, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true, default: 0 },
    outcome: { 
      type: String, 
      enum: ["credit_note", "replacement", "refund", "pending"], 
      default: "pending" 
    },
    status: {
      type: String,
      enum: ["draft", "approved", "dispatched_to_supplier", "resolved", "cancelled"],
      default: "draft",
    },
    stockReduced: { type: Boolean, default: false },
    creditNoteId: { type: String },
    createdBy: { type: String, required: true },
    approvedBy: { type: String },
  },
  { timestamps: true }
)

purchaseReturnSchema.index({ org_id: 1, returnNumber: 1 }, { unique: true })

export const PurchaseReturn = mongoose.models.PurchaseReturn || mongoose.model<IPurchaseReturn>("PurchaseReturn", purchaseReturnSchema)
