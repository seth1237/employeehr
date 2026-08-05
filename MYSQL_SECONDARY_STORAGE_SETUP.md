# MySQL Secondary Storage Layer Setup

## Overview

This system uses **MongoDB as primary storage** and **MySQL as secondary storage** for:
- Fast lookups (user auth, company data)
- Audit trails and compliance
- Analytics snapshots
- Session management
- Reporting queries

## Architecture

```
MongoDB (Primary)              MySQL (Secondary)
├── User                  →    User (cached)
├── Company              →    Company (cached)
├── Stock                       ├── AuditLog
├── Product                     ├── Session
├── ... (all entities)          ├── AnalyticsSnapshot
                                └── ...
```

## Setup

### 1. Start MySQL locally

**Option A — Docker (recommended):**

```bash
docker compose -f docker-compose.mysql.yml up -d
```

**Option B — existing MySQL:** create database `elevate_dev` and a user with access.

Add to `server/.env`:

```
MYSQL_DATABASE_URL=mysql://elevate:elevate123@localhost:3306/elevate_dev
```

### 2. Create sync tables + Prisma client

```bash
cd server
npm run db:setup
```

This creates dedicated tables (`mongo_sync_users`, `mongo_sync_companies`, …) separate from legacy ERP tables (`User`, `Company`).

### 3. Initial data sync (MongoDB → MySQL)

```bash
cd server
npm run db:sync
```

On server start, the sync scheduler runs migrations and sync automatically every 5 minutes.

### 4. Production / server deploy

1. Set `MYSQL_DATABASE_URL` in the deployment environment.
2. Set `NODE_ENV=production`.
3. On deploy, the server runs `prisma migrate deploy` (migrations in `server/prisma/migrations/`).
4. Ensure MySQL is reachable from the app host.

```bash
cd server
npx prisma migrate deploy
npm run db:sync   # optional one-time backfill
```

## Usage in Code

### Automatic Syncing

When you create/update users and companies in MongoDB, they automatically sync to MySQL:

```typescript
import { syncUserOperation } from "@/utils/dualWriteSync"

// In user creation flow
const newUser = await User.create(userData)

// Trigger dual-write sync
await syncUserOperation(newUser, "CREATE", req.user?.userId, 
  req.ip, req.get("user-agent"))
```

### Manual Queries from MySQL (for reads)

```typescript
import { SecondaryStorageService } from "@/services/secondaryStorageService"

// Fast user lookup
const user = await SecondaryStorageService.getUserByEmail("user@example.com")

// Get company
const company = await SecondaryStorageService.getCompanyBySlug("my-company")
```

### Audit Trails

```typescript
await SecondaryStorageService.logAuditTrail(
  userId,
  org_id,
  "User",
  "UPDATE",
  entityId,
  oldValues,
  newValues,
  ipAddress,
  userAgent
)
```

### Sessions

```typescript
// Create session
await SecondaryStorageService.createSession(
  userId,
  org_id,
  token,
  expiresAt,
  ipAddress,
  userAgent
)

// Clean expired
await SecondaryStorageService.cleanExpiredSessions()
```

### Analytics

```typescript
await SecondaryStorageService.recordAnalyticsSnapshot(
  org_id,
  {
    totalUsers: 150,
    activeUsers: 120,
    totalProducts: 500,
    totalSales: 1000,
    totalRevenue: 50000,
  }
)
```

## Database Schema Details

### Users Table
- `id`: UUID primary key
- `mongoId`: Reference to MongoDB ObjectId (unique)
- `email`, `role`, `status`: For quick auth lookups
- Indexes on `org_id`, `email`, `role` for fast queries

### Companies Table
- `mongoId`: Synced from MongoDB
- `slug`: For company lookups
- Color/branding props for quick reads

### AuditLog Table
- Track all CREATE/UPDATE/DELETE operations
- Indexes on `userId`, `org_id`, `entity`, `createdAt`
- Useful for compliance and debugging

### Sessions Table
- Store active sessions for logout/session management
- Auto-cleanup via TTL index

### AnalyticsSnapshot Table
- Daily aggregated metrics
- Useful for dashboards and reporting

## Important Notes

⚠️ **Write to MongoDB first** - MySQL is secondary backup/cache
⚠️ **Sync failures won't block operations** - MongoDB writes always succeed
⚠️ **Manual edits to MySQL should sync back** - Use reverse sync if needed
✅ **Use MySQL for reads** - Faster than MongoDB for simple lookups

## Troubleshooting

### Sync not working?

Check logs:
```bash
# Watch server logs
npm run dev

# Check Prisma connection
npx prisma db execute --stdin < "SELECT 1"
```

### Out of sync?

Re-sync data:
```bash
npx ts-node src/scripts/syncMongoToMySQL.ts
```

### MySQL connection refused?

```bash
# Check MySQL is running
sudo service mysql status

# Or start it
sudo service mysql start

# Test connection
mysql -u elevate -p -h localhost
```

## Next Steps

1. ✅ Update user creation endpoints to sync to MySQL
2. ✅ Add reverse sync for MySQL edits (if needed)
3. ✅ Set up scheduled audit log cleanup
4. ✅ Enable read replicas for MySQL for scaling
