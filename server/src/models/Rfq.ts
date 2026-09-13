import mongoose, { Schema, Document } from "mongoose"

export interface IRfq extends Document {
  org_id: string
  rfqNumber: string
  purchaseRequestId?: string // Link to PR
  title: string
  description?: string
  deadline: Date
  items: {
    productId?: string
    productName: string
    quantity: number
    unit?: string
    specifications?: string
  }[]
  invitedSuppliers: {
    supplierId: string
    invitedAt: Date
    status: "invited" | "viewed" | "submitted" | "declined"
  }[]
  attachments: {
    fileName: string
    fileUrl: string
  }[]
  status: "draft" | "published" | "closed" | "awarded" | "cancelled"
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const rfqSchema = new Schema<IRfq>(
  {
    org_id: { type: String, required: true },
    rfqNumber: { type: String, required: true },
    purchaseRequestId: { type: String },
    title: { type: String, required: true },
    description: { type: String },
    deadline: { type: Date, required: true },
    items: [
      {
        productId: { type: String },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unit: { type: String },
        specifications: { type: String },
      },
    ],
    invitedSuppliers: [
      {
        supplierId: { type: String, required: true },
        invitedAt: { type: Date, default: Date.now },
        status: { type: String, enum: ["invited", "viewed", "submitted", "declined"], default: "invited" },
      }
    ],
    attachments: [
      {
        fileName: { type: String },
        fileUrl: { type: String },
      }
    ],
    status: {
      type: String,
      enum: ["draft", "published", "closed", "awarded", "cancelled"],
      default: "draft",
    },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
)

rfqSchema.index({ org_id: 1, rfqNumber: 1 }, { unique: true })

export const Rfq = mongoose.models.Rfq || mongoose.model<IRfq>("Rfq", rfqSchema)
