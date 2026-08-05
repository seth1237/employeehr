import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Department } from "../models/Department"

export class DepartmentController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) return res.status(400).json({ success: false, message: "Organization context required" })
      const depts = await Department.find({ org_id: req.org_id }).sort({ name: 1 })
      return res.json({ success: true, data: depts })
    } catch (error) {
      console.error("Error fetching departments:", error)
      return res.status(500).json({ success: false, message: "Failed to fetch departments" })
    }
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) return res.status(400).json({ success: false, message: "Organization context required" })
      const name = String(req.body?.name || "").trim()
      if (!name) return res.status(400).json({ success: false, message: "Department name is required" })

      const existing = await Department.findOne({ org_id: req.org_id, name: { $regex: new RegExp(`^${name}$`, 'i') } })
      if (existing) return res.status(409).json({ success: false, message: "Department already exists" })

      const dept = await Department.create({ name, org_id: req.org_id })
      return res.json({ success: true, data: dept })
    } catch (error) {
      console.error("Error creating department:", error)
      return res.status(500).json({ success: false, message: "Failed to create department" })
    }
  }

  static async update(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) return res.status(400).json({ success: false, message: "Organization context required" })
      const id = String(req.params.id || "")
      if (!id) return res.status(400).json({ success: false, message: "Department id required" })

      const payload: any = {}
      if (typeof req.body?.name === 'string') payload.name = String(req.body.name).trim()
      if (typeof req.body?.managerId === 'string') payload.managerId = req.body.managerId || undefined
      if (Array.isArray(req.body?.sidebarSections)) payload.sidebarSections = req.body.sidebarSections

      const dept = await Department.findById(id)
      if (!dept) return res.status(404).json({ success: false, message: "Department not found" })
      if (dept.org_id !== req.org_id) return res.status(403).json({ success: false, message: "Not allowed" })

      Object.assign(dept, payload)
      await dept.save()
      return res.json({ success: true, data: dept })
    } catch (error) {
      console.error('Error updating department:', error)
      return res.status(500).json({ success: false, message: 'Failed to update department' })
    }
  }

  static async remove(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) return res.status(400).json({ success: false, message: "Organization context required" })
      const id = String(req.params.id || "")
      if (!id) return res.status(400).json({ success: false, message: "Department id required" })

      const dept = await Department.findById(id)
      if (!dept) return res.status(404).json({ success: false, message: "Department not found" })
      if (dept.org_id !== req.org_id) return res.status(403).json({ success: false, message: "Not allowed" })

      await Department.findByIdAndDelete(id)
      return res.json({ success: true, message: 'Department deleted' })
    } catch (error) {
      console.error('Error deleting department:', error)
      return res.status(500).json({ success: false, message: 'Failed to delete department' })
    }
  }
}
