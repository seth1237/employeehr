import mongoose, { Schema } from "mongoose"

export type BarcodeScanContext =
  | "confirm"
  | "dispatch"
  | "stock-check"
  | "receive"
  | "quotation"
  | "credit-note"
  | "wms-putaway"

export interface IBarcodeScan {
  org_id: string
  userId?: string
  code: string
  context: BarcodeScanContext
  ok: boolean
  reason?: string
  productId?: string
  locationId?: string
  invoiceId?: string
  stockCheckId?: string
  createdAt?: Date
}

const barcodeScanSchema = new Schema<IBarcodeScan>(
  {
    org_id: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    code: { type: String, required: true, trim: true },
    context: {
      type: String,
      required: true,
      enum: [
        "confirm",
        "dispatch",
        "stock-check",
        "receive",
        "quotation",
        "credit-note",
        "wms-putaway",
      ],
    },
    ok: { type: Boolean, required: true, default: false },
    reason: { type: String, trim: true },
    productId: { type: String, index: true },
    locationId: { type: String },
    invoiceId: { type: String, index: true },
    stockCheckId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

barcodeScanSchema.index({ org_id: 1, createdAt: -1 })

export const BarcodeScan = mongoose.model<IBarcodeScan>("BarcodeScan", barcodeScanSchema)
