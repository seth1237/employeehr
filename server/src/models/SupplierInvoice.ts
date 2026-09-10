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
    productName: string
    quantity: number
    unitPrice: number
    lineTotal: number
  }[]
  subTotal: number
  taxAmount: number
  grandTotal: number
  paidAmount: number
  balanceRemaining: number
  status: "draft" | "pending_payment" | "partially_paid" | "paid" | "cancelled"
  glPosted: boolean // Flag to check if it has hit the General Ledger
  postedBy?: string
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
        productName: { type: String, required: true },
        quantity: { type: Number, required: true },
        unitPrice: { type: Number, required: true },
        lineTotal: { type: Number, required: true },
      },
    ],
    subTotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceRemaining: { type: Number, required: true },
    status: {
      type: String,
      enum: ["draft", "pending_payment", "partially_paid", "paid", "cancelled"],
      default: "draft",
    },
    glPosted: { type: Boolean, default: false },
    postedBy: { type: String },
  },
  { timestamps: true }
)

// Compound index to ensure invoice number is unique per supplier per org
supplierInvoiceSchema.index({ org_id: 1, supplierId: 1, invoiceNumber: 1 }, { unique: true })

export const SupplierInvoice = mongoose.models.SupplierInvoice || mongoose.model<ISupplierInvoice>("SupplierInvoice", supplierInvoiceSchema)
