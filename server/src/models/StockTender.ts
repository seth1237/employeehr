import mongoose, { Schema } from "mongoose"

interface ITenderItem {
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
  categoryGroup?: string
}

interface ITenderClient {
  name: string
  number: string
  location: string
  contactPerson?: string
}

export interface IStockTender {
  _id?: string
  org_id: string
  tenderNumber: string
  tenderName: string
  department: string
  client: ITenderClient
  items: ITenderItem[]
  subTotal: number
  categoryOrder?: string[]
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

const tenderItemSchema = new Schema<ITenderItem>(
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
    categoryGroup: { type: String },
  },
  { _id: false },
)

const stockTenderSchema = new Schema<IStockTender>(
  {
    org_id: { type: String, required: true, index: true },
    tenderNumber: { type: String, required: true, index: true },
    tenderName: { type: String, required: true },
    department: { type: String, required: true },
    client: {
      name: { type: String, required: true },
      number: { type: String, required: true },
      location: { type: String, required: true },
      contactPerson: { type: String },
    },
    items: { type: [tenderItemSchema], required: true },
    subTotal: { type: Number, required: true, min: 0 },
    categoryOrder: { type: [String], default: [] },
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

stockTenderSchema.index({ org_id: 1, tenderNumber: 1 }, { unique: true })

export const StockTender = mongoose.model<IStockTender>("StockTender", stockTenderSchema)
