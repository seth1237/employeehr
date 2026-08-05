import mongoose, { Schema, Document } from "mongoose"

export interface IClientConversation extends Document {
  org_id: string
  roomName: string // e.g. "Telesales"
  customer_id?: string // Reference to Customer if linked
  clientName?: string
  clientPhone?: string
  lead_id?: string // Reference to Lead if linked
  quotation_id?: string // Reference to a Quotation
  note: string
  assignedTo?: string // user_id
  followUpDate?: Date
  status: string // e.g., "Interested", "Follow-up Needed"
  documentName?: string
  createdBy: string // user_id
  createdAt: Date
  updatedAt: Date
}

const clientConversationSchema = new Schema<IClientConversation>(
  {
    org_id: { type: String, required: true },
    roomName: { type: String, required: true },
    customer_id: { type: String, ref: "Customer" },
    clientName: { type: String },
    clientPhone: { type: String },
    lead_id: { type: String, ref: "Lead" },
    quotation_id: { type: String }, // Can refer to StockQuotation
    note: { type: String, required: true },
    assignedTo: { type: String },
    followUpDate: { type: Date },
    status: { type: String, required: true, default: "Pending" },
    documentName: { type: String },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
)

clientConversationSchema.index({ org_id: 1 })
clientConversationSchema.index({ customer_id: 1 })
clientConversationSchema.index({ roomName: 1 })
clientConversationSchema.index({ followUpDate: 1 })

export const ClientConversation = mongoose.model<IClientConversation>("ClientConversation", clientConversationSchema)
