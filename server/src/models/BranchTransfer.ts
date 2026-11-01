import mongoose, { Schema, type Document } from "mongoose"

export type BranchTransferKind = "inventory" | "asset" | "employee" | "mixed"
export type BranchTransferStatus =
  | "draft"
  | "in_transit"
  | "received"
  | "cancelled"
export type BranchTransferLineKind = "inventory" | "asset" | "employee"

export interface IBranchTransferAllocation {
  locationId: string
  quantity: number
}

export interface IBranchTransferLine {
  lineId: string
  kind: BranchTransferLineKind
  itemId: string
  code?: string
  name: string
  quantity: number
  unit?: string
  serialNumber?: string
  notes?: string
  shippedQty: number
  receivedQty: number
  usedUnallocated?: boolean
  allocations?: IBranchTransferAllocation[]
}

export interface IBranchTransfer extends Document {
  org_id: string
  documentNumber: string
  kind: BranchTransferKind
  status: BranchTransferStatus
  fromBranchId: string
  fromBranchName: string
  fromBranchCode?: string
  toBranchId: string
  toBranchName: string
  toBranchCode?: string
  reason?: string
  notes?: string
  carrier?: string
  vehicleReg?: string
  reference?: string
  effectiveDate?: Date
  lines: IBranchTransferLine[]
  requestedBy: string
  requestedByName?: string
  issuedBy?: string
  issuedByName?: string
  issuedAt?: Date
  receivedBy?: string
  receivedByName?: string
  receivedAt?: Date
  receiveNotes?: string
  cancelledBy?: string
  cancelledByName?: string
  cancelledAt?: Date
  cancelReason?: string
  documentGeneratedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

const allocationSchema = new Schema<IBranchTransferAllocation>(
  {
    locationId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const lineSchema = new Schema<IBranchTransferLine>(
  {
    lineId: { type: String, required: true },
    kind: {
      type: String,
      enum: ["inventory", "asset", "employee"],
      required: true,
    },
    itemId: { type: String, required: true },
    code: { type: String },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "pcs" },
    serialNumber: { type: String },
    notes: { type: String },
    shippedQty: { type: Number, default: 0, min: 0 },
    receivedQty: { type: Number, default: 0, min: 0 },
    usedUnallocated: { type: Boolean, default: false },
    allocations: { type: [allocationSchema], default: [] },
  },
  { _id: false },
)

const branchTransferSchema = new Schema<IBranchTransfer>(
  {
    org_id: { type: String, required: true, index: true },
    documentNumber: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ["inventory", "asset", "employee", "mixed"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "in_transit", "received", "cancelled"],
      default: "draft",
      index: true,
    },
    fromBranchId: { type: String, required: true, index: true },
    fromBranchName: { type: String, required: true },
    fromBranchCode: { type: String },
    toBranchId: { type: String, required: true, index: true },
    toBranchName: { type: String, required: true },
    toBranchCode: { type: String },
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
    carrier: { type: String, trim: true },
    vehicleReg: { type: String, trim: true },
    reference: { type: String, trim: true },
    effectiveDate: { type: Date },
    lines: { type: [lineSchema], default: [] },
    requestedBy: { type: String, required: true },
    requestedByName: { type: String },
    issuedBy: { type: String },
    issuedByName: { type: String },
    issuedAt: { type: Date },
    receivedBy: { type: String },
    receivedByName: { type: String },
    receivedAt: { type: Date },
    receiveNotes: { type: String },
    cancelledBy: { type: String },
    cancelledByName: { type: String },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    documentGeneratedAt: { type: Date },
  },
  { timestamps: true },
)

branchTransferSchema.index({ org_id: 1, documentNumber: 1 }, { unique: true })
branchTransferSchema.index({ org_id: 1, status: 1, createdAt: -1 })
branchTransferSchema.index({ org_id: 1, fromBranchId: 1, status: 1 })
branchTransferSchema.index({ org_id: 1, toBranchId: 1, status: 1 })

export const BranchTransfer = mongoose.model<IBranchTransfer>(
  "BranchTransfer",
  branchTransferSchema,
)
