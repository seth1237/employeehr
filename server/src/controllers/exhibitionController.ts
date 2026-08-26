import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Exhibition } from "../models/Exhibition"
import { ExhibitionLead } from "../models/ExhibitionLead"
import { User } from "../models/User"

const ADMIN_ROLES = ["company_admin", "hr", "admin", "super_admin"]
const isAdminRole = (role?: string) => !!role && ADMIN_ROLES.includes(role)

export class ExhibitionController {
  // Admin: Create Exhibition
  static async createExhibition(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Forbidden" })
      }

      const { name, location, date, endDate, status, assignedReps, customFields } = req.body

      const exhibition = await Exhibition.create({
        org_id,
        name,
        location,
        date,
        endDate,
        status,
        assignedReps: assignedReps || [],
        customFields: customFields || [],
        createdBy: userId,
      })

      return res.status(201).json({ success: true, data: exhibition })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Get Exhibitions (Admin sees all, Sales sees assigned)
  static async getExhibitions(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const query: any = { org_id }

      if (!isAdminRole(req.user?.role)) {
        query.assignedReps = userId
      }

      const exhibitions = await Exhibition.find(query).sort({ date: -1 }).lean()
      return res.status(200).json({ success: true, data: exhibitions })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Get single Exhibition
  static async getExhibition(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const exhibition = await Exhibition.findOne({ _id: req.params.id, org_id }).lean()
      if (!exhibition) {
        return res.status(404).json({ success: false, message: "Exhibition not found" })
      }

      if (!isAdminRole(req.user?.role) && !exhibition.assignedReps.includes(userId)) {
        return res.status(403).json({ success: false, message: "Not assigned to this exhibition" })
      }

      // Populate assigned reps names if admin
      let populatedReps: any[] = []
      if (exhibition.assignedReps && exhibition.assignedReps.length > 0) {
        populatedReps = await User.find(
          { _id: { $in: exhibition.assignedReps }, org_id },
          "firstName lastName email role",
        ).lean()
      }

      return res.status(200).json({
        success: true,
        data: {
          ...exhibition,
          assignedRepsData: populatedReps,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Admin: Update Exhibition
  static async updateExhibition(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Forbidden" })
      }

      const { name, location, date, endDate, status, assignedReps, customFields } = req.body

      const exhibition = await Exhibition.findOneAndUpdate(
        { _id: req.params.id, org_id },
        { name, location, date, endDate, status, assignedReps, customFields },
        { new: true }
      )

      if (!exhibition) return res.status(404).json({ success: false, message: "Exhibition not found" })

      return res.status(200).json({ success: true, data: exhibition })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Sales: Collect Lead
  static async collectLead(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const exhibitionId = req.params.id
      const exhibition = await Exhibition.findOne({ _id: exhibitionId, org_id })
      if (!exhibition) {
        return res.status(404).json({ success: false, message: "Exhibition not found" })
      }

      // Admin can collect lead too, or assigned rep
      if (!isAdminRole(req.user?.role) && !exhibition.assignedReps.includes(userId)) {
        return res.status(403).json({ success: false, message: "Not assigned to this exhibition" })
      }

      const { name, facility, role, location, phoneNumber, email, productOfInterest, customData, notes } = req.body

      const lead = await ExhibitionLead.create({
        org_id,
        exhibitionId,
        collectedBy: userId,
        name,
        facility,
        role,
        location,
        phoneNumber,
        email,
        productOfInterest,
        customData,
        notes,
      })

      return res.status(201).json({ success: true, data: lead })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Get Exhibition Leads
  static async getExhibitionLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const exhibitionId = req.params.id

      // Check access
      if (!isAdminRole(req.user?.role)) {
        const exhibition = await Exhibition.findOne({ _id: exhibitionId, org_id })
        if (!exhibition || !exhibition.assignedReps.includes(userId)) {
          return res.status(403).json({ success: false, message: "Not assigned to this exhibition" })
        }
      }

      const leads = await ExhibitionLead.find({ org_id, exhibitionId }).sort({ createdAt: -1 }).lean()
      
      // Populate collector info
      const collectorIds = [...new Set(leads.map(l => String(l.collectedBy)))]
      const collectors = await User.find({ _id: { $in: collectorIds }, org_id }, "firstName lastName email").lean()
      const collectorMap = new Map(collectors.map(c => [String(c._id), c]))

      const enrichedLeads = leads.map(lead => ({
        ...lead,
        collectedByData: collectorMap.get(String(lead.collectedBy))
      }))

      return res.status(200).json({ success: true, data: enrichedLeads })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }
}
