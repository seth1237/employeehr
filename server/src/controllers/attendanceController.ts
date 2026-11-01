import type { Response } from "express"
import { Attendance } from "../models/Attendance"
import { Company } from "../models/Company"
import type { AuthenticatedRequest } from "../middleware/auth"

const ATTENDANCE_STATUSES = new Set(["present", "absent", "late", "half_day", "leave"])

async function lateThresholdForOrg(orgId: string, now: Date) {
  const company = await Company.findById(orgId).select("attendanceSettings").lean()
  const hour = Number(company?.attendanceSettings?.lateHour ?? 9)
  const minute = Number(company?.attendanceSettings?.lateMinute ?? 15)
  const threshold = new Date(now)
  threshold.setHours(Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 15, 0, 0)
  return {
    threshold,
    requireGps: Boolean(company?.attendanceSettings?.requireGps),
  }
}

function getDayRange(referenceDate = new Date()) {
  const start = new Date(referenceDate)
  start.setHours(0, 0, 0, 0)

  const end = new Date(referenceDate)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

function formatTime(value?: Date | string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function mapAttendanceRecord(record: any) {
  return {
    ...record,
    checkIn: formatTime(record.checkIn),
    checkOut: formatTime(record.checkOut),
    hours: Number(record.hoursWorked || 0),
  }
}

export class AttendanceController {
  static async getMyAttendance(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user?.userId) {
        return res.status(400).json({ success: false, message: "Organization ID and user ID required" })
      }

      const records = await Attendance.find({
        org_id: req.org_id,
        user_id: String(req.user.userId),
      })
        .sort({ date: -1 })
        .limit(120)
        .lean()

      return res.status(200).json({
        success: true,
        message: "My attendance fetched successfully",
        data: records.map(mapAttendanceRecord),
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch attendance records",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async checkIn(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user?.userId) {
        return res.status(400).json({ success: false, message: "Organization ID and user ID required" })
      }

      const now = new Date()
      const { start, end } = getDayRange(now)

      const existing = await Attendance.findOne({
        org_id: req.org_id,
        user_id: String(req.user.userId),
        date: { $gte: start, $lte: end },
      })

      if (existing?.checkIn) {
        return res.status(400).json({ success: false, message: "Already checked in for today" })
      }

      const { threshold, requireGps } = await lateThresholdForOrg(req.org_id, now)
      if (requireGps && (req.body?.latitude == null || req.body?.longitude == null)) {
        return res.status(400).json({ success: false, message: "This company requires GPS on check-in" })
      }
      const status = now.getTime() > threshold.getTime() ? "late" : "present"

      const record = existing || new Attendance({
        org_id: req.org_id,
        user_id: String(req.user.userId),
        date: start,
      })

      record.status = status
      record.checkIn = now

      await record.save()

      return res.status(200).json({
        success: true,
        message: "Check-in successful",
        data: mapAttendanceRecord(record.toObject()),
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to check in",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async checkOut(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user?.userId) {
        return res.status(400).json({ success: false, message: "Organization ID and user ID required" })
      }

      const now = new Date()
      const { start, end } = getDayRange(now)

      const record = await Attendance.findOne({
        org_id: req.org_id,
        user_id: String(req.user.userId),
        date: { $gte: start, $lte: end },
      })

      if (!record || !record.checkIn) {
        return res.status(400).json({ success: false, message: "Check in first before checking out" })
      }

      if (record.checkOut) {
        return res.status(400).json({ success: false, message: "Already checked out for today" })
      }

      record.checkOut = now
      const workedMs = now.getTime() - new Date(record.checkIn).getTime()
      const workedHours = Math.max(0, workedMs / (1000 * 60 * 60))
      record.hoursWorked = Number(workedHours.toFixed(2))
      await record.save()

      return res.status(200).json({
        success: true,
        message: "Check-out successful",
        data: mapAttendanceRecord(record.toObject()),
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to check out",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getAllAttendance(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { startDate, endDate } = req.query
      const query: any = { org_id: req.org_id }

      if (startDate || endDate) {
        query.date = {}
        if (startDate) query.date.$gte = new Date(startDate as string)
        if (endDate) query.date.$lte = new Date(endDate as string)
      }

      const records = await Attendance.find(query).sort({ date: -1 }).lean()

      res.status(200).json({
        success: true,
        message: "Attendance records fetched successfully",
        data: records.map(mapAttendanceRecord),
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch attendance records",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async markAttendance(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { user_id, date, status, hoursWorked, remarks, checkIn } = req.body
      if (!user_id || !date) {
        return res.status(400).json({ success: false, message: "user_id and date are required" })
      }
      if (status && !ATTENDANCE_STATUSES.has(String(status))) {
        return res.status(400).json({ success: false, message: "Invalid attendance status" })
      }
      if (status && status !== "absent" && status !== "leave" && !checkIn) {
        return res.status(400).json({ success: false, message: "checkIn is required when marking a working status" })
      }
      const hours = hoursWorked === undefined || hoursWorked === null || hoursWorked === "" ? undefined : Number(hoursWorked)
      if (hours !== undefined && (!Number.isFinite(hours) || hours < 0 || hours > 24)) {
        return res.status(400).json({ success: false, message: "hoursWorked must be between 0 and 24" })
      }

      const attendance = new Attendance({
        org_id: req.org_id,
        user_id,
        date: new Date(date),
        status,
        checkIn: checkIn ? new Date(checkIn) : undefined,
        hoursWorked: hours,
        remarks: remarks ? String(remarks).slice(0, 500) : undefined,
      })

      const savedAttendance = await attendance.save()

      res.status(201).json({
        success: true,
        message: "Attendance marked successfully",
        data: savedAttendance,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to mark attendance",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getAttendanceRecords(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { userId } = req.params
      const { startDate, endDate } = req.query

      const query: any = {
        org_id: req.org_id,
        user_id: userId,
      }

      if (startDate || endDate) {
        query.date = {}
        if (startDate) query.date.$gte = new Date(startDate as string)
        if (endDate) query.date.$lte = new Date(endDate as string)
      }

      const records = await Attendance.find(query).sort({ date: -1 }).lean()

      res.status(200).json({
        success: true,
        message: "Attendance records fetched successfully",
        data: records.map(mapAttendanceRecord),
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch attendance records",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
