import type { Response } from "express"
import mongoose from "mongoose"
import { ClientComplaint } from "../models/ClientComplaint"
import { StockClient } from "../models/StockClient"
import { User } from "../models/User"
import type { AuthenticatedRequest } from "../middleware/auth"

export class ComplaintController {
  // Generate unique complaint ID
  private static async generateComplaintId(org_id: string): Promise<string> {
    const year = new Date().getFullYear()
    const count = await ClientComplaint.countDocuments({ org_id })
    return `COMP-${year}-${String(count + 1).padStart(4, "0")}`
  }

  // Get all complaints with filters
  static async getComplaints(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { status, priority, clientId, assignedTo, search } = req.query
      const query: any = { org_id: req.org_id }

      if (status) query.status = status
      if (priority) query.priority = priority
      if (clientId) query.clientId = clientId
      if (assignedTo) query.assignedTo = assignedTo

      if (search) {
        query.$or = [
          { complaintId: { $regex: search, $options: "i" } },
          { title: { $regex: search, $options: "i" } },
          { clientName: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ]
      }

      const complaints = await ClientComplaint.find(query)
        .sort({ createdAt: -1 })
        .lean()

      return res.status(200).json({
        success: true,
        message: "Complaints fetched successfully",
        data: complaints,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch complaints",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get single complaint
  static async getComplaint(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { complaintId } = req.params

      const complaint = await ClientComplaint.findOne({
        _id: complaintId,
        org_id: req.org_id,
      })

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Complaint fetched successfully",
        data: complaint,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch complaint",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Create new complaint
  static async createComplaint(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const {
        clientId,
        clientKey,
        clientName,
        clientNumber,
        clientLocation,
        title,
        description,
        complaintCategory,
        priority = "medium",
        attachments = [],
      } = req.body

      const normalizedName = String(clientName || "").trim()
      const normalizedNumber = String(clientNumber || "").trim()
      const normalizedLocation = String(clientLocation || "").trim()

      let client = null as any

      if (clientId && mongoose.Types.ObjectId.isValid(clientId)) {
        client = await StockClient.findOne({
          _id: clientId,
          org_id: req.org_id,
        })
      }

      if (!client && normalizedName && normalizedNumber && normalizedLocation) {
        client = await StockClient.findOne({
          org_id: req.org_id,
          sourceName: normalizedName,
          sourceNumber: normalizedNumber,
          sourceLocation: normalizedLocation,
        })
      }

      if (!normalizedName || !normalizedNumber || !normalizedLocation) {
        return res.status(400).json({ success: false, message: "Client details are required" })
      }

      // Fetch submitting user details
      const submittingUser = await User.findById(req.user.userId).select("firstName lastName")

      const complaintId = await ComplaintController.generateComplaintId(req.org_id)

      const complaint = await ClientComplaint.create({
        org_id: req.org_id,
        complaintId,
        clientId: client?._id || clientId || clientKey || `${normalizedName}|${normalizedNumber}|${normalizedLocation}`,
        clientName: client?.sourceName || normalizedName,
        clientNumber: client?.sourceNumber || normalizedNumber,
        clientLocation: client?.sourceLocation || normalizedLocation,
        clientEmail: client?.email,
        title,
        description,
        complaintCategory,
        priority,
        attachments,
        submittedBy: req.user.userId,
        submittedByName: submittingUser ? `${submittingUser.firstName} ${submittingUser.lastName}` : "System",
        status: "new",
      })

      return res.status(201).json({
        success: true,
        message: "Complaint created successfully",
        data: complaint,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create complaint",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Update complaint
  static async updateComplaint(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { complaintId } = req.params
      const updates = req.body

      const complaint = await ClientComplaint.findOneAndUpdate(
        { _id: complaintId, org_id: req.org_id },
        updates,
        { new: true },
      )

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Complaint updated successfully",
        data: complaint,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update complaint",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Assign complaint to employee
  static async assignComplaint(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { complaintId } = req.params
      const { assignedTo } = req.body

      // Verify employee exists
      const employee = await User.findOne({
        _id: assignedTo,
        org_id: req.org_id,
      })

      if (!employee) {
        return res.status(404).json({ success: false, message: "Employee not found" })
      }

      const complaint = await ClientComplaint.findOneAndUpdate(
        { _id: complaintId, org_id: req.org_id },
        {
          assignedTo,
          assignedToName: `${employee.firstName} ${employee.lastName}`,
          status: "assigned",
        },
        { new: true },
      )

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Complaint assigned successfully",
        data: complaint,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to assign complaint",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Add internal note
  static async addInternalNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { complaintId } = req.params
      const { note } = req.body

      const complaint = await ClientComplaint.findOne({
        _id: complaintId,
        org_id: req.org_id,
      })

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" })
      }

      // Fetch user details
      const user = await User.findById(req.user.userId).select("firstName lastName")

      complaint.internalNotes = complaint.internalNotes || []
      complaint.internalNotes.push({
        userId: req.user.userId,
        userName: user ? `${user.firstName} ${user.lastName}` : "System",
        note,
        createdAt: new Date(),
      })

      await complaint.save()

      return res.status(200).json({
        success: true,
        message: "Internal note added successfully",
        data: complaint,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to add internal note",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Add client communication
  static async addCommunication(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { complaintId } = req.params
      const { message, senderRole = "staff", attachments = [] } = req.body

      const complaint = await ClientComplaint.findOne({
        _id: complaintId,
        org_id: req.org_id,
      })

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" })
      }

      // Fetch user details
      const user = await User.findById(req.user.userId).select("firstName lastName")

      complaint.communications = complaint.communications || []
      complaint.communications.push({
        senderUserId: req.user.userId,
        senderName: user ? `${user.firstName} ${user.lastName}` : "System",
        senderRole,
        message,
        attachments,
        createdAt: new Date(),
      })

      // Update status if in_progress
      if (complaint.status === "assigned") {
        complaint.status = "in_progress"
      }

      await complaint.save()

      return res.status(200).json({
        success: true,
        message: "Communication added successfully",
        data: complaint,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to add communication",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Resolve complaint
  static async resolveComplaint(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { complaintId } = req.params
      const { resolutionType, resolutionNotes, clientFeedback, satisfactionRating } = req.body

      const complaint = await ClientComplaint.findOne({
        _id: complaintId,
        org_id: req.org_id,
      })

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" })
      }

      // Fetch user details
      const user = await User.findById(req.user.userId).select("firstName lastName")

      complaint.resolution = {
        resolvedBy: req.user.userId,
        resolvedByName: user ? `${user.firstName} ${user.lastName}` : "System",
        resolutionType,
        resolutionNotes,
        clientFeedback,
        satisfactionRating,
        resolvedAt: new Date(),
      }

      complaint.status = "resolved"
      complaint.resolvedAt = new Date()

      await complaint.save()

      return res.status(200).json({
        success: true,
        message: "Complaint resolved successfully",
        data: complaint,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to resolve complaint",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Close complaint
  static async closeComplaint(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { complaintId } = req.params

      const complaint = await ClientComplaint.findOneAndUpdate(
        { _id: complaintId, org_id: req.org_id },
        {
          status: "closed",
          closedAt: new Date(),
        },
        { new: true },
      )

      if (!complaint) {
        return res.status(404).json({ success: false, message: "Complaint not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Complaint closed successfully",
        data: complaint,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to close complaint",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get complaints dashboard stats
  static async getComplaintStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const [total, open, pending, resolved, escalated, byCategory, byPriority] = await Promise.all([
        ClientComplaint.countDocuments({ org_id: req.org_id }),
        ClientComplaint.countDocuments({
          org_id: req.org_id,
          status: { $in: ["new", "under_review", "assigned", "in_progress"] },
        }),
        ClientComplaint.countDocuments({
          org_id: req.org_id,
          status: "pending_client_feedback",
        }),
        ClientComplaint.countDocuments({
          org_id: req.org_id,
          status: "resolved",
        }),
        ClientComplaint.countDocuments({
          org_id: req.org_id,
          status: "escalated",
        }),
        ClientComplaint.aggregate([
          { $match: { org_id: req.org_id } },
          { $group: { _id: "$complaintCategory", count: { $sum: 1 } } },
        ]),
        ClientComplaint.aggregate([
          { $match: { org_id: req.org_id } },
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]),
      ])

      return res.status(200).json({
        success: true,
        message: "Complaint stats fetched successfully",
        data: {
          total,
          open,
          pending,
          resolved,
          escalated,
          byCategory,
          byPriority,
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch complaint stats",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
