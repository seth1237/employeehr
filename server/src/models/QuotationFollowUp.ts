import mongoose, { Schema } from 'mongoose'

export interface IQuotationFollowUp {
  _id?: string
  org_id: string
  quotationId: string
  note: string
  callMade?: boolean
  outcome?: string
  createdBy: string
  createdAt?: Date
}

const quotationFollowUpSchema = new Schema<IQuotationFollowUp>({
  org_id: { type: String, required: true, index: true },
  quotationId: { type: String, required: true, index: true },
  note: { type: String, required: true },
  callMade: { type: Boolean, default: false },
  outcome: { type: String },
  createdBy: { type: String, required: true },
}, { timestamps: { createdAt: 'createdAt' } })

quotationFollowUpSchema.index({ org_id: 1, quotationId: 1 })

export const QuotationFollowUp = mongoose.model<IQuotationFollowUp>('QuotationFollowUp', quotationFollowUpSchema)
