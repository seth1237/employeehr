import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import JobAnalytics from "../models/JobAnalytics"
import Job from "../models/Job"

export class JobAnalyticsController {
  // Get analytics for a specific job
  static async getJobAnalytics(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { jobId } = req.params
      const { startDate, endDate } = req.query

      const filter: any = { org_id: req.org_id, job_id: jobId }

      if (startDate || endDate) {
        filter.date = {}
        if (startDate) filter.date.$gte = new Date(startDate as string)
        if (endDate) filter.date.$lte = new Date(endDate as string)
      }

      const analytics = await JobAnalytics.find(filter).sort({ date: -1 })

      // Calculate totals
      const totals = analytics.reduce(
        (acc, day) => ({
          views: acc.views + day.views,
          applications: acc.applications + day.applications,
        }),
        { views: 0, applications: 0 }
      )

      const avgConversionRate = totals.views > 0 ? (totals.applications / totals.views) * 100 : 0

      // Aggregate sources
      const sourceAggregation: Record<string, number> = {}
      analytics.forEach((day) => {
        Object.entries(day.sources).forEach(([source, count]) => {
          sourceAggregation[source] = (sourceAggregation[source] || 0) + count
        })
      })

      res.status(200).json({
        success: true,
        data: {
          dailyAnalytics: analytics,
          totals: {
            ...totals,
            avgConversionRate: Math.round(avgConversionRate * 100) / 100,
          },
          sourceBreakdown: sourceAggregation,
        },
      })
    } catch (error) {
      console.error("Get job analytics error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch job analytics",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get analytics overview for all jobs
  static async getAnalyticsOverview(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { startDate, endDate } = req.query
      const filter: any = { org_id: req.org_id }

      if (startDate || endDate) {
        filter.date = {}
        if (startDate) filter.date.$gte = new Date(startDate as string)
        if (endDate) filter.date.$lte = new Date(endDate as string)
      }

      const analytics = await JobAnalytics.find(filter)

      // Aggregate by job
      const jobStats: Record<
        string,
        { views: number; applications: number; conversionRate: number }
      > = {}

      analytics.forEach((record) => {
        if (!jobStats[record.job_id]) {
          jobStats[record.job_id] = { views: 0, applications: 0, conversionRate: 0 }
        }
        jobStats[record.job_id].views += record.views
        jobStats[record.job_id].applications += record.applications
      })

      // Calculate conversion rates
      Object.keys(jobStats).forEach((jobId) => {
        const stats = jobStats[jobId]
        stats.conversionRate =
          stats.views > 0 ? Math.round((stats.applications / stats.views) * 10000) / 100 : 0
      })

      // Get job details
      const jobIds = Object.keys(jobStats)
      const jobs = await Job.find({ _id: { $in: jobIds }, org_id: req.org_id })

      const jobAnalytics = jobs.map((job) => ({
        job_id: job._id,
        job_title: job.title,
        department: job.department,
        status: job.status,
        ...jobStats[job._id.toString()],
      }))

      // Overall totals
      const totals = Object.values(jobStats).reduce(
        (acc, stats) => ({
          views: acc.views + stats.views,
          applications: acc.applications + stats.applications,
        }),
        { views: 0, applications: 0 }
      )

      const overallConversionRate =
        totals.views > 0 ? Math.round((totals.applications / totals.views) * 10000) / 100 : 0

      res.status(200).json({
        success: true,
        data: {
          jobAnalytics,
          totals: {
            ...totals,
            conversionRate: overallConversionRate,
          },
        },
      })
    } catch (error) {
      console.error("Get analytics overview error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch analytics overview",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Track job view (called when someone views a job posting)
  static async trackJobView(req: AuthenticatedRequest, res: Response) {
    try {
      const { jobId } = req.params
      const { source } = req.body

      const job = await Job.findById(jobId)
      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" })
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      await JobAnalytics.findOneAndUpdate(
        { org_id: job.org_id, job_id: jobId, date: today },
        {
          $inc: {
            views: 1,
            [`sources.${source || "direct"}`]: 1,
          },
          $setOnInsert: { org_id: job.org_id, job_id: jobId, date: today },
        },
        { upsert: true, new: true }
      )

      res.status(200).json({
        success: true,
        message: "View tracked successfully",
      })
    } catch (error) {
      console.error("Track job view error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to track view",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
