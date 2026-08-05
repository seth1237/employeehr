import mongoose, { Schema } from "mongoose";

interface IInstalledMachine {
  _id?: string;
  org_id: string;
  client: {
    name: string;
    number?: string;
    location?: string;
    contactPerson?: string;
  };
  productId: string;
  productName: string;
  category?: string;
  serialNumber?: string;
  installationLocation?: string;
  installationDepartment?: string;
  installationDate?: Date;
  warrantyUntil?: Date;
  status?: "active" | "maintenance" | "ended" | "installation_pending";
  invoiceId?: string;
  quotationId?: string;
  isActive?: boolean;
  notes?: string;
  nextServiceDate?: Date;
  installedBy?: string;
  attendant?: string;
  attendantNumber?: string;
  isTrained?: boolean;
  createdBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const installedMachineSchema = new Schema<IInstalledMachine>(
  {
    org_id: { type: String, required: true, index: true },
    client: {
      name: { type: String, required: true },
      number: { type: String },
      location: { type: String },
      contactPerson: { type: String },
    },
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    category: { type: String, index: true },
    serialNumber: { type: String, index: true },
    installationLocation: { type: String },
    installationDepartment: { type: String },
    installationDate: { type: Date },
    warrantyUntil: { type: Date },
    status: {
      type: String,
      enum: ["active", "maintenance", "ended", "installation_pending"],
      default: "active",
    },
    invoiceId: { type: String, index: true },
    quotationId: { type: String, index: true },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String },
    nextServiceDate: { type: Date },
    installedBy: { type: String },
    attendant: { type: String },
    attendantNumber: { type: String },
    isTrained: { type: Boolean, default: false },
    createdBy: { type: String },
  },
  { timestamps: true },
);

installedMachineSchema.index(
  { org_id: 1, productId: 1, serialNumber: 1 },
  { unique: false },
);

export const InstalledMachine = mongoose.model<IInstalledMachine>(
  "InstalledMachine",
  installedMachineSchema,
);
