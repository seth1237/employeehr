import mongoose, { Schema } from "mongoose"

export interface IOnboardingTask {
  _id?: string
  title: string
  assigneeRole: "hr" | "manager" | "it" | "employee" | "other"
  dueOffsetDays: number
  completed: boolean
  completedAt?: Date
  completedBy?: string
  notes?: string
}

export interface IOnboardingChecklist {
  _id?: string
  org_id: string
  user_id?: string
  application_id?: string
  candidate_name?: string
  candidate_email?: string
  candidate_phone?: string
  job_title?: string
  template_id?: string
  templateName?: string
  status: "not_started" | "in_progress" | "completed" | "dropped"
  startDate?: Date
  dueDate?: Date
  tasks: IOnboardingTask[]
  sections?: any[]
  form_answers?: Record<string, any>
  dropped_reason?: string
  dropped_at?: Date
  dropped_by?: string
  converted_at?: Date
  createdBy?: string
  createdAt?: Date
  updatedAt?: Date
}

const onboardingTaskSchema = new Schema<IOnboardingTask>(
  {
    title: { type: String, required: true },
    assigneeRole: {
      type: String,
      enum: ["hr", "manager", "it", "employee", "other"],
      default: "hr",
    },
    dueOffsetDays: { type: Number, default: 7 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    completedBy: { type: String },
    notes: { type: String },
  },
  { _id: true },
)

const onboardingChecklistSchema = new Schema<IOnboardingChecklist>(
  {
    org_id: { type: String, required: true, index: true },
    user_id: { type: String, index: true },
    application_id: { type: String, index: true },
    candidate_name: { type: String },
    candidate_email: { type: String },
    candidate_phone: { type: String },
    job_title: { type: String },
    template_id: { type: String },
    templateName: { type: String, default: "Standard onboarding" },
    status: {
      type: String,
      enum: ["not_started", "in_progress", "completed", "dropped"],
      default: "not_started",
    },
    startDate: { type: Date },
    dueDate: { type: Date },
    tasks: { type: [onboardingTaskSchema], default: [] },
    sections: { type: Schema.Types.Mixed, default: [] },
    form_answers: { type: Schema.Types.Mixed, default: {} },
    dropped_reason: { type: String },
    dropped_at: { type: Date },
    dropped_by: { type: String },
    converted_at: { type: Date },
    createdBy: { type: String },
  },
  { timestamps: true },
)

onboardingChecklistSchema.index({ org_id: 1, user_id: 1 }, { unique: true, sparse: true })
onboardingChecklistSchema.index({ org_id: 1, application_id: 1 }, { unique: true, sparse: true })

export const OnboardingChecklist = mongoose.model<IOnboardingChecklist>(
  "OnboardingChecklist",
  onboardingChecklistSchema,
)

function syncOnboardingIndexes() {
  void OnboardingChecklist.syncIndexes().catch((error) => {
    console.warn("OnboardingChecklist index sync:", error?.message || error)
  })
}

if (mongoose.connection.readyState === 1) {
  syncOnboardingIndexes()
} else {
  mongoose.connection.once("connected", syncOnboardingIndexes)
}

export const DEFAULT_ONBOARDING_TASKS: Array<
  Pick<IOnboardingTask, "title" | "assigneeRole" | "dueOffsetDays">
> = [
  { title: "Send welcome email & login details", assigneeRole: "hr", dueOffsetDays: 0 },
  { title: "Collect statutory IDs (KRA, NSSF, SHA, National ID)", assigneeRole: "hr", dueOffsetDays: 3 },
  { title: "Assign manager & department", assigneeRole: "hr", dueOffsetDays: 1 },
  { title: "Provision email / systems access", assigneeRole: "it", dueOffsetDays: 2 },
  { title: "Issue equipment / desk setup", assigneeRole: "it", dueOffsetDays: 5 },
  { title: "Schedule orientation with manager", assigneeRole: "manager", dueOffsetDays: 3 },
  { title: "Complete employee profile & emergency contact", assigneeRole: "employee", dueOffsetDays: 7 },
  { title: "Review company handbook / policies", assigneeRole: "employee", dueOffsetDays: 14 },
  { title: "Set probation review date", assigneeRole: "hr", dueOffsetDays: 7 },
]
