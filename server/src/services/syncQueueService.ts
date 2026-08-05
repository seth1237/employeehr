/**
 * BullMQ Sync Queue Service
 * Manages the queue for MongoDB → MySQL synchronization
 * 
 * Usage:
 *  await mongoToMySQLQueue.add('sync', { type: 'USER_CREATED', user, ... })
 */

import net from 'node:net'
import { Queue } from 'bullmq'

// BullMQ uses ioredis-style connection options
export const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as number | null,
}

let mongoToMySQLQueue: Queue | null = null

async function isRedisReachable(timeoutMs = 1000) {
  return await new Promise<boolean>((resolve) => {
    const socket = net.createConnection({
      host: redisConnection.host,
      port: redisConnection.port,
    })

    const done = (ok: boolean) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(ok)
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

async function getQueue() {
  if (mongoToMySQLQueue) {
    return mongoToMySQLQueue
  }

  const reachable = await isRedisReachable()
  if (!reachable) {
    console.warn(`⚠️ [Queue] Redis is unavailable at ${redisConnection.host}:${redisConnection.port}; sync jobs will be skipped.`)
    return null
  }

  mongoToMySQLQueue = new Queue('mongo-to-mysql-sync', {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
      },
      removeOnFail: false,
    },
  })

  return mongoToMySQLQueue
}

// Convenience functions
export async function queueUserSync(user: any, action: 'CREATE' | 'UPDATE' | 'DELETE') {
  const queue = await getQueue()
  if (!queue) return null

  return queue.add('user-sync', {
    type: `USER_${action}`,
    user,
    action,
  })
}

export async function queueCompanySync(company: any, action: 'CREATE' | 'UPDATE' | 'DELETE') {
  const queue = await getQueue()
  if (!queue) return null

  return queue.add('company-sync', {
    type: `COMPANY_${action}`,
    company,
    action,
  })
}

export async function queueAuditLog(
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
  const queue = await getQueue()
  if (!queue) return null

  return queue.add('audit-log', {
    type: 'AUDIT_LOG',
    userId,
    org_id,
    entity,
    action,
    entityId,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
  })
}

export { mongoToMySQLQueue }

export default mongoToMySQLQueue
