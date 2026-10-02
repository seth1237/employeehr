import mongoose, { Schema } from "mongoose"

export type PosSaleStatus = "held" | "completed" | "voided"
export type PosPaymentMethod = "cash" | "mpesa" | "card" | "bank"

export interface IPosSaleLine {
  productId: string
  productName: string
  sku?: string
  quantity: number
  unitPrice: number
  lineTotal: number
  taxRate?: number
  taxAmount?: number
  taxable?: boolean
}

export interface IPosPayment {
  method: PosPaymentMethod
  amount: number
  tendered?: number
  change?: number
  reference?: string
  phone?: string
  mpesaCheckoutRequestId?: string
  mpesaReceiptCode?: string
  status?: "pending" | "confirmed" | "failed"
}

const lineSchema = new Schema<IPosSaleLine>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    sku: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    taxable: { type: Boolean, default: false },
  },
  { _id: false },
)

const paymentSchema = new Schema<IPosPayment>(
  {
    method: { type: String, enum: ["cash", "mpesa", "card", "bank"], required: true },
    amount: { type: Number, required: true, min: 0 },
    tendered: { type: Number, min: 0 },
    change: { type: Number, min: 0 },
    reference: { type: String, trim: true },
    phone: { type: String, trim: true },
    mpesaCheckoutRequestId: { type: String, trim: true },
    mpesaReceiptCode: { type: String, trim: true },
    status: { type: String, enum: ["pending", "confirmed", "failed"], default: "confirmed" },
  },
  { _id: false },
)

const posSaleSchema = new Schema(
  {
    org_id: { type: String, required: true, index: true },
    receiptNo: { type: String, index: true },
    receiptSeq: { type: Number },
    holdNo: { type: Number },
    cashierId: { type: String, required: true, index: true },
    cashierName: { type: String, required: true },
    status: {
      type: String,
      enum: ["held", "completed", "voided"],
      default: "held",
      index: true,
    },
    customerName: { type: String, default: "Walk-in" },
    customerPhone: { type: String, default: "" },
    items: { type: [lineSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    discountPercent: { type: Number, default: 0, min: 0 },
    discountReason: { type: String, default: "" },
    taxTotal: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    payments: { type: [paymentSchema], default: [] },
    invoiceId: { type: String },
    invoiceNumber: { type: String },
    heldAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true },
)

posSaleSchema.index({ org_id: 1, receiptNo: 1 }, { unique: true, sparse: true })
posSaleSchema.index({ org_id: 1, status: 1, cashierId: 1, createdAt: -1 })

export const PosSale = mongoose.model("PosSale", posSaleSchema)
