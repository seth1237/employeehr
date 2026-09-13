import mongoose, { Schema, Document } from "mongoose"

export interface IGoodsReceiptNote extends Document {
  org_id: string
  grnNumber: string
  purchaseOrderId: string
  supplierId: string
  receiptDate: Date
  deliveryNoteNumber?: string // Supplier's DN number
  warehouseId?: string // NEW: Receiving location
  items: {
    productId?: string
    productName: string
    orderedQuantity: number
    receivedQuantity: number
    rejectedQuantity: number
    rejectionReason?: string
    batchNumber?: string // NEW: Medicine tracking
    expiryDate?: Date // NEW: Consumables tracking
    serialNumber?: string // NEW: Equipment tracking
  }[]
  receivedBy: string // user id
  // NEW: Quality Inspection Workflow
  inspectionStatus: "pending" | "accepted" | "accepted_with_remarks" | "rejected" | "quarantined"
  inspectedBy?: string // Quality Officer ID
  inspectionDate?: Date
  inspectionRemarks?: string
  status: "draft" | "pending_inspection" | "confirmed" // UPDATED: once confirmed, stock is updated
  stockUpdated: boolean
  createdAt: Date
  updatedAt: Date
}

const goodsReceiptNoteSchema = new Schema<IGoodsReceiptNote>(
  {
    org_id: { type: String, required: true },
    grnNumber: { type: String, required: true },
    purchaseOrderId: { type: String, required: true },
    supplierId: { type: String, required: true },
    receiptDate: { type: Date, default: Date.now },
    deliveryNoteNumber: { type: String },
    warehouseId: { type: String },
    items: [
      {
        productId: { type: String },
        productName: { type: String, required: true },
        orderedQuantity: { type: Number, required: true },
        receivedQuantity: { type: Number, required: true, min: 0 },
        rejectedQuantity: { type: Number, default: 0 },
        rejectionReason: { type: String },
        batchNumber: { type: String },
        expiryDate: { type: Date },
        serialNumber: { type: String }
      },
    ],
    receivedBy: { type: String, required: true },
    inspectionStatus: { 
      type: String, 
      enum: ["pending", "accepted", "accepted_with_remarks", "rejected", "quarantined"], 
      default: "pending" 
    },
    inspectedBy: { type: String },
    inspectionDate: { type: Date },
    inspectionRemarks: { type: String },
    status: { type: String, enum: ["draft", "pending_inspection", "confirmed"], default: "draft" },
    stockUpdated: { type: Boolean, default: false },
  },
  { timestamps: true }
)

goodsReceiptNoteSchema.index({ org_id: 1, grnNumber: 1 }, { unique: true })

export const GoodsReceiptNote = mongoose.models.GoodsReceiptNote || mongoose.model<IGoodsReceiptNote>("GoodsReceiptNote", goodsReceiptNoteSchema)
