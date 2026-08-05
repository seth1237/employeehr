import type { Response } from "express"
import { Badge, UserBadge } from "../models/Badge"
import type { AuthenticatedRequest } from "../middleware/auth"

export class BadgeController {
  // Get all available badges
  static async getBadges(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const badges = await Badge.find({ org_id: req.org_id, is_active: true }).sort({
        name: 1,
      })

      return res.status(200).json({
        success: true,
        message: "Badges fetched successfully",
        data: badges,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch badges",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get user badges
  static async getUserBadges(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { userId } = req.params
      const targetUserId = userId || req.user.userId

      const userBadges = await UserBadge.find({
        org_id: req.org_id,
        user_id: targetUserId,
      })
        .populate("badge_id")
        .sort({ awarded_at: -1 })

      return res.status(200).json({
        success: true,
        message: "User badges fetched successfully",
        data: userBadges,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch user badges",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Award badge (admin/manager only)
  static async awardBadge(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      // Check role
      if (!["company_admin", "admin", "manager"].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Insufficient permissions" })
      }

      const { user_id, badge_id, reason } = req.body

      // Check if badge exists
      const badge = await Badge.findOne({ _id: badge_id, org_id: req.org_id })
      if (!badge) {
        return res.status(404).json({ success: false, message: "Badge not found" })
      }

      // Create user badge
      const userBadge = await UserBadge.create({
        org_id: req.org_id,
        user_id,
        badge_id,
        awarded_by: req.user.userId,
        reason,
      })

      return res.status(201).json({
        success: true,
        message: "Badge awarded successfully",
        data: userBadge,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to award badge",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get leaderboard
  static async getLeaderboard(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const leaderboard = await UserBadge.aggregate([
        { $match: { org_id: req.org_id } },
        {
          $lookup: {
            from: "badges",
            localField: "badge_id",
            foreignField: "_id",
            as: "badge",
          },
        },
        { $unwind: "$badge" },
        {
          $group: {
            _id: "$user_id",
            total_points: { $sum: "$badge.points" },
            badge_count: { $sum: 1 },
          },
        },
        { $sort: { total_points: -1 } },
        { $limit: 10 },
      ])

      return res.status(200).json({
        success: true,
        message: "Leaderboard fetched successfully",
        data: leaderboard,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch leaderboard",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get all awarded badges
  static async getAllAwards(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const awards = await UserBadge.find({ org_id: req.org_id })
        .populate("badge_id")
        .sort({ awarded_at: -1 })

      return res.status(200).json({
        success: true,
        message: "Awards fetched successfully",
        data: awards,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch awards",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }}