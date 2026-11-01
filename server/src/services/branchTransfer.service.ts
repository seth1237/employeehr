import { Branch } from "../models/Branch"
import { BranchTransfer } from "../models/BranchTransfer"
import type {
  BranchTransferKind,
  BranchTransferLineKind,
  IBranchTransferLine,
} from "../models/BranchTransfer"
import { Company } from "../models/Company"
import { FixedAsset } from "../models/FixedAsset"
import { StockProduct } from "../models/StockProduct"
import { User } from "../models/User"
import {
  deductSourceInventory,
  receiveInventory,
  resolveInventoryAvailable,
  restoreSourceInventory,
} from "./branchTransfer.movement"
import {
  actorName,
  canManageBranch,
  getTransferScope,
  httpError,
  type Actor,
} from "./branchTransfer.scope"

type IncomingLine = {
  kind: BranchTransferLineKind
  itemId: string
  quantity?: number
  notes?: string
  serialNumber?: string
}

function inferKind(lines: IncomingLine[]): BranchTransferKind {
  const kinds = new Set(lines.map((line) => line.kind))
  if (kinds.size === 1) return [...kinds][0] as BranchTransferKind
  return "mixed"
}

function nextLineId(index: number) {
  return `L${Date.now().toString(36)}${index}`
}

async function nextDocumentNumber(orgId: string) {
  const last = await BranchTransfer.findOne({ org_id: orgId })
    .sort({ createdAt: -1 })
    .select("documentNumber")
    .lean()
  const match = String(last?.documentNumber || "").match(/IBT-(\d+)/i)
  const next = match ? Number(match[1]) + 1 : 1
  return `IBT-${String(next).padStart(5, "0")}`
}

async function loadBranch(orgId: string, branchId: string) {
  const branch = await Branch.findOne({ _id: branchId, org_id: orgId })
  if (!branch) throw httpError("Branch not found", 404)
  return branch
}

async function hydrateLines(
  orgId: string,
  fromBranchId: string,
  incoming: IncomingLine[],
): Promise<IBranchTransferLine[]> {
  if (!incoming.length) throw httpError("Add at least one item to transfer", 400)

  const lines: IBranchTransferLine[] = []
  for (const [index, raw] of incoming.entries()) {
    const quantity = Math.max(1, Number(raw.quantity || 1))
    if (raw.kind === "inventory") {
      const product = await StockProduct.findOne({ _id: raw.itemId, org_id: orgId })
      if (!product) throw httpError("Product not found", 404)
      const availability = await resolveInventoryAvailable(orgId, fromBranchId, raw.itemId)
      if (availability.available < quantity) {
        throw httpError(
          `${product.name} has only ${availability.available} available at the sending branch`,
          400,
        )
      }
      lines.push({
        lineId: nextLineId(index),
        kind: "inventory",
        itemId: String(product._id),
        code: product.sku || product.barcode || "",
        name: product.name,
        quantity,
        unit: "pcs",
        notes: raw.notes,
        serialNumber: raw.serialNumber,
        shippedQty: 0,
        receivedQty: 0,
      })
      continue
    }

    if (raw.kind === "asset") {
      const asset = await FixedAsset.findOne({ _id: raw.itemId, org_id: orgId })
      if (!asset) throw httpError("Asset not found", 404)
      if (asset.status === "disposed") {
        throw httpError(`${asset.name} has been disposed`, 400)
      }
      if (asset.branchId && String(asset.branchId) !== String(fromBranchId)) {
        throw httpError(`${asset.assetCode} is not at the sending branch`, 400)
      }
      const moving = await BranchTransfer.findOne({
        org_id: orgId,
        status: "in_transit",
        "lines.kind": "asset",
        "lines.itemId": String(asset._id),
      }).select("documentNumber")
      if (moving) {
        throw httpError(`${asset.assetCode} is already on ${moving.documentNumber}`, 400)
      }
      lines.push({
        lineId: nextLineId(index),
        kind: "asset",
        itemId: String(asset._id),
        code: asset.assetCode,
        name: asset.name,
        quantity: 1,
        unit: "asset",
        notes: raw.notes,
        serialNumber: raw.serialNumber,
        shippedQty: 0,
        receivedQty: 0,
      })
      continue
    }

    const employee = await User.findOne({ _id: raw.itemId, org_id: orgId })
    if (!employee) throw httpError("Employee not found", 404)
    if (employee.branchId && String(employee.branchId) !== String(fromBranchId)) {
      throw httpError(`${actorName(employee)} is not assigned to the sending branch`, 400)
    }
    const moving = await BranchTransfer.findOne({
      org_id: orgId,
      status: "in_transit",
      "lines.kind": "employee",
      "lines.itemId": String(employee._id),
    }).select("documentNumber")
    if (moving) {
      throw httpError(`${actorName(employee)} is already on ${moving.documentNumber}`, 400)
    }
    lines.push({
      lineId: nextLineId(index),
      kind: "employee",
      itemId: String(employee._id),
      code: employee.employee_id || employee.email,
      name: actorName(employee),
      quantity: 1,
      unit: "staff",
      notes: raw.notes,
      shippedQty: 0,
      receivedQty: 0,
    })
  }
  return lines
}

export async function createTransfer(
  actor: Actor,
  payload: {
    fromBranchId: string
    toBranchId: string
    reason?: string
    notes?: string
    carrier?: string
    vehicleReg?: string
    reference?: string
    effectiveDate?: string
    lines: IncomingLine[]
  },
) {
  const activeBranchCount = await Branch.countDocuments({
    org_id: actor.org_id,
    isActive: true,
  })
  if (activeBranchCount < 2) {
    throw httpError("Add at least two active branches before transferring between them", 400)
  }
  const scope = await getTransferScope(actor)
  if (!canManageBranch(scope, payload.fromBranchId)) {
    throw httpError("You can only create transfers from your branch", 403)
  }
  if (String(payload.fromBranchId) === String(payload.toBranchId)) {
    throw httpError("Choose a different destination branch", 400)
  }

  const [fromBranch, toBranch, requester] = await Promise.all([
    loadBranch(actor.org_id, payload.fromBranchId),
    loadBranch(actor.org_id, payload.toBranchId),
    User.findOne({ _id: actor.userId, org_id: actor.org_id }),
  ])
  const lines = await hydrateLines(actor.org_id, payload.fromBranchId, payload.lines || [])

  let documentNumber = await nextDocumentNumber(actor.org_id)
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await BranchTransfer.create({
        org_id: actor.org_id,
        documentNumber,
        kind: inferKind(payload.lines),
        status: "draft",
        fromBranchId: String(fromBranch._id),
        fromBranchName: fromBranch.name,
        fromBranchCode: fromBranch.code,
        toBranchId: String(toBranch._id),
        toBranchName: toBranch.name,
        toBranchCode: toBranch.code,
        reason: payload.reason,
        notes: payload.notes,
        carrier: payload.carrier,
        vehicleReg: payload.vehicleReg,
        reference: payload.reference,
        effectiveDate: payload.effectiveDate ? new Date(payload.effectiveDate) : undefined,
        lines,
        requestedBy: actor.userId,
        requestedByName: actorName(requester, actor.name),
      })
    } catch (error: any) {
      if (error?.code !== 11000) throw error
      documentNumber = await nextDocumentNumber(actor.org_id)
    }
  }
  throw httpError("Could not allocate a transfer number", 500)
}

export async function updateDraft(
  actor: Actor,
  id: string,
  payload: {
    fromBranchId?: string
    toBranchId?: string
    reason?: string
    notes?: string
    carrier?: string
    vehicleReg?: string
    reference?: string
    effectiveDate?: string
    lines?: IncomingLine[]
  },
) {
  const doc = await BranchTransfer.findOne({ _id: id, org_id: actor.org_id })
  if (!doc) throw httpError("Transfer not found", 404)
  if (doc.status !== "draft") throw httpError("Only draft transfers can be edited", 400)
  const scope = await getTransferScope(actor)
  if (!canManageBranch(scope, doc.fromBranchId)) {
    throw httpError("You cannot edit this transfer", 403)
  }

  if (payload.fromBranchId) {
    const fromBranch = await loadBranch(actor.org_id, payload.fromBranchId)
    if (!canManageBranch(scope, payload.fromBranchId)) {
      throw httpError("You can only send from your branch", 403)
    }
    doc.fromBranchId = String(fromBranch._id)
    doc.fromBranchName = fromBranch.name
    doc.fromBranchCode = fromBranch.code
  }
  if (payload.toBranchId) {
    if (String(payload.toBranchId) === String(doc.fromBranchId)) {
      throw httpError("Choose a different destination branch", 400)
    }
    const toBranch = await loadBranch(actor.org_id, payload.toBranchId)
    doc.toBranchId = String(toBranch._id)
    doc.toBranchName = toBranch.name
    doc.toBranchCode = toBranch.code
  }
  if (payload.reason !== undefined) doc.reason = payload.reason
  if (payload.notes !== undefined) doc.notes = payload.notes
  if (payload.carrier !== undefined) doc.carrier = payload.carrier
  if (payload.vehicleReg !== undefined) doc.vehicleReg = payload.vehicleReg
  if (payload.reference !== undefined) doc.reference = payload.reference
  if (payload.effectiveDate !== undefined) {
    doc.effectiveDate = payload.effectiveDate ? new Date(payload.effectiveDate) : undefined
  }
  if (payload.lines) {
    doc.lines = await hydrateLines(actor.org_id, doc.fromBranchId, payload.lines)
    doc.kind = inferKind(payload.lines)
  }
  await doc.save()
  return doc
}

export async function issueTransfer(actor: Actor, id: string) {
  const doc = await BranchTransfer.findOne({ _id: id, org_id: actor.org_id })
  if (!doc) throw httpError("Transfer not found", 404)
  if (doc.status !== "draft") throw httpError("Only draft transfers can be issued", 400)
  if (!doc.lines.length) throw httpError("Add at least one item before issuing", 400)
  const scope = await getTransferScope(actor)
  if (!canManageBranch(scope, doc.fromBranchId)) {
    throw httpError("Only the sending branch admin can issue this transfer", 403)
  }

  const issuer = await User.findOne({ _id: actor.userId, org_id: actor.org_id })
  for (const line of doc.lines) {
    if (line.kind === "inventory") {
      const availability = await resolveInventoryAvailable(
        actor.org_id,
        doc.fromBranchId,
        line.itemId,
      )
      if (availability.available < line.quantity) {
        throw httpError(`${line.name} has only ${availability.available} available`, 400)
      }
      await deductSourceInventory(actor.org_id, doc.fromBranchId, line)
    }
    if (line.kind === "asset") {
      await FixedAsset.updateOne(
        { _id: line.itemId, org_id: actor.org_id },
        { $set: { transferredTo: doc.toBranchName } },
      )
      line.shippedQty = 1
    }
    if (line.kind === "employee") {
      line.shippedQty = 1
    }
  }

  doc.status = "in_transit"
  doc.issuedBy = actor.userId
  doc.issuedByName = actorName(issuer, actor.name)
  doc.issuedAt = new Date()
  doc.documentGeneratedAt = new Date()
  if (!doc.effectiveDate) doc.effectiveDate = doc.issuedAt
  await doc.save()
  return doc
}

export async function receiveTransfer(actor: Actor, id: string, receiveNotes?: string) {
  const doc = await BranchTransfer.findOne({ _id: id, org_id: actor.org_id })
  if (!doc) throw httpError("Transfer not found", 404)
  if (doc.status !== "in_transit") {
    throw httpError("Only in-transit transfers can be received", 400)
  }
  const scope = await getTransferScope(actor)
  if (!canManageBranch(scope, doc.toBranchId)) {
    throw httpError("Only the destination branch admin can receive this transfer", 403)
  }

  const receiver = await User.findOne({ _id: actor.userId, org_id: actor.org_id })
  const dest = await loadBranch(actor.org_id, doc.toBranchId)

  for (const line of doc.lines) {
    if (line.kind === "inventory") {
      await receiveInventory(
        actor.org_id,
        doc.toBranchId,
        actor.userId,
        doc.documentNumber,
        line,
      )
    }
    if (line.kind === "asset") {
      await FixedAsset.updateOne(
        { _id: line.itemId, org_id: actor.org_id },
        {
          $set: {
            branchId: String(dest._id),
            location: dest.name,
            transferredTo: dest.name,
            status: "active",
          },
        },
      )
      line.receivedQty = 1
    }
    if (line.kind === "employee") {
      await User.updateOne(
        { _id: line.itemId, org_id: actor.org_id },
        {
          $set: {
            branchId: String(dest._id),
            workLocation: dest.name,
          },
        },
      )
      line.receivedQty = 1
    }
  }

  doc.status = "received"
  doc.receivedBy = actor.userId
  doc.receivedByName = actorName(receiver, actor.name)
  doc.receivedAt = new Date()
  doc.receiveNotes = receiveNotes
  await doc.save()
  return doc
}

export async function cancelTransfer(actor: Actor, id: string, reason?: string) {
  const doc = await BranchTransfer.findOne({ _id: id, org_id: actor.org_id })
  if (!doc) throw httpError("Transfer not found", 404)
  if (doc.status === "received" || doc.status === "cancelled") {
    throw httpError("This transfer can no longer be cancelled", 400)
  }
  const scope = await getTransferScope(actor)
  const allowed =
    canManageBranch(scope, doc.fromBranchId) ||
    (doc.status === "in_transit" && canManageBranch(scope, doc.toBranchId))
  if (!allowed) throw httpError("You cannot cancel this transfer", 403)

  if (doc.status === "in_transit") {
    for (const line of doc.lines) {
      if (line.kind === "inventory") {
        await restoreSourceInventory(actor.org_id, doc.fromBranchId, line)
      }
      if (line.kind === "asset") {
        await FixedAsset.updateOne(
          { _id: line.itemId, org_id: actor.org_id },
          { $unset: { transferredTo: 1 } },
        )
      }
    }
  }

  const user = await User.findOne({ _id: actor.userId, org_id: actor.org_id })
  doc.status = "cancelled"
  doc.cancelledBy = actor.userId
  doc.cancelledByName = actorName(user, actor.name)
  doc.cancelledAt = new Date()
  doc.cancelReason = reason
  await doc.save()
  return doc
}

export async function listTransfers(
  actor: Actor,
  filters: { status?: string; kind?: string; branchId?: string },
) {
  const scope = await getTransferScope(actor)
  const query: Record<string, unknown> = { org_id: actor.org_id }
  if (filters.status && filters.status !== "all") query.status = filters.status
  if (filters.kind && filters.kind !== "all") query.kind = filters.kind
  if (!scope.canManageAll) {
    query.$or = [
      { fromBranchId: { $in: scope.managedBranchIds } },
      { toBranchId: { $in: scope.managedBranchIds } },
    ]
  } else if (filters.branchId) {
    query.$or = [{ fromBranchId: filters.branchId }, { toBranchId: filters.branchId }]
  }
  return BranchTransfer.find(query).sort({ createdAt: -1 }).limit(200).lean()
}

export async function getTransfer(actor: Actor, id: string) {
  const doc = await BranchTransfer.findOne({ _id: id, org_id: actor.org_id }).lean()
  if (!doc) throw httpError("Transfer not found", 404)
  const scope = await getTransferScope(actor)
  if (
    !scope.canManageAll &&
    !canManageBranch(scope, doc.fromBranchId) &&
    !canManageBranch(scope, doc.toBranchId)
  ) {
    throw httpError("Transfer not found", 404)
  }
  return doc
}

export async function getContext(actor: Actor) {
  const scope = await getTransferScope(actor)
  const [branches, company, user] = await Promise.all([
    Branch.find({ org_id: actor.org_id, isActive: true }).sort({ name: 1 }).lean(),
    Company.findById(actor.org_id).select("name").lean(),
    User.findOne({ _id: actor.userId, org_id: actor.org_id }).select(
      "firstName lastName role branchId",
    ),
  ])
  const defaultFromBranchId =
    scope.managedBranchIds[0] || (branches[0] ? String(branches[0]._id) : "")
  const defaultToBranchId =
    branches
      .map((branch) => String(branch._id))
      .find((id) => id && id !== defaultFromBranchId) || ""
  return {
    companyName: company?.name,
    canManageAll: scope.canManageAll,
    managedBranchIds: scope.managedBranchIds,
    branchCount: branches.length,
    hasBranches: branches.length > 0,
    transfersEnabled: branches.length >= 2,
    defaultFromBranchId,
    defaultToBranchId,
    actorName: actorName(user, actor.name),
    branches: branches.map((branch) => ({
      _id: String(branch._id),
      name: branch.name,
      code: branch.code,
      location: branch.location,
      managerId: branch.managerId,
      managerName: branch.managerName,
      isMine: scope.managedBranchIds.includes(String(branch._id)),
    })),
  }
}

export async function catalogProducts(actor: Actor, branchId: string) {
  const scope = await getTransferScope(actor)
  if (!canManageBranch(scope, branchId)) {
    throw httpError("You cannot view another branch's stock", 403)
  }
  const products = await StockProduct.find({ org_id: actor.org_id, isActive: true })
    .select("name sku barcode currentQuantity")
    .sort({ name: 1 })
    .lean()
  const rows = []
  for (const product of products) {
    const availability = await resolveInventoryAvailable(
      actor.org_id,
      branchId,
      String(product._id),
    )
    if (availability.available <= 0) continue
    rows.push({
      _id: String(product._id),
      name: product.name,
      code: product.sku || product.barcode || "",
      available: availability.available,
    })
  }
  return rows
}

export async function catalogAssets(actor: Actor, branchId: string) {
  const scope = await getTransferScope(actor)
  if (!canManageBranch(scope, branchId)) {
    throw httpError("You cannot view another branch's assets", 403)
  }
  const moving = await BranchTransfer.find({
    org_id: actor.org_id,
    status: "in_transit",
    "lines.kind": "asset",
  })
    .select("lines.itemId")
    .lean()
  const blocked = new Set(
    moving.flatMap((doc) =>
      (doc.lines || [])
        .filter((line) => line.kind === "asset")
        .map((line) => String(line.itemId)),
    ),
  )
  const assets = await FixedAsset.find({
    org_id: actor.org_id,
    status: { $ne: "disposed" },
    $or: [{ branchId: String(branchId) }, { branchId: { $in: [null, ""] } }],
  })
    .select("assetCode name location branchId")
    .sort({ name: 1 })
    .lean()
  return assets
    .filter((asset) => !blocked.has(String(asset._id)))
    .map((asset) => ({
      _id: String(asset._id),
      name: asset.name,
      code: asset.assetCode,
      location: asset.location,
    }))
}

export async function catalogEmployees(actor: Actor, branchId: string) {
  const scope = await getTransferScope(actor)
  if (!canManageBranch(scope, branchId)) {
    throw httpError("You cannot view another branch's staff", 403)
  }
  const moving = await BranchTransfer.find({
    org_id: actor.org_id,
    status: "in_transit",
    "lines.kind": "employee",
  })
    .select("lines.itemId")
    .lean()
  const blocked = new Set(
    moving.flatMap((doc) =>
      (doc.lines || [])
        .filter((line) => line.kind === "employee")
        .map((line) => String(line.itemId)),
    ),
  )
  const users = await User.find({
    org_id: actor.org_id,
    status: { $in: ["active", "probation", "notice"] },
    $or: [{ branchId: String(branchId) }, { branchId: { $in: [null, ""] } }],
  })
    .select("firstName lastName employee_id email role branchId workLocation")
    .sort({ firstName: 1 })
    .lean()
  return users
    .filter((user) => !blocked.has(String(user._id)))
    .map((user) => ({
      _id: String(user._id),
      name: actorName(user),
      code: user.employee_id || user.email,
      role: user.role,
      workLocation: user.workLocation,
    }))
}
