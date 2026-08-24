import mongoose, { Schema } from "mongoose"

interface IDebitNoteItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  description?: string
}

interface IDebitNoteClient {
  name: string
  number: string
  location: string
}

export interface IDebitNote {
  _id?: string
  org_id: string
  debitNoteNumber: string
  invoiceId: string
  invoiceNumber: string
  client: IDebitNoteClient
  items: IDebitNoteItem[]
  subTotal: number
  reason:
    | "undercharged"
    | "additional_items"
    | "shipping"
    | "price_correction"
    | "other"
  reasonDetails?: string
  status: "draft" | "issued" | "cancelled"
  createdBy: string
  issuedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

const debitNoteItemSchema = new Schema<IDebitNoteItem>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    description: { type: String },
  },
  { _id: false },
)

const debitNoteSchema = new Schema<IDebitNote>(
  {
    org_id: { type: String, required: true, index: true },
    debitNoteNumber: { type: String, required: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true },
    client: {
      name: { type: String, required: true },
      number: { type: String, required: true },
      location: { type: String, required: true },
    },
    items: { type: [debitNoteItemSchema], required: true },
    subTotal: { type: Number, required: true, min: 0 },
    reason: {
      type: String,
      enum: ["undercharged", "additional_items", "shipping", "price_correction", "other"],
      required: true,
    },
    reasonDetails: { type: String },
    status: {
      type: String,
      enum: ["draft", "issued", "cancelled"],
      default: "draft",
    },
    createdBy: { type: String, required: true },
    issuedAt: { type: Date },
  },
  { timestamps: true },
)

debitNoteSchema.index({ org_id: 1, debitNoteNumber: 1 }, { unique: true })
debitNoteSchema.index({ org_id: 1, invoiceId: 1 })

export const DebitNote = mongoose.model<IDebitNote>("DebitNote", debitNoteSchema)

export const DEBIT_NOTE_REASONS = {
  undercharged: "Customer was undercharged",
  additional_items: "Additional items or services billed",
  shipping: "Shipping / delivery charges",
  price_correction: "Price correction after invoicing",
  other: "Other",
}
