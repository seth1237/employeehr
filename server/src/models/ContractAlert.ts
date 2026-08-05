import mongoose, { Schema } from "mongoose"

// Contract Alert Schema
const contractAlertSchema = new Schema(
  {
    org_id: { type: String, required: true },
    user_id: { type: String, required: true },
    contract_type: {
      type: String,
      enum: ["employment", "probation", "project", "equipment", "lease", "other"],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    alert_days_before: { type: Number, default: 30 }, // Days before expiry to alert
    status: {
      type: String,
      enum: ["active", "expiring_soon", "expired", "renewed", "cancelled"],
      default: "active",
    },
    is_acknowledged: { type: Boolean, default: false },
    acknowledged_at: { type: Date },
    renewal_status: {
      type: String,
      enum: ["not_applicable", "pending", "approved", "rejected"],
      default: "not_applicable",
    },
    notes: { type: String },
    attachment_url: { type: String },
  },
  { timestamps: true }
)

contractAlertSchema.index({ org_id: 1, user_id: 1 })
contractAlertSchema.index({ org_id: 1, end_date: 1 })
contractAlertSchema.index({ org_id: 1, status: 1 })

export const ContractAlert = mongoose.model("ContractAlert", contractAlertSchema)
