import { Company } from "../models/Company"
import { StockCategory } from "../models/StockCategory"
import { StockLocation } from "../models/StockLocation"
import { StockProduct } from "../models/StockProduct"
import { StockProductLocation } from "../models/StockProductLocation"

export function normalizeScanCode(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "")
}

export function skuPrefix(value?: string | null, fallback = "PRD") {
  const letters = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
  if (!letters) return fallback
  return letters.slice(0, 3).padEnd(3, "X")
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

export function codeMatch(value: string) {
  return new RegExp(`^${escapeRegex(value)}$`, "i")
}

export async function lookupProductByCode(orgId: string, rawCode: string) {
  const code = normalizeScanCode(rawCode)
  if (code.length < 3) return null

  return StockProduct.findOne({
    org_id: orgId,
    isActive: { $ne: false },
    $or: [
      { sku: codeMatch(code) },
      { barcode: codeMatch(code) },
      { manufacturerBarcode: codeMatch(code) },
    ],
  })
}

export async function lookupLocationByCode(
  orgId: string,
  rawCode: string,
  warehouseId?: string,
) {
  const code = normalizeScanCode(rawCode)
  if (!code) return null
  const query: Record<string, unknown> = {
    org_id: orgId,
    isActive: { $ne: false },
    code: codeMatch(code),
  }
  if (warehouseId) query.branchId = warehouseId
  return StockLocation.findOne(query)
}

export async function productWithLocations(orgId: string, product: any) {
  if (!product) return null
  const locations = await StockProductLocation.find({
    org_id: orgId,
    productId: String(product._id),
  }).lean()
  const locationIds = locations.map((row) => row.locationId).filter(Boolean)
  const bins = locationIds.length
    ? await StockLocation.find({
        org_id: orgId,
        _id: { $in: locationIds },
      })
        .select("code name branchId")
        .lean()
    : []
  const binMap = new Map(bins.map((bin) => [String(bin._id), bin]))
  return {
    ...((typeof product.toObject === "function" ? product.toObject() : product) as Record<string, unknown>),
    locations: locations.map((row) => ({
      ...row,
      location: binMap.get(String(row.locationId)) || null,
    })),
  }
}

async function orgSkuPrefix(orgId: string) {
  const company = await Company.findById(orgId).select("slug name").lean()
  return skuPrefix(company?.slug || company?.name, "ELV")
}

export async function nextProductSku(
  orgId: string,
  categoryId?: string | null,
) {
  const orgPrefix = await orgSkuPrefix(orgId)
  let categoryName = "PRD"
  if (categoryId) {
    const category = await StockCategory.findOne({
      _id: categoryId,
      org_id: orgId,
    })
      .select("name")
      .lean()
    if (category?.name) categoryName = category.name
  }
  const prefix = `${orgPrefix}-${skuPrefix(categoryName)}-`
  const existing = await StockProduct.find({
    org_id: orgId,
    sku: new RegExp(`^${escapeRegex(prefix)}\\d+$`, "i"),
  })
    .select("sku")
    .lean()

  let max = 0
  for (const row of existing) {
    const n = Number(String(row.sku || "").split("-").pop())
    if (Number.isFinite(n) && n > max) max = n
  }

  return `${prefix}${String(max + 1).padStart(4, "0")}`
}

export async function ensureProductBarcode(
  orgId: string,
  product: any,
  options?: { sku?: string; manufacturerBarcode?: string; force?: boolean },
) {
  if (!product || product.productType === "service") {
    return product
  }

  const requestedSku = normalizeScanCode(options?.sku).toUpperCase()
  const manufacturerBarcode =
    normalizeScanCode(options?.manufacturerBarcode) || undefined

  let sku = requestedSku || String(product.sku || "").trim().toUpperCase()
  if (!sku || options?.force) {
    sku = await nextProductSku(orgId, product.category)
  }

  const taken = await StockProduct.findOne({
    org_id: orgId,
    sku,
    _id: { $ne: product._id },
  }).select("_id")
  if (taken) {
    if (requestedSku) {
      throw new Error(`SKU ${sku} is already used`)
    }
    sku = await nextProductSku(orgId, product.category)
  }

  product.sku = sku
  product.barcode = sku
  product.barcodeSymbology = product.barcodeSymbology || "code128"
  if (manufacturerBarcode !== undefined) {
    product.manufacturerBarcode = manufacturerBarcode || undefined
  }
  await product.save()
  return product
}

export async function assignBarcodeFields(
  orgId: string,
  payload: Record<string, unknown>,
  options: {
    sku?: string
    manufacturerBarcode?: string
    category?: string
    productType?: string
  },
) {
  if (options.productType === "service") return payload

  const requestedSku = normalizeScanCode(options.sku).toUpperCase()
  const sku = requestedSku || (await nextProductSku(orgId, options.category))
  if (requestedSku) {
    const taken = await StockProduct.findOne({ org_id: orgId, sku }).select("_id")
    if (taken) throw new Error(`SKU ${sku} is already used`)
  }

  payload.sku = sku
  payload.barcode = sku
  payload.barcodeSymbology = "code128"
  const manufacturerBarcode = normalizeScanCode(options.manufacturerBarcode)
  if (manufacturerBarcode) payload.manufacturerBarcode = manufacturerBarcode
  return payload
}
