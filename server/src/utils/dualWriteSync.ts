/**
 * DEPRECATED - Use BullMQ Queue Based Sync Instead
 * 
 * This file is kept for reference only.
 * Direct sync operations have been replaced with async queue-based synchronization.
 *
 * ✅ NEW APPROACH (use these):
 *   - Import from: server/src/utils/queueHelper.ts
 *   - Functions: syncUserToQueue, syncCompanyToQueue, logToQueue
 *
 * ❌ OLD APPROACH (deprecated):
 *   - captureAuditContext → not needed (context passed via job data)
 *   - syncUserOperation → use syncUserToQueue instead
 *   - syncCompanyOperation → use syncCompanyToQueue instead
 *
 * Benefits of new queue-based approach:
 *   ✅ Non-blocking (fast user operations)
 *   ✅ Automatic retries on failure
 *   ✅ No data loss if MySQL is temporarily down
 *   ✅ Monitorable via BullMQ dashboard
 *   ✅ Concurrent processing with configurable workers
 *
 * See:
 *   - server/src/utils/queueHelper.ts (use these functions)
 *   - server/src/services/syncQueueService.ts (queue definition)
 *   - server/src/services/workers/syncWorker.ts (job processor)
 */

export default {}
