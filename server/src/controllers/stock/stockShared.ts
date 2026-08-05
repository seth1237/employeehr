import { StockProduct } from "../../models/StockProduct"

export const ADMIN_ROLES = ["company_admin", "hr", "admin", "super_admin"]

export function isAdminRole(role?: string) {
  return !!role && ADMIN_ROLES.includes(role)
}

export function generateDocumentNumber(prefix: string) {
  const ts = Date.now().toString().slice(-8)
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `${prefix}-${ts}-${rand}`
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

      result.push({
        productId: String(item.productId || fallbackId),
        productName: manualName,
        quantity,
        productUnitPrice: unitPrice,
        soldUnitPrice: unitPrice,
        unitPrice,
        lineTotal: Number((quantity * unitPrice).toFixed(2)),
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

      result.push({
        productId: String(item.productId || fallbackId),
        productName: manualName,
        quantity,
        productUnitPrice: resolvedUnitPrice,
        soldUnitPrice: resolvedUnitPrice,
        unitPrice: resolvedUnitPrice,
        lineTotal: Number((quantity * resolvedUnitPrice).toFixed(2)),
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

    if (
      item.description &&
      item.description.trim() !== "" &&
      item.description !== product.description
    ) {
      await StockProduct.updateOne(
        { _id: product._id, org_id: orgId },
        { $set: { description: item.description.trim() } },
      )
    }

    result.push({
      productId: String(product._id),
      productName: product.name,
      quantity,
      productUnitPrice: Number(product.sellingPrice),
      soldUnitPrice: unitPrice,
      unitPrice,
      lineTotal: Number((quantity * unitPrice).toFixed(2)),
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
