import mongoose, { Schema, Document } from "mongoose"

export interface ITicket extends Document {
  org_id: string
  customer_id?: string
  machine_id?: string
  callerName?: string
  callerPhone?: string
  title: string
  description: string
  assignedTechnician_id?: string
  createdBy: string
  status:
    | "Open"
    | "Pending"
    | "Scheduled"
    | "Visited"
    | "Closed"
    | "Dismissed"
    | "Processed"
    | "Resolved"
  /** conversation = fixed without service; escalated_to_service = service + quotation created */
  resolutionType?: "conversation" | "escalated_to_service" | "dismissed"
  resolutionNote?: string
  serviceId?: string
  quotationId?: string
  quotationNumber?: string
  scheduledDate?: Date
  resolvedDate?: Date
  createdAt: Date
  updatedAt: Date
}

const ticketSchema = new Schema<ITicket>(
  {
    org_id: { type: String, required: true },
    customer_id: { type: String, ref: "Customer" },
    machine_id: { type: String, ref: "InstalledMachine" },
    callerName: { type: String },
    callerPhone: { type: String },
    title: { type: String, required: true },
    description: { type: String, required: true },
    assignedTechnician_id: { type: String },
    createdBy: { type: String, required: true },
    status: {
      type: String,
      enum: [
        "Open",
        "Pending",
        "Scheduled",
        "Visited",
        "Closed",
        "Dismissed",
        "Processed",
        "Resolved",
      ],
      default: "Open",
    },
    resolutionType: {
      type: String,
      enum: ["conversation", "escalated_to_service", "dismissed"],
    },
    resolutionNote: { type: String },
    serviceId: { type: String },
    quotationId: { type: String },
    quotationNumber: { type: String },
    scheduledDate: { type: Date },
    resolvedDate: { type: Date },
  },
  { timestamps: true },
)

ticketSchema.index({ org_id: 1 })
ticketSchema.index({ customer_id: 1 })
ticketSchema.index({ assignedTechnician_id: 1 })
ticketSchema.index({ org_id: 1, status: 1 })

export const Ticket = mongoose.model<ITicket>("Ticket", ticketSchema)
