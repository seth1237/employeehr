import mongoose, { Schema, type Document } from "mongoose"

export interface IBranch extends Document {
  _id?: string
  org_id: string
  name: string
  code: string // Unique identifier per branch (e.g., "BR001", "BR002")
  location: string // Physical address
  city?: string
  state?: string
  country?: string
  phone?: string
  email?: string
  managerId?: string // User ID of the admin in charge
  managerName?: string
  managerEmail?: string
  description?: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

const branchSchema = new Schema<IBranch>(
  {
    org_id: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    managerId: {
      type: String,
      default: null,
    },
    managerName: {
      type: String,
      trim: true,
      default: null,
    },
    managerEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
)

// Ensure unique branch code per organization
branchSchema.index({ org_id: 1, code: 1 }, { unique: true })
branchSchema.index({ org_id: 1, isActive: 1 })

export const Branch = mongoose.model<IBranch>("Branch", branchSchema)
