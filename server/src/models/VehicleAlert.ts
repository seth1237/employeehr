import mongoose, { Schema, type Document } from "mongoose"

export type VehicleAlertType =
  | "overspeed"
  | "geofence"
  | "ignition"
  | "sos"
  | "low_battery"
  | "offline"
  | "maintenance"
  | "insurance"

export interface IVehicleAlert extends Document {
  org_id: string
  vehicleId: string
  type: VehicleAlertType
  title: string
  message: string
  severity: "info" | "warning" | "critical"
  latitude?: number
  longitude?: number
  speedKmh?: number
  acknowledged: boolean
  acknowledgedAt?: Date
  acknowledgedBy?: string
  createdAt?: Date
  updatedAt?: Date
}

const vehicleAlertSchema = new Schema<IVehicleAlert>(
  {
    org_id: { type: String, required: true, index: true },
    vehicleId: { type: String, required: true, index: true },
    type: {
      type: String,
      enum: [
        "overspeed",
        "geofence",
        "ignition",
        "sos",
        "low_battery",
        "offline",
        "maintenance",
        "insurance",
      ],
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "warning",
    },
    latitude: { type: Number },
    longitude: { type: Number },
    speedKmh: { type: Number },
    acknowledged: { type: Boolean, default: false, index: true },
    acknowledgedAt: { type: Date },
    acknowledgedBy: { type: String },
  },
  { timestamps: true },
)

vehicleAlertSchema.index({ org_id: 1, acknowledged: 1, createdAt: -1 })

export const VehicleAlert = mongoose.model<IVehicleAlert>("VehicleAlert", vehicleAlertSchema)
