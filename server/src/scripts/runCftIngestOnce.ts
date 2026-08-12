#!/usr/bin/env npx tsx
/**
 * One-shot CFT ingest from CLI (stream + sync). Prefer the backend scheduler in production.
 */
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import mongoose from "mongoose"
import { runCftIngestCycle } from "../services/cft/cftIngestScheduler"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, "../../.env") })

async function main() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI required")
  await mongoose.connect(process.env.MONGODB_URI)
  const result = await runCftIngestCycle({ includeLines: true })
  console.log(JSON.stringify(result, null, 2))
  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error(error)
  if (mongoose.connection.readyState) await mongoose.disconnect()
  process.exit(1)
})
