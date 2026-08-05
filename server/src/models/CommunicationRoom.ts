import mongoose, { Schema, Document } from "mongoose"

export interface ICommunicationRoom extends Document {
  org_id: string
  name: string
  description?: string
  status: "Active" | "Inactive"
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

const communicationRoomSchema = new Schema<ICommunicationRoom>(
  {
    org_id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
)

communicationRoomSchema.index({ org_id: 1 })
communicationRoomSchema.index({ name: 1 })

export const CommunicationRoom = mongoose.model<ICommunicationRoom>("CommunicationRoom", communicationRoomSchema)
