# BullMQ Queue-Based Sync (Option B) - Implementation Guide

## ✅ What's Implemented

```
MongoDB (Live)            Redis Queue            MySQL (Records)
├── User created    →  BullMQ job  →  Sync Worker  →  users table
├── Company created →  queued      →  processes    →  companies table  
├── Changes        →  with retry   →  5 concurrent →  audit_logs table
└── ...            →  3 attempts   →  workers      →  ...
```

**Better than Option A because:**
- ✅ Non-blocking (users see instant response)
- ✅ Auto-retries (3 attempts with exponential backoff)
- ✅ No data loss (queue persists to Redis)
- ✅ Monitorable (see all jobs)
- ✅ Production-ready

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd server
npm install
```

This installs:
- `bullmq@4.12.0` - Job queue
- `redis@4.7.0` - Queue storage
- `concurrently@8.2.2` - Run server + worker together

### 2. Start Redis

```bash
# Mac
brew services start redis

# Ubuntu/Linux
sudo service redis-server start

# Docker
docker run -d -p 6379:6379 redis:latest

# Verify it's running
redis-cli ping
# Should output: PONG
```

### 3. Start Dev with Queue Worker

```bash
npm run dev
```

This runs **both** in parallel:
- Server on port 5010
- Sync worker listening for jobs

You should see:

```
🚀 [Worker] Sync worker started and listening for jobs...
📍 [Worker] Connected to Redis: localhost:6379
✅ Server running on port 5010
🗄️  MongoDB: Connected
🗄️  MySQL: Secondary storage ready
```

---

## 📝 Usage in Controllers

### Before (direct sync - DEPRECATED)

```typescript
// ❌ OLD - blocks user response
const user = await User.create(userData)
await SecondaryStorageService.syncUserToMySQL(user, 'CREATE')
// User has to wait for MySQL sync
```

### After (queue-based - RECOMMENDED)

```typescript
// ✅ NEW - instant response to user
import { syncUserToQueue } from '@/utils/queueHelper'

const user = await User.create(userData)

// Queue async sync (returns immediately)
syncUserToQueue(user, 'CREATE', {
  userId: req.user?.userId,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
})

// User already has response!
return res.json({ success: true, user })
```

---

## 🔧 Implementation Examples

### Example 1: Creating a User

```typescript
// authService.ts
import { syncUserToQueue } from '@/utils/queueHelper'

static async registerCompany(data: any) {
  const company = new Company(data)
  const savedCompany = await company.save()
  
  const user = new User({
    org_id: savedCompany._id,
    ...userData
  })
  const savedUser = await user.save()
  
  // Queue sync to MySQL (non-blocking)
  syncUserToQueue(savedUser.toObject(), 'CREATE', {
    userId: 'system',
    ipAddress: '127.0.0.1',
  })
  
  return { company: savedCompany, user: savedUser, token }
}
```

### Example 2: Updating a User

```typescript
// userController.ts
import { syncUserToQueue } from '@/utils/queueHelper'

static async updateUser(req: AuthenticatedRequest, res: Response) {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  )
  
  // Queue the update
  syncUserToQueue(user.toObject(), 'UPDATE', {
    userId: req.user!.userId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  })
  
  res.json({ success: true, user })
}
```

### Example 3: Logging Audit Trail

```typescript
// Leave request approval
import { logToQueue } from '@/utils/queueHelper'

static async approveLeave(req: AuthenticatedRequest, res: Response) {
  const leave = await Leave.findByIdAndUpdate(
    req.params.id,
    { status: 'approved' },
    { new: true }
  )
  
  // Log to audit trail (queued)
  await logToQueue(
    req.user!.userId,
    req.user!.org_id,
    'LeaveRequest',
    'APPROVE',
    leave._id.toString(),
    { status: 'pending' },
    { status: 'approved' },
    req.ip,
    req.get('user-agent'),
  )
  
  res.json({ success: true, leave })
}
```

---

## 📊 Queue Monitoring

### Via Logs (Console)

```bash
# When job completes successfully
⚙️  [Worker] Processing job abc123: USER_CREATE
✅ [Queue] Job abc123 completed successfully

# When job fails and retries
❌ [Queue] Job abc123 failed after retries: Connection refused
```

### Via BullMQ UI (Optional)

```bash
# Install
npm install --save-dev @bull-board/express @bull-board/ui

# See: API docs for setup
# Access: http://localhost:3000/admin/queues
```

### Via Redis CLI

```bash
redis-cli

# View queue
LLEN bull:mongo-to-mysql-sync:jobs

# View job details
HGETALL bull:mongo-to-mysql-sync:1234:data
```

---

## ⚙️ Configuration

### Retry Strategy

In `syncQueueService.ts`:

```typescript
defaultJobOptions: {
  attempts: 3,                    // Retry 3 times
  backoff: {
    type: 'exponential',
    delay: 2000,                  // Start at 2 seconds
  },                              // Then 4s, 8s, 16s...
  removeOnComplete: { age: 3600 }, // Keep for 1 hour
}
```

**If you want:**
- More retries: `attempts: 5`
- Faster retries: `delay: 500`
- Slower retries: `delay: 5000`

### Concurrency

In `syncWorker.ts`:

```typescript
const syncWorker = new Worker(
  'mongo-to-mysql-sync',
  handler,
  {
    connection: redisConnection,
    concurrency: 5,  // Process 5 jobs in parallel
  }
)
```

**Increase if:** Many sync jobs backing up
**Decrease if:** Worker CPU usage too high

---

## 🐳 Production Deployment

### Docker Compose

```yaml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

  api:
    build: ./server
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
      MONGODB_URI: ${MONGODB_URI}
      MYSQL_DATABASE_URL: ${MYSQL_DATABASE_URL}
    ports:
      - "5010:5010"
    depends_on:
      - redis
    command: npm start

  worker:
    build: ./server
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
      MONGODB_URI: ${MONGODB_URI}
      MYSQL_DATABASE_URL: ${MYSQL_DATABASE_URL}
    depends_on:
      - redis
    command: npm run queue:worker

volumes:
  redis_data:
```

Deploy:
```bash
docker-compose up -d
```

### Horizontal Scaling

Run multiple worker instances:

```bash
# Terminal 1
npm run queue:worker

# Terminal 2
npm run queue:worker

# Terminal 3
npm run queue:worker
```

All workers share same Redis queue = parallel processing!

---

## 🚨 Troubleshooting

### "Redis connection refused"

```bash
# Check if Redis is running
redis-cli ping

# If not running:
# Mac
brew services start redis

# Linux
sudo service redis-server start

# Docker
docker run -d -p 6379:6379 redis:latest
```

### "Jobs not processing"

```bash
# Check worker is running
npm run queue:worker

# Check console for errors
# Should see: 🚀 [Worker] Sync worker started...

# If not, check Redis connection:
redis-cli PING
```

### "Queue backed up (lots of pending jobs)"

Options:
1. Increase `concurrency` in `syncWorker.ts`
2. Run multiple worker instances
3. Check MySQL performance (might be bottleneck)

### "Jobs failing with retries exhausted"

Check logs for error message. Common causes:
- MySQL connection down
- MongoDB connection down
- Schema mismatch

Fix the underlying issue, then:
```bash
# Retry failed jobs
# (automatic if you restart worker)
```

---

## 📚 Files Created/Modified

| File | Purpose |
|------|---------|
| `server/package.json` | Added bullmq, redis, concurrently |
| `server/.env` | Added REDIS_HOST, REDIS_PORT |
| `src/services/syncQueueService.ts` | **NEW** - Queue definition |
| `src/services/workers/syncWorker.ts` | **NEW** - Job processor |
| `src/utils/queueHelper.ts` | **NEW** - Controller integration |
| `src/utils/dualWriteSync.ts` | **DEPRECATED** - See queueHelper instead |
| `src/utils/testConnections.ts` | **DEPRECATED** - Use server healthcheck |
| `src/index.ts` | Updated startup, still runs migrations |

---

## ✅ Next Steps

1. ✅ Start Redis: `redis-cli ping`
2. ✅ Install: `npm install`
3. ✅ Run: `npm run dev`
4. ✅ Update one controller to use `syncUserToQueue`
5. ✅ Test creating/updating entity
6. ✅ Check logs for: "✅ [Queue] Job X completed"

---

## 🎯 Key Takeaways

```
Option B (You chose this):
✅ Non-blocking user actions
✅ Automatic retries
✅ No data loss
✅ Monitorable
✅ Production-ready
✅ Easily scalable
```

**Use this for all MongoDB → MySQL syncs:**
```typescript
import { syncUserToQueue, syncCompanyToQueue, logToQueue } from '@/utils/queueHelper'
```
