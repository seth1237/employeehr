import mongoose, { Schema } from "mongoose"

export interface IProjectTimeLog {
  _id?: string
  org_id: string
  project_id: string
  task_id?: string           // optional — time can be logged against a task within a project
  user_id: string
  hours: number              // decimal hours e.g. 1.5 = 1h 30m
  description?: string
  date: Date                 // the date the work was done
  billable: boolean
  createdAt?: Date
  updatedAt?: Date
}

const projectTimeLogSchema = new Schema<IProjectTimeLog>(
  {
    org_id: { type: String, required: true, index: true },
    project_id: { type: String, required: true, index: true },
    task_id: { type: String },
    user_id: { type: String, required: true, index: true },
    hours: { type: Number, required: true, min: 0.1, max: 24 },
    description: { type: String },
    date: { type: Date, required: true, default: Date.now },
    billable: { type: Boolean, default: false },
  },
  { timestamps: true },
)

projectTimeLogSchema.index({ org_id: 1, project_id: 1 })
projectTimeLogSchema.index({ org_id: 1, user_id: 1 })

export const ProjectTimeLog = mongoose.model<IProjectTimeLog>(
  "ProjectTimeLog",
  projectTimeLogSchema,
)
