import mongoose, { Schema } from "mongoose";

export type MachineQrReportType = "service" | "breakdown" | "product_order";
export type MachineQrReportStatus = "open" | "in_progress" | "closed";

export interface IMachineQrReport {
  org_id: string;
  machineId: string;
  qrToken: string;
  type: MachineQrReportType;
  status: MachineQrReportStatus;
  contactName: string;
  contactPhone: string;
  contactEmail?: string;
  message: string;
  preferredDate?: string;
  urgency?: "low" | "normal" | "high" | "critical";
  productName?: string;
  quantity?: number;
  ticketId?: string;
  machineSnapshot?: {
    productName?: string;
    serialNumber?: string;
    clientName?: string;
    location?: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const machineQrReportSchema = new Schema<IMachineQrReport>(
  {
    org_id: { type: String, required: true, index: true },
    machineId: { type: String, required: true, index: true },
    qrToken: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: ["service", "breakdown", "product_order"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "closed"],
      default: "open",
      index: true,
    },
    contactName: { type: String, required: true },
    contactPhone: { type: String, required: true },
    contactEmail: { type: String },
    message: { type: String, required: true },
    preferredDate: { type: String },
    urgency: {
      type: String,
      enum: ["low", "normal", "high", "critical"],
      default: "normal",
    },
    productName: { type: String },
    quantity: { type: Number, min: 1 },
    ticketId: { type: String },
    machineSnapshot: {
      productName: { type: String },
      serialNumber: { type: String },
      clientName: { type: String },
      location: { type: String },
    },
  },
  { timestamps: true },
);

machineQrReportSchema.index({ org_id: 1, createdAt: -1 });
machineQrReportSchema.index({ org_id: 1, status: 1, createdAt: -1 });

export const MachineQrReport = mongoose.model<IMachineQrReport>(
  "MachineQrReport",
  machineQrReportSchema,
);
