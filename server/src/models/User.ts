import mongoose, { Schema } from "mongoose"
import type { IUser } from "../types/interfaces"

const userSchema = new Schema<IUser>(
  {
    org_id: { type: String, required: true },
    employee_id: { type: String, unique: true, sparse: true }, // Unique employee ID for login (e.g., EMP001)
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "company_admin", "admin", "manager", "employee", "hr"],
      default: "employee",
    },
    department: { type: String },
    position: { type: String }, // Job title
    manager_id: { type: String },
    avatar: { type: String },
    signatureUrl: { type: String },
    // Preference: whether user wants to be prompted for stamps when downloading PDFs
    promptStampOnPdf: { type: Boolean, default: false },
    phone: { type: String },
    dateOfJoining: { type: Date },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
    },
    salary: { type: Number },
    sha_id: { type: String },
    kra_pin: { type: String },
    national_id: { type: String },
    nssf_number: { type: String },
    bankDetails: {
      accountName: { type: String },
      accountNumber: { type: String },
      bankName: { type: String },
      bankBranch: { type: String },
    },
    lastLoginAt: { type: Date },
    lastActiveAt: { type: Date },
  },
  { timestamps: true },
)

// Indexes for better query performance
userSchema.index({ org_id: 1 }) // For getAllUsers query
userSchema.index({ org_id: 1, email: 1 }) // Compound index for org_id and email
userSchema.index({ org_id: 1, manager_id: 1 }) // For getTeamMembers query
userSchema.index({ org_id: 1, status: 1 }) // For filtering by status

export const User = mongoose.model<IUser>("User", userSchema)
