import type { Response } from "express"
import { Award, AwardNomination } from "../models/Award"
import type { AuthenticatedRequest } from "../middleware/auth"

export class AwardController {
  static async createAward(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { name, description, type, criteria, icon } = req.body

      const award = new Award({
        org_id: req.org_id,
        name,
        description,
        type,
        criteria,
        icon,
      })

      const savedAward = await award.save()

      res.status(201).json({
        success: true,
        message: "Award created successfully",
        data: savedAward,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create award",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getAwards(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const awards = await Award.find({ org_id: req.org_id })

      res.status(200).json({
        success: true,
        message: "Awards fetched successfully",
        data: awards,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch awards",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async createNomination(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { award_id, user_id, period, score, reason } = req.body

      const nomination = new AwardNomination({
        org_id: req.org_id,
        award_id,
        user_id,
        period,
        score,
        reason,
        status: "pending",
      })

      const savedNomination = await nomination.save()

      res.status(201).json({
        success: true,
        message: "Nomination created successfully",
        data: savedNomination,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create nomination",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getNominations(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { period, status } = req.query
      const query: any = { org_id: req.org_id }

      if (period) query.period = period
      if (status) query.status = status

      const nominations = await AwardNomination.find(query)

      res.status(200).json({
        success: true,
        message: "Nominations fetched successfully",
        data: nominations,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch nominations",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getLeaderboard(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { period } = req.query
      const query: any = { org_id: req.org_id, status: "approved" }

      if (period) query.period = period

      const nominations = await AwardNomination.find(query).sort({ score: -1 }).limit(10)

      res.status(200).json({
        success: true,
        message: "Leaderboard fetched successfully",
        data: nominations,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch leaderboard",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
