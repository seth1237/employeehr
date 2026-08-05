import mongoose, { Schema, Document } from "mongoose"

export interface IMeeting extends Document {
  org_id: string
  title: string
  description?: string
  scheduled_at: Date
  duration_minutes: number
  meeting_type: "video" | "audio" | "in-person"
  meeting_id: string // Unique meeting ID for generating links
  meeting_link?: string // For external video conferencing links
  password?: string // Optional meeting password
  require_password: boolean // Whether password is required
  status: "scheduled" | "in-progress" | "completed" | "cancelled"
  organizer_id: string
  attendees: Array<{
    user_id: string
    display_name?: string
    is_guest?: boolean
    status: "invited" | "accepted" | "declined" | "tentative"
    attended: boolean
    joined_at?: Date // Track when user joined the meeting
    left_at?: Date // Track when user left the meeting
    duration_minutes?: number // Total time spent in meeting
  }>
  actual_start_time?: Date // When meeting actually started
  actual_end_time?: Date // When meeting actually ended
  agenda?: string
  transcript?: string
  ai_summary?: string
  key_points?: string[]
  action_items?: Array<{
    description: string
    assigned_to: string
    due_date?: Date
    task_id?: string // Reference to created task
  }>
  recording_url?: string
  ai_processed: boolean
  ai_processing_status?: "pending" | "processing" | "completed" | "failed"
  ai_processing_error?: string
  created_at: Date
  updated_at: Date
}

const MeetingSchema = new Schema<IMeeting>(
  {
    org_id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    scheduled_at: { type: Date, required: true, index: true },
    duration_minutes: { type: Number, required: true, default: 60 },
    meeting_type: {
      type: String,
      enum: ["video", "audio", "in-person"],
      default: "video",
    },
    meeting_id: { type: String, required: true, unique: true, index: true },
    meeting_link: { type: String },
    password: { type: String },
    require_password: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["scheduled", "in-progress", "completed", "cancelled"],
      default: "scheduled",
      index: true,
    },
    organizer_id: { type: String, required: true, index: true },
    attendees: [
      {
        user_id: { type: String, required: true },
        display_name: { type: String },
        is_guest: { type: Boolean, default: false },
        status: {
          type: String,
          enum: ["invited", "accepted", "declined", "tentative"],
          default: "invited",
        },
        attended: { type: Boolean, default: false },
        joined_at: { type: Date },
        left_at: { type: Date },
        duration_minutes: { type: Number },
      },
    ],
    actual_start_time: { type: Date },
    actual_end_time: { type: Date },
    agenda: { type: String },
    transcript: { type: String },
    ai_summary: { type: String },
    key_points: [{ type: String }],
    action_items: [
      {
        description: { type: String, required: true },
        assigned_to: { type: String, required: true },
        due_date: { type: Date },
        task_id: { type: String },
      },
    ],
    recording_url: { type: String },
    ai_processed: { type: Boolean, default: false },
    ai_processing_status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
    },
    ai_processing_error: { type: String },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
)

// Compound indexes for common queries
MeetingSchema.index({ org_id: 1, scheduled_at: -1 })
MeetingSchema.index({ org_id: 1, status: 1 })
MeetingSchema.index({ "attendees.user_id": 1, scheduled_at: -1 })

export const Meeting = mongoose.model<IMeeting>("Meeting", MeetingSchema)
