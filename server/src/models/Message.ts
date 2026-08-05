import mongoose, { Schema } from "mongoose"

export interface IMessage {
  _id?: string
  org_id: string
  from_user_id: string
  to_user_id: string
  subject: string
  body: string
  is_read: boolean
  read_at?: Date
  attachments?: string[]
  replied_to?: string // Reference to parent message
  createdAt?: Date
  updatedAt?: Date
}

const messageSchema = new Schema<IMessage>(
  {
    org_id: { type: String, required: true },
    from_user_id: { type: String, required: true, index: true },
    to_user_id: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    is_read: { type: Boolean, default: false },
    read_at: { type: Date },
    attachments: [{ type: String }],
    replied_to: { type: String },
  },
  { timestamps: true },
)

// Indexes for efficient queries
messageSchema.index({ org_id: 1, to_user_id: 1, is_read: 1 })
messageSchema.index({ org_id: 1, from_user_id: 1 })

export const Message = mongoose.model<IMessage>("Message", messageSchema)
