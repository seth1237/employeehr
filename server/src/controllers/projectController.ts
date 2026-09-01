import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Project } from "../models/Project"
import { ProjectTimeLog } from "../models/ProjectTimeLog"
import { Task } from "../models/Task"
import { User } from "../models/User"

const ADMIN_ROLES = ["company_admin", "hr", "admin", "super_admin"]
const MANAGER_ROLES = [...ADMIN_ROLES, "manager"]

// Generate a sequential project code like PROJ-0001
async function generateProjectCode(org_id: string): Promise<string> {
  const count = await Project.countDocuments({ org_id })
  const padded = String(count + 1).padStart(4, "0")
  return `PROJ-${padded}`
}

export class ProjectController {
  // ─────────────────────────────────────────────
  // GET /api/projects
  // ─────────────────────────────────────────────
  static async getProjects(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { status, priority, search } = req.query
      const { role, userId } = req.user

      const query: any = { org_id: req.org_id }

      // Non-admins only see projects they are a member of
      if (!ADMIN_ROLES.includes(role)) {
        query["members.user_id"] = userId
      }

      if (status) query.status = status
      if (priority) query.priority = priority
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: "i" } },
          { project_code: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ]
      }

      const projects = await Project.find(query).sort({ createdAt: -1 })

      // Enrich with member user details and task counts
      const enriched = await Promise.all(
        projects.map(async (project) => {
          const p = project.toObject()

          // Count tasks linked to this project
          const taskCount = await Task.countDocuments({
            org_id: req.org_id,
            related_entity_type: "other",
            related_entity_id: String(project._id),
          })

          const completedTaskCount = await Task.countDocuments({
            org_id: req.org_id,
            related_entity_type: "other",
            related_entity_id: String(project._id),
            status: "completed",
          })

          // Enrich members with names
          const memberDetails = await Promise.all(
            (p.members || []).map(async (m: any) => {
              const user = await User.findById(m.user_id).select("firstName lastName avatar")
              return { ...m, user }
            }),
          )

          return {
            ...p,
            members: memberDetails,
            task_count: taskCount,
            completed_task_count: completedTaskCount,
          }
        }),
      )

      return res.status(200).json({
        success: true,
        message: "Projects fetched successfully",
        data: enriched,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch projects",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // ─────────────────────────────────────────────
  // GET /api/projects/stats
  // ─────────────────────────────────────────────
  static async getProjectStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { role, userId } = req.user
      const baseQuery: any = { org_id: req.org_id }
      if (!ADMIN_ROLES.includes(role)) {
        baseQuery["members.user_id"] = userId
      }

      const [total, active, onHold, completed, planning, cancelled] = await Promise.all([
        Project.countDocuments(baseQuery),
        Project.countDocuments({ ...baseQuery, status: "active" }),
        Project.countDocuments({ ...baseQuery, status: "on_hold" }),
        Project.countDocuments({ ...baseQuery, status: "completed" }),
        Project.countDocuments({ ...baseQuery, status: "planning" }),
        Project.countDocuments({ ...baseQuery, status: "cancelled" }),
      ])

      // Overdue: end_date < now and not completed/cancelled
      const overdue = await Project.countDocuments({
        ...baseQuery,
        end_date: { $lt: new Date() },
        status: { $nin: ["completed", "cancelled"] },
      })

      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

      return res.status(200).json({
        success: true,
        message: "Stats fetched",
        data: { total, active, on_hold: onHold, completed, planning, cancelled, overdue, completionRate },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch stats",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // ─────────────────────────────────────────────
  // GET /api/projects/:projectId
  // ─────────────────────────────────────────────
  static async getProjectById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { projectId } = req.params
      const { role, userId } = req.user

      const project = await Project.findOne({ _id: projectId, org_id: req.org_id })
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" })
      }

      // Non-admins must be a member
      if (!ADMIN_ROLES.includes(role)) {
        const isMember = project.members.some((m) => m.user_id === userId)
        if (!isMember) {
          return res.status(403).json({ success: false, message: "Access denied" })
        }
      }

      const p = project.toObject()

      // Enrich members
      const memberDetails = await Promise.all(
        (p.members || []).map(async (m: any) => {
          const user = await User.findById(m.user_id).select("firstName lastName avatar email position")
          return { ...m, user }
        }),
      )

      // Fetch linked tasks
      const tasks = await Task.find({
        org_id: req.org_id,
        related_entity_type: "other",
        related_entity_id: String(project._id),
      }).sort({ createdAt: -1 })

      // Enrich tasks with assignee names
      const tasksEnriched = await Promise.all(
        tasks.map(async (t) => {
          const assignedTo = await User.findById(t.assigned_to).select("firstName lastName")
          return { ...t.toObject(), assigned_to_user: assignedTo }
        }),
      )

      // Fetch time logs summary
      const timeLogs = await ProjectTimeLog.find({ org_id: req.org_id, project_id: String(project._id) })
        .sort({ date: -1 })
        .limit(50)

      const totalHours = timeLogs.reduce((sum, log) => sum + log.hours, 0)

      // Creator details
      const creator = await User.findById(project.created_by).select("firstName lastName")

      return res.status(200).json({
        success: true,
        message: "Project fetched successfully",
        data: {
          ...p,
          members: memberDetails,
          tasks: tasksEnriched,
          time_logs: timeLogs,
          total_logged_hours: totalHours,
          creator,
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch project",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // ─────────────────────────────────────────────
  // POST /api/projects
  // ─────────────────────────────────────────────
  static async createProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      if (!MANAGER_ROLES.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const {
        title,
        description,
        status,
        priority,
        start_date,
        end_date,
        budget,
        tags,
        phases,
        client_name,
        client_id,
        member_ids,
      } = req.body

      if (!title) {
        return res.status(400).json({ success: false, message: "Project title is required" })
      }

      const project_code = await generateProjectCode(req.org_id)

      // Build initial members — creator is always a project_manager
      const members: any[] = [
        { user_id: req.user.userId, role: "project_manager", added_at: new Date() },
      ]
      if (Array.isArray(member_ids)) {
        for (const uid of member_ids) {
          if (uid !== req.user.userId) {
            members.push({ user_id: uid, role: "member", added_at: new Date() })
          }
        }
      }

      const project = new Project({
        org_id: req.org_id,
        project_code,
        title,
        description,
        status: status || "planning",
        priority: priority || "medium",
        start_date,
        end_date,
        budget,
        tags: tags || [],
        phases: phases || [],
        members,
        client_name,
        client_id,
        progress: 0,
        created_by: req.user.userId,
      })

      const saved = await project.save()

      return res.status(201).json({
        success: true,
        message: "Project created successfully",
        data: saved,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create project",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // ─────────────────────────────────────────────
  // PUT /api/projects/:projectId
  // ─────────────────────────────────────────────
  static async updateProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { projectId } = req.params
      const { role, userId } = req.user

      const project = await Project.findOne({ _id: projectId, org_id: req.org_id })
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" })
      }

      // Must be admin OR a project_manager member
      const isProjectManager = project.members.some(
        (m) => m.user_id === userId && m.role === "project_manager",
      )
      if (!ADMIN_ROLES.includes(role) && !isProjectManager) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const allowedFields = [
        "title", "description", "status", "priority",
        "start_date", "end_date", "actual_end_date",
        "budget", "budget_used", "tags", "phases",
        "progress", "client_name", "client_id",
      ]

      const updateData: any = {}
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field]
        }
      }

      const updated = await Project.findByIdAndUpdate(
        projectId,
        { $set: updateData },
        { new: true },
      )

      return res.status(200).json({
        success: true,
        message: "Project updated successfully",
        data: updated,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update project",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // ─────────────────────────────────────────────
  // DELETE /api/projects/:projectId
  // ─────────────────────────────────────────────
  static async deleteProject(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      if (!ADMIN_ROLES.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const { projectId } = req.params
      const project = await Project.findOne({ _id: projectId, org_id: req.org_id })
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" })
      }

      await Project.findByIdAndDelete(projectId)
      // Also clean up time logs
      await ProjectTimeLog.deleteMany({ org_id: req.org_id, project_id: projectId })

      return res.status(200).json({ success: true, message: "Project deleted successfully" })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete project",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // ─────────────────────────────────────────────
  // POST /api/projects/:projectId/members
  // ─────────────────────────────────────────────
  static async addMember(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { projectId } = req.params
      const { user_id, role: memberRole } = req.body

      if (!user_id) {
        return res.status(400).json({ success: false, message: "user_id is required" })
      }

      const project = await Project.findOne({ _id: projectId, org_id: req.org_id })
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" })
      }

      // Only admin or project_manager can add
      const isProjectManager = project.members.some(
        (m) => m.user_id === req.user!.userId && m.role === "project_manager",
      )
      if (!ADMIN_ROLES.includes(req.user.role) && !isProjectManager) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const alreadyMember = project.members.some((m) => m.user_id === user_id)
      if (alreadyMember) {
        return res.status(409).json({ success: false, message: "User is already a member" })
      }

      project.members.push({
        user_id,
        role: memberRole || "member",
        added_at: new Date(),
      })

      await project.save()

      return res.status(200).json({ success: true, message: "Member added", data: project })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to add member",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // ─────────────────────────────────────────────
  // DELETE /api/projects/:projectId/members/:userId
  // ─────────────────────────────────────────────
  static async removeMember(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { projectId, userId: targetUserId } = req.params

      const project = await Project.findOne({ _id: projectId, org_id: req.org_id })
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" })
      }

      const isProjectManager = project.members.some(
        (m) => m.user_id === req.user!.userId && m.role === "project_manager",
      )
      if (!ADMIN_ROLES.includes(req.user.role) && !isProjectManager) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      project.members = project.members.filter((m) => m.user_id !== targetUserId) as any
      await project.save()

      return res.status(200).json({ success: true, message: "Member removed", data: project })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to remove member",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // ─────────────────────────────────────────────
  // GET /api/projects/:projectId/tasks
  // ─────────────────────────────────────────────
  static async getProjectTasks(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { projectId } = req.params

      const project = await Project.findOne({ _id: projectId, org_id: req.org_id })
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" })
      }

      const tasks = await Task.find({
        org_id: req.org_id,
        related_entity_type: "other",
        related_entity_id: projectId,
      }).sort({ createdAt: -1 })

      const enriched = await Promise.all(
        tasks.map(async (t) => {
          const assignedTo = await User.findById(t.assigned_to).select("firstName lastName avatar")
          const assignedBy = await User.findById(t.assigned_by).select("firstName lastName")
          return { ...t.toObject(), assigned_to_user: assignedTo, assigned_by_user: assignedBy }
        }),
      )

      return res.status(200).json({
        success: true,
        message: "Tasks fetched",
        data: enriched,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch tasks",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // ─────────────────────────────────────────────
  // POST /api/projects/:projectId/tasks
  // Create a task linked to this project
  // ─────────────────────────────────────────────
  static async createProjectTask(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { projectId } = req.params

      const project = await Project.findOne({ _id: projectId, org_id: req.org_id })
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" })
      }

      // Must be admin or project manager/member
      const isMember = project.members.some((m) => m.user_id === req.user!.userId)
      if (!ADMIN_ROLES.includes(req.user.role) && !isMember) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const { title, description, assigned_to, priority, due_date } = req.body

      if (!title || !assigned_to) {
        return res.status(400).json({ success: false, message: "title and assigned_to are required" })
      }

      const task = new Task({
        org_id: req.org_id,
        title,
        description: description || "",
        assigned_to,
        assigned_by: req.user.userId,
        priority: priority || "medium",
        due_date,
        related_entity_type: "other",
        related_entity_id: projectId,
        source_label: project.project_code,
      })

      const saved = await task.save()

      return res.status(201).json({ success: true, message: "Task created", data: saved })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create task",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // ─────────────────────────────────────────────
  // POST /api/projects/:projectId/time-logs
  // ─────────────────────────────────────────────
  static async addTimeLog(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { projectId } = req.params
      const { hours, description, date, billable, task_id } = req.body

      if (!hours || isNaN(Number(hours))) {
        return res.status(400).json({ success: false, message: "Valid hours value is required" })
      }

      const project = await Project.findOne({ _id: projectId, org_id: req.org_id })
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" })
      }

      const isMember = project.members.some((m) => m.user_id === req.user!.userId)
      if (!ADMIN_ROLES.includes(req.user.role) && !isMember) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const log = new ProjectTimeLog({
        org_id: req.org_id,
        project_id: projectId,
        task_id,
        user_id: req.user.userId,
        hours: Number(hours),
        description,
        date: date ? new Date(date) : new Date(),
        billable: billable ?? false,
      })

      await log.save()

      // Update budget_used on the project
      const totalHours = await ProjectTimeLog.aggregate([
        { $match: { org_id: req.org_id, project_id: projectId } },
        { $group: { _id: null, total: { $sum: "$hours" } } },
      ])
      const total = totalHours[0]?.total || 0
      await Project.findByIdAndUpdate(projectId, { budget_used: total })

      return res.status(201).json({ success: true, message: "Time logged", data: log })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to log time",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // ─────────────────────────────────────────────
  // GET /api/projects/:projectId/time-logs
  // ─────────────────────────────────────────────
  static async getTimeLogs(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { projectId } = req.params

      const project = await Project.findOne({ _id: projectId, org_id: req.org_id })
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" })
      }

      const logs = await ProjectTimeLog.find({
        org_id: req.org_id,
        project_id: projectId,
      }).sort({ date: -1 })

      const enriched = await Promise.all(
        logs.map(async (log) => {
          const user = await User.findById(log.user_id).select("firstName lastName avatar")
          return { ...log.toObject(), user }
        }),
      )

      const totalHours = logs.reduce((sum, l) => sum + l.hours, 0)

      return res.status(200).json({
        success: true,
        message: "Time logs fetched",
        data: enriched,
        total_hours: totalHours,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch time logs",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // ─────────────────────────────────────────────
  // POST /api/projects/:projectId/notes
  // ─────────────────────────────────────────────
  static async addNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { projectId } = req.params
      const { text } = req.body

      if (!text || String(text).trim().length === 0) {
        return res.status(400).json({ success: false, message: "Note text is required" })
      }

      const project = await Project.findOne({ _id: projectId, org_id: req.org_id })
      if (!project) {
        return res.status(404).json({ success: false, message: "Project not found" })
      }

      const isMember = project.members.some((m) => m.user_id === req.user!.userId)
      if (!ADMIN_ROLES.includes(req.user.role) && !isMember) {
        return res.status(403).json({ success: false, message: "Access denied" })
      }

      const user = await User.findById(req.user.userId).select("firstName lastName")
      const userName = user ? `${user.firstName} ${user.lastName}` : undefined

      const history = Array.isArray((project as any).notes_history) ? (project as any).notes_history : []
      history.push({ text, user_id: req.user.userId, user_name: userName, createdAt: new Date() })
      ;(project as any).notes_history = history

      await project.save()

      return res.status(200).json({ success: true, message: "Note added", data: project })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to add note",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
