import mongoose, { Document, Schema } from "mongoose"

export type LoginOtpType = "standard" | "company" | "employee"

export interface ILoginOtpDocument extends Document {
  challengeId: string
  email: string
  userId: string
  org_id: string
  loginType: LoginOtpType
  otp: string
  companySlug?: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

const LoginOtpSchema = new Schema<ILoginOtpDocument>(
  {
    challengeId: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, lowercase: true, index: true },
    userId: { type: String, required: true, index: true },
    org_id: { type: String, required: true, index: true },
    loginType: { type: String, enum: ["standard", "company", "employee"], required: true, index: true },
    otp: { type: String, required: true },
    companySlug: { type: String, required: false },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

LoginOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const LoginOtp = mongoose.model<ILoginOtpDocument>("LoginOtp", LoginOtpSchema)

export default LoginOtp