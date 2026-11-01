import mongoose, { Schema, Document } from "mongoose"

export interface IFiscalPeriod extends Document {
  org_id: string
  year: number
  month: number
  startDate: Date
  endDate: Date
  status: "open" | "closed"
  closedAt?: Date
  closedBy?: string
}

const fiscalPeriodSchema = new Schema<IFiscalPeriod>(
  {
    org_id: { type: String, required: true, index: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    closedAt: { type: Date },
    closedBy: { type: String },
  },
  { timestamps: true },
)

fiscalPeriodSchema.index({ org_id: 1, year: 1, month: 1 }, { unique: true })

export const FiscalPeriod = mongoose.model<IFiscalPeriod>("FiscalPeriod", fiscalPeriodSchema)
