import mongoose, { Schema, Document } from "mongoose"

export interface IConversationFocusCategory {
  id: string
  name: string
}

export interface IClientConversation extends Document {
  org_id: string
  roomName: string // e.g. "Telesales"
  customer_id?: string // Reference to Customer if linked
  clientName?: string
  clientPhone?: string
  lead_id?: string // Reference to Lead if linked
  quotation_id?: string // Reference to a Quotation
  relatedMachineId?: string
  relatedMachineName?: string
  source?: string // e.g. "installed_machine", "clients_list"
  note: string
  callPurpose?: string
  focusCategories?: IConversationFocusCategory[]
  outcome?: string
  followUpNeeded?: boolean
  assignedTo?: string // user_id
  followUpDate?: Date
  status: string // e.g., "Interested", "Follow-up Needed"
  documentName?: string
  createdBy: string // user_id
  createdAt: Date
  updatedAt: Date
}

const focusCategorySchema = new Schema<IConversationFocusCategory>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
  },
  { _id: false },
)

const clientConversationSchema = new Schema<IClientConversation>(
  {
    org_id: { type: String, required: true },
    roomName: { type: String, required: true },
    customer_id: { type: String, ref: "Customer" },
    clientName: { type: String },
    clientPhone: { type: String },
    lead_id: { type: String, ref: "Lead" },
    quotation_id: { type: String }, // Can refer to StockQuotation
    relatedMachineId: { type: String, index: true },
    relatedMachineName: { type: String },
    source: { type: String, index: true },
    note: { type: String, required: true },
    callPurpose: { type: String },
    focusCategories: { type: [focusCategorySchema], default: [] },
    outcome: { type: String },
    followUpNeeded: { type: Boolean, default: false, index: true },
    assignedTo: { type: String },
    followUpDate: { type: Date },
    status: { type: String, required: true, default: "Pending" },
    documentName: { type: String },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
)

clientConversationSchema.index({ org_id: 1 })
clientConversationSchema.index({ customer_id: 1 })
clientConversationSchema.index({ roomName: 1 })
clientConversationSchema.index({ followUpDate: 1 })
clientConversationSchema.index({ org_id: 1, status: 1, followUpNeeded: 1 })

export const ClientConversation = mongoose.model<IClientConversation>(
  "ClientConversation",
  clientConversationSchema,
)
