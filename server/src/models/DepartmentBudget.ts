import mongoose, { Schema, Document } from "mongoose"

export interface IDepartmentBudget extends Document {
  org_id: string
  department: string // e.g. "Pharmacy", "IT", "HR"
  costCenter: string // e.g. "CC-1001"
  accountId?: string // Link to GL expense account
  financialYear: string // e.g. "2026/2027"
  startDate: Date
  endDate: Date
  totalAllocated: number
  totalCommitted: number // Amount in active PRs/POs (reserved)
  totalSpent: number // Amount actually paid/invoiced
  balance: number // totalAllocated - totalCommitted - totalSpent
  status: "draft" | "active" | "exhausted" | "closed"
  alerts: {
    warningThresholdPercent: number // e.g. 80 means alert when 80% is used
    alertSent: boolean
  }
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}

const departmentBudgetSchema = new Schema<IDepartmentBudget>(
  {
    org_id: { type: String, required: true },
    department: { type: String, required: true },
    costCenter: { type: String, required: true },
    accountId: { type: String },
    financialYear: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    totalAllocated: { type: Number, required: true, min: 0 },
    totalCommitted: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    balance: { type: Number, required: true },
    status: {
      type: String,
      enum: ["draft", "active", "exhausted", "closed"],
      default: "draft",
    },
    alerts: {
      warningThresholdPercent: { type: Number, default: 80, min: 1, max: 100 },
      alertSent: { type: Boolean, default: false }
    },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
)

// Ensure uniqueness per department per financial year
departmentBudgetSchema.index({ org_id: 1, department: 1, financialYear: 1 }, { unique: true })

// Pre-save hook to calculate balance automatically
departmentBudgetSchema.pre("validate", function(next) {
  if (this.totalAllocated !== undefined && this.totalCommitted !== undefined && this.totalSpent !== undefined) {
    this.balance = this.totalAllocated - (this.totalCommitted + this.totalSpent);
    if (this.balance <= 0 && this.status === "active") {
      this.status = "exhausted";
    }
  }
  next();
});

export const DepartmentBudget = mongoose.models.DepartmentBudget || mongoose.model<IDepartmentBudget>("DepartmentBudget", departmentBudgetSchema)
