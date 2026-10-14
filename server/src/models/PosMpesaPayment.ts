import mongoose, { Schema } from "mongoose"

export type PosMpesaStatus = "pending" | "confirmed" | "failed" | "expired"

const posMpesaPaymentSchema = new Schema(
  {
    org_id: { type: String, required: true, index: true },
    cashierId: { type: String, required: true, index: true },
    phone: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    checkoutRequestId: { type: String, required: true },
    merchantRequestId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "confirmed", "failed", "expired"],
      default: "pending",
      index: true,
    },
    resultCode: { type: String, default: "" },
    resultDesc: { type: String, default: "" },
    mpesaReceiptCode: { type: String, default: "", index: true },
    usedSaleId: { type: String, default: "" },
    rawCallback: { type: Schema.Types.Mixed },
    confirmedAt: { type: Date },
  },
  { timestamps: true },
)

posMpesaPaymentSchema.index({ org_id: 1, mpesaReceiptCode: 1, createdAt: -1 })
posMpesaPaymentSchema.index({ org_id: 1, status: 1, createdAt: -1 })
posMpesaPaymentSchema.index({ checkoutRequestId: 1 }, { unique: true })

export const PosMpesaPayment = mongoose.model("PosMpesaPayment", posMpesaPaymentSchema)
