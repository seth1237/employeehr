import mongoose, { Schema } from "mongoose"

export interface IInvitation extends Document {
  org_id: string
  email: string
  role: string
  invite_token: string
  invited_by: string
  status: "pending" | "accepted" | "rejected" | "expired"
  expires_at: Date
  created_at: Date
  accepted_at?: Date
}

const invitationSchema = new Schema<IInvitation>(
  {
    org_id: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    role: { type: String, required: true, enum: ["company_admin", "hr", "manager", "admin", "employee"] },
    invite_token: { type: String, required: true, unique: true },
    invited_by: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "expired"],
      default: "pending",
    },
    expires_at: { type: Date, required: true },
    accepted_at: { type: Date },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
)

// Index for fast lookups
invitationSchema.index({ org_id: 1, status: 1 })
// Note: invite_token is unique in schema definition, no need for separate index
// Note: expires_at TTL index is defined below
invitationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }) // TTL index for cleanup

export default mongoose.model<IInvitation>("Invitation", invitationSchema)
