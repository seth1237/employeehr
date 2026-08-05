import mongoose, { Schema } from "mongoose";

// Resource Department Schema - for organizing departments and their managers
const resourceDepartmentSchema = new Schema(
  {
    company_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    manager_id: { type: String }, // Reference to User
    manager_name: { type: String },
    budget_allocation: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

resourceDepartmentSchema.index({ company_id: 1, name: 1 });
resourceDepartmentSchema.index({ company_id: 1, manager_id: 1 });

export const ResourceDepartment = mongoose.model(
  "ResourceDepartment",
  resourceDepartmentSchema
);
