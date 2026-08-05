import mongoose, { Schema } from "mongoose"

interface IQuotationItem {
  productId: string
  productName: string
  quantity: number
  productUnitPrice?: number
  soldUnitPrice?: number
  unitPrice: number
  lineTotal: number
  description?: string
  productDescription?: string
  productType?: string
  isOutsourced?: boolean
  imageUrl?: string
  showImageOnQuote?: boolean
}

interface IQuotationClient {
  name: string
  number: string
  location: string
  contactPerson?: string
}

export interface IStockQuotation {
  _id?: string
  org_id: string
  quotationNumber: string
  client: IQuotationClient
  items: IQuotationItem[]
  subTotal: number
  status: "draft" | "pending_approval" | "converted" | "cancelled"
  createdBy: string
  ownerUserId?: string
  branchId?: string
  approvedBy?: string
  approvedAt?: Date
  convertedInvoiceId?: string
  createdAt?: Date
  updatedAt?: Date
}

const quotationItemSchema = new Schema<IQuotationItem>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    productUnitPrice: { type: Number, min: 0 },
    soldUnitPrice: { type: Number, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    description: { type: String },
    productDescription: { type: String },
    productType: { type: String },
    isOutsourced: { type: Boolean, default: false },
    imageUrl: { type: String },
    showImageOnQuote: { type: Boolean, default: false },
  },
  { _id: false },
)

const stockQuotationSchema = new Schema<IStockQuotation>(
  {
    org_id: { type: String, required: true, index: true },
    quotationNumber: { type: String, required: true, index: true },
    client: {
      name: { type: String, required: true },
      number: { type: String, required: true },
      location: { type: String, required: true },
      contactPerson: { type: String },
    },
    items: { type: [quotationItemSchema], required: true },
    subTotal: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["draft", "pending_approval", "converted", "cancelled"],
      default: "draft",
    },
    createdBy: { type: String, required: true },
    ownerUserId: { type: String, index: true },
    branchId: { type: String, index: true },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    convertedInvoiceId: { type: String },
  },
  { timestamps: true },
)

stockQuotationSchema.index({ org_id: 1, quotationNumber: 1 }, { unique: true })

export const StockQuotation = mongoose.model<IStockQuotation>("StockQuotation", stockQuotationSchema)
