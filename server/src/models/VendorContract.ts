import mongoose, { Schema } from "mongoose";

export interface IVendorContract {
  _id?: string;
  org_id: string;
  vendorId?: string;
  vendorName: string;
  assetIds?: string[];
  category?: string;
  type: "amc" | "warranty" | "rental";
  startDate?: Date;
  endDate?: Date;
  slaHours?: number;
  visitsIncluded?: number;
  visitsUsed?: number;
  documentUrl?: string;
  documentName?: string;
  cost?: number;
  notes?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const vendorContractSchema = new Schema<IVendorContract>(
  {
    org_id: { type: String, required: true, index: true },
    vendorId: { type: String },
    vendorName: { type: String, required: true },
    assetIds: { type: [String], default: [] },
    category: { type: String },
    type: {
      type: String,
      enum: ["amc", "warranty", "rental"],
      default: "amc",
    },
    startDate: { type: Date },
    endDate: { type: Date, index: true },
    slaHours: { type: Number },
    visitsIncluded: { type: Number },
    visitsUsed: { type: Number, default: 0 },
    documentUrl: { type: String },
    documentName: { type: String },
    cost: { type: Number, default: 0 },
    notes: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true },
);

vendorContractSchema.index({ org_id: 1, type: 1, endDate: 1 });

export const VendorContract = mongoose.model<IVendorContract>(
  "VendorContract",
  vendorContractSchema,
);
