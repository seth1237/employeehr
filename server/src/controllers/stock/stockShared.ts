import { StockProduct } from "../../models/StockProduct"

export const ADMIN_ROLES = ["company_admin", "hr", "admin", "super_admin"]
export const DEFAULT_VAT_RATE = 16

export function isAdminRole(role?: string) {
  return !!role && ADMIN_ROLES.includes(role)
}

export function isOwnDocumentsRole(role?: string) {
  return role === "employee" || role === "sales_rep"
}

export function generateDocumentNumber(prefix: string) {
  const ts = Date.now().toString().slice(-8)
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `${prefix}-${ts}-${rand}`
}

export function resolveLineTax(input: {
  taxable?: boolean
  taxRate?: number
  lineTotal: number
  fallbackTaxable?: boolean
  fallbackTaxRate?: number
}) {
  const taxable =
    input.taxable !== undefined
      ? Boolean(input.taxable)
      : Boolean(input.fallbackTaxable)
  const rawRate = Number(
    input.taxRate !== undefined && input.taxRate !== null
      ? input.taxRate
      : input.fallbackTaxRate !== undefined
        ? input.fallbackTaxRate
        : DEFAULT_VAT_RATE,
  )
  const taxRate = taxable
    ? Number.isFinite(rawRate) && rawRate > 0
      ? rawRate
      : DEFAULT_VAT_RATE
    : 0
  const taxAmount = taxable
    ? Number(((Number(input.lineTotal) || 0) * (taxRate / 100)).toFixed(2))
    : 0
  const totalAfterTax = Number(
    ((Number(input.lineTotal) || 0) + taxAmount).toFixed(2),
  )
  return { taxable, taxRate, taxAmount, totalAfterTax }
}

export function summarizeDocumentTotals(
  items: Array<{ lineTotal?: number; taxAmount?: number; totalAfterTax?: number }>,
) {
  const subTotal = Number(
    items
      .reduce((sum, item) => sum + Number(item.lineTotal || 0), 0)
      .toFixed(2),
  )
  const taxTotal = Number(
    items
      .reduce((sum, item) => sum + Number(item.taxAmount || 0), 0)
      .toFixed(2),
  )
  const grandTotal = Number(
    items
      .reduce(
        (sum, item) =>
          sum +
          Number(
            item.totalAfterTax !== undefined
              ? item.totalAfterTax
              : Number(item.lineTotal || 0) + Number(item.taxAmount || 0),
          ),
        0,
      )
      .toFixed(2),
  )
  return { subTotal, taxTotal, grandTotal }
}

export async function buildQuotationItems(
  orgId: string,
  items: Array<{
    productId?: string
    productName?: string
    quantity: number
    unitPrice?: number
    isOutsourced?: boolean
    description?: string
    categoryGroup?: string
    showImageOnQuote?: boolean
    taxable?: boolean
    taxRate?: number
  }>,
) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one item is required")
  }

  const productIds = [...new Set(items.map((item) => item.productId).filter(Boolean))]
  const products = await StockProduct.find({
    _id: { $in: productIds },
    org_id: orgId,
  }).lean()
  const productMap = new Map(products.map((product) => [String(product._id), product]))

  const result = []
  for (const item of items) {
    const quantity = Number(item.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("Invalid quantity")
    }

    const isOutsourced = Boolean(item.isOutsourced)
    if (isOutsourced) {
      const manualName = String(item.productName || "").trim()
      if (!manualName) {
        throw new Error("Outsourced items require a product name")
      }

      const unitPrice = Number(item.unitPrice)
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error(`Invalid unit price for ${manualName}`)
      }

      const fallbackId = `outsourced:${manualName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")}`

      const lineTotal = Number((quantity * unitPrice).toFixed(2))
      const tax = resolveLineTax({
        taxable: item.taxable,
        taxRate: item.taxRate,
        lineTotal,
        fallbackTaxable: false,
      })

      result.push({
        productId: String(item.productId || fallbackId),
        productName: manualName,
        quantity,
        productUnitPrice: unitPrice,
        soldUnitPrice: unitPrice,
        unitPrice,
        lineTotal,
        ...tax,
        description: item.description,
        isOutsourced: true,
        categoryGroup: item.categoryGroup,
      })
      continue
    }

    const product = productMap.get(String(item.productId))
    if (!product) {
      const manualName = String(item.productName || item.description || item.productId || "Custom Item")
        .trim()
      const fallbackId = `manual:${manualName
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")}`
      const unitPrice = Number(item.unitPrice)
      const resolvedUnitPrice = Number.isFinite(unitPrice) && unitPrice >= 0 ? unitPrice : 0
      const lineTotal = Number((quantity * resolvedUnitPrice).toFixed(2))
      const tax = resolveLineTax({
        taxable: item.taxable,
        taxRate: item.taxRate,
        lineTotal,
        fallbackTaxable: false,
      })

      result.push({
        productId: String(item.productId || fallbackId),
        productName: manualName,
        quantity,
        productUnitPrice: resolvedUnitPrice,
        soldUnitPrice: resolvedUnitPrice,
        unitPrice: resolvedUnitPrice,
        lineTotal,
        ...tax,
        description: item.description,
        isOutsourced: true,
        categoryGroup: item.categoryGroup,
      })
      continue
    }

    const unitPrice =
      item.unitPrice !== undefined && item.unitPrice !== null
        ? Number(item.unitPrice)
        : Number(product.sellingPrice)

    const minimumSellingPrice = Number(product.sellingPrice)

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new Error(`Invalid unit price for ${product.name}`)
    }

    if (unitPrice < minimumSellingPrice) {
      throw new Error(
        `Sold price for ${product.name} cannot be below minimum selling price (${minimumSellingPrice})`,
      )
    }

    const productUpdates: Record<string, any> = {}
    if (
      item.description &&
      item.description.trim() !== "" &&
      item.description !== product.description
    ) {
      productUpdates.description = item.description.trim()
    }

    if (item.taxable !== undefined) {
      const nextTaxable = Boolean(item.taxable)
      const nextTaxRate = nextTaxable
        ? Number(
            item.taxRate && Number(item.taxRate) > 0
              ? item.taxRate
              : product.taxRate || DEFAULT_VAT_RATE,
          )
        : Number(product.taxRate || DEFAULT_VAT_RATE)
      if (Boolean(product.taxable) !== nextTaxable) {
        productUpdates.taxable = nextTaxable
      }
      if (nextTaxable && Number(product.taxRate || 0) !== nextTaxRate) {
        productUpdates.taxRate = nextTaxRate
      }
    }

    if (Object.keys(productUpdates).length > 0) {
      await StockProduct.updateOne(
        { _id: product._id, org_id: orgId },
        { $set: productUpdates },
      )
    }

    const lineTotal = Number((quantity * unitPrice).toFixed(2))
    const tax = resolveLineTax({
      taxable: item.taxable,
      taxRate: item.taxRate,
      lineTotal,
      fallbackTaxable: Boolean(product.taxable),
      fallbackTaxRate: Number(product.taxRate || DEFAULT_VAT_RATE),
    })

    result.push({
      productId: String(product._id),
      productName: product.name,
      quantity,
      productUnitPrice: Number(product.sellingPrice),
      soldUnitPrice: unitPrice,
      unitPrice,
      lineTotal,
      ...tax,
      description: item.description,
      productDescription: (product as { description?: string }).description,
      productType: product.productType,
      kraItemClassificationCode: (product as { kraItemClassificationCode?: string }).kraItemClassificationCode,
      isOutsourced: false,
      imageUrl: (product as { imageUrl?: string }).imageUrl,
      showImageOnQuote: item.showImageOnQuote || false,
      categoryGroup: item.categoryGroup,
    })
  }
  return result
}
