#!/usr/bin/env npx tsx
/**
 * CLI wrapper around the embedded CFT sync service.
 *
 *   npx tsx src/scripts/syncCftRawToAccord.ts
 *   npx tsx src/scripts/syncCftRawToAccord.ts --dry-run --limit 20
 */
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import { runCftSyncToErp } from "../services/cft/syncToErp.service"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, "../../.env") })

function parseArgs(argv: string[]) {
  const dryRun = argv.includes("--dry-run")
  const limitIdx = argv.indexOf("--limit")
  const limit = limitIdx >= 0 ? Number(argv[limitIdx + 1]) : 0
  return {
    dryRun,
    limit: Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0,
  }
}

async function main() {
  const { dryRun, limit } = parseArgs(process.argv.slice(2))
  const result = await runCftSyncToErp({
    dryRun,
    limit,
    manageMongoose: true,
  })
  console.log(JSON.stringify(result, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
