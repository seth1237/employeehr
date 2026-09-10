import mongoose, { Schema } from "mongoose"

export interface ICustomerDeliveryFeedback {
  _id?: string
  org_id: string
  invoiceId: string
  invoiceNumber: string
  clientId?: string
  clientName: string
  productRating: number
  serviceRating: number
  areasOfImprovement: string[]
  wouldRecommend?: boolean
  comments?: string
  submittedAt: Date
  createdAt?: Date
  updatedAt?: Date
}

const customerDeliveryFeedbackSchema = new Schema<ICustomerDeliveryFeedback>(
  {
    org_id: { type: String, required: true, index: true },
    invoiceId: { type: String, required: true, index: true },
    invoiceNumber: { type: String, required: true },
    clientId: { type: String, index: true },
    clientName: { type: String, required: true },
    productRating: { type: Number, required: true, min: 1, max: 5 },
    serviceRating: { type: Number, required: true, min: 1, max: 5 },
    areasOfImprovement: { type: [String], default: [] },
    wouldRecommend: { type: Boolean },
    comments: { type: String },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

export const CustomerDeliveryFeedback = mongoose.model<ICustomerDeliveryFeedback>(
  "CustomerDeliveryFeedback",
  customerDeliveryFeedbackSchema
)
