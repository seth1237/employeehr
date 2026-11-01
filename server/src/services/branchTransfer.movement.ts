import { BranchTransfer } from "../models/BranchTransfer"
import type { IBranchTransferLine } from "../models/BranchTransfer"
import { StockEntry } from "../models/StockEntry"
import { StockLocation } from "../models/StockLocation"
import { StockProduct } from "../models/StockProduct"
import { StockProductLocation } from "../models/StockProductLocation"
import { httpError } from "./branchTransfer.scope"

export async function resolveInventoryAvailable(
  orgId: string,
  branchId: string,
  productId: string,
) {
  const locations = await StockProductLocation.find({
    org_id: orgId,
    branchId: String(branchId),
    productId: String(productId),
  }).lean()
  const locationQty = locations.reduce((sum, row) => sum + Number(row.quantity || 0), 0)
  if (locations.length > 0) {
    return { available: locationQty, source: "locations" as const }
  }

  const [entryAgg, outbound] = await Promise.all([
    StockEntry.aggregate([
      {
        $match: {
          org_id: orgId,
          branchId: String(branchId),
          productId: String(productId),
        },
      },
      { $group: { _id: null, qty: { $sum: "$quantityAdded" } } },
    ]),
    BranchTransfer.aggregate([
      {
        $match: {
          org_id: orgId,
          fromBranchId: String(branchId),
          status: { $in: ["in_transit", "received"] },
        },
      },
      { $unwind: "$lines" },
      {
        $match: {
          "lines.kind": "inventory",
          "lines.itemId": String(productId),
        },
      },
      { $group: { _id: null, qty: { $sum: "$lines.shippedQty" } } },
    ]),
  ])
  const entryQty = Number(entryAgg[0]?.qty || 0)
  const shipped = Number(outbound[0]?.qty || 0)
  if (entryQty > 0) {
    return { available: Math.max(0, entryQty - shipped), source: "entries" as const }
  }

  const [product, allLocations, inTransit] = await Promise.all([
    StockProduct.findOne({ _id: productId, org_id: orgId }).lean(),
    StockProductLocation.aggregate([
      { $match: { org_id: orgId, productId: String(productId) } },
      { $group: { _id: null, qty: { $sum: "$quantity" } } },
    ]),
    BranchTransfer.aggregate([
      { $match: { org_id: orgId, status: "in_transit" } },
      { $unwind: "$lines" },
      {
        $match: {
          "lines.kind": "inventory",
          "lines.itemId": String(productId),
        },
      },
      { $group: { _id: null, qty: { $sum: "$lines.shippedQty" } } },
    ]),
  ])
  const unallocated = Math.max(
    0,
    Number(product?.currentQuantity || 0) -
      Number(allLocations[0]?.qty || 0) -
      Number(inTransit[0]?.qty || 0),
  )
  return { available: unallocated, source: "unallocated" as const }
}

export async function deductSourceInventory(
  orgId: string,
  fromBranchId: string,
  line: IBranchTransferLine,
) {
  const locations = await StockProductLocation.find({
    org_id: orgId,
    branchId: String(fromBranchId),
    productId: String(line.itemId),
    quantity: { $gt: 0 },
  }).sort({ updatedAt: 1 })

  let remaining = line.quantity
  const allocations: { locationId: string; quantity: number }[] = []
  for (const location of locations) {
    if (remaining <= 0) break
    const take = Math.min(Number(location.quantity || 0), remaining)
    if (take <= 0) continue
    location.quantity = Number(location.quantity || 0) - take
    await location.save()
    allocations.push({ locationId: String(location.locationId), quantity: take })
    remaining -= take
  }

  if (remaining > 0 && locations.length > 0) {
    throw httpError(`${line.name} no longer has enough quantity at the sending branch`, 400)
  }

  line.allocations = allocations
  line.usedUnallocated = remaining > 0
  line.shippedQty = line.quantity
}

export async function restoreSourceInventory(
  orgId: string,
  fromBranchId: string,
  line: IBranchTransferLine,
) {
  if (line.kind !== "inventory" || !line.shippedQty) return
  for (const allocation of line.allocations || []) {
    await StockProductLocation.findOneAndUpdate(
      {
        org_id: orgId,
        productId: String(line.itemId),
        locationId: allocation.locationId,
      },
      {
        $set: { org_id: orgId, branchId: String(fromBranchId), productId: String(line.itemId) },
        $inc: { quantity: allocation.quantity },
      },
      { upsert: true, new: true },
    )
  }
}

export async function ensureReceivingLocation(orgId: string, branchId: string) {
  const existing = await StockLocation.findOne({
    org_id: orgId,
    branchId: String(branchId),
    code: "RECV",
  })
  if (existing) return existing
  return StockLocation.create({
    org_id: orgId,
    branchId: String(branchId),
    name: "Receiving",
    code: "RECV",
    locationType: "bin",
    x: 4,
    y: 4,
    width: 24,
    height: 12,
    color: "#0f766e",
  })
}

export async function receiveInventory(
  orgId: string,
  toBranchId: string,
  actorId: string,
  documentNumber: string,
  line: IBranchTransferLine,
) {
  const location = await ensureReceivingLocation(orgId, toBranchId)
  await StockProductLocation.findOneAndUpdate(
    {
      org_id: orgId,
      productId: String(line.itemId),
      locationId: String(location._id),
    },
    {
      $set: {
        org_id: orgId,
        branchId: String(toBranchId),
        productId: String(line.itemId),
        locationId: String(location._id),
      },
      $inc: { quantity: line.quantity },
    },
    { upsert: true, new: true },
  )
  await StockEntry.create({
    org_id: orgId,
    productId: String(line.itemId),
    branchId: String(toBranchId),
    locationId: String(location._id),
    quantityAdded: line.quantity,
    addedBy: actorId,
    note: `Inter-branch transfer ${documentNumber} receive`,
    entryDate: new Date(),
  })
  line.receivedQty = line.quantity
}
