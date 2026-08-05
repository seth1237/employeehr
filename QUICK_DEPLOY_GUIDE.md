# Auto-Deploy with Prisma: Quick Start

## 🚀 30-Second Setup

### Step 1: Generate Prisma Client
```bash
cd server
npx prisma generate
```

### Step 2: Push Schema to MySQL
```bash
npx prisma db push
```

### Step 3: Sync MongoDB Data
```bash
npx ts-node src/scripts/syncMongoToMySQL.ts
```

### Step 4: Test Everything
```bash
npm run db:test    # ✅ Both DBs connected?
```

---

## 📦 Deployment Flow

### Local Development
```bash
npm run dev        # Runs without requiring migrations
```

### Production Build
```bash
npm run build      # 1. Generates Prisma Client
                   # 2. Pushes migrations to MySQL
                   # 3. Compiles TypeScript
```

### Production Start
```bash
npm start          # 1. Pushes migrations (as safety check)
                   # 2. Starts server
```

---

## 🐳 Docker Quick Start

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY server/prisma ./prisma
COPY dist ./dist
ENV NODE_ENV=production
CMD ["sh", "-c", "npm run db:push && npm start"]
```

Build and run:
```bash
docker build -t app .
docker run -e MYSQL_DATABASE_URL="mysql://..." -e MONGODB_URI="mongodb://..." app
```

---

## 🔧 Environment Variables Required

```bash
# .env (production)
NODE_ENV=production
MYSQL_DATABASE_URL=mysql://user:pass@host:3306/db
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net
JWT_SECRET=strong-secret-key
PORT=5010
```

---

## ⚠️ Common Issues

**Q: "Table doesn't exist" error?**
```bash
# Push schema first
npm run db:push
```

**Q: "Can't connect to MySQL"?**
```bash
# Test connections
npm run db:test

# Check .env: MYSQL_DATABASE_URL is correct?
```

**Q: Data not synced to MySQL?**
```bash
# Re-sync from MongoDB
npx ts-node src/scripts/syncMongoToMySQL.ts
```

---

## ✅ Success Checklist

After deploying, you should see:

```
✅ Server running on port 5010
✅ MongoDB: Connected
✅ MySQL: Secondary storage ready
🔄 Running Prisma migrations...
✅ Prisma migrations completed successfully!
```

---

## 📚 Full Docs

- [DEPLOYMENT_AUTO_MIGRATION.md](./DEPLOYMENT_AUTO_MIGRATION.md) - Complete deployment guide
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Pre-deploy checklist
- [MYSQL_SECONDARY_STORAGE_SETUP.md](./MYSQL_SECONDARY_STORAGE_SETUP.md) - MySQL setup details
