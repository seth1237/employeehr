import mongoose, { Schema, Document } from "mongoose"

export interface IFixedAsset extends Document {
  org_id: string
  assetCode: string
  name: string
  category: string
  purchaseDate: Date
  cost: number
  salvageValue: number
  usefulLifeMonths: number
  method: "straight-line" | "reducing"
  reducingRate?: number
  accumulatedDepreciation: number
  location?: string
  department?: string
  branchId?: string
  status: "active" | "disposed" | "transferred"
  assetAccountId?: string
  accumDepAccountId?: string
  depExpenseAccountId?: string
  lastDepreciatedOn?: Date
  disposedAt?: Date
  disposalProceeds?: number
  disposalGainLoss?: number
  transferredTo?: string
  notes?: string
}

const fixedAssetSchema = new Schema<IFixedAsset>(
  {
    org_id: { type: String, required: true, index: true },
    assetCode: { type: String, required: true },
    name: { type: String, required: true },
    category: { type: String, default: "Equipment" },
    purchaseDate: { type: Date, required: true },
    cost: { type: Number, required: true, min: 0 },
    salvageValue: { type: Number, default: 0, min: 0 },
    usefulLifeMonths: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ["straight-line", "reducing"], default: "straight-line" },
    reducingRate: { type: Number, min: 0, max: 100 },
    accumulatedDepreciation: { type: Number, default: 0, min: 0 },
    location: { type: String },
    department: { type: String },
    branchId: { type: String },
    status: { type: String, enum: ["active", "disposed", "transferred"], default: "active" },
    assetAccountId: { type: String },
    accumDepAccountId: { type: String },
    depExpenseAccountId: { type: String },
    lastDepreciatedOn: { type: Date },
    disposedAt: { type: Date },
    disposalProceeds: { type: Number },
    disposalGainLoss: { type: Number },
    transferredTo: { type: String },
    notes: { type: String },
  },
  { timestamps: true },
)

fixedAssetSchema.index({ org_id: 1, assetCode: 1 }, { unique: true })

export const FixedAsset = mongoose.model<IFixedAsset>("FixedAsset", fixedAssetSchema)
