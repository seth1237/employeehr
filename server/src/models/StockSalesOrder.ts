import mongoose, { Schema } from "mongoose"

export interface ISalesOrderItem {
  productId: string
  productName: string
  quantity: number
  reservedQuantity: number
  invoicedQuantity: number
  productUnitPrice?: number
  soldUnitPrice?: number
  unitPrice: number
  lineTotal: number
  taxable?: boolean
  taxRate?: number
  taxAmount?: number
  totalAfterTax?: number
  description?: string
  productDescription?: string
  productType?: string
  isOutsourced?: boolean
  imageUrl?: string
}

export interface ISalesOrderClient {
  name: string
  number: string
  location: string
  contactPerson?: string
}

export interface IStockSalesOrder {
  _id?: string
  org_id: string
  orderNumber: string
  quotationId?: string
  quotationNumber?: string
  convertedInvoiceId?: string
  client: ISalesOrderClient
  items: ISalesOrderItem[]
  subTotal: number
  taxTotal?: number
  grandTotal?: number
  status: "confirmed" | "invoiced" | "cancelled"
  branchId?: string
  ownerUserId?: string
  createdBy: string
  reservedAt?: Date
  invoicedAt?: Date
  cancelledAt?: Date
  cancelReason?: string
  createdAt?: Date
  updatedAt?: Date
}

const itemSchema = new Schema<ISalesOrderItem>(
  {
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    reservedQuantity: { type: Number, required: true, min: 0, default: 0 },
    invoicedQuantity: { type: Number, required: true, min: 0, default: 0 },
    productUnitPrice: { type: Number, min: 0 },
    soldUnitPrice: { type: Number, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    taxable: { type: Boolean, default: false },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    taxAmount: { type: Number, min: 0, default: 0 },
    totalAfterTax: { type: Number, min: 0 },
    description: { type: String },
    productDescription: { type: String },
    productType: { type: String },
    isOutsourced: { type: Boolean, default: false },
    imageUrl: { type: String },
  },
  { _id: false },
)

const salesOrderSchema = new Schema<IStockSalesOrder>(
  {
    org_id: { type: String, required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    quotationId: { type: String, index: true },
    quotationNumber: { type: String },
    convertedInvoiceId: { type: String, index: true },
    client: {
      name: { type: String, required: true },
      number: { type: String, required: true },
      location: { type: String, required: true },
      contactPerson: { type: String },
    },
    items: { type: [itemSchema], required: true },
    subTotal: { type: Number, required: true, min: 0 },
    taxTotal: { type: Number, min: 0, default: 0 },
    grandTotal: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ["confirmed", "invoiced", "cancelled"],
      default: "confirmed",
      index: true,
    },
    branchId: { type: String, index: true },
    ownerUserId: { type: String, index: true },
    createdBy: { type: String, required: true },
    reservedAt: { type: Date },
    invoicedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
  },
  { timestamps: true },
)

salesOrderSchema.index({ org_id: 1, orderNumber: 1 }, { unique: true })
salesOrderSchema.index({ org_id: 1, quotationId: 1 })
salesOrderSchema.index({ org_id: 1, status: 1, createdAt: -1 })

export const StockSalesOrder = mongoose.model<IStockSalesOrder>(
  "StockSalesOrder",
  salesOrderSchema,
)
