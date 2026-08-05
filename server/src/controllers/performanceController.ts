import type { Response } from "express"
import { PerformanceService } from "../services/performanceService"
import { Performance } from "../models/Performance"
import type { AuthenticatedRequest } from "../middleware/auth"

export class PerformanceController {
  static async getPerformanceByPeriod(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { userId, period } = req.params
      const result = await PerformanceService.getPerformanceByPeriod(req.org_id, userId, period)
      res.status(result.success ? 200 : 404).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch performance",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async updateKPIScore(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { performanceId, kpiId } = req.params
      const { score } = req.body

      const result = await PerformanceService.updateKPIScore(req.org_id, performanceId, kpiId, score)
      res.status(result.success ? 200 : 400).json(result)
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update KPI score",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getOrganizationPerformances(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { period } = req.query
      const query: any = { org_id: req.org_id }

      if (period) {
        query.period = period
      }

      const performances = await Performance.find(query)

      res.status(200).json({
        success: true,
        message: "Performances fetched successfully",
        data: performances,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch performances",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
