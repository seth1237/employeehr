import mongoose, { Schema, type Document } from "mongoose"

interface IAuditLog extends Document {
  org_id: string
  userId: string
  action: string
  resource: string
  resourceId: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  status: "success" | "failure"
  details?: string
  timestamp: Date
}

const auditLogSchema = new Schema<IAuditLog>({
  org_id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  resource: { type: String, required: true },
  resourceId: { type: String, required: true },
  changes: { type: Schema.Types.Mixed },
  ipAddress: String,
  userAgent: String,
  status: { type: String, enum: ["success", "failure"], default: "success" },
  details: String,
  timestamp: { type: Date, default: Date.now },
})

// TTL index - auto-delete audit logs after 1 year for compliance
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 })

export default mongoose.model<IAuditLog>("AuditLog", auditLogSchema)
