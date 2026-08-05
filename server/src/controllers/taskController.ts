import type { Response } from "express"
import { Task } from "../models/Task"
import { User } from "../models/User"
import type { AuthenticatedRequest } from "../middleware/auth"

export class TaskController {
  // Get tasks for user (employee sees assigned tasks, admin/manager sees all)
  static async getTasks(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { status, priority } = req.query
      const { role, userId } = req.user
      const query: any = { org_id: req.org_id }

      // Employees only see their own tasks
      if (role === "employee") {
        query.assigned_to = userId
      }

      // Add filters
      if (status) query.status = status
      if (priority) query.priority = priority

      const tasks = await Task.find(query).sort({ createdAt: -1 })

      // Populate user details
      const tasksWithUsers = await Promise.all(
        tasks.map(async (task) => {
          const assignedTo = await User.findById(task.assigned_to).select("firstName lastName email")
          const assignedBy = await User.findById(task.assigned_by).select("firstName lastName email")
          return {
            ...task.toObject(),
            assigned_to_user: assignedTo,
            assigned_by_user: assignedBy,
          }
        })
      )

      return res.status(200).json({
        success: true,
        message: "Tasks fetched successfully",
        data: tasksWithUsers,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tasks",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get task by ID
  static async getTaskById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { taskId } = req.params
      const task = await Task.findOne({ _id: taskId, org_id: req.org_id })

      if (!task) {
        return res.status(404).json({ success: false, message: "Task not found" })
      }

      // Employees can only view their own tasks
      if (req.user.role === "employee" && task.assigned_to !== req.user.userId) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const assignedTo = await User.findById(task.assigned_to).select("firstName lastName email")
      const assignedBy = await User.findById(task.assigned_by).select("firstName lastName email")

      return res.status(200).json({
        success: true,
        message: "Task fetched successfully",
        data: {
          ...task.toObject(),
          assigned_to_user: assignedTo,
          assigned_by_user: assignedBy,
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch task",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Create task (admin/manager only)
  static async createTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      // Only admin/manager can create tasks
      if (!['company_admin', 'hr', 'manager', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const { title, description, assigned_to, priority, due_date } = req.body

      const task = new Task({
        org_id: req.org_id,
        title,
        description,
        assigned_to,
        assigned_by: req.user.userId,
        priority: priority || "medium",
        due_date,
      })

      const savedTask = await task.save()

      return res.status(201).json({
        success: true,
        message: "Task created successfully",
        data: savedTask,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create task",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Update task
  static async updateTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { taskId } = req.params
      const task = await Task.findOne({ _id: taskId, org_id: req.org_id })

      if (!task) {
        return res.status(404).json({ success: false, message: "Task not found" })
      }

      // Employees can only update status and notes for their tasks
      if (req.user.role === "employee" && task.assigned_to !== req.user.userId) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const updatedTask = await Task.findByIdAndUpdate(taskId, { $set: req.body }, { new: true })

      return res.status(200).json({
        success: true,
        message: "Task updated successfully",
        data: updatedTask,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update task",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Complete task (employee marks as done)
  static async completeTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { taskId } = req.params
      const { notes } = req.body

      const task = await Task.findOne({ _id: taskId, org_id: req.org_id })

      if (!task) {
        return res.status(404).json({ success: false, message: "Task not found" })
      }

      // Only assigned employee can complete
      if (task.assigned_to !== req.user.userId) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      task.status = "completed"
      task.completed_at = new Date()
      if (notes) task.notes = notes

      await task.save()

      return res.status(200).json({
        success: true,
        message: "Task completed successfully",
        data: task,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to complete task",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Add a note to a task (append to notes_history)
  static async addNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { taskId } = req.params
      const { text } = req.body

      if (!text || String(text).trim().length === 0) {
        return res.status(400).json({ success: false, message: "Note text is required" })
      }

      const task = await Task.findOne({ _id: taskId, org_id: req.org_id })
      if (!task) return res.status(404).json({ success: false, message: "Task not found" })

      // Employees can only add notes to their own tasks
      if (req.user.role === "employee" && task.assigned_to !== req.user.userId) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const user = await User.findById(req.user.userId).select("firstName lastName")
      const userName = user ? `${user.firstName} ${user.lastName}` : undefined

      // Prepare history entry
      const entry = {
        text,
        user_id: req.user.userId,
        user_name: userName,
        createdAt: new Date(),
      }

      // Append to notes_history and update notes summary
      const notesHistory = Array.isArray((task as any).notes_history) ? (task as any).notes_history : []
      notesHistory.push(entry)
      task.notes = text
      ;(task as any).notes_history = notesHistory

      await task.save()

      return res.status(200).json({ success: true, message: "Note added", data: task })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to add note", error: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  // Request postpone for a task (employee requests new due date)
  static async requestPostpone(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { taskId } = req.params
      const { new_due_date, reason } = req.body

      if (!new_due_date) {
        return res.status(400).json({ success: false, message: "New due date is required" })
      }

      const task = await Task.findOne({ _id: taskId, org_id: req.org_id })
      if (!task) return res.status(404).json({ success: false, message: "Task not found" })

      // Only assigned employee can request postpone
      if (task.assigned_to !== req.user.userId) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const user = await User.findById(req.user.userId).select("firstName lastName")
      const userName = user ? `${user.firstName} ${user.lastName}` : undefined

      const requestEntry = {
        requested_by: req.user.userId,
        requested_by_name: userName,
        requested_at: new Date(),
        new_due_date: new Date(new_due_date),
        reason: reason || "",
        status: "pending",
      }

      const pr = Array.isArray((task as any).postpone_requests) ? (task as any).postpone_requests : []
      pr.push(requestEntry)
      ;(task as any).postpone_requests = pr

      await task.save()

      return res.status(200).json({ success: true, message: "Postpone requested", data: task })
    } catch (error) {
      return res.status(500).json({ success: false, message: "Failed to request postpone", error: error instanceof Error ? error.message : "Unknown error" })
    }
  }

  // Delete task (admin/manager only)
  static async deleteTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      // Only admin/manager can delete
      if (!["company_admin", "hr", "manager", "admin"].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const { taskId } = req.params
      await Task.findOneAndDelete({ _id: taskId, org_id: req.org_id })

      return res.status(200).json({
        success: true,
        message: "Task deleted successfully",
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete task",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
