import mongoose, { Schema } from "mongoose"

export const EMAIL_ASSET_CATEGORIES = [
  "logo",
  "campaign",
  "product",
  "banner",
  "social",
] as const

export type EmailAssetCategory = (typeof EMAIL_ASSET_CATEGORIES)[number]

export interface IEmailAsset {
  _id?: string
  org_id: string
  name: string
  category: EmailAssetCategory
  url: string
  filename: string
  mimeType?: string
  size?: number
  width?: number
  height?: number
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
}

const emailAssetSchema = new Schema<IEmailAsset>(
  {
    org_id: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: EMAIL_ASSET_CATEGORIES,
      default: "campaign",
      index: true,
    },
    url: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number },
    width: { type: Number },
    height: { type: Number },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

emailAssetSchema.index({ org_id: 1, createdAt: -1 })
emailAssetSchema.index({ org_id: 1, category: 1 })

export const EmailAsset = mongoose.model<IEmailAsset>("EmailAsset", emailAssetSchema)
