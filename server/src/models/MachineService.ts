import mongoose, { Schema } from "mongoose";

export interface IMachineService {
  _id?: string;
  org_id: string;
  machineId: string;
  serviceType?: string;
  scheduledDate?: Date;
  completedDate?: Date | null;
  technician?: string;
  cost?: number;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const machineServiceSchema = new Schema<IMachineService>(
  {
    org_id: { type: String, required: true, index: true },
    machineId: { type: String, required: true, index: true },
    serviceType: { type: String, default: "" },
    scheduledDate: { type: Date },
    completedDate: { type: Date, default: null },
    technician: { type: String, default: "" },
    cost: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

machineServiceSchema.index({ machineId: 1 });
machineServiceSchema.index({ completedDate: 1 });
machineServiceSchema.index({ scheduledDate: 1 });

export const MachineService = mongoose.model<IMachineService>(
  "MachineService",
  machineServiceSchema,
);
