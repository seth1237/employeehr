import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import {
  OnboardingChecklist,
  DEFAULT_ONBOARDING_TASKS,
} from "../models/OnboardingChecklist"
import {
  OnboardingTemplate,
  cloneDefaultTemplateParts,
} from "../models/OnboardingTemplate"
import { User } from "../models/User"
import JobApplication from "../models/JobApplication"
import Job from "../models/Job"
import { AuthService } from "../services/authService"

function setPath(target: Record<string, any>, path: string, value: any) {
  if (value === undefined || value === null || value === "") return
  const parts = path.split(".")
  let cursor = target
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]
    if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {}
    cursor = cursor[key]
  }
  cursor[parts[parts.length - 1]] = value
}

async function resolveTemplate(org_id: string, actorId?: string) {
  let template = await OnboardingTemplate.findOne({ org_id, isDefault: true })
  if (!template) {
    const parts = cloneDefaultTemplateParts()
    template = await OnboardingTemplate.create({
      org_id,
      name: "Standard onboarding",
      isDefault: true,
      sections: parts.sections,
      tasks: parts.tasks,
      createdBy: actorId,
    })
  }
  return template
}

export async function enrollHiredApplication(params: {
  org_id: string
  actorId: string
  application: any
  job?: any
}) {
  const { org_id, actorId, application, job } = params
  const existing = await OnboardingChecklist.findOne({
    org_id,
    application_id: String(application._id),
    status: { $ne: "dropped" },
  })
  if (existing) return existing

  const template = await resolveTemplate(org_id, actorId)
  const start = new Date()
  const nameParts = String(application.applicant_name || "").trim().split(/\s+/)
  const answers: Record<string, any> = {
    firstName: nameParts[0] || "",
    lastName: nameParts.slice(1).join(" ") || "",
    email: application.applicant_email || "",
    phone: application.applicant_phone || "",
    position: job?.title || "",
    department: job?.department || "",
  }

  return OnboardingChecklist.create({
    org_id,
    application_id: String(application._id),
    candidate_name: application.applicant_name,
    candidate_email: application.applicant_email,
    candidate_phone: application.applicant_phone,
    job_title: job?.title || "",
    template_id: String(template._id),
    templateName: template.name,
    status: "in_progress",
    startDate: start,
    dueDate: new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000),
    tasks: (template.tasks?.length ? template.tasks : DEFAULT_ONBOARDING_TASKS).map((task) => ({
      ...task,
      completed: false,
    })),
    sections: template.sections || [],
    form_answers: answers,
    createdBy: actorId,
  })
}

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
      const userIds = checklists.map((c) => c.user_id).filter(Boolean) as string[]
      const users = userIds.length
        ? await User.find({ _id: { $in: userIds }, org_id }).select(
            "firstName lastName email department position status dateOfJoining",
          )
        : []
      const userMap = new Map(users.map((u) => [String(u._id), u]))

      const data = checklists.map((c) => {
        const user = c.user_id ? userMap.get(String(c.user_id)) : null
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
            : {
                _id: null,
                firstName: String(c.candidate_name || "").split(/\s+/)[0] || "",
                lastName: String(c.candidate_name || "").split(/\s+/).slice(1).join(" "),
                email: c.candidate_email,
                department: c.job_title,
                position: c.job_title,
                status: c.status,
              },
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

  static async getTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id || req.user?.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const template = await resolveTemplate(org_id, req.user?.userId)
      return res.status(200).json({ success: true, data: template })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to load onboarding form",
      })
    }
  }

  static async saveTemplate(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id || req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { name, sections, tasks } = req.body || {}
      if (!Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({ success: false, message: "Add at least one section" })
      }

      const template = await OnboardingTemplate.findOneAndUpdate(
        { org_id, isDefault: true },
        {
          $set: {
            name: name || "Standard onboarding",
            sections,
            tasks: Array.isArray(tasks) && tasks.length ? tasks : DEFAULT_ONBOARDING_TASKS,
            createdBy: actorId,
            isDefault: true,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )

      return res.status(200).json({
        success: true,
        message: "Onboarding form saved",
        data: template,
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to save onboarding form",
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

      const template = await resolveTemplate(org_id, actorId)
      const start = startDate ? new Date(startDate) : new Date()
      const checklist = await OnboardingChecklist.create({
        org_id,
        user_id: String(userId),
        candidate_name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        candidate_email: user.email,
        template_id: String(template._id),
        templateName: templateName || template.name,
        status: "in_progress",
        startDate: start,
        dueDate: new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000),
        tasks: (template.tasks?.length ? template.tasks : DEFAULT_ONBOARDING_TASKS).map((t) => ({
          ...t,
          completed: false,
        })),
        sections: template.sections || [],
        form_answers: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          department: user.department,
          position: user.position,
        },
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

  static async saveAnswers(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id || req.user?.org_id
      if (!org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const { checklistId } = req.params
      const { answers } = req.body || {}
      const checklist = await OnboardingChecklist.findOne({ _id: checklistId, org_id })
      if (!checklist) {
        return res.status(404).json({ success: false, message: "Checklist not found" })
      }
      if (checklist.status === "dropped" || checklist.status === "completed") {
        return res.status(400).json({ success: false, message: "This record is closed" })
      }
      checklist.form_answers = { ...(checklist.form_answers || {}), ...(answers || {}) }
      if (checklist.status === "not_started") checklist.status = "in_progress"
      await checklist.save()
      return res.status(200).json({ success: true, data: checklist })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to save form",
      })
    }
  }

  static async drop(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id || req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const { checklistId } = req.params
      const { reason } = req.body || {}
      const checklist = await OnboardingChecklist.findOne({ _id: checklistId, org_id })
      if (!checklist) {
        return res.status(404).json({ success: false, message: "Checklist not found" })
      }
      if (checklist.status === "completed") {
        return res.status(400).json({ success: false, message: "Completed onboarding cannot be dropped" })
      }

      checklist.status = "dropped"
      checklist.dropped_reason = reason ? String(reason) : "Dropped from onboarding"
      checklist.dropped_at = new Date()
      checklist.dropped_by = actorId
      await checklist.save()

      if (checklist.application_id) {
        const application = await JobApplication.findOne({
          _id: checklist.application_id,
          org_id,
        })
        if (application) {
          application.timeline.push({
            status: application.status,
            changed_by: actorId,
            changed_at: new Date(),
            comment: `Dropped from onboarding${reason ? `: ${reason}` : ""}`,
          })
          await application.save()
        }
      }

      return res.status(200).json({ success: true, data: checklist })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to drop candidate",
      })
    }
  }

  static async complete(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.org_id || req.user?.org_id
      const actorId = req.user?.userId
      if (!org_id || !actorId) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }
      const { checklistId } = req.params
      const checklist = await OnboardingChecklist.findOne({ _id: checklistId, org_id })
      if (!checklist) {
        return res.status(404).json({ success: false, message: "Checklist not found" })
      }
      if (checklist.status === "dropped") {
        return res.status(400).json({ success: false, message: "Dropped candidates cannot be converted" })
      }
      if (checklist.status === "completed" && checklist.user_id) {
        return res.status(200).json({ success: true, message: "Already completed", data: checklist })
      }

      const answers = { ...(checklist.form_answers || {}) }
      const mapped: Record<string, any> = {}
      for (const section of checklist.sections || []) {
        for (const field of section.fields || []) {
          const value = answers[field.field_id]
          if (field.mapsTo) setPath(mapped, field.mapsTo, value)
        }
      }

      const nameParts = String(checklist.candidate_name || "").trim().split(/\s+/)
      const firstName = mapped.firstName || nameParts[0] || "New"
      const lastName = mapped.lastName || nameParts.slice(1).join(" ") || "Hire"
      const email = String(mapped.email || checklist.candidate_email || "").trim().toLowerCase()
      if (!email) {
        return res.status(400).json({ success: false, message: "Email is required to create the employee" })
      }

      let user = checklist.user_id
        ? await User.findOne({ _id: checklist.user_id, org_id })
        : await User.findOne({ org_id, email })

      if (!user) {
        const inviterUser = await User.findById(actorId)
        const createResult = await AuthService.createEmployee(org_id, {
          email,
          firstName,
          lastName,
          role: "employee",
          department: mapped.department,
          position: mapped.position || checklist.job_title,
          phone: mapped.phone || checklist.candidate_phone,
          dateOfJoining: mapped.dateOfJoining ? new Date(mapped.dateOfJoining) : new Date(),
          employmentType: mapped.employmentType || "permanent",
          salary: mapped.salary != null && mapped.salary !== "" ? Number(mapped.salary) : undefined,
          status: "active",
          inviter_name: inviterUser ? `${inviterUser.firstName} ${inviterUser.lastName}` : "HR",
        } as any)
        if (!createResult.success || !createResult.data) {
          return res.status(400).json(createResult)
        }
        user = createResult.data as any
      }

      if (mapped.national_id) user.national_id = mapped.national_id
      if (mapped.kra_pin) user.kra_pin = mapped.kra_pin
      if (mapped.nssf_number) user.nssf_number = mapped.nssf_number
      if (mapped.sha_id) user.sha_id = mapped.sha_id
      if (mapped.bankDetails) {
        user.bankDetails = { ...(user.bankDetails || {}), ...mapped.bankDetails }
      }
      if (user.status === "preboarding" || user.status === "pending") {
        user.status = "active"
      }
      await user.save()

      checklist.user_id = String(user._id)
      checklist.status = "completed"
      checklist.converted_at = new Date()
      checklist.tasks.forEach((task) => {
        if (!task.completed) {
          task.completed = true
          task.completedAt = new Date()
          task.completedBy = actorId
        }
      })
      await checklist.save()

      return res.status(200).json({
        success: true,
        message: "Onboarding complete. Employee record created.",
        data: { checklist, user },
      })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to complete onboarding",
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
      if (checklist.status === "dropped") {
        return res.status(400).json({ success: false, message: "Dropped records cannot be updated" })
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
      if (checklist.status !== "completed") {
        checklist.status = allDone
          ? "in_progress"
          : anyDone
            ? "in_progress"
            : "not_started"
      }

      await checklist.save()

      return res.status(200).json({ success: true, data: checklist })
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message || "Failed to update task",
      })
    }
  }
}
