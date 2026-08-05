import mongoose, { Schema } from "mongoose"

export interface ITask {
  _id?: string
  org_id: string
  title: string
  description: string
  assigned_to: string // user_id
  assigned_by: string // user_id (admin/manager)
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "in_progress" | "completed" | "cancelled"
  due_date?: Date
  completed_at?: Date
  notes?: string
  notes_history?: Array<{
    text: string
    user_id: string
    user_name?: string
    createdAt?: Date
  }>
  postpone_requests?: Array<{
    requested_by: string
    requested_by_name?: string
    requested_at: Date
    new_due_date?: Date
    reason?: string
    status?: "pending" | "approved" | "rejected"
  }>
  attachments?: string[]
  createdAt?: Date
  updatedAt?: Date
  related_entity_type?: "invoice" | "meeting" | "report" | "pdp" | "other"
  related_entity_id?: string
  source_label?: string
  source_status?: string
  is_packaging_duty?: boolean
  // AI Meeting Integration
  is_ai_generated?: boolean // Set to true if created by AI from meeting
  meeting_id?: string // Reference to meeting
  is_ai_reminder?: boolean // Set to true for AI-generated reminders
  ai_source?: string // Description of how task was created (e.g., "Meeting action item")
}

const taskSchema = new Schema<ITask>(
  {
    org_id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    assigned_to: { type: String, required: true, index: true },
    assigned_by: { type: String, required: true },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    due_date: { type: Date },
    completed_at: { type: Date },
    notes: { type: String },
    notes_history: [
      {
        text: { type: String },
        user_id: { type: String },
        user_name: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [{ type: String }],
    related_entity_type: { type: String, enum: ["invoice", "meeting", "report", "pdp", "other"] },
    related_entity_id: { type: String },
    source_label: { type: String },
    source_status: { type: String },
    is_packaging_duty: { type: Boolean, default: false },
    is_ai_generated: { type: Boolean, default: false },
    meeting_id: { type: String },
    is_ai_reminder: { type: Boolean, default: false },
    ai_source: { type: String },
    postpone_requests: [
      {
        requested_by: { type: String },
        requested_by_name: { type: String },
        requested_at: { type: Date, default: Date.now },
        new_due_date: { type: Date },
        reason: { type: String },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
      },
    ],
  },
  { timestamps: true },
)

// Compound index for efficient queries
taskSchema.index({ org_id: 1, assigned_to: 1 })
taskSchema.index({ org_id: 1, status: 1 })

export const Task = mongoose.model<ITask>("Task", taskSchema)
