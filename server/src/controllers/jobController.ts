import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import Job from "../models/Job"
import { Company } from "../models/Company"
import JobAnalytics from "../models/JobAnalytics"
import { Request } from "express"

export class JobController {
  // Helper to generate company slug from name
  private static generateCompanySlug(companyName: string): string {
    return companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  private static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }

  private static async findCompanyForPublicJob(companyKey: string) {
    const normalizedKey = JobController.generateCompanySlug(companyKey)
    const escapedKey = JobController.escapeRegExp(companyKey)
    const escapedSlug = JobController.escapeRegExp(normalizedKey)

    return Company.findOne({
      $or: [
        { slug: normalizedKey },
        { name: new RegExp(`^${escapedKey}$`, "i") },
        { slug: new RegExp(`^${escapedSlug}(?:-|$)`, "i") },
        { name: new RegExp(`\\b${escapedKey}\\b`, "i") },
      ],
    }).select("_id slug name")
  }

  // Helper to get next position index for a company
  private static async getNextPositionIndex(org_id: string): Promise<number> {
    const lastJob = await Job.findOne({ org_id }).sort({ position_index: -1 })
    return lastJob ? lastJob.position_index + 1 : 1
  }

  // Create a new job
  static async createJob(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      // Get company details
      const company = await Company.findOne({ _id: req.org_id })
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      const companyName = company.name
      const companySlug = company.slug ?? JobController.generateCompanySlug(companyName)
      const positionIndex = await JobController.getNextPositionIndex(req.org_id)

      // Generate share link
      const shareLink = `${companySlug}/${positionIndex}`

      const jobData = {
        ...req.body,
        org_id: req.org_id,
        company_name: companyName,
        position_index: positionIndex,
        created_by: req.user.userId,
        status: req.body?.status || "open",
        share_link: shareLink,
      }

      const job = await Job.create(jobData)

      res.status(201).json({
        success: true,
        message: "Job created successfully",
        data: job,
        shareUrl: `https://hr.codewithseth.co.ke/careers/${shareLink}`,
      })
    } catch (error) {
      console.error("Create job error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to create job",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get all jobs for organization
  static async getAllJobs(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { status, department } = req.query
      const filter: any = { org_id: req.org_id }

      if (status) filter.status = status
      if (department) filter.department = department

      const jobs = await Job.find(filter).sort({ created_at: -1 })

      res.status(200).json({
        success: true,
        data: jobs,
        count: jobs.length,
      })
    } catch (error) {
      console.error("Get jobs error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch jobs",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get single job by ID
  static async getJobById(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { jobId } = req.params
      const job = await Job.findOne({ _id: jobId, org_id: req.org_id })

      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" })
      }

      res.status(200).json({
        success: true,
        data: job,
      })
    } catch (error) {
      console.error("Get job error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch job",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Update job
  static async updateJob(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { jobId } = req.params
      
      // Don't allow updating these fields
      delete req.body.org_id
      delete req.body.position_index
      delete req.body.share_link
      delete req.body.company_name

      const job = await Job.findOneAndUpdate(
        { _id: jobId, org_id: req.org_id },
        { $set: req.body },
        { new: true, runValidators: true }
      )

      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" })
      }

      res.status(200).json({
        success: true,
        message: "Job updated successfully",
        data: job,
      })
    } catch (error) {
      console.error("Update job error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update job",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Delete job
  static async deleteJob(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { jobId } = req.params
      const job = await Job.findOneAndDelete({ _id: jobId, org_id: req.org_id })

      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" })
      }

      res.status(200).json({
        success: true,
        message: "Job deleted successfully",
      })
    } catch (error) {
      console.error("Delete job error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to delete job",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get job statistics
  static async getJobStats(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const stats = await Job.aggregate([
        { $match: { org_id: req.org_id } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalViews: { $sum: "$views" },
            totalApplications: { $sum: "$applications_count" },
          },
        },
      ])

      const totalJobs = await Job.countDocuments({ org_id: req.org_id })
      const openJobs = await Job.countDocuments({ org_id: req.org_id, status: "open" })

      res.status(200).json({
        success: true,
        data: {
          totalJobs,
          openJobs,
          statusBreakdown: stats,
        },
      })
    } catch (error) {
      console.error("Get job stats error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch job statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // PUBLIC: Get job by company name and position index
  static async getPublicJob(req: Request, res: Response) {
    try {
      const { companyName, positionIndex } = req.params
      const { source } = req.query
      const companyKey = decodeURIComponent(String(companyName || "")).trim()
      const positionKey = String(positionIndex || "").trim()
      const shareLink = `${companyKey}/${positionKey}`
      const normalizedShareLink = `${JobController.generateCompanySlug(companyKey)}/${positionKey}`

      // Fetch by share link first; fallback to company slug/name + position index for older records
      let job = await Job.findOne({
        share_link: new RegExp(`^(?:${JobController.escapeRegExp(shareLink)}|${JobController.escapeRegExp(normalizedShareLink)})$`, "i"),
      })

      if (!job) {
        const company = await JobController.findCompanyForPublicJob(companyKey)
        const numericPositionIndex = Number(positionKey)

        if (company && !Number.isNaN(numericPositionIndex)) {
          job = await Job.findOne({ org_id: company._id.toString(), position_index: numericPositionIndex })
        }
      }

      if (!job) {
        job = await Job.findOne({
          share_link: new RegExp(
            `^${JobController.escapeRegExp(JobController.generateCompanySlug(companyKey))}(?:-|/).*\\/${JobController.escapeRegExp(positionKey)}$`,
            "i",
          ),
        })
      }

      if (!job) {
        return res.status(404).json({
          success: false,
          message: "Job not found or no longer available",
        })
      }

      if (job.status !== "open") {
        return res.status(403).json({
          success: false,
          message: "This job is not open for applications",
        })
      }

      // Increment view count
      await Job.findByIdAndUpdate(job._id, { $inc: { views: 1 } })

      // Track analytics
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      await JobAnalytics.findOneAndUpdate(
        { org_id: job.org_id, job_id: job._id.toString(), date: today },
        {
          $inc: {
            views: 1,
            [`sources.${source || "direct"}`]: 1,
          },
          $setOnInsert: { org_id: job.org_id, job_id: job._id.toString(), date: today },
        },
        { upsert: true, new: true }
      )

      res.status(200).json({
        success: true,
        data: job,
      })
    } catch (error) {
      console.error("Get public job error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch job",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // PUBLIC: Get all open jobs for a company
  static async getCompanyPublicJobs(req: Request, res: Response) {
    try {
      const { companyName } = req.params
      const companyKey = decodeURIComponent(String(companyName || "")).trim()
      const normalizedKey = JobController.generateCompanySlug(companyKey)
      const company = await JobController.findCompanyForPublicJob(companyKey)
      const escapedCompanyKey = JobController.escapeRegExp(companyKey)
      const escapedNormalizedKey = JobController.escapeRegExp(normalizedKey)

      const filters: any[] = [
        { share_link: new RegExp(`^${escapedCompanyKey}/`, "i") },
        { share_link: new RegExp(`^${escapedNormalizedKey}/`, "i") },
      ]

      if (company) {
        filters.push({ org_id: company._id.toString() })
      }
      
      const jobs = await Job.find({
        $or: filters,
        status: "open",
      }).sort({ created_at: -1 })

      res.status(200).json({
        success: true,
        data: jobs,
        count: jobs.length,
      })
    } catch (error) {
      console.error("Get company public jobs error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch jobs",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
