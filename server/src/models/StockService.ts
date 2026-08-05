import mongoose, { Schema, Document } from "mongoose"

export interface IStockService extends Document {
  org_id: string
  name: string
  description?: string
  category: string // e.g., "Installation", "Maintenance", "Inspection"
  price: number
  duration?: string // e.g., "2 hours", "1 day"
  
  // Recurring service configuration
  isRecurring: boolean
  intervalDays: number // Days between recurring services (0 = one-time)
  
  // Status tracking
  status: "active" | "inactive" | "archived"
  
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}

const stockServiceSchema = new Schema<IStockService>(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    duration: { type: String },
    isRecurring: { type: Boolean, default: false, index: true },
    intervalDays: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ["active", "inactive", "archived"], 
      default: "active",
      index: true 
    },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
)

// Compound unique index for org_id and name
stockServiceSchema.index({ org_id: 1, name: 1 }, { unique: true })

export const StockService = mongoose.model<IStockService>("StockService", stockServiceSchema)
