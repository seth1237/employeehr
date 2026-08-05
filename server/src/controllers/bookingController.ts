import type { Response } from "express"
import { ResourceBooking, Resource } from "../models/ResourceBooking"
import type { AuthenticatedRequest } from "../middleware/auth"

export class BookingController {
  // Get all bookings (user's own or all for admins)
  static async getBookings(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { role, userId } = req.user
      const query: any = { org_id: req.org_id }

      // Employees see only their bookings
      if (role === "employee") {
        query.user_id = userId
      }

      const bookings = await ResourceBooking.find(query).sort({ start_date: -1 })

      return res.status(200).json({
        success: true,
        message: "Bookings fetched successfully",
        data: bookings,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch bookings",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get available resources
  static async getResources(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { type } = req.query
      const query: any = { org_id: req.org_id, is_available: true }
      if (type) query.type = type

      const resources = await Resource.find(query).sort({ name: 1 })

      return res.status(200).json({
        success: true,
        message: "Resources fetched successfully",
        data: resources,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch resources",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Create booking
  static async createBooking(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const booking = await ResourceBooking.create({
        org_id: req.org_id,
        user_id: req.user.userId,
        ...req.body,
      })

      return res.status(201).json({
        success: true,
        message: "Booking created successfully",
        data: booking,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create booking",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Update booking status
  static async updateBookingStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { bookingId } = req.params
      const { status } = req.body

      const booking = await ResourceBooking.findOneAndUpdate(
        { _id: bookingId, org_id: req.org_id },
        {
          $set: {
            status,
            ...(status === "approved" && {
              approved_by: req.user.userId,
              approved_at: new Date(),
            }),
          },
        },
        { new: true }
      )

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Booking updated successfully",
        data: booking,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update booking",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Delete booking
  static async deleteBooking(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { bookingId } = req.params
      const query: any = { _id: bookingId, org_id: req.org_id }

      // Employees can only delete their own bookings
      if (req.user.role === "employee") {
        query.user_id = req.user.userId
      }

      const booking = await ResourceBooking.findOneAndDelete(query)

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Booking deleted successfully",
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete booking",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Approve booking
  static async approveBooking(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { bookingId } = req.params

      const booking = await ResourceBooking.findByIdAndUpdate(
        bookingId,
        {
          status: "approved",
          approved_by: req.user.userId,
          approved_at: new Date(),
        },
        { new: true }
      )

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Booking approved successfully",
        data: booking,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to approve booking",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Reject booking
  static async rejectBooking(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { bookingId } = req.params
      const { reason } = req.body

      const booking = await ResourceBooking.findByIdAndUpdate(
        bookingId,
        {
          status: "rejected",
          approved_by: req.user.userId,
          approved_at: new Date(),
          rejection_reason: reason,
        },
        { new: true }
      )

      if (!booking) {
        return res.status(404).json({ success: false, message: "Booking not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Booking rejected successfully",
        data: booking,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to reject booking",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }}