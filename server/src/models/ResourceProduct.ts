import mongoose, { Schema } from "mongoose";

// Resource Product Schema - for managing company assets and products
const resourceProductSchema = new Schema(
  {
    company_id: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true }, // e.g., Laptop, Chair, Vehicle, License
    quantity_total: { type: Number, required: true, default: 1 },
    quantity_available: { type: Number, required: true, default: 1 },
    purchase_date: { type: Date },
    cost: { type: Number, default: 0 },
    serial_number: { type: String },
    status: {
      type: String,
      enum: ["active", "inactive", "damaged", "retired"],
      default: "active",
    },
    location: { type: String },
    last_maintained: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

resourceProductSchema.index({ company_id: 1, category: 1 });
resourceProductSchema.index({ company_id: 1, status: 1 });

export const ResourceProduct = mongoose.model(
  "ResourceProduct",
  resourceProductSchema
);
