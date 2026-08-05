import mongoose, { Schema } from "mongoose"

const departmentSchema = new Schema(
  {
    name: { type: String, required: true },
    org_id: { type: String, required: true },
    managerId: { type: String, required: false },
    sidebarSections: { type: [String], required: false, default: [] },
  },
  { timestamps: true }
)

export const Department = mongoose.model("Department", departmentSchema)
