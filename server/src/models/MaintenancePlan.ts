import mongoose, { Schema } from "mongoose";

export const MAINTENANCE_PLAN_TYPES = [
  "preventive",
  "inspection",
  "calibration",
] as const;

export interface IMaintenancePlan {
  _id?: string;
  org_id: string;
  assetId: string;
  name: string;
  type: (typeof MAINTENANCE_PLAN_TYPES)[number];
  intervalDays?: number;
  intervalHours?: number;
  lastDoneAt?: Date;
  nextDueAt?: Date;
  leadTimeDays?: number;
  defaultChecklist?: { item: string }[];
  assignedTeam?: string;
  active?: boolean;
  notes?: string;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const maintenancePlanSchema = new Schema<IMaintenancePlan>(
  {
    org_id: { type: String, required: true, index: true },
    assetId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: MAINTENANCE_PLAN_TYPES,
      default: "preventive",
    },
    intervalDays: { type: Number, default: 90 },
    intervalHours: { type: Number },
    lastDoneAt: { type: Date },
    nextDueAt: { type: Date, index: true },
    leadTimeDays: { type: Number, default: 7 },
    defaultChecklist: {
      type: [{ item: { type: String, required: true } }],
      default: [],
    },
    assignedTeam: { type: String },
    active: { type: Boolean, default: true, index: true },
    notes: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true },
);

maintenancePlanSchema.index({ org_id: 1, assetId: 1, active: 1 });

export const MaintenancePlan = mongoose.model<IMaintenancePlan>(
  "MaintenancePlan",
  maintenancePlanSchema,
);
