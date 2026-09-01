import mongoose, { Schema, Document } from "mongoose";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export interface IAccount extends Document {
  org_id: string;
  code: string; // e.g., 1000, 2000
  name: string; // e.g., Cash, Accounts Receivable
  type: AccountType;
  description?: string;
  isActive: boolean;
  isSystem: boolean; // System accounts cannot be deleted/modified easily
  parentAccountId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const accountSchema = new Schema<IAccount>(
  {
    org_id: { type: String, required: true, index: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ["asset", "liability", "equity", "revenue", "expense"],
    },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    isSystem: { type: Boolean, default: false },
    parentAccountId: { type: Schema.Types.ObjectId, ref: "Account" },
  },
  { timestamps: true }
);

// Ensure account codes are unique per organization
accountSchema.index({ org_id: 1, code: 1 }, { unique: true });
// Ensure account names are unique per organization
accountSchema.index({ org_id: 1, name: 1 }, { unique: true });

export const Account = mongoose.model<IAccount>("Account", accountSchema);
