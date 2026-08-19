import mongoose from "mongoose"

const SalesPlannerSchema = new mongoose.Schema(
  {
    org_id: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true },
    visits: [
      {
        clientName: { type: String, required: true },
        clientId: { type: String },
        reason: { type: String, required: true },
        customReason: { type: String },
        expectedOutcome: { type: String },
        plannedTime: { type: String },
        priority: { type: String, enum: ["low", "medium", "high", "critical"], default: "medium" },
        location: { type: String },
        notes: { type: String },
        followUpDate: { type: String },
        interestCategories: [{ type: String }],
        expenses: {
          transport: { type: Number, default: 0 },
          accommodation: { type: Number, default: 0 },
          meals: { type: Number, default: 0 },
          other: { type: Number, default: 0 },
        },
      },
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
