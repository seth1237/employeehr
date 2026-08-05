import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { runMigrations } from '../../scripts/runMigrations.mjs'
import { migrateUsers, migrateCompanies } from '../../scripts/syncMongoToMySQL'

dotenv.config()

const SYNC_INTERVAL_MS = Number(process.env.AUTO_SYNC_INTERVAL_MS || 5 * 60 * 1000) // default 5 minutes
let syncInProgress = false

async function runFullSync() {
  if (!process.env.MYSQL_DATABASE_URL?.trim()) {
    return
  }

  if (syncInProgress) {
    console.log('⏳ [SyncScheduler] Sync already running, skipping overlapping run')
    return
  }

  if (mongoose.connection.readyState !== 1) {
    console.warn('⚠️ [SyncScheduler] MongoDB is not connected, skipping sync run')
    return
  }

  syncInProgress = true
  try {
    console.log('🔁 [SyncScheduler] Starting full sync: migrations + data sync')
    // Ensure DB schema is up-to-date
    await runMigrations()

    // Run data migrations
    const users = await migrateUsers()
    const companies = await migrateCompanies()
    console.log(`🔁 [SyncScheduler] Sync complete: users=${users}, companies=${companies}`)
  } catch (error) {
    console.error('❌ [SyncScheduler] Full sync failed:', error instanceof Error ? error.message : error)
  } finally {
    syncInProgress = false
  }
}

export async function startSyncScheduler() {
  // Run once at startup
  await runFullSync()

  // Schedule periodic syncs
  setInterval(() => {
    void runFullSync()
  }, SYNC_INTERVAL_MS)

  console.log(`🔁 [SyncScheduler] Scheduled full sync every ${SYNC_INTERVAL_MS / 1000} seconds`)
}

export default startSyncScheduler
