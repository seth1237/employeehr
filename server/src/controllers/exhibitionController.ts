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

      const isMongoId = /^[0-9a-fA-F]{24}$/.test(req.params.id)
      
      const query = isMongoId 
        ? { _id: req.params.id, org_id }
        : { name: decodeURIComponent(req.params.id), org_id }

      const exhibition = await Exhibition.findOne(query).lean()
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

      const isMongoId = /^[0-9a-fA-F]{24}$/.test(req.params.id)
      const query = isMongoId 
        ? { _id: req.params.id, org_id }
        : { name: decodeURIComponent(req.params.id), org_id }

      const exhibition = await Exhibition.findOneAndUpdate(
        query,
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

      const isMongoId = /^[0-9a-fA-F]{24}$/.test(req.params.id)
      const query = isMongoId 
        ? { _id: req.params.id, org_id }
        : { name: decodeURIComponent(req.params.id), org_id }

      const exhibition = await Exhibition.findOne(query)
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
        exhibitionId: String(exhibition._id),
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

  // Get ALL Exhibition Leads for CRM
  static async getAllLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      let query: any = { org_id }
      if (!isAdminRole(req.user?.role)) {
        const myExhibitions = await Exhibition.find({ org_id, assignedReps: userId }).select("_id").lean()
        const myExhibitionIds = myExhibitions.map(e => e._id)
        query.exhibitionId = { $in: myExhibitionIds }
      }

      if (req.query.exhibitionId) {
        // If they requested a specific exhibition, filter it
        // Ensure we respect the existing $in array if the user is not an admin
        if (query.exhibitionId && query.exhibitionId.$in) {
          if (query.exhibitionId.$in.some((id: any) => String(id) === req.query.exhibitionId)) {
            query.exhibitionId = req.query.exhibitionId
          } else {
            // They requested an exhibition they don't have access to
            return res.status(403).json({ success: false, message: "Forbidden" })
          }
        } else {
           query.exhibitionId = req.query.exhibitionId
        }
      }

      const leads = await ExhibitionLead.find(query).sort({ createdAt: -1 }).lean()
      
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

  // Get Exhibition Leads
  static async getExhibitionLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const isMongoId = /^[0-9a-fA-F]{24}$/.test(req.params.id)
      const query = isMongoId 
        ? { _id: req.params.id, org_id }
        : { name: decodeURIComponent(req.params.id), org_id }

      const exhibition = await Exhibition.findOne(query).lean()
      if (!exhibition) return res.status(404).json({ success: false, message: "Exhibition not found" })

      // Check access
      if (!isAdminRole(req.user?.role) && !exhibition.assignedReps.includes(userId)) {
        return res.status(403).json({ success: false, message: "Not assigned to this exhibition" })
      }

      const leads = await ExhibitionLead.find({ org_id, exhibitionId: exhibition._id }).sort({ createdAt: -1 }).lean()
      
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

  // Admin / Sales Rep: Bulk Import Leads
  static async bulkImportLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const { leads } = req.body
      if (!Array.isArray(leads) || leads.length === 0) {
        return res.status(400).json({ success: false, message: "No leads provided for import." })
      }

      const isMongoId = /^[0-9a-fA-F]{24}$/.test(req.params.id)
      const query = isMongoId 
        ? { _id: req.params.id, org_id }
        : { name: decodeURIComponent(req.params.id), org_id }

      const exhibition = await Exhibition.findOne(query).lean()
      if (!exhibition) return res.status(404).json({ success: false, message: "Exhibition not found" })

      if (!isAdminRole(req.user?.role) && !exhibition.assignedReps.includes(userId)) {
        return res.status(403).json({ success: false, message: "Not assigned to this exhibition" })
      }

      const formattedLeads = leads.map((lead: any) => ({
        org_id,
        exhibitionId: exhibition._id,
        collectedBy: userId,
        name: lead.name || lead.Name || "Unknown",
        facility: lead.facility || lead.Facility || "Unknown",
        role: lead.role || lead.Role || "Unknown",
        location: lead.location || lead.Location || "Unknown",
        phoneNumber: lead.phoneNumber || lead.Phone || "Unknown",
        email: lead.email || lead.Email || "",
        productOfInterest: lead.productOfInterest || lead["Product of Interest"] || "General",
        notes: lead.notes || lead.Notes || "",
        customData: {} // Skip dynamic mapping for bulk CSV upload unless explicitly mapped
      }))

      await ExhibitionLead.insertMany(formattedLeads)

      return res.status(201).json({ success: true, message: `Successfully imported ${formattedLeads.length} leads.` })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Update Exhibition Lead
  static async updateLead(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const isMongoId = /^[0-9a-fA-F]{24}$/.test(req.params.id)
      const query = isMongoId 
        ? { _id: req.params.id, org_id }
        : { name: decodeURIComponent(req.params.id), org_id }

      const exhibition = await Exhibition.findOne(query).lean()
      if (!exhibition) {
        return res.status(404).json({ success: false, message: "Exhibition not found" })
      }

      const leadId = req.params.leadId
      const existingLead = await ExhibitionLead.findOne({ _id: leadId, org_id, exhibitionId: exhibition._id }).lean()
      if (!existingLead) {
        return res.status(404).json({ success: false, message: "Lead not found" })
      }

      // Check access: Admin or the person who collected it, or an assigned rep
      if (!isAdminRole(req.user?.role) && !exhibition.assignedReps.includes(userId)) {
        return res.status(403).json({ success: false, message: "Not assigned to this exhibition" })
      }

      const { name, facility, role, location, phoneNumber, email, productOfInterest, customData, notes } = req.body

      const updatedLead = await ExhibitionLead.findOneAndUpdate(
        { _id: leadId, org_id, exhibitionId: exhibition._id },
        { name, facility, role, location, phoneNumber, email, productOfInterest, customData, notes },
        { new: true }
      )

      return res.status(200).json({ success: true, data: updatedLead })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  // Delete Exhibition Lead (single or bulk)
  static async deleteLeads(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })

      const isMongoId = /^[0-9a-fA-F]{24}$/.test(req.params.id)
      const query = isMongoId 
        ? { _id: req.params.id, org_id }
        : { name: decodeURIComponent(req.params.id), org_id }

      const exhibition = await Exhibition.findOne(query).lean()
      if (!exhibition) {
        return res.status(404).json({ success: false, message: "Exhibition not found" })
      }

      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admins can delete leads" })
      }

      const { leadIds } = req.body
      if (!Array.isArray(leadIds) || leadIds.length === 0) {
        return res.status(400).json({ success: false, message: "No leads specified for deletion" })
      }

      const result = await ExhibitionLead.deleteMany({
        _id: { $in: leadIds },
        org_id,
        exhibitionId: exhibition._id
      })

      return res.status(200).json({ success: true, message: `Successfully deleted ${result.deletedCount} leads.` })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message })
    }
  }
}
