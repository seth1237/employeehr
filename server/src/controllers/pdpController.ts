import type { Response } from "express"
import { PDP } from "../models/PDP"
import type { AuthenticatedRequest } from "../middleware/auth"

export class PDPController {
  static async getPDPs(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { userId, status } = req.query
      const { role, userId: currentUserId } = req.user
      const query: any = { org_id: req.org_id }

      // Apply role-based filtering
      if (role === "company_admin" || role === "admin" || role === "hr" || role === "super_admin") {
        // Admins can see all PDPs, optionally filter by userId
        if (userId) query.user_id = userId
      } else if (role === "manager") {
        // Managers can see their team's PDPs (where manager_id matches)
        if (userId) {
          query.user_id = userId
        } else {
          query.manager_id = currentUserId
        }
      } else {
        // Employees can see their own PDPs or PDPs where they are the trustee
        query.$or = [
          { user_id: currentUserId },
          { trustee_id: currentUserId }
        ]
      }

      if (status) query.status = status

      const pdps = await PDP.find(query)

      return res.status(200).json({
        success: true,
        message: "PDPs fetched successfully",
        data: pdps,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch PDPs",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getPDPById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { pdpId } = req.params
      const { userId: currentUserId, role } = req.user
      const pdp = await PDP.findOne({ _id: pdpId, org_id: req.org_id })

      if (!pdp) {
        return res.status(404).json({
          success: false,
          message: "PDP not found",
        })
      }

      // Check access: owner, trustee, manager, or admin
      const hasAccess = 
        role === "company_admin" || 
        role === "admin" || 
        role === "hr" || 
        role === "super_admin" ||
        pdp.user_id === currentUserId ||
        pdp.trustee_id === currentUserId ||
        pdp.manager_id === currentUserId

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "You don't have permission to view this PDP",
        })
      }

      res.status(200).json({
        success: true,
        message: "PDP fetched successfully",
        data: pdp,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch PDP",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async createPDP(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const pdpData = {
        org_id: req.org_id,
        user_id: req.body.user_id || req.user.userId,
        title: req.body.title,
        description: req.body.description,
        period: req.body.period,
        personalProfile: req.body.personalProfile || {},
        visionMission: req.body.visionMission || {},
        goals: req.body.goals || [],
        actionPlans: req.body.actionPlans || [],
        skills: req.body.skills || [],
        habits: req.body.habits || [],
        journalEntries: req.body.journalEntries || [],
        careerDomain: req.body.careerDomain || {},
        educationDomain: req.body.educationDomain || {},
        financeDomain: req.body.financeDomain || {},
        healthDomain: req.body.healthDomain || {},
        relationshipDomain: req.body.relationshipDomain || {},
        mentalHealthDomain: req.body.mentalHealthDomain || {},
        reviews: req.body.reviews || [],
        status: "draft",
      }

      const pdp = new PDP(pdpData)
      const savedPDP = await pdp.save()

      res.status(201).json({
        success: true,
        message: "PDP created successfully",
        data: savedPDP,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to create PDP",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async updatePDP(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { pdpId } = req.params
      const pdp = await PDP.findOneAndUpdate({ _id: pdpId, org_id: req.org_id }, { $set: req.body }, { new: true })

      if (!pdp) {
        return res.status(404).json({
          success: false,
          message: "PDP not found",
        })
      }

      res.status(200).json({
        success: true,
        message: "PDP updated successfully",
        data: pdp,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update PDP",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async updateGoalProgress(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { pdpId, goalId } = req.params
      const { progress, status } = req.body

      const pdp = await PDP.findOne({ _id: pdpId, org_id: req.org_id })

      if (!pdp) {
        return res.status(404).json({
          success: false,
          message: "PDP not found",
        })
      }

      const goalIndex = pdp.goals.findIndex((g) => g._id?.toString() === goalId)

      if (goalIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Goal not found",
        })
      }

      if (progress !== undefined) pdp.goals[goalIndex].progress = progress
      if (status !== undefined) pdp.goals[goalIndex].status = status

      // Calculate overall progress
      pdp.overallProgress = Math.round(pdp.goals.reduce((sum, g) => sum + g.progress, 0) / pdp.goals.length || 0)

      await pdp.save()

      res.status(200).json({
        success: true,
        message: "Goal progress updated successfully",
        data: pdp,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to update goal progress",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async submitPDP(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { pdpId } = req.params
      const pdp = await PDP.findOneAndUpdate(
        { _id: pdpId, org_id: req.org_id },
        { $set: { status: "submitted" } },
        { new: true },
      )

      if (!pdp) {
        return res.status(404).json({
          success: false,
          message: "PDP not found",
        })
      }

      res.status(200).json({
        success: true,
        message: "PDP submitted for approval",
        data: pdp,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to submit PDP",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async approvePDP(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      // Only Manager, HR, or Company Admin can approve PDPs
        if (!["manager", "hr", "admin", "company_admin", "super_admin"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Managers or Admins can approve PDPs",
        })
      }

      const { pdpId } = req.params
      const { feedback } = req.body

      const pdp = await PDP.findOneAndUpdate(
        { _id: pdpId, org_id: req.org_id },
        {
          $set: {
            status: "approved",
            manager_feedback: feedback,
            manager_id: req.user.userId,
            approvedAt: new Date(),
          },
        },
        { new: true },
      )

      if (!pdp) {
        return res.status(404).json({
          success: false,
          message: "PDP not found",
        })
      }

      return res.status(200).json({
        success: true,
        message: "PDP approved successfully",
        data: pdp,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to approve PDP",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async rejectPDP(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      // Only Manager, HR, or Company Admin can reject PDPs
        if (!["manager", "hr", "admin", "company_admin", "super_admin"].includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: "Only Managers or Admins can reject PDPs",
        })
      }

      const { pdpId } = req.params
      const { feedback } = req.body

      const pdp = await PDP.findOneAndUpdate(
        { _id: pdpId, org_id: req.org_id },
        {
          $set: {
            status: "rejected",
            manager_feedback: feedback,
            manager_id: req.user.userId,
          },
        },
        { new: true },
      )

      if (!pdp) {
        return res.status(404).json({
          success: false,
          message: "PDP not found",
        })
      }

      return res.status(200).json({
        success: true,
        message: "PDP rejected",
        data: pdp,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to reject PDP",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Add journal entry
  static async addJournalEntry(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { pdpId } = req.params
      const journalEntry = {
        ...req.body,
        date: req.body.date || new Date(),
      }

      const pdp = await PDP.findOneAndUpdate(
        { _id: pdpId, org_id: req.org_id, user_id: req.user.userId },
        { $push: { journalEntries: journalEntry } },
        { new: true },
      )

      if (!pdp) {
        return res.status(404).json({ success: false, message: "PDP not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Journal entry added successfully",
        data: pdp,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to add journal entry",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Add review
  static async addReview(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { pdpId } = req.params
      const review = {
        ...req.body,
        date: req.body.date || new Date(),
      }

      const pdp = await PDP.findOneAndUpdate(
        { _id: pdpId, org_id: req.org_id, user_id: req.user.userId },
        { $push: { reviews: review } },
        { new: true },
      )

      if (!pdp) {
        return res.status(404).json({ success: false, message: "PDP not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Review added successfully",
        data: pdp,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to add review",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Update habit progress
  static async updateHabitProgress(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { pdpId, habitId } = req.params
      const { completed } = req.body

      const pdp = await PDP.findOne({
        _id: pdpId,
        org_id: req.org_id,
        user_id: req.user.userId,
      })

      if (!pdp) {
        return res.status(404).json({ success: false, message: "PDP not found" })
      }

      const habit = pdp.habits.find((h: any) => h._id.toString() === habitId)
      if (!habit) {
        return res.status(404).json({ success: false, message: "Habit not found" })
      }

      if (completed) {
        habit.lastCompleted = new Date()
        habit.streak = (habit.streak || 0) + 1
        habit.progress = (habit.progress || 0) + 1
      }

      await pdp.save()

      return res.status(200).json({
        success: true,
        message: "Habit progress updated successfully",
        data: pdp,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update habit progress",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Update skill progress
  static async updateSkillProgress(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { pdpId, skillId } = req.params
      const { currentLevel } = req.body

      const pdp = await PDP.findOneAndUpdate(
        {
          _id: pdpId,
          org_id: req.org_id,
          user_id: req.user.userId,
          "skills._id": skillId,
        },
        { $set: { "skills.$.currentLevel": currentLevel } },
        { new: true },
      )

      if (!pdp) {
        return res.status(404).json({ success: false, message: "PDP or skill not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Skill progress updated successfully",
        data: pdp,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update skill progress",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
