/**
 * Sync CFT RAW Mongo (cft_raw) → Elevate/employeehr for ONE tenant only.
 * Safe for use from the running API process (does not disconnect shared mongoose).
 */
import fs from "fs"
import mongoose from "mongoose"
import { MongoClient, type Db, type Document } from "mongodb"
import { Company } from "../../models/Company"
import { User } from "../../models/User"
import { StockClient } from "../../models/StockClient"
import { StockQuotation } from "../../models/StockQuotation"
import { StockInvoice } from "../../models/StockInvoice"
import { CFT_RAW_DB, CFT_TARGET_EMAIL, CFT_TARGET_ORG_ID } from "./cftConfig"

export type CftSyncCounters = {
  clientsUpserted: number
  clientsSkipped: number
  quotationsUpserted: number
  quotationsSkipped: number
  invoicesUpserted: number
  invoicesSkipped: number
}

export type CftSyncOptions = {
  dryRun?: boolean
  limit?: number
  orgId?: string
  targetEmail?: string
  rawDbName?: string
  cftMongoUri?: string
  /** When true (CLI), connect/disconnect mongoose. When false (API), reuse existing connection. */
  manageMongoose?: boolean
}

function parseAmount(value: unknown): number {
  const cleaned = String(value ?? "")
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "")
  const numeric = Number(cleaned)
  return Number.isFinite(numeric) ? numeric : 0
}

function parseDate(value: unknown): Date {
  const input = String(value ?? "").trim()
  if (!input) return new Date()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [day, month, year] = input.split("/").map(Number)
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  }
  const date = new Date(input)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function normalizeQuoteStatus(value: unknown): "draft" | "pending_approval" | "converted" | "cancelled" {
  const status = String(value || "").toLowerCase()
  if (status.includes("draft")) return "draft"
  if (status.includes("pending")) return "pending_approval"
  if (status.includes("convert") || status.includes("closed") || status.includes("approved")) return "converted"
  if (status.includes("cancel") || status.includes("void")) return "cancelled"
  return "draft"
}

function normalizeInvoiceStatus(value: unknown): "issued" | "paid" | "cancelled" {
  const status = String(value || "").toLowerCase()
  if (status.includes("paid") || status.includes("cleared") || status.includes("closed")) return "paid"
  if (status.includes("cancel") || status.includes("void")) return "cancelled"
  return "issued"
}

function loadCftMongoUri(explicit?: string): string {
  if (explicit) return explicit
  if (process.env.CFT_MONGODB_URI) return process.env.CFT_MONGODB_URI

  const candidates = [
    "/home/seth/Documents/ACCORD/cft/atlas-credentials.env",
  ]
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, "utf8")
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*MONGODB_URI\s*=\s*(.*)\s*$/)
      if (m) return m[1].trim().replace(/^["']|["']$/g, "")
    }
  }

  if (process.env.MONGODB_URI) return process.env.MONGODB_URI
  throw new Error("No CFT Mongo URI found. Set CFT_MONGODB_URI")
}

async function latestByKey(db: Db, collection: string, keyField: string, limit = 0): Promise<Document[]> {
  const pipeline: Document[] = [
    { $match: { [keyField]: { $exists: true, $nin: [null, ""] } } },
    { $sort: { scraped_at: -1, _id: -1 } },
    { $group: { _id: `$${keyField}`, doc: { $first: "$$ROOT" } } },
    { $replaceRoot: { newRoot: "$doc" } },
  ]
  if (limit > 0) pipeline.push({ $limit: limit })
  return db.collection(collection).aggregate(pipeline, { allowDiskUse: true }).toArray()
}

async function preloadLinesByParent(db: Db, collection: string, parentField: string): Promise<Map<string, Document[]>> {
  console.log(`[cft-sync] preload ${collection} by ${parentField}...`)
  const rows = await db
    .collection(collection)
    .find({ [parentField]: { $exists: true, $nin: [null, ""] } })
    .toArray()

  const bestRun = new Map<string, { scraped_at: number; runId: unknown }>()
  for (const row of rows) {
    const key = String(row[parentField] || "").trim().toUpperCase()
    if (!key) continue
    const scrapedAt = Number(row.scraped_at || 0)
    const prev = bestRun.get(key)
    if (!prev || scrapedAt >= prev.scraped_at) {
      bestRun.set(key, { scraped_at: scrapedAt, runId: row._raw_run_id })
    }
  }

  const grouped = new Map<string, Document[]>()
  for (const row of rows) {
    const key = String(row[parentField] || "").trim().toUpperCase()
    if (!key) continue
    const best = bestRun.get(key)
    if (!best) continue
    if (best.runId != null && row._raw_run_id !== best.runId) continue
    if (best.runId == null && Number(row.scraped_at || 0) !== best.scraped_at) continue
    const list = grouped.get(key) || []
    list.push(row)
    grouped.set(key, list)
  }

  for (const [key, list] of grouped) {
    list.sort((a, b) => Number(a.line_index || 0) - Number(b.line_index || 0))
    grouped.set(key, list)
  }

  console.log(`[cft-sync] ${collection}: parents=${grouped.size} rows=${rows.length}`)
  return grouped
}

function mapQuoteItems(lines: Document[], fallbackTotal: number) {
  const items = lines
    .map((line, index) => {
      const productName =
        String(line.Item || line.item || line.line_item || "").trim() || `Imported line ${index + 1}`
      if (productName.toLowerCase() === "total") return null
      const quantity = Math.max(1, Math.round(parseAmount(line.Quantity ?? line.quantity ?? line.line_quantity ?? 1)) || 1)
      const unitPrice = parseAmount(line.Price ?? line.price ?? line["N/Price"] ?? line.line_n_price ?? 0)
      const lineTotal = parseAmount(line.Subtotal ?? line.subtotal ?? line.Total ?? line.total ?? unitPrice * quantity)
      return {
        productId: `cft-quote-line-${index + 1}`,
        productName,
        quantity,
        unitPrice,
        lineTotal: lineTotal || unitPrice * quantity,
        description: String(line["Description/Specifications"] || line.Description || line.description || "").trim() || undefined,
        isOutsourced: false,
      }
    })
    .filter(Boolean) as Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    lineTotal: number
    description?: string
    isOutsourced: boolean
  }>

  if (items.length > 0) return items
  return [
    {
      productId: "cft-imported-item",
      productName: "Imported quotation total",
      quantity: 1,
      unitPrice: fallbackTotal,
      lineTotal: fallbackTotal,
      isOutsourced: false,
    },
  ]
}

function mapInvoiceItems(lines: Document[], fallbackTotal: number) {
  const items = lines
    .map((line, index) => {
      const productName =
        String(line.line_item || line.Item || line.item || "").trim() || `Imported line ${index + 1}`
      if (productName.toLowerCase() === "total") return null
      const quantity = Math.max(1, Math.round(parseAmount(line.line_quantity ?? line.Quantity ?? line.quantity ?? 1)) || 1)
      const unitPrice = parseAmount(line.line_n_price ?? line.line_g_price ?? line.Price ?? line.price ?? 0)
      const lineTotal = parseAmount(line.line_subtotal ?? line.Subtotal ?? line.subtotal ?? unitPrice * quantity)
      return {
        productId: `cft-invoice-line-${index + 1}`,
        productName,
        quantity,
        unitPrice,
        lineTotal: lineTotal || unitPrice * quantity,
        description: String(line.line_description || line.Description || line.description || "").trim() || undefined,
        isOutsourced: false,
      }
    })
    .filter(Boolean) as Array<{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    lineTotal: number
    description?: string
    isOutsourced: boolean
  }>

  if (items.length > 0) return items
  return [
    {
      productId: "cft-imported-item",
      productName: "Imported invoice total",
      quantity: 1,
      unitPrice: fallbackTotal,
      lineTotal: fallbackTotal,
      isOutsourced: false,
    },
  ]
}

async function resolveActor(orgId: string, targetEmail: string) {
  const company = await Company.findById(orgId).lean()
  if (!company) throw new Error(`Target company org_id=${orgId} not found`)

  const user =
    (await User.findOne({ org_id: orgId, email: targetEmail.toLowerCase() })) ||
    (await User.findOne({ email: targetEmail.toLowerCase() })) ||
    (await User.findOne({ org_id: orgId, role: "company_admin" }))

  if (!user) throw new Error(`No user found for ${targetEmail} / org ${orgId}`)
  if (String(user.org_id) !== orgId) {
    throw new Error(`User ${targetEmail} belongs to org ${user.org_id}, expected ${orgId}`)
  }
  return { company, userId: String(user._id) }
}

async function upsertClientDoc(
  orgId: string,
  userId: string,
  dryRun: boolean,
  doc: Record<string, any>,
  counters: CftSyncCounters,
) {
  const legalName = String(doc.client_name || "").trim()
  const clientNo = String(doc.client_no || doc.display_document_no || doc.client_id || "").trim()
  if (!legalName || !clientNo) {
    counters.clientsSkipped += 1
    return
  }

  const sourceLocation =
    String(doc.client_address_1 || doc.client_city || doc.client_country || "N/A").trim() || "N/A"
  const phone = String(doc.client_phone || doc.client_mobile || "").trim()
  const email = String(doc.client_email || "").trim() || undefined
  const kraPin = String(doc.pin_no || "").trim()

  if (dryRun) {
    counters.clientsUpserted += 1
    return
  }

  const existing = await StockClient.findOne({
    org_id: orgId,
    $or: [{ sourceNumber: clientNo }, { sourceName: legalName, legalName }],
  })

  if (existing) {
    existing.legalName = legalName
    if (email) existing.email = email
    if (kraPin) {
      existing.kraPin = kraPin
      existing.hasKraDetails = true
    }
    if (phone && !existing.contactPerson) existing.contactPerson = phone
    existing.updatedBy = userId
    await existing.save()
  } else {
    await StockClient.create({
      org_id: orgId,
      sourceName: legalName,
      sourceNumber: clientNo,
      sourceLocation,
      legalName,
      contactPerson: phone || undefined,
      kraPin: kraPin || undefined,
      email,
      hasKraDetails: Boolean(kraPin),
      contacts: phone ? [{ role: "Other", name: legalName, phone, email, isActive: true }] : [],
      groupIds: [],
      createdBy: userId,
      updatedBy: userId,
    })
  }
  counters.clientsUpserted += 1
}

async function syncClients(raw: Db, orgId: string, userId: string, dryRun: boolean, limit: number, counters: CftSyncCounters) {
  const docs = await latestByKey(raw, "clients", "client_no", limit)
  console.log(`[cft-sync] clients unique=${docs.length}`)
  for (const doc of docs) await upsertClientDoc(orgId, userId, dryRun, doc, counters)
}

async function syncClientsFromCsvFallback(
  orgId: string,
  userId: string,
  dryRun: boolean,
  limit: number,
  counters: CftSyncCounters,
) {
  const csvPath = "/home/seth/Documents/ACCORD/cft/exports/clients.csv"
  if (!fs.existsSync(csvPath)) {
    console.log("[cft-sync] CSV fallback missing")
    return
  }

  const content = fs.readFileSync(csvPath, "utf8")
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return

  const parseCsvLine = (line: string): string[] => {
    const cells: string[] = []
    let current = ""
    let inQuotes = false
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i += 1
        } else inQuotes = !inQuotes
        continue
      }
      if (ch === "," && !inQuotes) {
        cells.push(current.trim())
        current = ""
        continue
      }
      current += ch
    }
    cells.push(current.trim())
    return cells
  }

  const headers = parseCsvLine(lines[0])
  let rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i] ?? ""
    })
    return row
  })
  if (limit > 0) rows = rows.slice(0, limit)
  console.log(`[cft-sync] CSV fallback rows=${rows.length}`)
  for (const doc of rows) await upsertClientDoc(orgId, userId, dryRun, doc, counters)
}

async function syncQuotations(
  raw: Db,
  orgId: string,
  userId: string,
  dryRun: boolean,
  limit: number,
  counters: CftSyncCounters,
  quoteLinesByNumber: Map<string, Document[]>,
) {
  const docs = await latestByKey(raw, "quotes", "Quote", limit)
  console.log(`[cft-sync] quotations unique=${docs.length}`)

  for (let i = 0; i < docs.length; i += 1) {
    const doc = docs[i]
    const quotationNumber = String(doc.Quote || doc.quote_number || "").trim().toUpperCase()
    if (!quotationNumber) {
      counters.quotationsSkipped += 1
      continue
    }

    const clientName = String(doc["Client Name"] || doc.Client || "Walk-in Client").trim() || "Walk-in Client"
    const totalAmount = parseAmount(doc["Total Amount"] || doc.Total || 0)
    const createdAt = parseDate(doc.Created)
    const incomingStatus = normalizeQuoteStatus(doc.Status)
    const lines = quoteLinesByNumber.get(quotationNumber) || []
    const items = mapQuoteItems(lines, totalAmount)
    const subTotal = items.reduce((sum, item) => sum + item.lineTotal, 0) || totalAmount

    if (dryRun) {
      counters.quotationsUpserted += 1
      continue
    }

    const existing = await StockQuotation.findOne({ org_id: orgId, quotationNumber })
    if (existing) {
      const keepStatus = ["converted", "cancelled"].includes(existing.status) ? existing.status : incomingStatus
      existing.client = {
        name: clientName,
        number: existing.client?.number || "N/A",
        location: existing.client?.location || "N/A",
        contactPerson: existing.client?.contactPerson,
      }
      existing.items = items as any
      existing.subTotal = subTotal
      existing.status = keepStatus
      await existing.save()
    } else {
      await StockQuotation.create({
        org_id: orgId,
        quotationNumber,
        client: { name: clientName, number: "N/A", location: "N/A" },
        items,
        subTotal,
        status: incomingStatus,
        createdBy: userId,
        createdAt,
        updatedAt: createdAt,
      })
    }
    counters.quotationsUpserted += 1
    if ((i + 1) % 100 === 0 || i + 1 === docs.length) {
      console.log(`[cft-sync] quotations ${i + 1}/${docs.length}`)
    }
  }
}

async function syncInvoices(
  raw: Db,
  orgId: string,
  userId: string,
  dryRun: boolean,
  limit: number,
  counters: CftSyncCounters,
  invoiceLinesByNumber: Map<string, Document[]>,
) {
  const docs = await latestByKey(raw, "invoices", "Invoice", limit)
  console.log(`[cft-sync] invoices unique=${docs.length}`)

  for (let i = 0; i < docs.length; i += 1) {
    const doc = docs[i]
    const invoiceNumber = String(doc.Invoice || doc.invoice_number || "").trim().toUpperCase()
    if (!invoiceNumber) {
      counters.invoicesSkipped += 1
      continue
    }

    const clientName = String(doc["Client Name"] || "Walk-in Client").trim() || "Walk-in Client"
    const totalAmount = parseAmount(doc["Invoice Amount"] || doc.Total || 0)
    const createdAt = parseDate(doc.Created)
    const incomingStatus = normalizeInvoiceStatus(doc.Status)
    const lines = invoiceLinesByNumber.get(invoiceNumber) || []
    const items = mapInvoiceItems(lines, totalAmount)
    const subTotal = items.reduce((sum, item) => sum + item.lineTotal, 0) || totalAmount

    if (dryRun) {
      counters.invoicesUpserted += 1
      continue
    }

    const existing = await StockInvoice.findOne({ org_id: orgId, invoiceNumber })
    if (existing) {
      const keepStatus = ["paid", "cancelled"].includes(existing.status) ? existing.status : incomingStatus
      existing.client = {
        name: clientName,
        number: existing.client?.number || "N/A",
        location: existing.client?.location || "N/A",
      }
      existing.items = items as any
      existing.subTotal = subTotal
      existing.status = keepStatus
      await existing.save()
    } else {
      await StockInvoice.create({
        org_id: orgId,
        invoiceNumber,
        deliveryNoteNumber: `DN-${invoiceNumber}`,
        client: { name: clientName, number: "N/A", location: "N/A" },
        items,
        subTotal,
        status: incomingStatus,
        createdBy: userId,
        createdAt,
        updatedAt: createdAt,
      })
    }
    counters.invoicesUpserted += 1
    if ((i + 1) % 100 === 0 || i + 1 === docs.length) {
      console.log(`[cft-sync] invoices ${i + 1}/${docs.length}`)
    }
  }
}

export async function runCftSyncToErp(options: CftSyncOptions = {}) {
  const dryRun = Boolean(options.dryRun)
  const limit = options.limit && options.limit > 0 ? Math.floor(options.limit) : 0
  const orgId = options.orgId || process.env.CFT_TARGET_ORG_ID || CFT_TARGET_ORG_ID
  const targetEmail = options.targetEmail || process.env.CFT_TARGET_EMAIL || CFT_TARGET_EMAIL
  const rawDbName = options.rawDbName || process.env.CFT_RAW_DB || CFT_RAW_DB
  const manageMongoose = options.manageMongoose === true

  const erpUri = process.env.MONGODB_URI
  if (!erpUri) throw new Error("MONGODB_URI missing")
  const cftUri = loadCftMongoUri(options.cftMongoUri)

  console.log(
    JSON.stringify(
      {
        targetOrgId: orgId,
        targetEmail,
        rawDbName,
        dryRun,
        limit: limit || "all",
        mode: "upsert-only-no-deletes",
      },
      null,
      2,
    ),
  )

  const cftClient = new MongoClient(cftUri)
  await cftClient.connect()
  const raw = cftClient.db(rawDbName)

  let connectedHere = false
  try {
    if (manageMongoose || mongoose.connection.readyState !== 1) {
      await mongoose.connect(erpUri)
      connectedHere = manageMongoose
    }

    const { company, userId } = await resolveActor(orgId, targetEmail)
    console.log(`[cft-sync] company=${company.name} actor=${userId}`)

    const counters: CftSyncCounters = {
      clientsUpserted: 0,
      clientsSkipped: 0,
      quotationsUpserted: 0,
      quotationsSkipped: 0,
      invoicesUpserted: 0,
      invoicesSkipped: 0,
    }

    await syncClients(raw, orgId, userId, dryRun, limit, counters)
    if (counters.clientsUpserted === 0) {
      console.log("[cft-sync] cft_raw clients empty — CSV fallback")
      await syncClientsFromCsvFallback(orgId, userId, dryRun, limit, counters)
    }

    const quoteLinesByNumber = await preloadLinesByParent(raw, "quote_lines", "quote_number")
    await syncQuotations(raw, orgId, userId, dryRun, limit, counters, quoteLinesByNumber)

    const invoiceLinesByNumber = await preloadLinesByParent(raw, "invoice_lines", "invoice_number")
    await syncInvoices(raw, orgId, userId, dryRun, limit, counters, invoiceLinesByNumber)

    return { ok: true as const, dryRun, orgId, counters }
  } finally {
    await cftClient.close()
    if (connectedHere && mongoose.connection.readyState) {
      await mongoose.disconnect()
    }
  }
}
