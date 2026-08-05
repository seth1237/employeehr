import mongoose, { Schema } from "mongoose"

export interface IClientComplaint {
  _id?: string
  org_id: string
  complaintId?: string // Auto-generated reference number (e.g., COMP-2024-001)
  clientId: string // Reference to StockClient
  clientName: string
  clientNumber: string
  clientLocation?: string
  clientEmail?: string
  clientPhone?: string
  complaintCategory:
    | "poor_service"
    | "delayed_delivery"
    | "billing_issues"
    | "product_defects"
    | "staff_misconduct"
    | "technical_problems"
    | "warranty_claims"
    | "refund_requests"
    | "quality_issues"
    | "other"
  priority: "low" | "medium" | "high" | "urgent"
  status: "new" | "under_review" | "assigned" | "in_progress" | "pending_client_feedback" | "escalated" | "resolved" | "closed"
  title: string
  description: string
  attachments?: string[] // File URLs
  submittedBy: string // User ID who submitted
  submittedByName?: string
  assignedTo?: string // User ID (employee assigned to resolve)
  assignedToName?: string // Employee name
  relatedTaskId?: string // Link to Task model if duty is created
  escalatedTo?: string // User ID if escalated to manager/senior
  escalationReason?: string

  // Communication & History
  communications?: Array<{
    senderUserId: string
    senderName?: string
    senderRole?: "client" | "staff"
    message: string
    attachments?: string[]
    createdAt?: Date
  }>

  internalNotes?: Array<{
    userId: string
    userName?: string
    note: string
    createdAt?: Date
  }>

  // Resolution
  resolution?: {
    resolvedBy: string // User ID of employee who resolved
    resolvedByName?: string
    resolutionType?: "refund" | "replacement" | "service_repeat" | "apology" | "compensation" | "other"
    resolutionNotes?: string
    clientFeedback?: string
    satisfactionRating?: number // 1-5 scale
    resolvedAt?: Date
  }

  // Tracking
  createdAt?: Date
  updatedAt?: Date
  dueDate?: Date
  resolvedAt?: Date
  closedAt?: Date
}

const clientComplaintSchema = new Schema<IClientComplaint>(
  {
    org_id: { type: String, required: true, index: true },
    complaintId: { type: String, unique: true, sparse: true, index: true },
    clientId: { type: String, required: true, index: true },
    clientName: { type: String, required: true },
    clientNumber: { type: String, required: true },
    clientLocation: { type: String },
    clientEmail: { type: String },
    clientPhone: { type: String },
    complaintCategory: {
      type: String,
      enum: [
        "poor_service",
        "delayed_delivery",
        "billing_issues",
        "product_defects",
        "staff_misconduct",
        "technical_problems",
        "warranty_claims",
        "refund_requests",
        "quality_issues",
        "other",
      ],
      default: "other",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["new", "under_review", "assigned", "in_progress", "pending_client_feedback", "escalated", "resolved", "closed"],
      default: "new",
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    attachments: [{ type: String }],
    submittedBy: { type: String, required: true },
    submittedByName: { type: String },
    assignedTo: { type: String, index: true },
    assignedToName: { type: String },
    relatedTaskId: { type: String },
    escalatedTo: { type: String },
    escalationReason: { type: String },
    communications: [
      {
        senderUserId: { type: String, required: true },
        senderName: { type: String },
        senderRole: { type: String, enum: ["client", "staff"] },
        message: { type: String, required: true },
        attachments: [{ type: String }],
        createdAt: { type: Date, default: Date.now },
      },
    ],
    internalNotes: [
      {
        userId: { type: String, required: true },
        userName: { type: String },
        note: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolution: {
      resolvedBy: { type: String },
      resolvedByName: { type: String },
      resolutionType: { type: String, enum: ["refund", "replacement", "service_repeat", "apology", "compensation", "other"] },
      resolutionNotes: { type: String },
      clientFeedback: { type: String },
      satisfactionRating: { type: Number, min: 1, max: 5 },
      resolvedAt: { type: Date },
    },
    dueDate: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true },
)

// Compound indexes for efficient queries
clientComplaintSchema.index({ org_id: 1, clientId: 1 })
clientComplaintSchema.index({ org_id: 1, status: 1 })
clientComplaintSchema.index({ org_id: 1, assignedTo: 1 })
clientComplaintSchema.index({ org_id: 1, priority: 1 })
clientComplaintSchema.index({ org_id: 1, createdAt: -1 })

export const ClientComplaint = mongoose.model<IClientComplaint>("ClientComplaint", clientComplaintSchema)
