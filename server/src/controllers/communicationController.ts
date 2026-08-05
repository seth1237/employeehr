import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import JobApplication from "../models/JobApplication"
import Job from "../models/Job"
import SentEmail from "../models/SentEmail"
import EmailService from "../services/email.service"

export class CommunicationController {
  // Get applicants for a job filtered by status
  static async getApplicantsByStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { job_id, status } = req.query

      if (!job_id || !status) {
        return res.status(400).json({ success: false, message: "job_id and status are required" })
      }

      const applications = await JobApplication.find({
        org_id: req.org_id,
        job_id: String(job_id),
        status: String(status),
      })

      res.status(200).json({
        success: true,
        data: applications,
        count: applications.length,
      })
    } catch (error) {
      console.error("Get applicants error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch applicants",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Send bulk email to applicants
  static async sendBulkEmail(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { job_id, applicant_ids, subject, body, include_notes } = req.body

      if (!job_id || !applicant_ids || !Array.isArray(applicant_ids) || applicant_ids.length === 0) {
        return res.status(400).json({ success: false, message: "job_id and applicant_ids array required" })
      }

      if (!subject || !body) {
        return res.status(400).json({ success: false, message: "subject and body are required" })
      }

      // Fetch job details
      const job = await Job.findById(job_id)
      if (!job) {
        return res.status(404).json({ success: false, message: "Job not found" })
      }

      // Fetch applicants
      const applicants = await JobApplication.find({
        _id: { $in: applicant_ids },
        org_id: req.org_id,
      })

      if (applicants.length === 0) {
        return res.status(404).json({ success: false, message: "No applicants found" })
      }

      let sentCount = 0
      const failedEmails: string[] = []

      // Send email to each applicant
      for (const applicant of applicants) {
        try {
          // Replace template variables
          let emailBody = body
            .replace(/{{applicant_name}}/g, applicant.applicant_name)
            .replace(/{{job_title}}/g, job.title)
            .replace(/{{company_name}}/g, job.company_name)

          // Append public notes if requested
          if (include_notes && applicant.notes && applicant.notes.length > 0) {
            const publicNotes = applicant.notes.filter((n) => n.type === "public")
            if (publicNotes.length > 0) {
              const notesText = publicNotes.map((n) => n.note).join("\n\n")
              emailBody += `\n\n---\nNotes:\n${notesText}`
            }
          }

          // Send email via EmailService
          await EmailService.sendBulkInterviewInviteEmail(
            applicant.applicant_email,
            applicant.applicant_name,
            subject,
            emailBody,
            req.org_id // Pass company ID for multi-tenant email support
          )
          sentCount++
        } catch (error) {
          console.error(`Failed to send email to ${applicant.applicant_email}:`, error)
          failedEmails.push(applicant.applicant_email)
        }
      }

      res.status(200).json({
        success: true,
        message: `Emails sent successfully`,
        data: {
          sentCount,
          failedCount: failedEmails.length,
          failedEmails,
        },
      })

      // Save sent email record
      await SentEmail.create({
        org_id: req.org_id,
        job_id,
        sender_id: req.user.userId,
        subject,
        body,
        recipient_count: applicants.length,
        sent_count: sentCount,
        failed_count: failedEmails.length,
        failed_emails: failedEmails,
        recipient_emails: applicants.map((a) => a.applicant_email),
        include_notes,
      })
    } catch (error) {
      console.error("Send bulk email error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to send emails",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get sent emails history
  static async getSentEmails(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { job_id } = req.query
      const filter: any = { org_id: req.org_id }

      if (job_id) filter.job_id = String(job_id)

      const sentEmails = await SentEmail.find(filter).sort({ created_at: -1 }).limit(100)

      res.status(200).json({
        success: true,
        data: sentEmails,
        count: sentEmails.length,
      })
    } catch (error) {
      console.error("Get sent emails error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch sent emails",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}

export default CommunicationController

