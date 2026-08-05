import mongoose, { Schema, Document } from "mongoose"

export interface IStockServiceJob extends Document {
  org_id: string
  serviceId: mongoose.Types.ObjectId | string
  serviceName: string
  clientId?: string
  clientName?: string
  invoiceId?: mongoose.Types.ObjectId | string
  scheduledDate: Date
  completedDate?: Date
  status: "pending" | "in-progress" | "done" | "overdue" | "cancelled"
  notes?: string
  isRecurring: boolean
  intervalDays: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const stockServiceJobSchema = new Schema<IStockServiceJob>(
  {
    org_id: { type: String, required: true, index: true },
    serviceId: { type: Schema.Types.ObjectId, ref: "StockProduct", required: true },
    serviceName: { type: String, required: true },
    clientId: { type: String },
    clientName: { type: String },
    invoiceId: { type: Schema.Types.ObjectId, ref: "StockInvoice" },
    scheduledDate: { type: Date, required: true, index: true },
    completedDate: { type: Date },
    status: { type: String, enum: ["pending", "in-progress", "done", "overdue", "cancelled"], default: "pending", index: true },
    notes: { type: String },
    isRecurring: { type: Boolean, default: false },
    intervalDays: { type: Number, default: 0 },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
)

stockServiceJobSchema.index({ org_id: 1, status: 1, scheduledDate: 1 })

export const StockServiceJob = mongoose.model<IStockServiceJob>("StockServiceJob", stockServiceJobSchema)
