import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { User } from "../models/User"
import AuditLog from "../models/AuditLog"

export class ActivityController {
  /**
   * Track user activity (pulse and page views)
   */
  static async trackActivity(req: AuthenticatedRequest, res: Response) {
    try {
      const { action, resource, resourceId, details } = req.body
      const userId = req.user?.userId
      const org_id = req.user?.org_id

      if (!userId || !org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      // 1. Update lastActiveAt pulse
      await User.findByIdAndUpdate(userId, {
        lastActiveAt: new Date()
      })

      // 2. Log view if specific action is provided
      if (action === "view" && resource) {
        await AuditLog.create({
          org_id,
          userId,
          action: "view",
          resource,
          resourceId: resourceId || "root",
          details: details || `Viewed ${resource}`,
          ipAddress: req.ip,
          userAgent: req.get("user-agent"),
          status: "success",
          timestamp: new Date()
        })
      }

      return res.json({ success: true })
    } catch (error) {
      console.error("Error tracking activity:", error)
      return res.status(500).json({ success: false, message: "Tracking failed" })
    }
  }

  /**
   * Get user activity summary (for Owner/Admin dashboards)
   */
  static async getOwnerActivitySummary(req: AuthenticatedRequest, res: Response) {
    try {
      const userEmail = req.user?.email || ""
      const OWNER_EMAIL = "bellarinseth@gmail.com"

      if (userEmail.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
        return res.status(403).json({ success: false, message: "Unauthorized: Owner access required" })
      }

      // Fetch all users and companies
      const [users, companies] = await Promise.all([
        User.find({}, "firstName lastName email role lastLoginAt lastActiveAt org_id").lean(),
        import("../models/Company").then(m => m.Company.find({}, "name").lean())
      ])

      const companyMap = new Map(companies.map((c: any) => [c._id.toString(), c.name]))
      const now = new Date()
      
      // Enhance users with online status and most visited section
      const enhancedUsers = await Promise.all(users.map(async (u) => {
        // Online if active in last 5 minutes
        const isOnline = u.lastActiveAt ? (now.getTime() - new Date(u.lastActiveAt).getTime()) < 5 * 60 * 1000 : false

        // Get most visited section (top resource from views)
        const topSection = await AuditLog.aggregate([
          { $match: { userId: u._id.toString(), action: "view" } },
          { $group: { _id: "$resource", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 1 }
        ])

        return {
          ...u,
          companyName: companyMap.get(u.org_id) || "Unknown Organization",
          isOnline,
          mostVisitedSection: topSection.length > 0 ? topSection[0]._id : "N/A"
        }
      }))

      return res.json({
        success: true,
        data: enhancedUsers
      })
    } catch (error) {
      console.error("Error fetching activity summary:", error)
      return res.status(500).json({ success: false, message: "Failed to fetch summary" })
    }
  }
}
