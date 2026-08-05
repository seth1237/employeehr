# Services Module - Developer Setup & Troubleshooting Guide

## 🛠️ DEVELOPMENT ENVIRONMENT SETUP

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB instance (local or cloud)
- TypeScript knowledge
- React knowledge

### Installation Steps

#### 1. Update Dependencies
```bash
# No new npm packages needed - uses existing stack
npm install
```

#### 2. Update Database Schema (Prisma)
```bash
# Apply new Prisma models
npx prisma migrate dev --name add_services

# or if using MySQL
npx prisma migrate dev --name add_services_mysql

# Generate updated Prisma client
npx prisma generate
```

#### 3. Verify MongoDB Model
The new `StockServiceJob` model is already created at:
```
/server/src/models/StockServiceJob.ts
```
It uses the existing Mongoose connection - no additional setup needed.

#### 4. Rebuild Frontend
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

#### 5. Start Development Server
```bash
# Development mode (with hot reload)
npm run dev

# or production mode
npm run start
```

#### 6. Verify Installation
Navigate to: `http://localhost:3000/dashboard/stock/services`

You should see:
- Dashboard tab (empty analytics)
- Services tab (empty service list)
- Jobs tab (empty jobs list)

---

## 🔍 TROUBLESHOOTING GUIDE

### Issue 1: Page Returns 404

**Problem**: Cannot find `/dashboard/stock/services`

**Solutions**:
```bash
# 1. Clear build cache
rm -rf .next

# 2. Rebuild
npm run build

# 3. Restart dev server
npm run dev

# 4. Hard refresh browser
Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
```

### Issue 2: "API endpoint not found"

**Problem**: Getting 404 errors when calling `/api/stock/services`

**Solutions**:
```bash
# 1. Check routes file exists
ls -la /server/src/routes/stock.routes.ts

# 2. Verify controller methods exist
grep "createService\|getServices" /server/src/controllers/stockController.ts

# 3. Check server restart
# The API routes may not have been reloaded
# Restart with: npm run dev

# 4. Verify base URL
# Make sure you're calling /api/stock/ not /api/services/
```

### Issue 3: Database Connection Error

**Problem**: "Cannot connect to MongoDB" or database errors

**Solutions**:
```bash
# 1. Check MongoDB is running
# If local: mongod should be running
# If cloud: check connection string

# 2. Verify Prisma connection
npx prisma db push

# 3. Check schema is applied
npx prisma db execute -- "show tables;" -- MySQL
# or MongoDB commands for Atlas

# 4. Reset if needed (dev only!)
npx prisma migrate reset
```

### Issue 4: TypeScript Compilation Errors

**Problem**: Build fails with TypeScript errors

**Solutions**:
```bash
# 1. Check syntax of new files
npm run type-check

# 2. Regenerate Prisma types
npx prisma generate

# 3. Clear node_modules and reinstall
rm -rf node_modules
npm install

# 4. Check for import errors
npm run build -- --verbose
```

### Issue 5: Components Not Rendering

**Problem**: Blank page or component errors

**Solutions**:
```bash
# 1. Check browser console for errors
# DevTools → Console → Look for red errors

# 2. Check Next.js server logs
# Should see compilation messages

# 3. Verify component imports are correct
grep -r "from '@/components/stock/services" app/dashboard/stock/services/

# 4. Clear Next.js cache and rebuild
rm -rf .next
npm run build
```

### Issue 6: Styling Issues

**Problem**: Components look broken or unstyled

**Solutions**:
```bash
# 1. Rebuild Tailwind CSS
npm run build

# 2. Clear Next.js cache
rm -rf .next

# 3. Check UI component imports
# Verify shadcn/ui components are installed
ls -la components/ui/

# 4. Restart dev server
npm run dev
```

### Issue 7: Authentication Errors

**Problem**: "401 Unauthorized" or "403 Forbidden"

**Solutions**:
```bash
# 1. Check you're logged in
# Services require JWT token

# 2. Check user role
# Only admin/hr can create services
# Check your user role in database

# 3. Check token expiration
# Expired tokens cause 401 errors
# Re-login to get new token

# 4. Verify authMiddleware
grep -A5 "authMiddleware" /server/src/routes/stock.routes.ts
```

### Issue 8: Multi-Tenancy Issues

**Problem**: Seeing other organization's data

**Solutions**:
```bash
# 1. Verify org_id is set correctly
# Check req.user.org_id in controller

# 2. Check database query includes org_id filter
grep "org_id" /server/src/controllers/stockController.ts

# 3. Verify tenantIsolation middleware
grep -B2 -A2 "tenantIsolation" /server/src/routes/stock.routes.ts

# 4. Test with different users from different orgs
```

### Issue 9: Recurring Jobs Not Working

**Problem**: Completing a job doesn't create next job

**Solutions**:
```bash
# 1. Check job has isRecurring=true
# Jobs without this flag won't recur

# 2. Check intervalDays > 0
# intervalDays must be greater than 0

# 3. Check job status changed to "done"
# Status must be exactly "done" to trigger creation

# 4. Check controller logic
grep -A10 "if (status === \"done\")" /server/src/controllers/stockController.ts

# 5. Check database for created job
# Query MongoDB: db.stockservicejobs.find({})
```

### Issue 10: Analytics Not Showing Data

**Problem**: Dashboard is empty or shows 0

**Solutions**:
```bash
# 1. Create test data first
# Dashboard shows nothing if no jobs exist

# 2. Verify analytics endpoints work
# Try: curl http://localhost:3000/api/stock/services/analytics/summary

# 3. Check date filtering in queries
# Jobs with future dates may not count yet

# 4. Verify chart library loaded
# Check browser console for Recharts errors
```

---

## 📋 COMMON DEVELOPMENT TASKS

### Task 1: Run Tests
```bash
# Find and run test files
npm test -- services

# or specific test file
npm test -- services.test.ts
```

### Task 2: Debug API Endpoint
```bash
# Use curl to test endpoint
curl http://localhost:3000/api/stock/services \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# or use Postman to build request visually
```

### Task 3: View Database
```bash
# MongoDB Compass (visual)
# Download and connect to your MongoDB

# or MongoDB CLI
mongosh
use your_database_name
db.stockservicejobs.find({})
```

### Task 4: Check Logs
```bash
# Terminal logs (development)
# npm run dev output shows all logs

# or file logs (if configured)
tail -f /var/log/application.log

# Browser DevTools
# F12 → Console → See frontend logs
```

### Task 5: Profile Performance
```bash
# Chrome DevTools
F12 → Performance → Record → Use app → Stop

# or React DevTools
npm install react-devtools --save-dev

# or Next.js Analytics
# Built into Next.js by default
```

### Task 6: Debug State Issues
```bash
# Add console logs to React components
console.log('Component state:', { services, jobs, loading })

# or use React DevTools extension
# Inspect component props and state visually
```

---

## 🔧 CONFIGURATION FILES

### Environment Variables
Create `.env.local` if needed:
```env
# Database
DATABASE_URL=mongodb://localhost:27017/mydb
PRISMA_DATABASE_URL=mysql://user:pass@localhost:3306/db

# Auth
JWT_SECRET=your_secret_key

# API
API_BASE_URL=http://localhost:3000
```

### TypeScript Configuration
Already configured in `tsconfig.json`:
- ✅ Strict mode enabled
- ✅ Paths configured (@/* for imports)
- ✅ ES2020 target

### Next.js Configuration
Already configured in `next.config.mjs`:
- ✅ API routes enabled
- ✅ Static generation optimized
- ✅ Image optimization

---

## 🐛 DEBUG MODE

### Enable Debug Logging
```javascript
// In controller methods, add:
console.log('DEBUG: Creating service', { name, category, org_id })
console.log('DEBUG: Service created:', service)

// In components, add:
console.log('DEBUG: Fetching services...')
console.log('DEBUG: Services loaded:', services)
```

### VS Code Debugging
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

Then: Debug → Start Debugging (F5)

---

## 📊 MONITORING IN DEVELOPMENT

### Network Requests
```javascript
// Browser DevTools
F12 → Network tab → Make API call → See request/response
```

### Database Queries
```javascript
// Enable Prisma logging
// In code before prisma calls:
prisma.$on('query', (e) => {
  console.log('Query:', e.query)
  console.log('Duration:', e.duration + 'ms')
})
```

### React Component Performance
```bash
# Install React DevTools
npm install --save-dev react-devtools

# Then in browser DevTools:
React DevTools → Profiler tab → Record interactions
```

---

## 🚀 OPTIMIZATION TIPS

### Backend Optimization
```typescript
// Use lean queries when not updating
const jobs = await StockServiceJob.find({}).lean()

// Add specific field selection
const jobs = await StockServiceJob.find({}, 'id name status scheduledDate')

// Use pagination for large result sets
const jobs = await StockServiceJob.find({})
  .limit(20)
  .skip((page - 1) * 20)
```

### Frontend Optimization
```typescript
// Use React.memo for expensive components
export const ServicesList = React.memo(({ services }) => {
  return <div>...</div>
})

// Use useCallback to prevent unnecessary re-renders
const handleStatusChange = useCallback((jobId, status) => {
  // update logic
}, [])

// Use useMemo for expensive calculations
const completionRate = useMemo(() => {
  return (completed / total) * 100
}, [completed, total])
```

### Database Optimization
```bash
# Check query performance
db.stockservicejobs.explain("executionStats").find({ status: "pending" })

# Verify indexes are being used
db.stockservicejobs.getIndexes()

# Add index if missing
db.stockservicejobs.createIndex({ org_id: 1, status: 1 })
```

---

## 📚 USEFUL COMMANDS REFERENCE

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Build for production
npm start                  # Start production server

# Database
npx prisma migrate dev     # Create and apply migration
npx prisma studio         # Open Prisma Studio (visual DB editor)
npx prisma generate       # Regenerate Prisma client
npx prisma db push        # Sync schema without migrations

# Linting
npm run lint              # Run ESLint
npm run lint -- --fix     # Fix linting issues

# Type Checking
npm run type-check        # Run TypeScript compiler

# Testing
npm test                  # Run tests
npm test -- --watch      # Run tests in watch mode

# Building
npm run build             # Next.js build

# Cleanup
rm -rf .next              # Clear Next.js cache
rm -rf node_modules       # Remove dependencies
npm install               # Reinstall dependencies
```

---

## 🎯 DEVELOPMENT WORKFLOW

### Typical Day

```bash
# 1. Start the day
npm run dev

# 2. Make code changes
# Edit /server/src/controllers/stockController.ts or components

# 3. Changes auto-reload (hot reload)
# Browser automatically refreshes

# 4. If changes don't appear
npm run build
# Then restart: Ctrl+C and npm run dev

# 5. Test changes
# Browser: Navigate to /dashboard/stock/services
# API: Use Postman or curl

# 6. Check for errors
# Terminal: Look for error messages
# Browser Console (F12): Look for errors
# Network tab (F12): Check API responses

# 7. Commit your changes
git add .
git commit -m "feat: add service feature"
git push
```

---

## ✅ PRE-DEPLOYMENT CHECKLIST

```bash
# 1. Run type check
npm run type-check

# 2. Run linter
npm run lint

# 3. Build production bundle
npm run build

# 4. Check for errors in build output
# Should see: "✓ Ready in Xs"

# 5. Test the build locally
npm start
# Visit http://localhost:3000/dashboard/stock/services

# 6. Run database migrations
npx prisma migrate deploy

# 7. Final checks
npm test
git status
```

---

## 📞 WHEN STUCK

1. **Check documentation first**: [SERVICES_MODULE_DOCUMENTATION.md](SERVICES_MODULE_DOCUMENTATION.md)
2. **Review error messages carefully**: Google the exact error
3. **Check recent changes**: What was the last thing you changed?
4. **Try simple fixes**: Clear cache, restart server
5. **Ask for help**: Share error message and what you were doing

---

## 🎓 LEARNING RESOURCES

- Next.js Docs: https://nextjs.org/docs
- Express Docs: https://expressjs.com
- Prisma Docs: https://www.prisma.io/docs
- MongoDB Docs: https://docs.mongodb.com
- React Docs: https://react.dev
- TypeScript Docs: https://www.typescriptlang.org/docs

---

**Happy coding!** 🚀
