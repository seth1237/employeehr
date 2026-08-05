import mongoose, { Schema, type Document } from "mongoose"

export type VehicleStatus = "idle" | "moving" | "offline" | "maintenance" | "parked"
export type IgnitionStatus = "on" | "off" | "unknown"

export interface IVehicleLocation {
  latitude: number
  longitude: number
  address?: string
  speedKmh?: number
  heading?: number
  altitude?: number
  recordedAt: Date
}

export interface IVehicle extends Document {
  org_id: string
  registrationNumber: string
  make?: string
  vehicleModel?: string
  year?: number
  color?: string
  vin?: string
  trackerImei?: string
  trackerSimNumber?: string
  trackerProvider?: string
  assignedDriverId?: string
  assignedDriverName?: string
  status: VehicleStatus
  ignition: IgnitionStatus
  currentLocation?: IVehicleLocation
  odometerKm?: number
  fuelLevelPercent?: number
  batteryVoltage?: number
  lastSeenAt?: Date
  insuranceExpiry?: Date
  nextServiceDue?: Date
  notes?: string
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

const locationSchema = new Schema<IVehicleLocation>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String, trim: true },
    speedKmh: { type: Number },
    heading: { type: Number },
    altitude: { type: Number },
    recordedAt: { type: Date, required: true },
  },
  { _id: false },
)

const vehicleSchema = new Schema<IVehicle>(
  {
    org_id: { type: String, required: true, index: true },
    registrationNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    make: { type: String, trim: true },
    vehicleModel: { type: String, trim: true },
    year: { type: Number },
    color: { type: String, trim: true },
    vin: { type: String, trim: true, uppercase: true },
    trackerImei: { type: String, trim: true, index: true },
    trackerSimNumber: { type: String, trim: true },
    trackerProvider: { type: String, trim: true },
    assignedDriverId: { type: String, default: null, index: true },
    assignedDriverName: { type: String, trim: true },
    status: {
      type: String,
      enum: ["idle", "moving", "offline", "maintenance", "parked"],
      default: "offline",
      index: true,
    },
    ignition: {
      type: String,
      enum: ["on", "off", "unknown"],
      default: "unknown",
    },
    currentLocation: { type: locationSchema },
    odometerKm: { type: Number, default: 0 },
    fuelLevelPercent: { type: Number },
    batteryVoltage: { type: Number },
    lastSeenAt: { type: Date },
    insuranceExpiry: { type: Date },
    nextServiceDue: { type: Date },
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
)

vehicleSchema.index({ org_id: 1, registrationNumber: 1 }, { unique: true })
vehicleSchema.index({ org_id: 1, trackerImei: 1 }, { unique: true, sparse: true })
vehicleSchema.index({ org_id: 1, isActive: 1, status: 1 })

export const Vehicle = mongoose.model<IVehicle>("Vehicle", vehicleSchema)
