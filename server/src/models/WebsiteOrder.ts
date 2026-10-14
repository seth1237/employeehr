import mongoose, { Schema } from "mongoose"

const websiteOrderSchema = new Schema(
  {
    org_id: { type: String, default: "", index: true },
    shopOrderId: { type: String, required: true, index: true },
    customerName: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    location: { type: String, default: "" },
    items: {
      type: [
        {
          name: String,
          qty: Number,
          price: Number,
        },
      ],
      default: [],
    },
    total: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["awaiting_payment", "paid", "dispatched", "delivered"],
      default: "awaiting_payment",
      index: true,
    },
    paymentStatus: { type: String, default: "pending" },
    checkoutRequestId: { type: String, default: "", index: true },
    merchantRequestId: { type: String, default: "" },
    mpesaReceipt: { type: String, default: "" },
    resultDesc: { type: String, default: "" },
    quotationNumber: { type: String, default: "" },
  },
  { timestamps: true },
)

websiteOrderSchema.index({ checkoutRequestId: 1 })

export const WebsiteOrder = mongoose.models.WebsiteOrder || mongoose.model("WebsiteOrder", websiteOrderSchema)
