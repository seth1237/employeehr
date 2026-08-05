import mongoose, { Schema } from "mongoose"

export interface IStockInvoicePayment {
  _id?: string
  org_id: string
  invoiceId: string
  invoiceNumber: string
  amount: number
  paymentMethod: string
  reference?: string
  note?: string
  paidAt: Date
  receivedBy: string
  createdAt?: Date
  updatedAt?: Date
}

const stockInvoicePaymentSchema = new Schema<IStockInvoicePayment>(
  {
    org_id: { type: String, required: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: { type: String, required: true, default: "cash" },
    reference: { type: String },
    note: { type: String },
    paidAt: { type: Date, required: true },
    receivedBy: { type: String, required: true },
  },
  { timestamps: true },
)

stockInvoicePaymentSchema.index({ org_id: 1, invoiceId: 1, paidAt: -1 })

export const StockInvoicePayment = mongoose.model<IStockInvoicePayment>("StockInvoicePayment", stockInvoicePaymentSchema)
