import mongoose, { Schema } from "mongoose";

export interface ICalibrationRecord {
  _id?: string;
  org_id: string;
  assetId: string;
  woId?: string;
  performedAt: Date;
  dueNext?: Date;
  result: "pass" | "fail" | "adjusted";
  certificateUrl?: string;
  certificateName?: string;
  vendorId?: string;
  vendorName?: string;
  standard?: string;
  notes?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const calibrationRecordSchema = new Schema<ICalibrationRecord>(
  {
    org_id: { type: String, required: true, index: true },
    assetId: { type: String, required: true, index: true },
    woId: { type: String, index: true },
    performedAt: { type: Date, required: true },
    dueNext: { type: Date },
    result: {
      type: String,
      enum: ["pass", "fail", "adjusted"],
      default: "pass",
    },
    certificateUrl: { type: String },
    certificateName: { type: String },
    vendorId: { type: String },
    vendorName: { type: String },
    standard: { type: String },
    notes: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true },
);

calibrationRecordSchema.index({ org_id: 1, assetId: 1, performedAt: -1 });

export const CalibrationRecord = mongoose.model<ICalibrationRecord>(
  "CalibrationRecord",
  calibrationRecordSchema,
);
