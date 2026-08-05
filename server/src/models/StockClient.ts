import mongoose, { Schema } from "mongoose"

export interface IClientContact {
  role: string
  name: string
  phone?: string
  email?: string
  notes?: string
}

export interface IStockClient {
  _id?: string
  org_id: string
  sourceName: string
  sourceNumber: string
  sourceLocation: string
  legalName: string
  contactPerson?: string
  kraPin?: string
  email?: string
  branchId?: string
  hasKraDetails: boolean
  contacts: IClientContact[]
  groupIds: string[]
  createdBy: string
  updatedBy: string
  createdAt?: Date
  updatedAt?: Date
}

const clientContactSchema = new Schema<IClientContact>(
  {
    role: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { _id: true },
)

const stockClientSchema = new Schema<IStockClient>(
  {
    org_id: { type: String, required: true, index: true },
    sourceName: { type: String, required: true },
    sourceNumber: { type: String, required: true },
    sourceLocation: { type: String, required: true },
    legalName: { type: String, required: true },
    contactPerson: { type: String, trim: true },
    kraPin: { type: String },
    email: { type: String },
    branchId: { type: String },
    hasKraDetails: { type: Boolean, default: false },
    contacts: { type: [clientContactSchema], default: [] },
    groupIds: { type: [String], default: [], index: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true },
)

stockClientSchema.index(
  { org_id: 1, sourceName: 1, sourceNumber: 1, sourceLocation: 1 },
  { unique: true },
)

export const StockClient = mongoose.model<IStockClient>(
  "StockClient",
  stockClientSchema,
)

export const DEFAULT_CONTACT_ROLES = [
  "Doctor",
  "Lab Technician",
  "Nurse",
  "Procurement",
  "Facility Manager",
  "Accountant",
  "Reception",
  "Other",
] as const
