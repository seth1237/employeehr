import AuditLog from "../models/AuditLog"

export interface AuditLogEntry {
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
}

export class AuditService {
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await AuditLog.create({
        ...entry,
        timestamp: new Date(),
      })
    } catch (error) {
      console.error("[AuditService] Failed to log audit entry:", error)
    }
  }

  static async getOrgAuditLogs(org_id: string, limit = 100, skip = 0) {
    return AuditLog.find({ org_id }).sort({ timestamp: -1 }).limit(limit).skip(skip).lean()
  }

  static async getUserAuditLogs(org_id: string, userId: string, limit = 100) {
    return AuditLog.find({ org_id, userId }).sort({ timestamp: -1 }).limit(limit).lean()
  }

  static async getResourceAuditLogs(org_id: string, resource: string, resourceId: string) {
    return AuditLog.find({ org_id, resource, resourceId }).sort({ timestamp: -1 }).lean()
  }
}
