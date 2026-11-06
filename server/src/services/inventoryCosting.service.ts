import { Company } from "../models/Company"
import { StockProduct } from "../models/StockProduct"
import { StockCostLayer } from "../models/StockCostLayer"
import { Account } from "../models/Account"
import { GeneralLedgerService } from "./GeneralLedgerService"

export type CostingMethod = "average" | "fifo"

export function roundMoney(value: number) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function availableQuantity(product: {
  currentQuantity?: number
  reservedQuantity?: number
}) {
  return Math.max(
    0,
    Number(product.currentQuantity || 0) - Number(product.reservedQuantity || 0),
  )
}

export function isStockManagedLine(
  item: { isOutsourced?: boolean; productType?: string },
  product?: { productType?: string; isOutsourced?: boolean } | null,
) {
  if (item?.isOutsourced) return false
  if (item?.productType === "service") return false
  if (product?.isOutsourced) return false
  if (product?.productType === "service") return false
  return true
}

export function unitCostOf(product: {
  averageCost?: number
  startingPrice?: number
}) {
  const avg = Number(product.averageCost || 0)
  if (avg > 0) return avg
  return Math.max(0, Number(product.startingPrice || 0))
}

export async function getCostingMethod(orgId: string): Promise<CostingMethod> {
  const company = await Company.findById(orgId)
    .select("stockSettings.inventoryCostingMethod")
    .lean()
  const method = String(
    (company as any)?.stockSettings?.inventoryCostingMethod || "average",
  ).toLowerCase()
  return method === "fifo" ? "fifo" : "average"
}

async function ensureOpeningLayer(
  orgId: string,
  product: { _id?: unknown; averageCost?: number; startingPrice?: number },
  onHand: number,
) {
  if (onHand <= 0) return
  const existing = await StockCostLayer.countDocuments({
    org_id: orgId,
    productId: String(product._id),
    quantityRemaining: { $gt: 0 },
  })
  if (existing > 0) return
  const cost = unitCostOf(product)
  await StockCostLayer.create({
    org_id: orgId,
    productId: String(product._id),
    quantityRemaining: onHand,
    originalQuantity: onHand,
    unitCost: cost,
    receivedAt: new Date(),
    source: "opening",
  })
}

export async function receiveStock(params: {
  orgId: string
  productId: string
  quantity: number
  unitCost?: number
  actorId?: string
  source?: "opening" | "receipt" | "adjustment" | "return"
  sourceId?: string
  branchId?: string
  applyQuantity?: boolean
}) {
  const qty = Number(params.quantity)
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Quantity to receive must be greater than 0")
  }
  const product = await StockProduct.findOne({
    _id: params.productId,
    org_id: params.orgId,
  })
  if (!product) throw new Error("Product not found")

  const applyQuantity = params.applyQuantity !== false
  const beforeQty = Number(product.currentQuantity || 0)
  const cost = Math.max(
    0,
    Number(
      params.unitCost !== undefined && params.unitCost !== null
        ? params.unitCost
        : unitCostOf(product),
    ),
  )

  if (applyQuantity) {
    await ensureOpeningLayer(params.orgId, product, beforeQty)
    const afterQty = beforeQty + qty
    const oldAvg = unitCostOf(product)
    const newAvg = afterQty > 0 ? (beforeQty * oldAvg + qty * cost) / afterQty : cost
    await StockProduct.updateOne(
      { _id: product._id, org_id: params.orgId },
      {
        $inc: { currentQuantity: qty },
        $set: { averageCost: roundMoney(newAvg) },
      },
    )
  } else if (!Number(product.averageCost || 0)) {
    await StockProduct.updateOne(
      { _id: product._id, org_id: params.orgId },
      { $set: { averageCost: roundMoney(cost) } },
    )
  }

  const layerQty = applyQuantity ? qty : beforeQty
  if (layerQty > 0) {
    const openLayers = await StockCostLayer.countDocuments({
      org_id: params.orgId,
      productId: String(product._id),
      quantityRemaining: { $gt: 0 },
    })
    if (applyQuantity || openLayers === 0) {
      await StockCostLayer.create({
        org_id: params.orgId,
        productId: String(product._id),
        quantityRemaining: layerQty,
        originalQuantity: layerQty,
        unitCost: cost,
        receivedAt: new Date(),
        source: params.source || (applyQuantity ? "receipt" : "opening"),
        sourceId: params.sourceId,
        branchId: params.branchId,
        createdBy: params.actorId,
      })
    }
  }

  return StockProduct.findOne({ _id: product._id, org_id: params.orgId })
}

async function consumeLayers(params: {
  orgId: string
  productId: string
  quantity: number
  method: CostingMethod
  averageCost: number
}) {
  let remaining = params.quantity
  let fifoCost = 0
  let guard = 0

  while (remaining > 0 && guard < 40) {
    guard += 1
    const layer = await StockCostLayer.findOne({
      org_id: params.orgId,
      productId: params.productId,
      quantityRemaining: { $gt: 0 },
    }).sort({ receivedAt: 1, createdAt: 1 })

    if (!layer) break

    const take = Math.min(remaining, Number(layer.quantityRemaining || 0))
    const updated = await StockCostLayer.findOneAndUpdate(
      { _id: layer._id, quantityRemaining: { $gte: take } },
      { $inc: { quantityRemaining: -take } },
      { new: true },
    )
    if (!updated) continue
    fifoCost += take * Number(layer.unitCost || 0)
    remaining -= take
  }

  const valuedQty = params.quantity - remaining
  const fallback = remaining * params.averageCost
  const totalCost =
    params.method === "fifo"
      ? roundMoney(fifoCost + fallback)
      : roundMoney(params.quantity * params.averageCost)

  return {
    totalCost,
    unitCost: params.quantity > 0 ? roundMoney(totalCost / params.quantity) : 0,
    valuedQuantity: valuedQty,
  }
}

export async function issueStock(params: {
  orgId: string
  productId: string
  quantity: number
  fromReservation?: boolean
}) {
  const qty = Number(params.quantity)
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Quantity to issue must be greater than 0")
  }

  const product = await StockProduct.findOne({
    _id: params.productId,
    org_id: params.orgId,
  })
  if (!product) throw new Error("Product not found")

  await ensureOpeningLayer(
    params.orgId,
    product,
    Number(product.currentQuantity || 0),
  )

  const method = await getCostingMethod(params.orgId)
  const reserved = Number(product.reservedQuantity || 0)
  const available = availableQuantity(product)
  const fromReserved = params.fromReservation ? Math.min(reserved, qty) : 0
  const fromAvailable = qty - fromReserved
  if (fromAvailable > available) {
    throw new Error(
      `Insufficient available stock for ${product.name}. On hand ${Number(
        product.currentQuantity || 0,
      )}, reserved ${reserved}, requested ${qty}`,
    )
  }

  const filter: Record<string, unknown> = {
    _id: params.productId,
    org_id: params.orgId,
    currentQuantity: { $gte: qty },
  }
  const update: Record<string, unknown> = {
    $inc: { currentQuantity: -qty, reservedQuantity: -fromReserved },
  }
  if (fromReserved > 0) {
    filter.reservedQuantity = { $gte: fromReserved }
  }
  if (!params.fromReservation) {
    filter.$expr = {
      $gte: [
        {
          $subtract: [
            "$currentQuantity",
            { $ifNull: ["$reservedQuantity", 0] },
          ],
        },
        qty,
      ],
    }
  }

  const updated = await StockProduct.findOneAndUpdate(filter, update, {
    new: true,
  })
  if (!updated) {
    throw new Error(
      `Insufficient available stock for ${product.name}. On hand ${Number(
        product.currentQuantity || 0,
      )}, reserved ${Number(product.reservedQuantity || 0)}, requested ${qty}`,
    )
  }

  const consumed = await consumeLayers({
    orgId: params.orgId,
    productId: String(product._id),
    quantity: qty,
    method,
    averageCost: unitCostOf(updated),
  })

  return {
    product: updated,
    remainingQuantity: Number(updated.currentQuantity || 0),
    costingMethod: method,
    unitCost: consumed.unitCost,
    totalCost: consumed.totalCost,
    reservedReleased: fromReserved,
  }
}

export async function reserveStock(params: {
  orgId: string
  productId: string
  quantity: number
  productName?: string
}) {
  const qty = Number(params.quantity)
  if (!Number.isFinite(qty) || qty <= 0) return null
  const updated = await StockProduct.findOneAndUpdate(
    {
      _id: params.productId,
      org_id: params.orgId,
      $expr: {
        $gte: [
          {
            $subtract: [
              "$currentQuantity",
              { $ifNull: ["$reservedQuantity", 0] },
            ],
          },
          qty,
        ],
      },
    },
    { $inc: { reservedQuantity: qty } },
    { new: true },
  )
  if (!updated) {
    throw new Error(
      `Not enough free stock to reserve ${qty} of ${params.productName || "item"}`,
    )
  }
  return updated
}

export async function releaseReservation(params: {
  orgId: string
  productId: string
  quantity: number
}) {
  const qty = Number(params.quantity)
  if (!Number.isFinite(qty) || qty <= 0) return
  await StockProduct.findOneAndUpdate(
    {
      _id: params.productId,
      org_id: params.orgId,
      reservedQuantity: { $gte: qty },
    },
    { $inc: { reservedQuantity: -qty } },
  )
}

export async function restoreIssuedStock(params: {
  orgId: string
  productId: string
  quantity: number
  unitCost?: number
  actorId?: string
  sourceId?: string
}) {
  await receiveStock({
    orgId: params.orgId,
    productId: params.productId,
    quantity: params.quantity,
    unitCost: params.unitCost,
    actorId: params.actorId,
    source: "return",
    sourceId: params.sourceId,
    applyQuantity: true,
  })
}

export async function postSaleLedgers(params: {
  orgId: string
  userId: string
  date?: Date
  reference: string
  description: string
  revenueAmount?: number
  taxAmount?: number
  cogsAmount?: number
  skipRevenue?: boolean
}) {
  await GeneralLedgerService.initializeDefaultAccounts(params.orgId)
  const [ar, sales, vat, cogs, inventory] = await Promise.all([
    Account.findOne({ org_id: params.orgId, code: "1200" }),
    Account.findOne({ org_id: params.orgId, code: "4000" }),
    Account.findOne({ org_id: params.orgId, code: "2100" }),
    Account.findOne({ org_id: params.orgId, code: "5000" }),
    Account.findOne({ org_id: params.orgId, code: "1300" }),
  ])

  const revenue = roundMoney(params.revenueAmount || 0)
  const tax = roundMoney(params.taxAmount || 0)
  const cogsAmount = roundMoney(params.cogsAmount || 0)
  const lines: Array<{
    accountId: any
    debit: number
    credit: number
    description?: string
  }> = []

  if (!params.skipRevenue && revenue + tax > 0) {
    if (!ar || !sales) {
      throw new Error("Sales ledger accounts (1200 / 4000) are missing")
    }
    lines.push({
      accountId: ar._id,
      debit: roundMoney(revenue + tax),
      credit: 0,
      description: "Accounts receivable",
    })
    if (revenue > 0) {
      lines.push({
        accountId: sales._id,
        debit: 0,
        credit: revenue,
        description: "Sales revenue",
      })
    }
    if (tax > 0 && vat) {
      lines.push({
        accountId: vat._id,
        debit: 0,
        credit: tax,
        description: "Output VAT",
      })
    }
  }

  if (cogsAmount > 0) {
    if (!cogs || !inventory) {
      throw new Error("Inventory ledger accounts (1300 / 5000) are missing")
    }
    lines.push({
      accountId: cogs._id,
      debit: cogsAmount,
      credit: 0,
      description: "Cost of goods sold",
    })
    lines.push({
      accountId: inventory._id,
      debit: 0,
      credit: cogsAmount,
      description: "Inventory issue",
    })
  }

  if (lines.length < 2) return null

  return GeneralLedgerService.postJournalEntry(
    params.orgId,
    {
      date: params.date || new Date(),
      reference: params.reference,
      description: params.description,
      source: "invoice",
      journalType: cogsAmount > 0 ? "inventory" : "sales",
      nature: "automatic",
      lines,
    },
    params.userId,
  )
}
