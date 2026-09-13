import mongoose, { Schema, Document } from "mongoose"

export interface IPurchaseRequest extends Document {
  org_id: string
  requestNumber: string
  requestedBy: string // user id
  department?: string
  costCenter?: string // NEW
  priority: "low" | "medium" | "high" | "emergency" // NEW
  purchaseType?: "product" | "department"
  categoryId?: string
  dateRequested: Date
  dateRequired: Date
  items: {
    productId?: string
    productName: string
    quantity: number
    unit?: string // NEW
    estimatedUnitPrice?: number
    reason?: string
  }[]
  justification?: string // NEW
  totalEstimatedAmount: number
  status: "draft" | "pending_approval" | "approved" | "rejected" | "converted_to_rfq" | "converted_to_po" // UPDATED
  // NEW: Approval Workflow Support (multiple approvers)
  workflowId?: string
  approvalStage?: number
  approvers: Array<{
    userId: string
    role: string
    status: "pending" | "approved" | "rejected" | "escalated"
    date?: Date
    comments?: string
  }>
  // Budget Control
  budgetValidated?: boolean
  reservedAmount?: number
  // Legacy fields (kept for backward compatibility during transition)
  approvedBy?: string // user id
  approvalDate?: Date
  rejectionReason?: string
  createdAt: Date
  updatedAt: Date
}

const purchaseRequestSchema = new Schema<IPurchaseRequest>(
  {
    org_id: { type: String, required: true },
    requestNumber: { type: String, required: true },
    requestedBy: { type: String, required: true },
    department: { type: String },
    costCenter: { type: String },
    priority: { type: String, enum: ["low", "medium", "high", "emergency"], default: "medium" },
    purchaseType: { type: String, enum: ["product", "department"], default: "product" },
    categoryId: { type: String },
    dateRequested: { type: Date, default: Date.now },
    dateRequired: { type: Date, required: true },
    items: [
      {
        productId: { type: String },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unit: { type: String },
        estimatedUnitPrice: { type: Number },
        reason: { type: String },
      },
    ],
    justification: { type: String },
    totalEstimatedAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "pending_approval", "approved", "rejected", "converted_to_rfq", "converted_to_po"],
      default: "draft",
    },
    workflowId: { type: String },
    approvalStage: { type: Number, default: 0 },
    approvers: [
      {
        userId: { type: String },
        role: { type: String },
        status: { type: String, enum: ["pending", "approved", "rejected", "escalated"], default: "pending" },
        date: { type: Date },
        comments: { type: String }
      }
    ],
    budgetValidated: { type: Boolean, default: false },
    reservedAmount: { type: Number, default: 0 },
    approvedBy: { type: String },
    approvalDate: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
)

purchaseRequestSchema.index({ org_id: 1, requestNumber: 1 }, { unique: true })

export const PurchaseRequest = mongoose.models.PurchaseRequest || mongoose.model<IPurchaseRequest>("PurchaseRequest", purchaseRequestSchema)
