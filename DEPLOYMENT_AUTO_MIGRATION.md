# Deployment & Auto-Migration Guide

## Overview

Prisma migrations automatically run during:
- **Build**: `npm run build` → runs `prisma generate` + migrations
- **Startup**: Server starts → runs migrations before listening
- **Deployment**: CI/CD automatically triggers migrations

## How It Works

### Local Development

```bash
# Development mode - migrations are optional
npm run dev

# Manually run migrations
npm run db:push       # Recommended: push schema changes
npm run db:migrate    # Alternative: create snapshots
```

### Production Build & Deploy

```bash
# Build step (runs migrations automatically)
npm run build         # → prisma generate → prisma migrate deploy
                      # → tsc compilation

# Start server (runs migrations again as safety)
npm start             # → prisma db push → node server
```

## Deployment Strategies

### Strategy 1: Automated (Recommended)

**Build Phase:**
```bash
npm run build  # Includes: prisma generate + db:push + tsc
```

**Start Phase:**
```bash
npm start      # Includes: db:push + server startup
```

**Result:** Migrations run twice (safe, idempotent)

### Strategy 2: Explicit Control

**If you want migrations ONLY during build:**
```bash
# Set environment variable
RUN_MIGRATIONS=true npm run build
npm run start  # Skips migrations, only starts server
```

### Strategy 3: Manual Pre-deployment

```bash
# Before deploying, run migrations manually
npm run db:push

# Then deploy code without re-running migrations
npm run build  # Just compiles TypeScript
SKIP_MIGRATIONS=true npm start
```

## Docker Deployment

### Dockerfile Example

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY server/prisma ./prisma
COPY dist ./dist
COPY .env .env

# Run migrations before starting
CMD ["sh", "-c", "npm run db:push && npm start"]
```

### Docker Compose

```yaml
version: "3.8"
services:
  mysql:
    image: mysql:8
    environment:
      MYSQL_DATABASE: elevate_dev
      MYSQL_ROOT_PASSWORD: password
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: ./server
    depends_on:
      mysql:
        condition: service_healthy
    environment:
      MYSQL_DATABASE_URL: mysql://root:password@mysql:3306/elevate_dev
      MONGODB_URI: ${MONGODB_URI}
    ports:
      - "5010:5010"
    command: sh -c "npm run db:push && npm start"
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        working-directory: ./server
        run: npm ci

      - name: Build with migrations
        working-directory: ./server
        env:
          MYSQL_DATABASE_URL: ${{ secrets.MYSQL_DATABASE_URL }}
          MONGODB_URI: ${{ secrets.MONGODB_URI }}
          NODE_ENV: production
        run: npm run build

      - name: Deploy to production
        run: |
          # Your deployment command
          # Migrations will run on startup via npm start
```

### Vercel Deployment

**vercel.json:**
```json
{
  "buildCommand": "cd server && npm run build",
  "framework": "express",
  "env": {
    "MYSQL_DATABASE_URL": "@mysql_database_url",
    "MONGODB_URI": "@mongodb_uri",
    "NODE_ENV": "production"
  }
}
```

### Environment Variables

Ensure these are set in deployment:

```bash
# Required for MySQL sync
MYSQL_DATABASE_URL=mysql://user:pass@host:3306/dbname

# MongoDB primary storage
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net

# Server config
NODE_ENV=production       # Enables "prisma migrate deploy"
PORT=5010
JWT_SECRET=your-secret

# Optional: Force migrations in dev
RUN_MIGRATIONS=true      # Dev only - not for production
```

## Troubleshooting

### Migrations Fail During Deploy

**Check logs:**
```bash
npx prisma migrate status
npx prisma migrate resolve --rolled-back <migration_name>
```

**Rollback:**
```bash
npx prisma migrate reset  # ⚠️ DATA LOSS - dev only
```

### Schema Out of Sync

```bash
# Regenerate Prisma Client
npx prisma generate

# Push schema without creating migration (dev only)
npx prisma db push --skip-generate
```

### Connection Issues

```bash
# Test connections before deploying
npm run db:test    # Tests MongoDB + MySQL
```

## Migration Monitoring

### Track Migrations

```bash
# See migration history
npx prisma migrate status

# View current schema
npx prisma db pull   # Pulls schema from DB to schema.prisma
```

### Sync Issues?

If MySQL is out of sync with MongoDB schema:

```bash
# Resync all data from MongoDB
npx ts-node src/scripts/syncMongoToMySQL.ts
```

## Best Practices

✅ **DO:**
- Run migrations in build pipeline before deploying
- Test migrations in staging first
- Set `NODE_ENV=production` in production deployments
- Keep `.env` with correct database URLs in production

❌ **DON'T:**
- Manually edit database without migrations
- Delete migration files
- Run `prisma migrate reset` in production
- Skip `prisma generate` before starting server

## Commands Summary

| Command | Purpose | When to Use |
|---------|---------|------------|
| `npm run build` | Build + Migrations | Build step |
| `npm start` | Run server with auto-migrations | Production start |
| `npm run dev` | Dev watch mode | Local development |
| `npm run db:push` | Push schema to DB | Manual sync |
| `npm run db:migrate` | Create migration snapshot | Before PR |
| `npm run db:reset` | Reset DB (⚠️ DATA LOSS) | Dev only |

## Next Steps

1. ✅ Ensure `MYSQL_DATABASE_URL` is set in production
2. ✅ Test deployment with migrations locally first
3. ✅ Set up CI/CD to run `npm run build` before deploy
4. ✅ Monitor logs during first deployment
