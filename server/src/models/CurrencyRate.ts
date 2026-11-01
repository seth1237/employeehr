import mongoose, { Schema, Document } from "mongoose"

export interface ICurrencyRate extends Document {
  org_id: string
  code: string
  name: string
  symbol: string
  rateToFunctional: number
  isFunctional: boolean
  isActive: boolean
}

const currencyRateSchema = new Schema<ICurrencyRate>(
  {
    org_id: { type: String, required: true, index: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    symbol: { type: String, default: "" },
    rateToFunctional: { type: Number, required: true, min: 0 },
    isFunctional: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

currencyRateSchema.index({ org_id: 1, code: 1 }, { unique: true })

export const CurrencyRate = mongoose.model<ICurrencyRate>("CurrencyRate", currencyRateSchema)
