import type { Response } from "express"
import { KPI } from "../models/KPI"
import type { AuthenticatedRequest } from "../middleware/auth"

export class KPIController {
  static async getAllKPIs(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { departmentId } = req.query as { departmentId?: string }
      const filter: Record<string, any> = { org_id: req.org_id }
      if (departmentId) filter.department_id = departmentId
      const kpis = await KPI.find(filter)

      res.status(200).json({
        success: true,
        message: "KPIs fetched successfully",
        data: kpis,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch KPIs",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getKPIById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { kpiId } = req.params
      const kpi = await KPI.findOne({ _id: kpiId, org_id: req.org_id })

      if (!kpi) {
        return res.status(404).json({
          success: false,
          message: "KPI not found",
        })
      }

      res.status(200).json({
        success: true,
        message: "KPI fetched successfully",
        data: kpi,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch KPI",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async createKPI(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      // Only Company Admins and Admin users can create KPIs
      if (!["company_admin", "admin", "super_admin"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Company Admins can create KPIs",
        })
      }

      const { name, description, category, weight, target, unit, department_id } = req.body

      // Validate required fields
      if (!name || !category || !unit) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields",
        })
      }

      const kpi = new KPI({
        org_id: req.org_id,
        name,
        description,
        category,
        weight: weight || 50,
        target: target || 100,
        unit,
        department_id: department_id || undefined,
      })

      const savedKPI = await kpi.save()

      return res.status(201).json({
        success: true,
        message: "KPI created successfully",
        data: savedKPI,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create KPI",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async updateKPI(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      // Only Company Admins and Admin users can update KPIs
      if (!["company_admin", "admin", "super_admin"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Company Admins can update KPIs",
        })
      }

      const { kpiId } = req.params
      const kpi = await KPI.findOneAndUpdate({ _id: kpiId, org_id: req.org_id }, { $set: req.body }, { new: true })

      if (!kpi) {
        return res.status(404).json({
          success: false,
          message: "KPI not found",
        })
      }

      return res.status(200).json({
        success: true,
        message: "KPI updated successfully",
        data: kpi,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update KPI",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async deleteKPI(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      // Only Company Admins and Admin users can delete KPIs
      if (!["company_admin", "admin", "super_admin"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Company Admins can delete KPIs",
        })
      }

      const { kpiId } = req.params
      const kpi = await KPI.findOneAndDelete({ _id: kpiId, org_id: req.org_id })

      if (!kpi) {
        return res.status(404).json({
          success: false,
          message: "KPI not found",
        })
      }

      return res.status(200).json({
        success: true,
        message: "KPI deleted successfully",
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete KPI",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
