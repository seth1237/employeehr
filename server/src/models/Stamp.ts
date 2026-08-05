import mongoose, { Schema, Document } from "mongoose";

export interface IStamp extends Document {
  org_id: string;
  name: string;
  description?: string;
  template?: "standard" | "sample-classic" | "uploaded-svg";
  svgTemplate?: string;
  shape: "circle" | "rectangle" | "badge";
  text: string;
  fields: {
    date: boolean;
    user: boolean;
    stampId: boolean;
    poBox: boolean;
    email: boolean;
  };
  style: {
    color: string;
    opacity: number;
    rotation: number;
    fontSize?: number;
    wordPadding?: number;
  };
  isDefault?: boolean;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const StampSchema: Schema = new Schema(
  {
    org_id: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    template: {
      type: String,
      enum: ["standard", "sample-classic", "uploaded-svg"],
      default: "standard",
    },
    svgTemplate: {
      type: String,
      default: "",
    },
    shape: {
      type: String,
      enum: ["circle", "rectangle", "badge"],
      default: "circle",
    },
    text: {
      type: String,
      required: true,
      maxlength: 50,
    },
    fields: {
      date: { type: Boolean, default: true },
      user: { type: Boolean, default: true },
      stampId: { type: Boolean, default: false },
      poBox: { type: Boolean, default: false },
      email: { type: Boolean, default: false },
    },
    style: {
      color: {
        type: String,
        default: "#8B0000",
        match: /^#[0-9A-F]{6}$/i,
      },
      opacity: {
        type: Number,
        default: 0.2,
        min: 0,
        max: 1,
      },
      rotation: {
        type: Number,
        default: 12,
        min: 0,
        max: 20,
      },
      fontSize: {
        type: Number,
        default: 18,
        min: 8,
        max: 48,
      },
      wordPadding: {
        type: Number,
        default: 0,
        min: 0,
        max: 20,
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index for fast queries
StampSchema.index({ org_id: 1, name: 1 });
StampSchema.index({ org_id: 1, isDefault: 1 });

const Stamp = mongoose.model<IStamp>("Stamp", StampSchema);

export default Stamp;
