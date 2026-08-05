import mongoose, { Schema, type Document } from "mongoose"

export interface ITripPoint {
  latitude: number
  longitude: number
  speedKmh?: number
  recordedAt: Date
}

export interface IVehicleTrip extends Document {
  org_id: string
  vehicleId: string
  driverId?: string
  driverName?: string
  startedAt: Date
  endedAt?: Date
  startLocation?: ITripPoint
  endLocation?: ITripPoint
  distanceKm?: number
  maxSpeedKmh?: number
  idleMinutes?: number
  status: "in_progress" | "completed"
  createdAt?: Date
  updatedAt?: Date
}

const tripPointSchema = new Schema<ITripPoint>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speedKmh: { type: Number },
    recordedAt: { type: Date, required: true },
  },
  { _id: false },
)

const vehicleTripSchema = new Schema<IVehicleTrip>(
  {
    org_id: { type: String, required: true, index: true },
    vehicleId: { type: String, required: true, index: true },
    driverId: { type: String },
    driverName: { type: String, trim: true },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    startLocation: { type: tripPointSchema },
    endLocation: { type: tripPointSchema },
    distanceKm: { type: Number, default: 0 },
    maxSpeedKmh: { type: Number, default: 0 },
    idleMinutes: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
      index: true,
    },
  },
  { timestamps: true },
)

vehicleTripSchema.index({ org_id: 1, vehicleId: 1, startedAt: -1 })

export const VehicleTrip = mongoose.model<IVehicleTrip>("VehicleTrip", vehicleTripSchema)
