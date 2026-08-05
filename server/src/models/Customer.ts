import mongoose, { Schema, Document } from "mongoose"

export interface ICustomer extends Document {
  org_id: string
  name: string
  hospital?: string
  county?: string
  department?: string
  contactPerson?: string
  position?: string
  phoneNumbers: string[]
  email?: string
  physicalAddress?: string
  kraPin?: string
  category: "Hospital" | "Clinic" | "Pharmacy" | "NGO" | "Government" | "Private Practice" | "Other"
  leadSource?: string
  status: "Active" | "Inactive"
  createdBy: string // user_id
  createdAt: Date
  updatedAt: Date
}

const customerSchema = new Schema<ICustomer>(
  {
    org_id: { type: String, required: true },
    name: { type: String, required: true },
    hospital: { type: String },
    county: { type: String },
    department: { type: String },
    contactPerson: { type: String },
    position: { type: String },
    phoneNumbers: [{ type: String }],
    email: { type: String },
    physicalAddress: { type: String },
    kraPin: { type: String },
    category: {
      type: String,
      enum: ["Hospital", "Clinic", "Pharmacy", "NGO", "Government", "Private Practice", "Other"],
      default: "Other"
    },
    leadSource: { type: String },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    createdBy: { type: String, required: true }
  },
  { timestamps: true }
)

customerSchema.index({ org_id: 1 })
customerSchema.index({ phoneNumbers: 1 })

export const Customer = mongoose.model<ICustomer>("Customer", customerSchema)
