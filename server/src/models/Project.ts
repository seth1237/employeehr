import mongoose, { Schema } from "mongoose"

export interface IProjectMember {
  user_id: string
  role: "project_manager" | "member" | "viewer"
  added_at: Date
}

export interface IProjectPhase {
  _id?: string
  title: string
  description?: string
  start_date?: Date
  end_date?: Date
  status: "not_started" | "in_progress" | "completed" | "on_hold"
  order: number
}

export interface IProject {
  _id?: string
  org_id: string
  project_code: string           // e.g. PROJ-0001
  title: string
  description?: string
  status: "planning" | "active" | "on_hold" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  start_date?: Date
  end_date?: Date                // planned end
  actual_end_date?: Date
  budget?: number                // planned budget
  budget_used?: number           // actual spend tracked
  members: IProjectMember[]
  phases: IProjectPhase[]
  tags: string[]
  progress: number               // 0–100
  created_by: string             // user_id
  client_name?: string           // optional client association
  client_id?: string             // optional StockClient reference
  notes_history?: Array<{
    text: string
    user_id: string
    user_name?: string
    createdAt: Date
  }>
  createdAt?: Date
  updatedAt?: Date
}

const projectMemberSchema = new Schema<IProjectMember>(
  {
    user_id: { type: String, required: true },
    role: {
      type: String,
      enum: ["project_manager", "member", "viewer"],
      default: "member",
    },
    added_at: { type: Date, default: Date.now },
  },
  { _id: false },
)

const projectPhaseSchema = new Schema<IProjectPhase>(
  {
    title: { type: String, required: true },
    description: { type: String },
    start_date: { type: Date },
    end_date: { type: Date },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "on_hold"],
      default: "not_started",
    },
    order: { type: Number, default: 0 },
  },
)

const projectSchema = new Schema<IProject>(
  {
    org_id: { type: String, required: true, index: true },
    project_code: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ["planning", "active", "on_hold", "completed", "cancelled"],
      default: "planning",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    start_date: { type: Date },
    end_date: { type: Date },
    actual_end_date: { type: Date },
    budget: { type: Number, min: 0 },
    budget_used: { type: Number, min: 0, default: 0 },
    members: { type: [projectMemberSchema], default: [] },
    phases: { type: [projectPhaseSchema], default: [] },
    tags: [{ type: String }],
    progress: { type: Number, min: 0, max: 100, default: 0 },
    created_by: { type: String, required: true },
    client_name: { type: String },
    client_id: { type: String },
    notes_history: [
      {
        text: { type: String },
        user_id: { type: String },
        user_name: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
)

projectSchema.index({ org_id: 1, project_code: 1 }, { unique: true })
projectSchema.index({ org_id: 1, status: 1 })
projectSchema.index({ org_id: 1, "members.user_id": 1 })

export const Project = mongoose.model<IProject>("Project", projectSchema)
