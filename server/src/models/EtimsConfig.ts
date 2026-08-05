import mongoose, { Schema, Document } from "mongoose"

export interface IEtimsConfig extends Document {
  org_id: string
  companyName: string
  kraPin: string
  branchId: string
  deviceSerialNumber: string
  deviceId?: string
  sdcId?: string
  communicationKey?: string
  environment: "Sandbox" | "Production"
  apiEndpoint: string
  status: "Active" | "Inactive"
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const etimsConfigSchema = new Schema<IEtimsConfig>(
  {
    org_id: { type: String, required: true, unique: true }, // One config per tenant
    companyName: { type: String, required: true },
    kraPin: { type: String, required: true },
    branchId: { type: String, required: true, default: "00" },
    deviceSerialNumber: { type: String, required: false },
    deviceId: { type: String },
    sdcId: { type: String },
    communicationKey: { type: String },
    environment: { type: String, enum: ["Sandbox", "Production"], default: "Sandbox" },
    apiEndpoint: { type: String, required: true },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
)

export const EtimsConfig = mongoose.model<IEtimsConfig>("EtimsConfig", etimsConfigSchema)
