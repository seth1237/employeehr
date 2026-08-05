import mongoose, { Schema, Document } from "mongoose"

export interface IEtimsLog extends Document {
  org_id: string
  invoiceNumber?: string // Could be linked to an invoice
  invoice_id?: string // Reference to StockInvoice
  requestTime: Date
  responseTime?: Date
  apiEndpoint: string
  requestPayload?: string // JSON string
  responsePayload?: string // JSON string
  resultCode?: string
  resultMessage?: string
  submissionStatus: "Processing" | "Submitted" | "Failed" | "Cancelled"
  retryCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const etimsLogSchema = new Schema<IEtimsLog>(
  {
    org_id: { type: String, required: true },
    invoiceNumber: { type: String },
    invoice_id: { type: String, ref: "StockInvoice" },
    requestTime: { type: Date, required: true, default: Date.now },
    responseTime: { type: Date },
    apiEndpoint: { type: String, required: true },
    requestPayload: { type: String },
    responsePayload: { type: String },
    resultCode: { type: String },
    resultMessage: { type: String },
    submissionStatus: {
      type: String,
      enum: ["Processing", "Submitted", "Failed", "Cancelled"],
      default: "Processing",
    },
    retryCount: { type: Number, default: 0 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
)

etimsLogSchema.index({ org_id: 1 })
etimsLogSchema.index({ invoice_id: 1 })

export const EtimsLog = mongoose.model<IEtimsLog>("EtimsLog", etimsLogSchema)
