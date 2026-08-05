/**
 * Queue Helper Utilities
 * Used by controllers to queue sync jobs
 */

import {
  queueUserSync,
  queueCompanySync,
  queueAuditLog,
} from '../services/syncQueueService'

export interface AuditContext {
  userId: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Queue user sync to MySQL
 * Use this after creating/updating/deleting users in MongoDB
 */
export async function syncUserToQueue(
  user: any,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  auditContext?: AuditContext,
) {
  try {
    await queueUserSync(user, action)
    
    // Also log audit trail
    if (auditContext) {
      await queueAuditLog(
        auditContext.userId,
        user.org_id,
        'User',
        action,
        user._id?.toString() || user.mongoId,
        undefined,
        { email: user.email, role: user.role },
        auditContext.ipAddress,
        auditContext.userAgent,
      )
    }

    return { queued: true }
  } catch (error) {
    console.error(`Failed to queue user sync:`, error)
    // Don't throw - MongoDB write already succeeded
    return { queued: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Queue company sync to MySQL
 * Use this after creating/updating/deleting companies in MongoDB
 */
export async function syncCompanyToQueue(
  company: any,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  auditContext?: AuditContext,
) {
  try {
    await queueCompanySync(company, action)

    if (auditContext) {
      await queueAuditLog(
        auditContext.userId,
        company._id?.toString() || company.mongoId,
        'Company',
        action,
        company._id?.toString() || company.mongoId,
        undefined,
        { name: company.name, slug: company.slug },
        auditContext.ipAddress,
        auditContext.userAgent,
      )
    }

    return { queued: true }
  } catch (error) {
    console.error(`Failed to queue company sync:`, error)
    return { queued: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Queue audit log
 * Use this for tracking sensitive operations
 */
export async function logToQueue(
  userId: string,
  org_id: string,
  entity: string,
  action: string,
  entityId: string,
  oldValues?: Record<string, any>,
  newValues?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string,
) {
  try {
    await queueAuditLog(userId, org_id, entity, action, entityId, oldValues, newValues, ipAddress, userAgent)
    return { queued: true }
  } catch (error) {
    console.error(`Failed to queue audit log:`, error)
    return { queued: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export default {
  syncUserToQueue,
  syncCompanyToQueue,
  logToQueue,
}
