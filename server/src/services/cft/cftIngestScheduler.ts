import { streamCftToRaw } from "./cftStreamer.service"
import { runCftSyncToErp } from "./syncToErp.service"

export type CftIngestStatus = {
  enabled: boolean
  running: boolean
  lastStartedAt: string | null
  lastFinishedAt: string | null
  lastError: string | null
  lastResult: unknown
  intervalMs: number
}

let ingestInProgress = false
let lastStartedAt: string | null = null
let lastFinishedAt: string | null = null
let lastError: string | null = null
let lastResult: unknown = null
let timer: NodeJS.Timeout | null = null

function isEnabled(): boolean {
  if (process.env.CFT_INGEST_ENABLED === "false") return false
  return Boolean(process.env.CFT_IP_SESSION)
}

export function getCftIngestStatus(): CftIngestStatus {
  return {
    enabled: isEnabled(),
    running: ingestInProgress,
    lastStartedAt,
    lastFinishedAt,
    lastError,
    lastResult,
    intervalMs: Number(process.env.CFT_INGEST_INTERVAL_MS || 15 * 60 * 1000),
  }
}

/**
 * Full pipeline: CFT website → cft_raw → employeehr (single tenant upsert).
 */
export async function runCftIngestCycle(options?: { includeLines?: boolean; syncLimit?: number }) {
  if (!isEnabled()) {
    throw new Error("CFT ingest disabled (set CFT_IP_SESSION and optionally CFT_INGEST_ENABLED=true)")
  }
  if (ingestInProgress) {
    throw new Error("CFT ingest already running")
  }

  ingestInProgress = true
  lastStartedAt = new Date().toISOString()
  lastError = null

  try {
    console.log("[cft-ingest] starting stream → raw")
    const stream = await streamCftToRaw({ includeLines: options?.includeLines !== false })
    console.log("[cft-ingest] stream done", stream.counts)

    console.log("[cft-ingest] starting sync → ERP")
    const sync = await runCftSyncToErp({
      manageMongoose: false,
      limit: options?.syncLimit,
    })
    console.log("[cft-ingest] sync done", sync.counters)

    lastResult = { stream, sync }
    lastFinishedAt = new Date().toISOString()
    return lastResult
  } catch (error: any) {
    lastError = error?.message || String(error)
    lastFinishedAt = new Date().toISOString()
    throw error
  } finally {
    ingestInProgress = false
  }
}

export function startCftIngestScheduler() {
  if (!isEnabled()) {
    console.log("[cft-ingest] scheduler not started (missing CFT_IP_SESSION or explicitly disabled)")
    return
  }

  const intervalMs = Number(process.env.CFT_INGEST_INTERVAL_MS || 15 * 60 * 1000)
  const runOnBoot = process.env.CFT_INGEST_RUN_ON_BOOT !== "false"

  if (runOnBoot) {
    void runCftIngestCycle().catch((err) => {
      console.error("[cft-ingest] boot cycle failed:", err?.message || err)
    })
  }

  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    void runCftIngestCycle().catch((err) => {
      console.error("[cft-ingest] scheduled cycle failed:", err?.message || err)
    })
  }, intervalMs)

  console.log(`[cft-ingest] scheduler started every ${Math.round(intervalMs / 60000)} min`)
}
