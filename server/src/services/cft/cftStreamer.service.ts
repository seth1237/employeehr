import axios, { type AxiosInstance } from "axios"
import * as cheerio from "cheerio"
import { MongoClient, type Db } from "mongodb"
import { randomUUID } from "crypto"
import { CFT_BASE_URL, CFT_PRIORITY_JOBS, CFT_RAW_DB, type CftExportJob } from "./cftConfig"

type StreamResult = {
  rawRunId: string
  counts: Record<string, number>
  errors: string[]
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeText(text: string): string {
  return String(text || "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseAmountLike(value: unknown): number {
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "")
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function buildSession(cookie: string): AxiosInstance {
  return axios.create({
    timeout: 30000,
    maxRedirects: 5,
    headers: {
      Cookie: `ip_session=${cookie}`,
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Connection: "keep-alive",
    },
    validateStatus: (s) => s >= 200 && s < 400,
  })
}

function looksLikeLogin(html: string): boolean {
  const lower = html.toLowerCase()
  return lower.includes("<title>") && (lower.includes("login") || lower.includes("sign in") || /sessions\/login/i.test(html))
}

async function fetchHtml(client: AxiosInstance, url: string): Promise<string> {
  const res = await client.get(url)
  const html = String(res.data || "")
  if (looksLikeLogin(html)) {
    throw new Error(`Authentication failed for ${url} (login page returned)`)
  }
  return html
}

function candidateUrls(pathUrl: string): string[] {
  return [pathUrl, `${pathUrl}?length=-1`]
}

function extractTable($: cheerio.CheerioAPI, table: cheerio.Element): { headers: string[]; rows: string[][] } {
  const el = $(table)
  const headers = el
    .find("thead th")
    .toArray()
    .map((th) => normalizeText($(th).text()))

  const rows: string[][] = []
  el.find("tbody tr").each((_, tr) => {
    const cells = $(tr)
      .children("td,th")
      .toArray()
      .map((td) => normalizeText($(td).text()))
    if (cells.length) rows.push(cells)
  })

  let finalHeaders = headers
  if (!finalHeaders.length && rows.length) {
    finalHeaders = rows[0].map((_, i) => `column_${i + 1}`)
  }
  if (rows.length && finalHeaders.length) {
    const maxLen = Math.max(...rows.map((r) => r.length))
    if (finalHeaders.length < maxLen) {
      for (let i = finalHeaders.length; i < maxLen; i += 1) finalHeaders.push(`column_${i + 1}`)
    }
  }
  return { headers: finalHeaders, rows }
}

function rowsToDicts(headers: string[], rows: string[][]): Record<string, string>[] {
  return rows.map((row) => {
    const item: Record<string, string> = {}
    headers.forEach((header, idx) => {
      item[header] = row[idx] ?? ""
    })
    for (let idx = headers.length; idx < row.length; idx += 1) {
      item[`column_${idx + 1}`] = row[idx]
    }
    return item
  })
}

function discoverTable($: cheerio.CheerioAPI, preferredId?: string | null) {
  if (preferredId) {
    const byId = $(`table#${preferredId}`).get(0)
    if (byId) return byId
  }
  const tables = $("table").toArray()
  for (const table of tables) {
    if ($(table).find("tbody tr").length > 0) return table
  }
  return tables[0] || null
}

async function insertRowsRaw(db: Db, module: string, rows: Record<string, unknown>[], rawRunId: string) {
  if (!rows.length) return 0
  const now = Math.floor(Date.now() / 1000)
  const docs = rows.map((row) => ({
    ...row,
    scraped_at: now,
    source_module: module,
    _raw_run_id: rawRunId,
    _raw_db: db.databaseName,
  }))
  const batchSize = 1000
  let inserted = 0
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize)
    const res = await db.collection(module).insertMany(batch, { ordered: false })
    inserted += res.insertedCount
  }
  return inserted
}

async function fetchClients(client: AxiosInstance): Promise<Record<string, string>[]> {
  const endpoint = `${CFT_BASE_URL.replace(/\/$/, "")}/index.php/clients/getClients`
  const limit = 100
  let start = 0
  const all: Record<string, string>[] = []
  const seen = new Set<string>()

  while (true) {
    const body = new URLSearchParams({
      limit: String(limit),
      start: String(start),
      dt_searchable: "",
      status: "All",
    })
    const res = await client.post(endpoint, body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    })
    const payload = typeof res.data === "string" ? res.data : JSON.stringify(res.data)
    const data = payload.trim().startsWith("[") ? (JSON.parse(payload) as any[]) : Array.isArray(res.data) ? res.data : []
    if (!data.length) break

    for (const row of data) {
      const normalized: Record<string, string> = {}
      for (const [k, v] of Object.entries(row || {})) {
        normalized[String(k)] = v == null ? "" : String(v)
      }
      const id = normalized.client_id || normalized.client_no || normalized.display_document_no
      if (id && seen.has(id)) continue
      if (id) seen.add(id)
      normalized.source_url = endpoint
      all.push(normalized)
    }

    if (data.length < limit) break
    start += limit
    await sleep(Number(process.env.CFT_SLEEP_MS || 400))
  }

  if (!all.length) throw new Error(`No client data from ${endpoint}`)
  return all
}

function isQuoteLinesTable(headers: string[], rowCount: number): boolean {
  if (rowCount <= 0 || !headers.length) return false
  const blob = headers.map((h) => h.toLowerCase()).join(" ")
  return blob.includes("item") && (blob.includes("quantity") || blob.includes("qty")) && (blob.includes("subtotal") || blob.includes("price") || blob.includes("total"))
}

function isInvoiceLinesTable(headers: string[], rowCount: number): boolean {
  if (rowCount <= 0) return false
  const normalized = new Set(headers.map((h) => h.toLowerCase()))
  return normalized.has("item") && normalized.has("quantity") && normalized.has("subtotal")
}

function collectQuoteNumbers(html: string): string[] {
  const found = html.match(/(?:quotes\/(?:view|form|print_quote)\/)?(QT\d+)/gi) || []
  const out: string[] = []
  const seen = new Set<string>()
  for (const m of found) {
    const qn = (m.match(/QT\d+/i)?.[0] || "").toUpperCase()
    if (!qn || seen.has(qn)) continue
    seen.add(qn)
    out.push(qn)
  }
  return out
}

async function streamHtmlJob(client: AxiosInstance, db: Db, job: CftExportJob, rawRunId: string): Promise<number> {
  let total = 0
  for (const path of job.paths) {
    const url = `${CFT_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
    let html = ""
    let sourceUrl = ""
    for (const candidate of candidateUrls(url)) {
      try {
        html = await fetchHtml(client, candidate)
        sourceUrl = candidate
        break
      } catch {
        html = ""
      }
    }
    if (!html) continue
    const $ = cheerio.load(html)
    const table = discoverTable($, job.tableId)
    if (!table) continue
    const { headers, rows } = extractTable($, table)
    if (!rows.length) continue
    const dictRows = rowsToDicts(headers, rows).map((r) => ({ ...r, source_url: sourceUrl }))
    total += await insertRowsRaw(db, job.name, dictRows, rawRunId)
  }
  return total
}

async function streamQuoteLines(client: AxiosInstance, db: Db, rawRunId: string, quoteNumbers: string[]): Promise<number> {
  let inserted = 0
  for (let i = 0; i < quoteNumbers.length; i += 1) {
    const qn = quoteNumbers[i]
    const detailUrl = `${CFT_BASE_URL.replace(/\/$/, "")}/index.php/quotes/view/${qn}`
    try {
      const html = await fetchHtml(client, detailUrl)
      const $ = cheerio.load(html)
      let matched: Record<string, string>[] = []
      for (const table of $("table").toArray()) {
        const { headers, rows } = extractTable($, table)
        if (headers.length && isQuoteLinesTable(headers, rows.length)) {
          matched = rowsToDicts(headers, rows)
          break
        }
      }
      const cleaned = matched
        .map((r, idx) => {
          const item = String(r.Item || "").trim()
          if (item.toLowerCase() === "total") return null
          return {
            ...r,
            quote_number: qn,
            line_index: String(idx + 1),
            source_url: detailUrl,
          }
        })
        .filter(Boolean) as Record<string, string>[]
      if (cleaned.length) inserted += await insertRowsRaw(db, "quote_lines", cleaned, rawRunId)
    } catch {
      // continue
    }
    await sleep(Number(process.env.CFT_SLEEP_MS || 300))
  }
  return inserted
}

async function streamInvoiceLines(client: AxiosInstance, db: Db, rawRunId: string, invoiceNumbers: string[]): Promise<number> {
  let inserted = 0
  for (const num of invoiceNumbers) {
    const detailUrl = `${CFT_BASE_URL.replace(/\/$/, "")}/index.php/invoices_header/view/${num}`
    try {
      const html = await fetchHtml(client, detailUrl)
      const $ = cheerio.load(html)
      let matched: Record<string, string>[] = []
      for (const table of $("table").toArray()) {
        const { headers, rows } = extractTable($, table)
        if (headers.length && isInvoiceLinesTable(headers, rows.length)) {
          matched = rowsToDicts(headers, rows)
          break
        }
      }
      const cleaned = matched
        .map((r, idx) => {
          const item = String(r.Item || "").trim()
          if (item.toLowerCase() === "total") return null
          return {
            invoice_number: num,
            line_index: String(idx + 1),
            line_item: r.Item || "",
            line_description: r.Description || "",
            line_quantity: r.Quantity || "",
            line_g_price: r["G/Price"] || "",
            line_n_price: r["N/Price"] || "",
            line_subtotal: r.Subtotal || "",
            line_tax: r.Tax || "",
            source_url: detailUrl,
            ...r,
          }
        })
        .filter(Boolean) as Record<string, string>[]
      if (cleaned.length) inserted += await insertRowsRaw(db, "invoice_lines", cleaned, rawRunId)
    } catch {
      // continue
    }
    await sleep(Number(process.env.CFT_SLEEP_MS || 300))
  }
  return inserted
}

function resolveCftMongoUri(): string {
  return process.env.CFT_MONGODB_URI || process.env.MONGODB_URI || ""
}

/**
 * Stream CFT website tables into MongoDB `cft_raw` (append-only history).
 * Focused on clients, quotes (+lines), invoices (+lines).
 */
export async function streamCftToRaw(options?: { cookie?: string; includeLines?: boolean }): Promise<StreamResult> {
  const cookie = options?.cookie || process.env.CFT_IP_SESSION || ""
  if (!cookie) throw new Error("CFT_IP_SESSION cookie is required")

  const mongoUri = resolveCftMongoUri()
  if (!mongoUri) throw new Error("CFT_MONGODB_URI or MONGODB_URI is required")

  const includeLines = options?.includeLines !== false
  const rawRunId = randomUUID().replace(/-/g, "")
  const counts: Record<string, number> = {}
  const errors: string[] = []

  const mongo = new MongoClient(mongoUri)
  await mongo.connect()
  const db = mongo.db(CFT_RAW_DB)
  const http = buildSession(cookie)

  try {
    await db.collection("__runs__").insertOne({
      raw_run_id: rawRunId,
      started_at: Math.floor(Date.now() / 1000),
      source: "employeehr-cft-streamer",
      site_base_url: CFT_BASE_URL,
      modules: CFT_PRIORITY_JOBS.map((j) => j.name),
      includeLines,
    })

    // Clients via JSON API
    try {
      const clients = await fetchClients(http)
      counts.clients = await insertRowsRaw(db, "clients", clients, rawRunId)
      console.log(`[cft-stream] clients=${counts.clients}`)
    } catch (e: any) {
      errors.push(`clients: ${e.message || e}`)
    }

    // Quotes HTML list
    let quoteNumbers: string[] = []
    try {
      const quotesJob = CFT_PRIORITY_JOBS.find((j) => j.name === "quotes")!
      counts.quotes = await streamHtmlJob(http, db, quotesJob, rawRunId)
      const listUrl = `${CFT_BASE_URL.replace(/\/$/, "")}/index.php/quotes`
      const html = await fetchHtml(http, listUrl)
      quoteNumbers = collectQuoteNumbers(html)
      console.log(`[cft-stream] quotes=${counts.quotes} quoteIds=${quoteNumbers.length}`)
    } catch (e: any) {
      errors.push(`quotes: ${e.message || e}`)
    }

    // Invoices HTML lists
    let invoiceNumbers: string[] = []
    try {
      const invoicesJob = CFT_PRIORITY_JOBS.find((j) => j.name === "invoices")!
      counts.invoices = await streamHtmlJob(http, db, invoicesJob, rawRunId)
      // Gather invoice numbers from just-inserted batch is hard; re-parse list pages
      for (const path of invoicesJob.paths) {
        const url = `${CFT_BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`
        try {
          const html = await fetchHtml(http, url)
          const found = html.match(/INV\d+/gi) || []
          for (const inv of found) {
            const n = inv.toUpperCase()
            if (!invoiceNumbers.includes(n)) invoiceNumbers.push(n)
          }
        } catch {
          // continue
        }
      }
      console.log(`[cft-stream] invoices=${counts.invoices} invoiceIds=${invoiceNumbers.length}`)
    } catch (e: any) {
      errors.push(`invoices: ${e.message || e}`)
    }

    if (includeLines) {
      try {
        counts.quote_lines = await streamQuoteLines(http, db, rawRunId, quoteNumbers)
        console.log(`[cft-stream] quote_lines=${counts.quote_lines}`)
      } catch (e: any) {
        errors.push(`quote_lines: ${e.message || e}`)
      }
      try {
        counts.invoice_lines = await streamInvoiceLines(http, db, rawRunId, invoiceNumbers)
        console.log(`[cft-stream] invoice_lines=${counts.invoice_lines}`)
      } catch (e: any) {
        errors.push(`invoice_lines: ${e.message || e}`)
      }
    }

    await db.collection("__runs__").updateOne(
      { raw_run_id: rawRunId },
      { $set: { finished_at: Math.floor(Date.now() / 1000), counts, errors } },
    )

    return { rawRunId, counts, errors }
  } finally {
    await mongo.close()
  }
}

// silence unused helper warning in some builds
void parseAmountLike
