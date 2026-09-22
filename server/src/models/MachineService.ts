import mongoose, { Schema } from "mongoose";

export const WORK_ORDER_TYPES = [
  "preventive",
  "corrective",
  "installation",
  "calibration",
  "inspection",
  "vendor",
] as const;

export const WORK_ORDER_STATUSES = [
  "draft",
  "open",
  "assigned",
  "in_progress",
  "on_hold",
  "waiting_parts",
  "completed",
  "cancelled",
] as const;

export const WORK_ORDER_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export interface IWorkOrderChecklistItem {
  item: string;
  done?: boolean;
  note?: string;
}

export interface IWorkOrderPart {
  productId?: string;
  name: string;
  qty: number;
  storeLocationId?: string;
}

export interface IWorkOrderCostLine {
  purpose: string;
  amount: number;
}

export interface IMachineService {
  _id?: string;
  org_id: string;
  machineId: string;
  woNumber?: string;
  type?: (typeof WORK_ORDER_TYPES)[number];
  status?: (typeof WORK_ORDER_STATUSES)[number];
  priority?: (typeof WORK_ORDER_PRIORITIES)[number];
  serviceType?: string;
  scheduledDate?: Date;
  startedAt?: Date;
  completedDate?: Date | null;
  technician?: string;
  technicianId?: string;
  helpers?: string[];
  cost?: number;
  costLines?: IWorkOrderCostLine[];
  notes?: string;
  requestId?: string;
  planId?: string;
  downtimeMinutes?: number;
  machineOkay?: boolean;
  failureCode?: string;
  causeCode?: string;
  checklist?: IWorkOrderChecklistItem[];
  parts?: IWorkOrderPart[];
  attachments?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const checklistSchema = new Schema<IWorkOrderChecklistItem>(
  {
    item: { type: String, required: true },
    done: { type: Boolean, default: false },
    note: { type: String, default: "" },
  },
  { _id: false },
);

const partSchema = new Schema<IWorkOrderPart>(
  {
    productId: { type: String },
    name: { type: String, required: true },
    qty: { type: Number, default: 1 },
    storeLocationId: { type: String },
  },
  { _id: false },
);

const costLineSchema = new Schema<IWorkOrderCostLine>(
  {
    purpose: { type: String, default: "" },
    amount: { type: Number, default: 0 },
  },
  { _id: false },
);

const machineServiceSchema = new Schema<IMachineService>(
  {
    org_id: { type: String, required: true, index: true },
    machineId: { type: String, required: true, index: true },
    woNumber: { type: String, index: true },
    type: {
      type: String,
      enum: WORK_ORDER_TYPES,
      default: "corrective",
    },
    status: {
      type: String,
      enum: WORK_ORDER_STATUSES,
      default: "open",
      index: true,
    },
    priority: {
      type: String,
      enum: WORK_ORDER_PRIORITIES,
      default: "medium",
    },
    serviceType: { type: String, default: "" },
    scheduledDate: { type: Date },
    startedAt: { type: Date },
    completedDate: { type: Date, default: null },
    technician: { type: String, default: "" },
    technicianId: { type: String, default: "", index: true },
    helpers: { type: [String], default: [] },
    cost: { type: Number, default: 0 },
    costLines: { type: [costLineSchema], default: [] },
    notes: { type: String, default: "" },
    requestId: { type: String, index: true },
    planId: { type: String, index: true },
    downtimeMinutes: { type: Number, default: 0 },
    machineOkay: { type: Boolean },
    failureCode: { type: String, default: "" },
    causeCode: { type: String, default: "" },
    checklist: { type: [checklistSchema], default: [] },
    parts: { type: [partSchema], default: [] },
    attachments: { type: [String], default: [] },
  },
  { timestamps: true },
);

machineServiceSchema.index({ completedDate: 1 });
machineServiceSchema.index({ scheduledDate: 1 });
machineServiceSchema.index({ org_id: 1, woNumber: 1 }, { unique: true, sparse: true });
machineServiceSchema.index({ org_id: 1, status: 1, scheduledDate: 1 });

export const MachineService = mongoose.model<IMachineService>(
  "MachineService",
  machineServiceSchema,
);
