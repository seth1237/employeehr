import mongoose, { Schema, Document } from "mongoose";

export interface IJournalLine {
  accountId: mongoose.Types.ObjectId;
  description?: string;
  debit: number;
  credit: number;
}

export type JournalType =
  | "sales"
  | "purchases"
  | "inventory"
  | "miscellaneous"
  | "carry-forward"
  | "closing";

export type JournalNature = "manual" | "automatic" | "template" | "recurring" | "reversing";

export interface IJournalEntry extends Document {
  org_id: string;
  entryNumber: string;
  date: Date;
  reference?: string;
  description: string;
  lines: IJournalLine[];
  status: "draft" | "posted" | "voided";
  source: "manual" | "invoice" | "payment" | "expense" | "payroll" | "system" | "depreciation" | "inventory" | "asset";
  journalType: JournalType;
  nature: JournalNature;
  currency: string;
  exchangeRate: number;
  reversedFrom?: string;
  reversedBy?: string;
  isTemplate?: boolean;
  recurring?: {
    interval: "weekly" | "monthly" | "yearly";
    nextRunAt?: Date;
    endDate?: Date;
    enabled?: boolean;
  };
  createdBy: string;
  postedBy?: string;
  postedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const journalLineSchema = new Schema<IJournalLine>({
  accountId: { type: Schema.Types.ObjectId, ref: "Account", required: true },
  description: { type: String },
  debit: { type: Number, default: 0, min: 0 },
  credit: { type: Number, default: 0, min: 0 },
});

const journalEntrySchema = new Schema<IJournalEntry>(
  {
    org_id: { type: String, required: true, index: true },
    entryNumber: { type: String, required: true },
    date: { type: Date, required: true },
    reference: { type: String },
    description: { type: String, required: true },
    lines: { type: [journalLineSchema], required: true },
    status: {
      type: String,
      enum: ["draft", "posted", "voided"],
      default: "draft",
    },
    source: {
      type: String,
      enum: ["manual", "invoice", "payment", "expense", "payroll", "system", "depreciation", "inventory", "asset"],
      default: "manual",
    },
    journalType: {
      type: String,
      enum: ["sales", "purchases", "inventory", "miscellaneous", "carry-forward", "closing"],
      default: "miscellaneous",
    },
    nature: {
      type: String,
      enum: ["manual", "automatic", "template", "recurring", "reversing"],
      default: "manual",
    },
    currency: { type: String, default: "KES" },
    exchangeRate: { type: Number, default: 1 },
    reversedFrom: { type: String },
    reversedBy: { type: String },
    isTemplate: { type: Boolean, default: false },
    recurring: {
      interval: { type: String, enum: ["weekly", "monthly", "yearly"] },
      nextRunAt: { type: Date },
      endDate: { type: Date },
      enabled: { type: Boolean, default: false },
    },
    createdBy: { type: String, required: true },
    postedBy: { type: String },
    postedAt: { type: Date },
  },
  { timestamps: true }
);

// Ensure entry numbers are unique per organization
journalEntrySchema.index({ org_id: 1, entryNumber: 1 }, { unique: true });
// Index for fast date filtering
journalEntrySchema.index({ org_id: 1, date: -1 });
// Index for finding entries by account
journalEntrySchema.index({ "lines.accountId": 1 });

export const JournalEntry = mongoose.model<IJournalEntry>(
  "JournalEntry",
  journalEntrySchema
);
