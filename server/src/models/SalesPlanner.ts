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
        location: { type: String },
        notes: { type: String },
        interestCategories: [{ type: String }],
        expenses: {
          transport: { type: Number, default: 0 },
          nightOut: { type: Boolean, default: false },
        },
      },
    ],
    projectedExpenses: { type: Number, default: 0 },
    budget: {
      transport: { type: Number, default: 0 },
      nightOut: { type: Boolean, default: false },
      nightOutAmount: { type: Number, default: 0 },
    },
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
