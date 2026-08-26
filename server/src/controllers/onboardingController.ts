import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import {
  OnboardingChecklist,
  DEFAULT_ONBOARDING_TASKS,
} from "../models/OnboardingChecklist"
import { User } from "../models/User"

export class OnboardingController {
  static async list(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id || req.user?.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const checklists = await OnboardingChecklist.find({ org_id }).sort({
        updatedAt: -1,
      })
      const userIds = checklists.map((c) => c.user_id)
      const users = await User.find({ _id: { $in: userIds }, org_id }).select(
        "firstName lastName email department position status dateOfJoining",
      )
      const userMap = new Map(users.map((u) => [String(u._id), u]))

      const data = checklists.map((c) => {
        const user = userMap.get(String(c.user_id))
        const total = c.tasks.length
        const done = c.tasks.filter((t) => t.completed).length
        return {
          ...c.toObject(),
          user: user
            ? {
                _id: String(user._id),
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                department: user.department,
                position: user.position,
                status: user.status,
                dateOfJoining: user.dateOfJoining,
              }
            : null,
          progress: total ? Math.round((done / total) * 100) : 0,
          completedTasks: done,
          totalTasks: total,
        }
      })

      return res.status(200).json({ success: true, data })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to list onboarding checklists",
      })
    }
  }

  static async getByUser(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id || req.user?.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const { userId } = req.params
      const checklist = await OnboardingChecklist.findOne({
        org_id,
        user_id: userId,
      })
      return res.status(200).json({ success: true, data: checklist })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch checklist",
      })
    }
  }

  static async createForUser(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id || req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { userId, templateName, startDate } = req.body || {}
      if (!userId) {
        return res
          .status(400)
          .json({ success: false, message: "userId is required" })
      }

      const user = await User.findOne({ _id: userId, org_id })
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" })
      }

      const existing = await OnboardingChecklist.findOne({
        org_id,
        user_id: String(userId),
      })
      if (existing) {
        return res.status(200).json({
          success: true,
          message: "Checklist already exists",
          data: existing,
        })
      }

      const start = startDate ? new Date(startDate) : new Date()
      const checklist = await OnboardingChecklist.create({
        org_id,
        user_id: String(userId),
        templateName: templateName || "Standard onboarding",
        status: "in_progress",
        startDate: start,
        dueDate: new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000),
        tasks: DEFAULT_ONBOARDING_TASKS.map((t) => ({
          ...t,
          completed: false,
        })),
        createdBy: actorId,
      })

      if (user.status === "pending" || user.status === "active") {
        user.status = "preboarding"
        if (!user.dateOfJoining) user.dateOfJoining = start
        await user.save()
      }

      return res.status(201).json({ success: true, data: checklist })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to create checklist",
      })
    }
  }

  static async toggleTask(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id || req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { checklistId, taskId } = req.params
      const { completed, notes } = req.body || {}

      const checklist = await OnboardingChecklist.findOne({
        _id: checklistId,
        org_id,
      })
      if (!checklist) {
        return res
          .status(404)
          .json({ success: false, message: "Checklist not found" })
      }

      const task = checklist.tasks.find(
        (t: any) => String(t._id) === String(taskId),
      ) as any
      if (!task) {
        return res.status(404).json({ success: false, message: "Task not found" })
      }

      const isDone = completed === undefined ? !task.completed : Boolean(completed)
      task.completed = isDone
      task.completedAt = isDone ? new Date() : undefined
      task.completedBy = isDone ? actorId : undefined
      if (notes !== undefined) task.notes = String(notes)

      const allDone =
        checklist.tasks.length > 0 &&
        checklist.tasks.every((t) => t.completed)
      const anyDone = checklist.tasks.some((t) => t.completed)
      checklist.status = allDone
        ? "completed"
        : anyDone
          ? "in_progress"
          : "not_started"

      await checklist.save()

      if (allDone) {
        const user = await User.findOne({ _id: checklist.user_id, org_id })
        if (user && ["preboarding", "pending"].includes(user.status)) {
          const now = new Date()
          if (
            user.probationEndDate &&
            user.probationEndDate.getTime() > now.getTime()
          ) {
            user.status = "probation"
          } else {
            user.status = "active"
          }
          await user.save()
        }
      }

      return res.status(200).json({ success: true, data: checklist })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update task",
      })
    }
  }
}
