import mongoose, { Document, Schema } from "mongoose"

export interface IPasswordResetDocument extends Document {
  email: string
  otp: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

const PasswordResetSchema = new Schema<IPasswordResetDocument>(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

// Optional TTL index to auto-remove expired tokens
PasswordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const PasswordReset = mongoose.model<IPasswordResetDocument>(
  "PasswordReset",
  PasswordResetSchema,
)

export default PasswordReset
