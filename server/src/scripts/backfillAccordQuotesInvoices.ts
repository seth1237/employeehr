import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import mongoose from "mongoose"
import { User } from "../models/User"
import { StockQuotation } from "../models/StockQuotation"
import { StockInvoice } from "../models/StockInvoice"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, "../..")
dotenv.config({ path: path.join(serverRoot, ".env") })

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
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

function parseCsv(filePath: string): Array<Record<string, string>> {
  const content = fs.readFileSync(filePath, "utf8")
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((header) => header.trim())
  const rows: Array<Record<string, string>> = []

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ""
    })
    rows.push(row)
  }

  return rows
}

function parseAmount(value: string): number {
  const cleaned = String(value || "")
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "")
  const numeric = Number(cleaned)
  return Number.isFinite(numeric) ? numeric : 0
}

function parseDate(value: string): Date {
  const input = String(value || "").trim()
  if (!input) return new Date()
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [day, month, year] = input.split("/").map(Number)
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  }
  const date = new Date(input)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!)

  const admin = await User.findOne({ email: "accord@gmail.com" })
  if (!admin) {
    throw new Error("accord@gmail.com user not found")
  }

  const orgId = admin.org_id
  const userId = admin._id.toString()
  const exportsDir = path.join(serverRoot, "exports")

  const quoteRows = parseCsv(path.join(exportsDir, "quotes.csv"))
  let importedQuotes = 0
  for (const row of quoteRows) {
    const quotationNumber = String(row["Quote"] || "").trim()
    if (!quotationNumber) continue
    const clientName = String(row["Client Name"] || "Walk-in Client").trim() || "Walk-in Client"
    const totalAmount = parseAmount(String(row["Total Amount"] || "0"))
    const createdAt = parseDate(String(row["Created"] || ""))
    const rawStatus = String(row["Status"] || "draft").toLowerCase()
    const status: "draft" | "pending_approval" | "converted" | "cancelled" = rawStatus.includes("draft")
      ? "draft"
      : rawStatus.includes("convert")
        ? "converted"
        : rawStatus.includes("cancel")
          ? "cancelled"
          : "pending_approval"

    await StockQuotation.updateOne(
      { org_id: orgId, quotationNumber },
      {
        $set: {
          org_id: orgId,
          quotationNumber,
          client: { name: clientName, number: "N/A", location: "N/A" },
          items: [
            {
              productId: "imported-item",
              productName: "Imported quotation line",
              quantity: 1,
              unitPrice: totalAmount,
              lineTotal: totalAmount,
            },
          ],
          subTotal: totalAmount,
          status,
          createdBy: userId,
          createdAt,
          updatedAt: createdAt,
        },
      },
      { upsert: true },
    )
    importedQuotes += 1
  }

  const invoiceRows = parseCsv(path.join(exportsDir, "invoices.csv"))
  let importedInvoices = 0
  for (const row of invoiceRows) {
    const invoiceNumber = String(row["Invoice"] || "").trim()
    if (!invoiceNumber) continue
    const clientName = String(row["Client Name"] || "Walk-in Client").trim() || "Walk-in Client"
    const amount = parseAmount(String(row["Invoice Amount"] || "0"))
    const createdAt = parseDate(String(row["Created"] || ""))

    await StockInvoice.updateOne(
      { org_id: orgId, invoiceNumber },
      {
        $set: {
          org_id: orgId,
          invoiceNumber,
          deliveryNoteNumber: `DN-${invoiceNumber}`,
          client: { name: clientName, number: "N/A", location: "N/A" },
          items: [
            {
              productId: "imported-item",
              productName: "Imported invoice line",
              quantity: 1,
              unitPrice: amount,
              lineTotal: amount,
            },
          ],
          subTotal: amount,
          status: "issued",
          createdBy: userId,
          createdAt,
          updatedAt: createdAt,
        },
      },
      { upsert: true },
    )
    importedInvoices += 1
  }

  console.log(JSON.stringify({ orgId, importedQuotes, importedInvoices }, null, 2))
  await mongoose.disconnect()
}

run().catch(async (error) => {
  console.error(error)
  if (mongoose.connection.readyState) await mongoose.disconnect()
  process.exit(1)
})
