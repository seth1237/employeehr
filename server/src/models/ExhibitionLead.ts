import mongoose, { Schema, Document } from "mongoose"

export interface IExhibitionLead extends Document {
  org_id: string
  exhibitionId: string
  collectedBy: string // User ID of the sales rep
  name: string
  facility: string // Facility of association
  role: string
  location: string
  phoneNumber: string
  email: string
  productOfInterest: string
  customData?: Record<string, any> // Key-value pairs for custom fields
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

const exhibitionLeadSchema = new Schema<IExhibitionLead>(
  {
    org_id: { type: String, required: true, index: true },
    exhibitionId: { type: String, required: true, index: true },
    collectedBy: { type: String, required: true, index: true },
    name: { type: String, required: true },
    facility: { type: String, required: true },
    role: { type: String, required: true },
    location: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    email: { type: String },
    productOfInterest: { type: String, required: true },
    customData: { type: Schema.Types.Mixed, default: {} },
    notes: { type: String },
  },
  { timestamps: true },
)

export const ExhibitionLead = mongoose.model<IExhibitionLead>("ExhibitionLead", exhibitionLeadSchema)
