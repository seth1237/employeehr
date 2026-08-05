# MySQL Migration - Strategic Roadmap

## Completed Phases ✅

### Phase 1: Core Infrastructure (Complete)
- ✅ MySQL 10.11.14 setup locally (elevate_dev)
- ✅ Prisma 6.16.2 configured with mysql2 driver
- ✅ Prisma schema with 58 models defined
- ✅ Global Prisma singleton client with logging

### Phase 2: Auth/Users Full Migration (Complete)
- ✅ Company model and data (3 companies migrated)
- ✅ User model and data (23 users migrated)
- ✅ AuthService - rewired to Prisma
- ✅ UserService - rewired to Prisma
- ✅ UserController - updated for Prisma
- ✅ Auth endpoints tested and working on MySQL backend
- **Status:** Production-ready, auth system can run on MySQL

### Phase 3: Stock Module - Clients (Partial)
- ✅ StockClient model exported and imported (720 clients in MySQL)
- ⚠️ Other Stock models (Sales, Quotations, Invoices, etc.) require schema refinement
- **Issue:** Prisma schema simplified; MongoDB has complex nested structures (dispatch info, etims config) that need careful mapping
- **Decision:** Skip detailed Stock migration for now; re-evaluate after simpler modules

## Recommended Next Steps

### IMMEDIATE: Resolve Prisma Schema & Deploy to MySQL

Current Status: Schema generation working, but `db push` encountering conflicts with existing StockEntry foreign keys.

**Solution:** Two options:

**Option A (Recommended): Incremental Schema Fix**
1. Identify which models are ready (LeaveRequest, LeaveBalance, Holiday are clean)
2. Comment out problematic Stock models temporarily from schema
3. Push clean tables only
4. Re-add Stock models after resolving FK conflicts

**Option B: Full Schema Rebuild** 
1. Drop all non-core tables and rebuild from clean state
2. Only migrate core (Company, User) + core business logic tables
3. Skip complex models with nested structures for now

### For Production: Choose Migration Strategy

**Fast Path (Recommended for MVP):**
- Auth/Users: ✅ Ready for production
- Stock Clients: ✅ Ready (720 records in MySQL)
- Defer: Leave, Meetings, Stock (complex) → Keep on MongoDB for now
- Result: Auth system + Client data on MySQL, business logic on MongoDB

**Comprehensive Path:**
- Extend current model-by-model approach after schema stabilization
- Estimated timeline: 1-2 weeks to migrate all remaining modules
- Higher risk but full migration value

### Testing Checkpoints

Before moving to production with any module:
1. ✅ Core auth endpoints (login, register) working on MySQL
2. ✅ Response formats unchanged from MongoDB version
3. ✅ JWT tokens generating correctly
4. ✅ Foreign key relationships preserved
5. ✅ Legacy API adapters maintaining compatibility

## Current Status Summary

```
Migrated to MySQL:
├─ Company (3 records)
├─ User (23 records)
├─ StockClient (720 records)
└─ [Auth service layer] ✅ Prisma-backed

Next Steps:
├─ Phase 4a: Full auth endpoint validation
├─ Phase 4b: Leave management migration
├─ Phase 4c: Jobs/recruitment migration
├─ Phase 4d: Meetings migration
├─ Phase 4e: Complaints migration
└─ Phase 5: Stock module refinement

Database Status:
├─ MySQL: 58 models defined, core tables populated
├─ MongoDB: Legacy connection still active for non-migrated services
└─ Dual-read capability: Services can query both databases during transition
```

## Technical Notes

1. **Prisma Client:** Working correctly, confirmed with count queries
2. **Backend Server:** Dev server running on port 5010, responding to auth endpoints
3. **Migration Scripts:** Reusable pattern established (export → import → verify)
4. **API Compatibility:** Auth endpoints return same response format as MongoDB version via adapter functions
5. **TypeScript:** All new Prisma code compiles without errors (190 pre-existing errors in legacy MongoDB code)

## Deployment Considerations

When ready for production:
1. Provision MySQL database on production server (same schema as local elevate_dev)
2. Run migrations on production database
3. Update production .env with new MYSQL_DATABASE_URL
4. Perform parallel testing (both MongoDB and MySQL backends)
5. Switch traffic to MySQL backend after validation
6. Keep MongoDB as fallback during initial production rollout

## Key Files

- Migration orchestrator: `server/src/scripts/migrateStockToMySQL.ts`
- Export scripts: `server/src/scripts/export*MongoData.ts`
- Import scripts: `server/src/scripts/import*ToMySQL.ts`
- Service adapters: `server/src/lib/mysqlAdapters.ts`
- Package scripts: See `server/package.json` scripts section
