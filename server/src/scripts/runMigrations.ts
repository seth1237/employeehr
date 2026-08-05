/**
 * Deployment migration script - runs during build/deploy
 * This ensures Prisma database is always up-to-date
 */

import { runMigrations as runMigrationsImpl } from "./runMigrations.mjs"

async function runMigrations() {
  return runMigrationsImpl()
}

const isMainModule = process.argv[1]
  ? fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file://${process.argv[1]}`))
  : false

// Run if executed directly
if (isMainModule) {
  runMigrations().then((success) => {
    process.exit(success ? 0 : 1)
  })
}

export { runMigrations }
