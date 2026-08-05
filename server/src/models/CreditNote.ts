import mongoose, { Schema } from "mongoose"

interface ICreditNoteItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  originalInvoiceItemQty?: number
}

interface ICreditNoteClient {
  name: string
  number: string
  location: string
}

export interface ICreditNote {
  _id?: string
  org_id: string
  creditNoteNumber: string
  invoiceId: string
  invoiceNumber: string
  client: ICreditNoteClient
  items: ICreditNoteItem[]
  subTotal: number
  reason: "returned" | "overcharged" | "incorrect_items" | "discounts_applied" | "partial_cancel" | "other"
  reasonDetails?: string
  status: "draft" | "issued" | "applied"
  appliedToInvoiceId?: string
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const creditNoteItemSchema = new Schema<ICreditNoteItem>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    originalInvoiceItemQty: { type: Number, min: 0 },
  },
  { _id: false },
)

const creditNoteSchema = new Schema<ICreditNote>(
  {
    org_id: { type: String, required: true, index: true },
    creditNoteNumber: { type: String, required: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true },
    client: {
      name: { type: String, required: true },
      number: { type: String, required: true },
      location: { type: String, required: true },
    },
    items: { type: [creditNoteItemSchema], required: true },
    subTotal: { type: Number, required: true, min: 0 },
    reason: {
      type: String,
      enum: ["returned", "overcharged", "incorrect_items", "discounts_applied", "partial_cancel", "other"],
      required: true,
    },
    reasonDetails: { type: String },
    status: {
      type: String,
      enum: ["draft", "issued", "applied"],
      default: "draft",
    },
    appliedToInvoiceId: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

creditNoteSchema.index({ org_id: 1, creditNoteNumber: 1 }, { unique: true })
creditNoteSchema.index({ org_id: 1, invoiceId: 1 })

export const CreditNote = mongoose.model<ICreditNote>("CreditNote", creditNoteSchema)
