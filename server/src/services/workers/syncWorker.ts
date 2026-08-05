/**
 * Sync Worker
 * Processes MongoDB → MySQL sync jobs from BullMQ queue
 * 
 * Run: npx tsx watch src/services/workers/syncWorker.ts
 * Or automatically via: npm run dev
 */

import net from 'node:net'
import { Worker } from 'bullmq'
import { SecondaryStorageService } from '../secondaryStorageService'

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null as number | null,
}

let syncWorker: Worker | null = null

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

/**
 * Create and start the sync worker
 */
export async function startSyncWorker() {
  if (syncWorker) {
    return syncWorker
  }

  const reachable = await isRedisReachable()
  if (!reachable) {
    console.warn(`⚠️ [Worker] Redis is unavailable at ${redisConnection.host}:${redisConnection.port}; sync worker will stay offline.`)
    return null
  }

  syncWorker = new Worker(
    'mongo-to-mysql-sync',
    async (job) => {
      try {
        console.log(`⚙️  [Worker] Processing job ${job.id}: ${job.data.type}`)

        switch (job.data.type) {
          case 'USER_CREATE':
            await SecondaryStorageService.syncUserToMySQL(job.data.user, 'CREATE')
            break

          case 'USER_UPDATE':
            await SecondaryStorageService.syncUserToMySQL(job.data.user, 'UPDATE')
            break

          case 'USER_DELETE':
            await SecondaryStorageService.syncUserToMySQL(job.data.user, 'DELETE')
            break

          case 'COMPANY_CREATE':
            await SecondaryStorageService.syncCompanyToMySQL(job.data.company, 'CREATE')
            break

          case 'COMPANY_UPDATE':
            await SecondaryStorageService.syncCompanyToMySQL(job.data.company, 'UPDATE')
            break

          case 'COMPANY_DELETE':
            await SecondaryStorageService.syncCompanyToMySQL(job.data.company, 'DELETE')
            break

          case 'AUDIT_LOG':
            await SecondaryStorageService.logAuditTrail(
              job.data.userId,
              job.data.org_id,
              job.data.entity,
              job.data.action,
              job.data.entityId,
              job.data.oldValues,
              job.data.newValues,
              job.data.ipAddress,
              job.data.userAgent,
            )
            break

          default:
            throw new Error(`Unknown job type: ${job.data.type}`)
        }

        console.log(`✅ [Worker] Job ${job.id} completed: ${job.data.type}`)
        return { success: true, jobId: job.id }
      } catch (error) {
        console.error(`❌ [Worker] Job ${job.id} failed:`, error instanceof Error ? error.message : error)
        throw error
      }
    },
    {
      connection: redisConnection,
      concurrency: 5,
    },
  )

  // Event handlers
  syncWorker.on('completed', (job) => {
    console.log(`✅ [Queue] Job ${job.id} completed successfully`)
  })

  syncWorker.on('failed', (job, error) => {
    if (job) {
      console.error(`❌ [Queue] Job ${job.id} failed after retries:`, error.message)
    }
  })

  syncWorker.on('error', (error) => {
    console.error(`❌ [Queue] Worker error:`, error)
  })

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('🛑 [Worker] Shutting down gracefully...')
    await syncWorker?.close()
    process.exit(0)
  })

  console.log('🚀 [Worker] Sync worker started and listening for jobs...')
  console.log(`📍 [Worker] Connected to Redis: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`)

  return syncWorker
}

void startSyncWorker()

export default syncWorker
