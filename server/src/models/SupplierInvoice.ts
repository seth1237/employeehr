import mongoose, { Schema, Document } from "mongoose"

export interface ISupplierInvoice extends Document {
  org_id: string
  invoiceNumber: string // Supplier's invoice number
  purchaseOrderId?: string
  grnId?: string
  supplierId: string
  invoiceDate: Date
  dueDate: Date
  items: {
    productId?: string // NEW
    productName: string
    quantity: number
    unitPrice: number
    taxRate?: number // NEW
    lineTotal: number
  }[]
  subTotal: number
  discountAmount?: number // NEW
  taxAmount: number
  grandTotal: number
  paidAmount: number
  balanceRemaining: number
  // NEW: Three-Way Matching Status
  matchStatus: "pending" | "matched" | "mismatch" | "override_approved"
  mismatchReason?: string
  // UPDATED: Added approved_for_payment
  status: "draft" | "pending_matching" | "approved_for_payment" | "pending_payment" | "partially_paid" | "paid" | "cancelled"
  // Attachments (e.g. eTIMS receipt)
  attachments?: {
    fileName: string
    fileUrl: string
  }[]
  glPosted: boolean // Flag to check if it has hit the General Ledger
  postedBy?: string
  createdBy?: string // NEW
  createdAt: Date
  updatedAt: Date
}

const supplierInvoiceSchema = new Schema<ISupplierInvoice>(
  {
    org_id: { type: String, required: true },
    invoiceNumber: { type: String, required: true }, // Not globally unique as different suppliers might use same number
    purchaseOrderId: { type: String },
    grnId: { type: String },
    supplierId: { type: String, required: true },
    invoiceDate: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    items: [
      {
        productId: { type: String },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        taxRate: { type: Number, default: 0 },
        lineTotal: { type: Number, required: true },
      },
    ],
    subTotal: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceRemaining: { type: Number, required: true },
    matchStatus: {
      type: String,
      enum: ["pending", "matched", "mismatch", "override_approved"],
      default: "pending",
    },
    mismatchReason: { type: String },
    status: {
      type: String,
      enum: ["draft", "pending_matching", "approved_for_payment", "pending_payment", "partially_paid", "paid", "cancelled"],
      default: "draft",
    },
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
      }
    ],
    glPosted: { type: Boolean, default: false },
    postedBy: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true }
)

// Compound index to ensure invoice number is unique per supplier per org
supplierInvoiceSchema.index({ org_id: 1, supplierId: 1, invoiceNumber: 1 }, { unique: true })

export const SupplierInvoice = mongoose.models.SupplierInvoice || mongoose.model<ISupplierInvoice>("SupplierInvoice", supplierInvoiceSchema)
