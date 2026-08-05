import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import dotenv from "dotenv"
import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import { Company } from "../models/Company"
import { User } from "../models/User"
import { StockCategory } from "../models/StockCategory"
import { StockClient } from "../models/StockClient"
import { StockQuotation } from "../models/StockQuotation"
import { StockInvoice } from "../models/StockInvoice"
import { StockExpense } from "../models/StockExpense"

const ADMIN_EMAIL = "accord@gmail.com"
const ADMIN_PASSWORD = "12345678"
const COMPANY_NAME = "Accord"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, "../..")
dotenv.config({ path: path.join(serverRoot, ".env") })

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ""
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  cells.push(current.trim())
  return cells
}

function parseCsv(content: string): Array<Record<string, string>> {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)

  if (lines.length < 1) return []

  const headers = parseCsvLine(lines[0]).map((header) => header.trim())

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, headerIndex) => {
      row[header] = values[headerIndex] ?? ""
    })
    return row
  })
}

function parseAmount(value: string): number {
  const normalized = String(value || "")
    .replace(/,/g, "")
    .replace(/\s/g, "")
    .replace(/[^0-9.-]/g, "")
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? numeric : 0
}

function parseDate(value: string): Date {
  const input = String(value || "").trim()
  if (!input) return new Date()

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(input)) {
    const [day, month, year] = input.split("/").map((n) => Number(n))
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  }

  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return new Date()
  return date
}

function normalizeStatus(value: string, fallback: "draft" | "pending_approval" | "converted" | "cancelled") {
  const status = String(value || "").toLowerCase()
  if (status.includes("draft")) return "draft"
  if (status.includes("pending")) return "pending_approval"
  if (status.includes("convert")) return "converted"
  if (status.includes("cancel") || status.includes("void")) return "cancelled"
  return fallback
}

async function ensureCompanyAndAdmin(): Promise<{ orgId: string; userId: string }> {
  let company = await Company.findOne({ email: ADMIN_EMAIL.toLowerCase() })

  const existingUser = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() })
  if (!company && existingUser?.org_id) {
    company = await Company.findById(existingUser.org_id)
  }

  if (!company) {
    let slug = "accord"
    let idx = 1
    while (await Company.findOne({ slug })) {
      slug = `accord-${idx}`
      idx += 1
    }

    company = await Company.create({
      name: COMPANY_NAME,
      slug,
      email: ADMIN_EMAIL.toLowerCase(),
      industry: "General",
      employeeCount: 1,
      status: "active",
    })
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)
  let admin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() })

  if (!admin) {
    admin = await User.create({
      org_id: company._id.toString(),
      firstName: "Accord",
      lastName: "Admin",
      email: ADMIN_EMAIL.toLowerCase(),
      password: passwordHash,
      role: "company_admin",
      status: "active",
    })
  } else {
    admin.org_id = company._id.toString()
    admin.password = passwordHash
    admin.role = "company_admin"
    admin.status = "active"
    if (!admin.firstName) admin.firstName = "Accord"
    if (!admin.lastName) admin.lastName = "Admin"
    await admin.save()
  }

  return { orgId: company._id.toString(), userId: admin._id.toString() }
}

async function importExports(orgId: string, userId: string) {
  const exportsDir = path.join(serverRoot, "exports")
  const files = fs.readdirSync(exportsDir).filter((name) => name.endsWith(".csv"))

  const legacyCollection = mongoose.connection.collection("legacy_imports")

  const counters: Record<string, number> = {
    categories: 0,
    clients: 0,
    quotations: 0,
    invoices: 0,
    expenses: 0,
    legacyRows: 0,
  }

  for (const fileName of files) {
    const filePath = path.join(exportsDir, fileName)
    const content = fs.readFileSync(filePath, "utf8")
    const rows = parseCsv(content)

    if (rows.length > 0) {
      const legacyDocs = rows.map((row) => ({
        org_id: orgId,
        sourceFile: fileName,
        data: row,
        importedAt: new Date(),
      }))
      await legacyCollection.insertMany(legacyDocs)
      counters.legacyRows += rows.length
    }

    if (fileName === "inventory_categories.csv") {
      for (const row of rows) {
        const categoryName = String(row["Category name"] || "").trim()
        if (!categoryName) continue
        await StockCategory.updateOne(
          { org_id: orgId, name: categoryName },
          {
            $setOnInsert: {
              org_id: orgId,
              name: categoryName,
              description: String(row["Category description"] || "").trim() || undefined,
              createdBy: userId,
            },
          },
          { upsert: true },
        )
        counters.categories += 1
      }
    }

    if (fileName === "clients.csv") {
      for (const row of rows) {
        const legalName = String(row["client_name"] || "").trim()
        if (!legalName) continue
        const sourceNumber = String(row["client_phone"] || row["client_mobile"] || row["client_no"] || "N/A").trim() || "N/A"
        const sourceLocation = String(row["client_address_1"] || row["client_city"] || row["client_country"] || "N/A").trim() || "N/A"
        const kraPin = String(row["pin_no"] || "N/A").trim() || "N/A"

        await StockClient.updateOne(
          { org_id: orgId, sourceName: legalName, sourceNumber, sourceLocation },
          {
            $set: {
              legalName,
              kraPin,
              email: String(row["client_email"] || "").trim() || undefined,
              hasKraDetails: kraPin !== "N/A",
              updatedBy: userId,
            },
            $setOnInsert: {
              org_id: orgId,
              sourceName: legalName,
              sourceNumber,
              sourceLocation,
              createdBy: userId,
            },
          },
          { upsert: true },
        )
        counters.clients += 1
      }
    }

    if (fileName === "quotes.csv") {
      for (const row of rows) {
        const quotationNumber = String(row["Quote"] || "").trim()
        if (!quotationNumber) continue

        const clientName = String(row["Client Name"] || "Walk-in Client").trim() || "Walk-in Client"
        const totalAmount = parseAmount(String(row["Total Amount"] || "0"))
        const createdAt = parseDate(String(row["Created"] || ""))
        const status = normalizeStatus(String(row["Status"] || "draft"), "draft") as
          | "draft"
          | "pending_approval"
          | "converted"
          | "cancelled"

        const doc = {
          org_id: orgId,
          quotationNumber,
          client: {
            name: clientName,
            number: "N/A",
            location: "N/A",
            contactPerson: undefined,
          },
          items: [
            {
              productId: "imported-item",
              productName: "Imported quotation line",
              quantity: 1,
              unitPrice: totalAmount,
              lineTotal: totalAmount,
              isOutsourced: false,
            },
          ],
          subTotal: totalAmount,
          status,
          createdBy: userId,
          createdAt,
          updatedAt: createdAt,
        }

        await StockQuotation.updateOne(
          { org_id: orgId, quotationNumber },
          { $set: doc, $setOnInsert: { org_id: orgId, quotationNumber } },
          { upsert: true },
        )
        counters.quotations += 1
      }
    }

    if (fileName === "invoices.csv") {
      for (const row of rows) {
        const invoiceNumber = String(row["Invoice"] || "").trim()
        if (!invoiceNumber) continue

        const clientName = String(row["Client Name"] || "Walk-in Client").trim() || "Walk-in Client"
        const totalAmount = parseAmount(String(row["Invoice Amount"] || "0"))
        const createdAt = parseDate(String(row["Created"] || ""))

        const baseDeliveryNote = `DN-${invoiceNumber}`
        const existing = await StockInvoice.findOne({ org_id: orgId, invoiceNumber }).lean()
        const deliveryNoteNumber = existing?.deliveryNoteNumber || baseDeliveryNote

        const invoiceDoc = {
          org_id: orgId,
          invoiceNumber,
          deliveryNoteNumber,
          client: {
            name: clientName,
            number: "N/A",
            location: "N/A",
          },
          items: [
            {
              productId: "imported-item",
              productName: "Imported invoice line",
              quantity: 1,
              unitPrice: totalAmount,
              lineTotal: totalAmount,
              isOutsourced: false,
            },
          ],
          subTotal: totalAmount,
          status: "issued" as const,
          createdBy: userId,
          createdAt,
          updatedAt: createdAt,
        }

        await StockInvoice.updateOne(
          { org_id: orgId, invoiceNumber },
          { $set: invoiceDoc, $setOnInsert: { org_id: orgId, invoiceNumber } },
          { upsert: true },
        )

        counters.invoices += 1
      }
    }

    if (fileName === "bills.csv") {
      for (const row of rows) {
        const billNo = String(row["Bill"] || "").trim()
        if (!billNo) continue
        const amount = parseAmount(String(row["Amount"] || "0"))
        const createdAt = parseDate(String(row["Created"] || ""))

        await StockExpense.create({
          org_id: orgId,
          payerPhone: "0700000000",
          payeePhone: "0700000000",
          amount: amount > 0 ? amount : 1,
          purpose: `Imported bill ${billNo}`,
          status: "completed",
          initiatedBy: userId,
          createdAt,
          updatedAt: createdAt,
        })
        counters.expenses += 1
      }
    }
  }

  return counters
}

async function main() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set")
  }

  await mongoose.connect(mongoUri)

  try {
    const { orgId, userId } = await ensureCompanyAndAdmin()
    const counters = await importExports(orgId, userId)

    console.log("✅ Import complete")
    console.log(`Company org_id: ${orgId}`)
    console.log(`Admin user: ${ADMIN_EMAIL}`)
    console.log("Imported counts:", counters)
  } finally {
    await mongoose.disconnect()
  }
}

main().catch((error) => {
  console.error("❌ Import failed:", error)
  process.exit(1)
})
