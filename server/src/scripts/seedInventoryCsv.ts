import fs from 'fs'
import path from 'path'
import 'dotenv/config'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { Company } from '../models/Company'
import { User } from '../models/User'
import { StockCategory } from '../models/StockCategory'
import { StockProduct } from '../models/StockProduct'

interface CsvRow {
  category: string
  itemNo: string
  description: string
  quantity: number
  unitPrice: number
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    const next = line[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  values.push(current.trim())
  return values
}

function parseCsv(content: string): CsvRow[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return []

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const rows: CsvRow[] = []

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line)
    if (values.length === 0) continue

    const normalized = values.slice(0, header.length)
    const row: Record<string, string> = {}

    header.forEach((name, index) => {
      row[name] = normalized[index] || ''
    })

    if (!row.category && !row.description && !row['item no.'] && !row.quantity && !row['unit price (kes)']) {
      continue
    }

    if (row.category === 'Grand Total' || row.category?.toLowerCase().includes('grand total')) {
      continue
    }

    const quantity = Number.parseInt(row.quantity || '0', 10)
    const unitPrice = Number.parseFloat((row['unit price (kes)'] || row['unit price'] || '0').replace(/,/g, ''))

    rows.push({
      category: row.category || 'Uncategorized',
      itemNo: row['item no.'] || row['item no'] || '',
      description: row.description || '',
      quantity: Number.isFinite(quantity) ? quantity : 0,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
    })
  }

  return rows
}

async function getMongoUri(): Promise<string> {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI

  const memoryServer = await MongoMemoryServer.create({ binary: { version: '7.0.14' } })
  const uri = memoryServer.getUri()
  process.env.MONGODB_URI = uri
  return uri
}

async function ensureCompany(email: string) {
  const normalizedEmail = email.toLowerCase()
  let company = await Company.findOne({ email: normalizedEmail }).lean()
  if (company) return company

  const companyDoc = await Company.create({
    name: 'Accord Medical Supplies',
    slug: 'accord-medical-supplies',
    email: normalizedEmail,
    industry: 'Medical Supplies',
    employeeCount: 1,
    status: 'active',
  })

  const userDoc = await User.create({
    org_id: String(companyDoc._id),
    firstName: 'Accord',
    lastName: 'Medical',
    email: normalizedEmail,
    password: '$2a$10$placeholder',
    role: 'company_admin',
    status: 'active',
  })

  return { ...companyDoc.toObject(), adminUserId: String(userDoc._id) }
}

async function seedInventory(csvFilePath: string, targetEmail: string) {
  const mongoUri = await getMongoUri()
  console.log(`Connecting to MongoDB at ${mongoUri}`)
  await mongoose.connect(mongoUri)

  const company = await ensureCompany(targetEmail)
  const orgId = String(company._id)
  const createdBy = company.adminUserId || orgId

  const csvContent = fs.readFileSync(csvFilePath, 'utf8')
  const rows = parseCsv(csvContent)
  console.log(`Parsed ${rows.length} inventory rows from ${csvFilePath}`)

  const categoryMap = new Map<string, string>()
  for (const row of rows) {
    let category = await StockCategory.findOne({ org_id: orgId, name: row.category })
    if (!category) {
      category = await StockCategory.create({
        org_id: orgId,
        name: row.category,
        description: `Imported inventory category: ${row.category}`,
        createdBy,
      })
    }
    categoryMap.set(row.category, String(category._id))
  }

  let created = 0
  let updated = 0
  for (const row of rows) {
    const categoryId = categoryMap.get(row.category)
    if (!categoryId) continue

    const productName = row.description || `${row.category} item ${row.itemNo || ''}`.trim() || 'Imported inventory item'
    const existing = await StockProduct.findOne({ org_id: orgId, name: productName })
    const payload = {
      org_id: orgId,
      name: productName,
      category: categoryId,
      startingPrice: row.unitPrice,
      sellingPrice: row.unitPrice,
      minAlertQuantity: Math.max(1, Math.floor(row.quantity * 0.1)),
      currentQuantity: row.quantity,
      assignedUsers: [],
      createdBy,
      isActive: true,
      productType: 'physical' as const,
      description: `${row.category} item imported from CSV`,
      manufacturer: 'Imported from CSV',
    }

    if (existing) {
      await StockProduct.updateOne({ _id: existing._id }, { $set: payload })
      updated += 1
    } else {
      await StockProduct.create(payload)
      created += 1
    }
  }

  console.log(`Seeded inventory for company ${targetEmail}`)
  console.log(`Stock categories: ${categoryMap.size}`)
  console.log(`Stock products created: ${created}`)
  console.log(`Stock products updated: ${updated}`)

  await mongoose.disconnect()
}

const csvPathArg = process.argv[2]
const emailArg = process.argv[3] || 'accordmedsupplies@gmail.com'

if (!csvPathArg) {
  console.error('Usage: npx tsx src/scripts/seedInventoryCsv.ts <csv-file> [target-email]')
  process.exit(1)
}

const absoluteCsvPath = path.isAbsolute(csvPathArg) ? csvPathArg : path.resolve(process.cwd(), csvPathArg)

seedInventory(absoluteCsvPath, emailArg)
  .catch(async (error) => {
    console.error('Inventory seeding failed:', error)
    if (mongoose.connection.readyState) {
      await mongoose.disconnect()
    }
    process.exit(1)
  })
