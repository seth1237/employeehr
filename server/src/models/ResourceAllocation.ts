import mongoose, { Schema } from "mongoose";

// Resource Allocation Schema - for tracking product allocations to employees
const resourceAllocationSchema = new Schema(
  {
    company_id: { type: String, required: true, index: true },
    product_id: { type: String, required: true, index: true }, // Reference to ResourceProduct
    product_name: { type: String },
    employee_id: { type: String, required: true, index: true },
    employee_name: { type: String },
    department_id: { type: String, required: true }, // Reference to ResourceDepartment
    department_name: { type: String },
    allocation_date: { type: Date, required: true, default: () => new Date() },
    
    // Return Information
    return_date: { type: Date },
    condition_on_return: {
      type: String,
      enum: ["good", "damaged", "lost"],
    },
    employee_remark: { type: String }, // Employee's remarks upon return
    admin_notes: { type: String }, // Admin's additional notes
    
    // Status tracking
    is_returned: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["allocated", "in-use", "returned", "damaged", "lost"],
      default: "allocated",
    },
    
    // Duration tracking
    duration_days: { type: Number },
  },
  { timestamps: true }
);

resourceAllocationSchema.index({ company_id: 1, employee_id: 1 });
resourceAllocationSchema.index({ company_id: 1, product_id: 1 });
resourceAllocationSchema.index({ company_id: 1, is_returned: 1 });
resourceAllocationSchema.index({ allocation_date: 1 });

export const ResourceAllocation = mongoose.model(
  "ResourceAllocation",
  resourceAllocationSchema
);
