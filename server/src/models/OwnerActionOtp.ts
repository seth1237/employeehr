import mongoose, { Document, Schema } from "mongoose"

export interface IOwnerActionOtpDocument extends Document {
  challengeId: string
  action: "delete_company"
  companyId: string
  companyName: string
  companySlug: string
  requestedByEmail: string
  requestedByUserId: string
  otpEmail: string
  otp: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

const ownerActionOtpSchema = new Schema<IOwnerActionOtpDocument>(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    action: {
      type: String,
      enum: ["delete_company"],
      required: true,
      index: true,
    },
    companyId: { type: String, required: true, index: true },
    companyName: { type: String, required: true },
    companySlug: { type: String, required: true },
    requestedByEmail: { type: String, required: true, lowercase: true },
    requestedByUserId: { type: String, required: true },
    otpEmail: { type: String, required: true, lowercase: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

ownerActionOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const OwnerActionOtp = mongoose.model<IOwnerActionOtpDocument>(
  "OwnerActionOtp",
  ownerActionOtpSchema,
)
