import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Vehicle } from "../models/Vehicle"
import { VehicleTrip } from "../models/VehicleTrip"
import { VehicleAlert } from "../models/VehicleAlert"
import { User } from "../models/User"

const OVERSPEED_THRESHOLD_KMH = Number(process.env.FLEET_OVERSPEED_KMH || 100)

function deriveStatus(speedKmh?: number, ignition?: string): "idle" | "moving" | "parked" | "offline" {
  const speed = Number(speedKmh || 0)
  if (speed > 5) return "moving"
  if (ignition === "on") return "idle"
  if (ignition === "off") return "parked"
  return "idle"
}

export class VehicleController {
  static async getVehicles(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { status, active, search } = req.query
      const query: Record<string, unknown> = { org_id: req.org_id }

      if (status) query.status = String(status)
      if (active === "true") query.isActive = true
      if (active === "false") query.isActive = false
      if (search) {
        const term = String(search).trim()
        query.$or = [
          { registrationNumber: { $regex: term, $options: "i" } },
          { trackerImei: { $regex: term, $options: "i" } },
          { trackerSimNumber: { $regex: term, $options: "i" } },
          { assignedDriverName: { $regex: term, $options: "i" } },
          { make: { $regex: term, $options: "i" } },
          { vehicleModel: { $regex: term, $options: "i" } },
        ]
      }

      const vehicles = await Vehicle.find(query).sort({ updatedAt: -1 }).lean()
      return res.status(200).json({ success: true, data: vehicles })
    } catch (error) {
      console.error("Get vehicles error:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch vehicles",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getFleetStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const org_id = req.org_id
      const [total, moving, idle, offline, maintenance, unacknowledgedAlerts] = await Promise.all([
        Vehicle.countDocuments({ org_id, isActive: true }),
        Vehicle.countDocuments({ org_id, isActive: true, status: "moving" }),
        Vehicle.countDocuments({ org_id, isActive: true, status: "idle" }),
        Vehicle.countDocuments({ org_id, isActive: true, status: "offline" }),
        Vehicle.countDocuments({ org_id, isActive: true, status: "maintenance" }),
        VehicleAlert.countDocuments({ org_id, acknowledged: false }),
      ])

      return res.status(200).json({
        success: true,
        data: { total, moving, idle, offline, maintenance, unacknowledgedAlerts },
      })
    } catch (error) {
      console.error("Fleet stats error:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch fleet stats",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getVehicle(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const vehicle = await Vehicle.findOne({ _id: req.params.vehicleId, org_id: req.org_id }).lean()
      if (!vehicle) {
        return res.status(404).json({ success: false, message: "Vehicle not found" })
      }

      const [trips, alerts] = await Promise.all([
        VehicleTrip.find({ org_id: req.org_id, vehicleId: String(vehicle._id) })
          .sort({ startedAt: -1 })
          .limit(20)
          .lean(),
        VehicleAlert.find({ org_id: req.org_id, vehicleId: String(vehicle._id) })
          .sort({ createdAt: -1 })
          .limit(30)
          .lean(),
      ])

      return res.status(200).json({ success: true, data: { ...vehicle, trips, alerts } })
    } catch (error) {
      console.error("Get vehicle error:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch vehicle",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async createVehicle(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const {
        registrationNumber,
        make,
        vehicleModel,
        year,
        color,
        vin,
        trackerImei,
        trackerSimNumber,
        trackerProvider,
        assignedDriverId,
        odometerKm,
        insuranceExpiry,
        nextServiceDue,
        notes,
        status,
      } = req.body

      if (!registrationNumber || !String(registrationNumber).trim()) {
        return res.status(400).json({
          success: false,
          message: "Registration number is required",
        })
      }

      let assignedDriverName: string | undefined
      if (assignedDriverId) {
        const driver = await User.findOne({
          _id: String(assignedDriverId),
          org_id: req.org_id,
        })
          .select("firstName lastName")
          .lean()
        if (!driver) {
          return res.status(404).json({ success: false, message: "Assigned driver not found" })
        }
        assignedDriverName = `${driver.firstName || ""} ${driver.lastName || ""}`.trim()
      }

      const vehicle = await Vehicle.create({
        org_id: req.org_id,
        registrationNumber: String(registrationNumber).trim().toUpperCase(),
        make,
        vehicleModel: vehicleModel || req.body.model,
        year: year ? Number(year) : undefined,
        color,
        vin: vin ? String(vin).trim().toUpperCase() : undefined,
        trackerImei: trackerImei ? String(trackerImei).trim() : undefined,
        trackerSimNumber: trackerSimNumber ? String(trackerSimNumber).trim() : undefined,
        trackerProvider,
        assignedDriverId: assignedDriverId || undefined,
        assignedDriverName,
        odometerKm: odometerKm != null ? Number(odometerKm) : 0,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : undefined,
        nextServiceDue: nextServiceDue ? new Date(nextServiceDue) : undefined,
        notes,
        status: status || "offline",
        ignition: "unknown",
        isActive: true,
      })

      return res.status(201).json({ success: true, data: vehicle })
    } catch (error: unknown) {
      if ((error as { code?: number })?.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A vehicle with this registration number or IMEI already exists",
        })
      }
      console.error("Create vehicle error:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to create vehicle",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async updateVehicle(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const vehicle = await Vehicle.findOne({ _id: req.params.vehicleId, org_id: req.org_id })
      if (!vehicle) {
        return res.status(404).json({ success: false, message: "Vehicle not found" })
      }

      const body = req.body || {}
      const fields = [
        "make",
        "vehicleModel",
        "year",
        "color",
        "vin",
        "trackerImei",
        "trackerSimNumber",
        "trackerProvider",
        "odometerKm",
        "fuelLevelPercent",
        "notes",
        "status",
        "isActive",
      ] as const

      for (const field of fields) {
        if (body[field] !== undefined) {
          ;(vehicle as any)[field] = body[field]
        }
      }
      if (body.model !== undefined && body.vehicleModel === undefined) {
        vehicle.vehicleModel = body.model
      }

      if (body.registrationNumber) {
        vehicle.registrationNumber = String(body.registrationNumber).trim().toUpperCase()
      }
      if (body.insuranceExpiry !== undefined) {
        vehicle.insuranceExpiry = body.insuranceExpiry ? new Date(body.insuranceExpiry) : undefined
      }
      if (body.nextServiceDue !== undefined) {
        vehicle.nextServiceDue = body.nextServiceDue ? new Date(body.nextServiceDue) : undefined
      }

      if (body.assignedDriverId !== undefined) {
        if (!body.assignedDriverId) {
          vehicle.assignedDriverId = undefined
          vehicle.assignedDriverName = undefined
        } else {
          const driver = await User.findOne({
            _id: String(body.assignedDriverId),
            org_id: req.org_id,
          })
            .select("firstName lastName")
            .lean()
          if (!driver) {
            return res.status(404).json({ success: false, message: "Assigned driver not found" })
          }
          vehicle.assignedDriverId = String(body.assignedDriverId)
          vehicle.assignedDriverName = `${driver.firstName || ""} ${driver.lastName || ""}`.trim()
        }
      }

      await vehicle.save()
      return res.status(200).json({ success: true, data: vehicle })
    } catch (error: unknown) {
      if ((error as { code?: number })?.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A vehicle with this registration number or IMEI already exists",
        })
      }
      console.error("Update vehicle error:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to update vehicle",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async deleteVehicle(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const vehicle = await Vehicle.findOne({ _id: req.params.vehicleId, org_id: req.org_id })
      if (!vehicle) {
        return res.status(404).json({ success: false, message: "Vehicle not found" })
      }

      vehicle.isActive = false
      vehicle.status = "offline"
      await vehicle.save()

      return res.status(200).json({ success: true, message: "Vehicle deactivated" })
    } catch (error) {
      console.error("Delete vehicle error:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to deactivate vehicle",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async updateLocation(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const vehicle = await Vehicle.findOne({ _id: req.params.vehicleId, org_id: req.org_id })
      if (!vehicle) {
        return res.status(404).json({ success: false, message: "Vehicle not found" })
      }

      const result = await VehicleController.applyTelemetry(vehicle, req.body)
      return res.status(200).json({ success: true, data: result })
    } catch (error) {
      console.error("Update location error:", error)
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to update location",
      })
    }
  }

  /**
   * Device/manufacturer webhook: identify vehicle by IMEI.
   * Optional shared secret via FLEET_INGEST_TOKEN header x-fleet-token / query token.
   */
  static async ingestTelemetry(req: AuthenticatedRequest, res: Response) {
    try {
      const expected = String(process.env.FLEET_INGEST_TOKEN || "").trim()
      if (expected) {
        const provided = String(
          req.headers["x-fleet-token"] || req.query.token || req.body?.token || "",
        ).trim()
        if (provided !== expected) {
          return res.status(403).json({ success: false, message: "Invalid ingest token" })
        }
      }

      const imei = String(req.body?.imei || req.body?.trackerImei || "").trim()
      if (!imei) {
        return res.status(400).json({ success: false, message: "IMEI is required" })
      }

      const vehicle = await Vehicle.findOne({ trackerImei: imei, isActive: true })
      if (!vehicle) {
        return res.status(404).json({ success: false, message: "No vehicle registered for this IMEI" })
      }

      const result = await VehicleController.applyTelemetry(vehicle, req.body)
      return res.status(200).json({ success: true, data: result })
    } catch (error) {
      console.error("Ingest telemetry error:", error)
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Failed to ingest telemetry",
      })
    }
  }

  static async getAlerts(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const query: Record<string, unknown> = { org_id: req.org_id }
      if (req.query.acknowledged === "false") query.acknowledged = false
      if (req.query.acknowledged === "true") query.acknowledged = true
      if (req.query.vehicleId) query.vehicleId = String(req.query.vehicleId)

      const alerts = await VehicleAlert.find(query).sort({ createdAt: -1 }).limit(100).lean()
      return res.status(200).json({ success: true, data: alerts })
    } catch (error) {
      console.error("Get alerts error:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to fetch alerts",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async acknowledgeAlert(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user?.userId) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const alert = await VehicleAlert.findOne({
        _id: req.params.alertId,
        org_id: req.org_id,
      })
      if (!alert) {
        return res.status(404).json({ success: false, message: "Alert not found" })
      }

      alert.acknowledged = true
      alert.acknowledgedAt = new Date()
      alert.acknowledgedBy = req.user.userId
      await alert.save()

      return res.status(200).json({ success: true, data: alert })
    } catch (error) {
      console.error("Acknowledge alert error:", error)
      return res.status(500).json({
        success: false,
        message: "Failed to acknowledge alert",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  private static async applyTelemetry(vehicle: InstanceType<typeof Vehicle>, body: any) {
    const latitude = Number(body.latitude ?? body.lat)
    const longitude = Number(body.longitude ?? body.lng ?? body.lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Valid latitude and longitude are required")
    }

    const speedKmh = Number(body.speedKmh ?? body.speed ?? 0)
    const ignitionRaw = String(body.ignition || "").toLowerCase()
    const ignition =
      ignitionRaw === "on" || ignitionRaw === "1" || ignitionRaw === "true"
        ? "on"
        : ignitionRaw === "off" || ignitionRaw === "0" || ignitionRaw === "false"
          ? "off"
          : vehicle.ignition || "unknown"

    const recordedAt = body.recordedAt ? new Date(body.recordedAt) : new Date()
    const previousStatus = vehicle.status

    vehicle.currentLocation = {
      latitude,
      longitude,
      address: body.address ? String(body.address) : vehicle.currentLocation?.address,
      speedKmh: Number.isFinite(speedKmh) ? speedKmh : 0,
      heading: body.heading != null ? Number(body.heading) : undefined,
      altitude: body.altitude != null ? Number(body.altitude) : undefined,
      recordedAt,
    }
    vehicle.ignition = ignition
    vehicle.status = body.status || deriveStatus(speedKmh, ignition)
    vehicle.lastSeenAt = recordedAt

    if (body.odometerKm != null && Number.isFinite(Number(body.odometerKm))) {
      vehicle.odometerKm = Number(body.odometerKm)
    }
    if (body.fuelLevelPercent != null && Number.isFinite(Number(body.fuelLevelPercent))) {
      vehicle.fuelLevelPercent = Number(body.fuelLevelPercent)
    }
    if (body.batteryVoltage != null && Number.isFinite(Number(body.batteryVoltage))) {
      vehicle.batteryVoltage = Number(body.batteryVoltage)
    }

    await vehicle.save()

    // Trip tracking: start when moving, complete when stopped after moving
    if (vehicle.status === "moving" && previousStatus !== "moving") {
      await VehicleTrip.create({
        org_id: vehicle.org_id,
        vehicleId: String(vehicle._id),
        driverId: vehicle.assignedDriverId,
        driverName: vehicle.assignedDriverName,
        startedAt: recordedAt,
        startLocation: {
          latitude,
          longitude,
          speedKmh,
          recordedAt,
        },
        status: "in_progress",
        maxSpeedKmh: speedKmh,
      })
    } else if (vehicle.status !== "moving" && previousStatus === "moving") {
      const openTrip = await VehicleTrip.findOne({
        org_id: vehicle.org_id,
        vehicleId: String(vehicle._id),
        status: "in_progress",
      }).sort({ startedAt: -1 })

      if (openTrip) {
        openTrip.endedAt = recordedAt
        openTrip.endLocation = { latitude, longitude, speedKmh, recordedAt }
        openTrip.status = "completed"
        openTrip.maxSpeedKmh = Math.max(Number(openTrip.maxSpeedKmh || 0), speedKmh || 0)
        await openTrip.save()
      }
    } else if (vehicle.status === "moving") {
      const openTrip = await VehicleTrip.findOne({
        org_id: vehicle.org_id,
        vehicleId: String(vehicle._id),
        status: "in_progress",
      }).sort({ startedAt: -1 })
      if (openTrip) {
        openTrip.maxSpeedKmh = Math.max(Number(openTrip.maxSpeedKmh || 0), speedKmh || 0)
        await openTrip.save()
      }
    }

    if (Number.isFinite(speedKmh) && speedKmh >= OVERSPEED_THRESHOLD_KMH) {
      await VehicleAlert.create({
        org_id: vehicle.org_id,
        vehicleId: String(vehicle._id),
        type: "overspeed",
        title: "Overspeed detected",
        message: `${vehicle.registrationNumber} recorded ${speedKmh.toFixed(0)} km/h`,
        severity: "warning",
        latitude,
        longitude,
        speedKmh,
        acknowledged: false,
      })
    }

    if (String(body.sos || "").toLowerCase() === "true" || body.sos === 1 || body.sos === true) {
      await VehicleAlert.create({
        org_id: vehicle.org_id,
        vehicleId: String(vehicle._id),
        type: "sos",
        title: "SOS alert",
        message: `SOS triggered for ${vehicle.registrationNumber}`,
        severity: "critical",
        latitude,
        longitude,
        speedKmh,
        acknowledged: false,
      })
    }

    return vehicle
  }
}
