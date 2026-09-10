import mongoose, { Schema, Document } from "mongoose"

export interface IGoodsReceiptNote extends Document {
  org_id: string
  grnNumber: string
  purchaseOrderId: string
  supplierId: string
  receiptDate: Date
  deliveryNoteNumber?: string // Supplier's DN number
  items: {
    productId?: string
    productName: string
    orderedQuantity: number
    receivedQuantity: number
    rejectedQuantity: number
    rejectionReason?: string
  }[]
  receivedBy: string // user id
  status: "draft" | "confirmed" // once confirmed, stock is updated
  stockUpdated: boolean
  createdAt: Date
  updatedAt: Date
}

const goodsReceiptNoteSchema = new Schema<IGoodsReceiptNote>(
  {
    org_id: { type: String, required: true },
    grnNumber: { type: String, required: true, unique: true },
    purchaseOrderId: { type: String, required: true },
    supplierId: { type: String, required: true },
    receiptDate: { type: Date, default: Date.now },
    deliveryNoteNumber: { type: String },
    items: [
      {
        productId: { type: String },
        productName: { type: String, required: true },
        orderedQuantity: { type: Number, required: true },
        receivedQuantity: { type: Number, required: true, min: 0 },
        rejectedQuantity: { type: Number, default: 0 },
        rejectionReason: { type: String },
      },
    ],
    receivedBy: { type: String, required: true },
    status: { type: String, enum: ["draft", "confirmed"], default: "draft" },
    stockUpdated: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export const GoodsReceiptNote = mongoose.models.GoodsReceiptNote || mongoose.model<IGoodsReceiptNote>("GoodsReceiptNote", goodsReceiptNoteSchema)
