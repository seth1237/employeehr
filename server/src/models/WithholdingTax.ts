import mongoose, { Schema, Document } from "mongoose"

export interface IWithholdingTax extends Document {
  org_id: string
  date: Date
  payee: string
  pin?: string
  grossAmount: number
  rate: number
  taxAmount: number
  reference?: string
  certificateNo?: string
}

const withholdingTaxSchema = new Schema<IWithholdingTax>(
  {
    org_id: { type: String, required: true, index: true },
    date: { type: Date, required: true },
    payee: { type: String, required: true },
    pin: { type: String },
    grossAmount: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, required: true, min: 0 },
    reference: { type: String },
    certificateNo: { type: String },
  },
  { timestamps: true },
)

withholdingTaxSchema.index({ org_id: 1, date: -1 })

export const WithholdingTax = mongoose.model<IWithholdingTax>("WithholdingTax", withholdingTaxSchema)
