import mongoose, { Schema } from "mongoose"

export interface IStockEntry {
  _id?: string
  org_id: string
  branchId?: string // New: branch identifier for multi-location support
  locationId?: string
  productId: string
  quantityAdded: number
  isOutsourced?: boolean
  outsourcedCompany?: string
  expiryEnabled?: boolean
  expiryDate?: Date | null
  expiryReminderDays?: number
  addedBy: string
  note?: string
  entryDate?: Date
  createdAt?: Date
  updatedAt?: Date
}

const stockEntrySchema = new Schema<IStockEntry>(
  {
    org_id: { type: String, required: true, index: true },
    branchId: { type: String, default: null, index: true },
    locationId: { type: String, default: null, index: true },
    productId: { type: String, required: true, index: true },
    quantityAdded: { type: Number, required: true, min: 1 },
    isOutsourced: { type: Boolean, default: false },
    outsourcedCompany: { type: String, trim: true },
    expiryEnabled: { type: Boolean, default: false },
    expiryDate: { type: Date, default: null },
    expiryReminderDays: { type: Number, min: 0, default: 7 },
    addedBy: { type: String, required: true },
    note: { type: String, trim: true },
    entryDate: { type: Date, default: null, index: true },
  },
  { timestamps: true },
)

stockEntrySchema.index({ org_id: 1, branchId: 1, productId: 1, createdAt: -1 })
stockEntrySchema.index({ org_id: 1, entryDate: -1 })
stockEntrySchema.index({ org_id: 1, productId: 1, createdAt: -1 })

export const StockEntry = mongoose.model<IStockEntry>("StockEntry", stockEntrySchema)
