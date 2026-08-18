import mongoose from "mongoose"

const SalesPlannerSchema = new mongoose.Schema(
  {
    org_id: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    visits: [
      {
        clientName: { type: String, required: true },
        clientId: { type: String }, // Optional, can be derived from existing stock clients
        reason: { type: String, required: true },
        customReason: { type: String },
      }
    ],
    projectedExpenses: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    adminNotes: { type: String },
  },
  { timestamps: true }
)

export const SalesPlanner =
  mongoose.models.SalesPlanner || mongoose.model("SalesPlanner", SalesPlannerSchema)
