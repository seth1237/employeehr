import type { Response, Request } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import JobApplication from "../models/JobApplication"
import Job from "../models/Job"
import JobAnalytics from "../models/JobAnalytics"
import { User } from "../models/User"
import EmailService from "../services/email.service"
import path from "path"
import fs from "fs"

export class JobApplicationController {
  // PUBLIC: Submit application
  static async submitApplication(req: Request, res: Response) {
    try {
      const { job_id, form_id, applicant_name, applicant_email, applicant_phone, answers, resume_url, cover_letter, source } =
        req.body
      const device_fingerprint = String(req.body?.device_fingerprint || "").trim()
      const normalizedEmail = String(applicant_email || "").trim().toLowerCase()

      // Get job to find org_id
      const job = await Job.findById(job_id)
      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" })
      }

      // Prevent duplicate applications from the same device or email for the same job
      const duplicateQuery: any = {
        org_id: job.org_id,
        job_id,
        $or: [{ applicant_email: normalizedEmail }],
      }

      if (device_fingerprint) {
        duplicateQuery.$or.push({ device_fingerprint })
      }

      const duplicateApplication = await JobApplication.findOne(duplicateQuery)
      if (duplicateApplication) {
        return res.status(409).json({
          success: false,
          message: "You have already applied for this job from this device or email.",
        })
      }

      // Handle uploaded files
      const uploadedFiles: Record<string, string> = {}
      if (req.files && Array.isArray(req.files)) {
        req.files.forEach((file: Express.Multer.File) => {
          // The fieldname contains the field_id from the form
          uploadedFiles[file.fieldname] = file.path
        })
      }

      // Parse answers if it's a string
      let parsedAnswers = answers
      if (typeof answers === 'string') {
        try {
          parsedAnswers = JSON.parse(answers)
        } catch (e) {
          parsedAnswers = answers
        }
      }

      const application = await JobApplication.create({
        org_id: job.org_id,
        job_id,
        form_id,
        applicant_name,
        applicant_email: normalizedEmail,
        applicant_phone,
        device_fingerprint: device_fingerprint || undefined,
        answers: parsedAnswers,
        uploaded_files: Object.keys(uploadedFiles).length > 0 ? uploadedFiles : undefined,
        resume_url,
        cover_letter,
        source: source || "direct",
        timeline: [
          {
            status: "pending",
            changed_by: "system",
            changed_at: new Date(),
            comment: "Application submitted",
          },
        ],
      })

      // Update job applications count
      await Job.findByIdAndUpdate(job_id, { $inc: { applications_count: 1 } })

      // Update analytics
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      await JobAnalytics.findOneAndUpdate(
        { org_id: job.org_id, job_id, date: today },
        {
          $inc: {
            applications: 1,
            [`sources.${source || "direct"}`]: 1,
          },
          $setOnInsert: { org_id: job.org_id, job_id, date: today },
        },
        { upsert: true, new: true }
      )

      // Calculate and update conversion rate
      const analytics = await JobAnalytics.findOne({ org_id: job.org_id, job_id, date: today })
      if (analytics && analytics.views > 0) {
        analytics.conversion_rate = (analytics.applications / analytics.views) * 100
        await analytics.save()
      }

      // Send confirmation email to applicant
      EmailService.sendApplicationReceivedEmail(normalizedEmail, applicant_name, job.title, job.company_name, req.org_id).catch(
        console.error
      )

      // Send notification to HR
      const hrUsers = await User.find({ org_id: job.org_id, role: { $in: ["company_admin", "hr"] } })
      if (hrUsers.length > 0) {
        const applicationLink = `https://hr.codewithseth.co.ke/admin/applications/${application._id}`
        hrUsers.forEach((hr) => {
          EmailService.sendApplicationNotificationToHR(
            hr.email,
            applicant_name,
            job.title,
            applicationLink,
            req.org_id
          ).catch(console.error)
        })
      }

      res.status(201).json({
        success: true,
        message: "Application submitted successfully",
        data: application,
      })
    } catch (error) {
      if ((error as any)?.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You have already applied for this job.",
        })
      }
      console.error("Submit application error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to submit application",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get all applications for organization
  static async getAllApplications(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { job_id, status } = req.query
      const filter: any = { org_id: req.org_id }

      if (job_id) filter.job_id = job_id
      if (status) filter.status = status

      const applications = await JobApplication.find(filter).sort({ submitted_at: -1 })

      res.status(200).json({
        success: true,
        data: applications,
        count: applications.length,
      })
    } catch (error) {
      console.error("Get applications error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch applications",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get single application
  static async getApplicationById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { applicationId } = req.params
      const application = await JobApplication.findOne({ _id: applicationId, org_id: req.org_id })

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" })
      }

      res.status(200).json({
        success: true,
        data: application,
      })
    } catch (error) {
      console.error("Get application error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch application",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Update application status
  static async updateApplicationStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { applicationId } = req.params
      const { status, comment } = req.body

      const application = await JobApplication.findOne({ _id: applicationId, org_id: req.org_id })

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" })
      }

      application.status = status
      application.timeline.push({
        status,
        changed_by: req.user.userId,
        changed_at: new Date(),
        comment,
      })

      await application.save()

      // Send status update email to applicant
      const job = await Job.findById(application.job_id)
      if (job && status !== "pending") {
        EmailService.sendStatusUpdateEmail(
          application.applicant_email,
          application.applicant_name,
          job.title,
          status,
          comment,
          req.org_id
        ).catch(console.error)
      }

      res.status(200).json({
        success: true,
        message: "Application status updated successfully",
        data: application,
      })
    } catch (error) {
      console.error("Update application status error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update application status",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Add note to application
  static async addNote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { applicationId } = req.params
      const { note, type } = req.body

      const application = await JobApplication.findOneAndUpdate(
        { _id: applicationId, org_id: req.org_id },
        {
          $push: {
            notes: {
              note,
              created_by: req.user.userId,
              created_at: new Date(),
              type: type || "private",
            },
          },
        },
        { new: true }
      )

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" })
      }

      res.status(200).json({
        success: true,
        message: "Note added successfully",
        data: application,
      })
    } catch (error) {
      console.error("Add note error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to add note",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Rate application
  static async rateApplication(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { applicationId } = req.params
      const { rating } = req.body

      const application = await JobApplication.findOneAndUpdate(
        { _id: applicationId, org_id: req.org_id },
        { $set: { rating } },
        { new: true }
      )

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" })
      }

      res.status(200).json({
        success: true,
        message: "Application rated successfully",
        data: application,
      })
    } catch (error) {
      console.error("Rate application error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to rate application",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get application statistics
  static async getApplicationStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { job_id } = req.query
      const filter: any = { org_id: req.org_id }
      if (job_id) filter.job_id = job_id

      const stats = await JobApplication.aggregate([
        { $match: filter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgRating: { $avg: "$rating" },
          },
        },
      ])

      const totalApplications = await JobApplication.countDocuments(filter)

      res.status(200).json({
        success: true,
        data: {
          totalApplications,
          statusBreakdown: stats,
        },
      })
    } catch (error) {
      console.error("Get application stats error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch application statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Download uploaded file
  static async downloadFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { applicationId, fieldId } = req.params

      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const application = await JobApplication.findOne({
        _id: applicationId,
        org_id: req.org_id,
      })

      if (!application) {
        return res.status(404).json({ success: false, message: "Application not found" })
      }

      if (!application.uploaded_files || !application.uploaded_files[fieldId]) {
        return res.status(404).json({ success: false, message: "File not found" })
      }

      const filePath = application.uploaded_files[fieldId]
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: "File not found on server" })
      }

      // Get original filename from path
      const filename = path.basename(filePath)

      // Set headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Type', 'application/octet-stream')

      // Stream the file
      const fileStream = fs.createReadStream(filePath)
      fileStream.pipe(res)
    } catch (error) {
      console.error("Download file error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to download file",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
