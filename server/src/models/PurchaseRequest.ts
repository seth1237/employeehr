import mongoose, { Schema, Document } from "mongoose"

export interface IPurchaseRequest extends Document {
  org_id: string
  requestNumber: string
  requestedBy: string // user id
  department?: string
  purchaseType?: "product" | "department"
  categoryId?: string
  dateRequested: Date
  dateRequired: Date
  items: {
    productId?: string
    productName: string
    quantity: number
    estimatedUnitPrice?: number
    reason?: string
  }[]
  totalEstimatedAmount: number
  status: "draft" | "pending_approval" | "approved" | "rejected" | "converted_to_po"
  approvedBy?: string // user id
  approvalDate?: Date
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}

const purchaseRequestSchema = new Schema<IPurchaseRequest>(
  {
    org_id: { type: String, required: true },
    requestNumber: { type: String, required: true, unique: true },
    requestedBy: { type: String, required: true },
    department: { type: String },
    purchaseType: { type: String, enum: ["product", "department"], default: "product" },
    categoryId: { type: String },
    dateRequested: { type: Date, default: Date.now },
    dateRequired: { type: Date, required: true },
    items: [
      {
        productId: { type: String },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        estimatedUnitPrice: { type: Number },
        reason: { type: String },
      },
    ],
    totalEstimatedAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "rejected", "converted_to_po"],
      default: "draft",
    },
    approvedBy: { type: String },
    approvalDate: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
)

export const PurchaseRequest = mongoose.models.PurchaseRequest || mongoose.model<IPurchaseRequest>("PurchaseRequest", purchaseRequestSchema)
