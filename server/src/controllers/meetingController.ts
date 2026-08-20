import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Meeting } from "../models/Meeting"
import { User } from "../models/User"
import { Task } from "../models/Task"
import { AIAnalysisService } from "../services/aiAnalysisService"
import { emailService } from "../services/emailService"
import { meetingInvitationEmail } from "../lib/email-templates"
import { AIMeetingService } from "../services/aiMeetingService"
import crypto from "crypto"

const aiService = new AIAnalysisService()
const aiMeetingService = new AIMeetingService()

/**
 * Generate a unique meeting ID
 */
function generateMeetingId(): string {
  return crypto.randomBytes(6).toString('hex') // 12-character hex string
}

/**
 * Generate meeting link
 */
function generateMeetingLink(meetingId: string, baseUrl?: string): string {
  const configuredBase = baseUrl || process.env.FRONTEND_URL || "https://hr.codewithseth.co.ke"
  const shouldForceProductionUrl =
    process.env.NODE_ENV === "production" &&
    /localhost|127\.0\.0\.1/i.test(configuredBase)

  const base = shouldForceProductionUrl
    ? "https://hr.codewithseth.co.ke"
    : configuredBase

  return `${base}/meeting/${meetingId}`
}

export class MeetingController {
  /**
   * Create a new meeting
   */
  static async createMeeting(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const organizer_id = req.user?.userId

      const {
        title,
        description,
        scheduled_at,
        duration_minutes,
        meeting_type,
        attendees,
        agenda,
        require_password,
        password,
      } = req.body

      console.log('Received attendees:', JSON.stringify(attendees))

      // Validate required fields
      if (!title || !scheduled_at) {
        return res.status(400).json({
          success: false,
          message: "Title and scheduled time are required",
        })
      }

      // Generate unique meeting ID and link
      const meeting_id = generateMeetingId()
      const meeting_link = generateMeetingLink(meeting_id)

      // Format attendees - ensure they have the correct structure
      let formattedAttendees: any[] = []
      
      if (attendees && Array.isArray(attendees) && attendees.length > 0) {
        formattedAttendees = attendees.map((item: any) => {
          // Handle if already formatted as object
          if (typeof item === 'object' && item.user_id) {
            return {
              user_id: item.user_id,
              status: item.status || "invited",
              attended: item.attended || false,
            }
          }
          // Handle if just a user ID string
          if (typeof item === 'string') {
            return {
              user_id: item,
              status: "invited",
              attended: false,
            }
          }
          return null
        }).filter(Boolean)
      }

      console.log('Formatted attendees:', JSON.stringify(formattedAttendees))

      const meeting = await Meeting.create({
        org_id,
        organizer_id,
        title,
        description,
        scheduled_at: new Date(scheduled_at),
        duration_minutes: duration_minutes || 60,
        meeting_type: meeting_type || "video",
        meeting_id,
        meeting_link,
        password: require_password ? password : undefined,
        require_password: require_password || false,
        attendees: formattedAttendees,
        agenda,
        status: "scheduled",
      })

      // Send invitation emails to attendees if any
      if (formattedAttendees.length > 0) {
        try {
          const attendeeUsers = await User.find({
            _id: { $in: formattedAttendees.map((a) => a.user_id) },
          })

          console.log(`Found ${attendeeUsers.length} attendee users out of ${formattedAttendees.length} attendees`)

          for (const user of attendeeUsers) {
            try {
              console.log(`Sending meeting invitation email to: ${user.email}`)
              await emailService.sendEmail({
                to: user.email,
                subject: `Meeting invitation: ${title}`,
                companyId: org_id,
                html: meetingInvitationEmail({
                  title,
                  scheduledAt: new Date(scheduled_at).toLocaleString(),
                  durationMinutes: duration_minutes || 60,
                  description,
                  agenda,
                  meetingLink: meeting_link,
                  meetingId: meeting_id,
                  password: require_password ? password : undefined,
                }),
              })
              console.log(`✓ Email sent successfully to: ${user.email}`)
            } catch (emailError) {
              console.error(`✗ Failed to send email to ${user.email}:`, emailError)
              // Continue sending to other attendees even if one fails
            }
          }
        } catch (attendeeError) {
          console.error("Error fetching or emailing attendees:", attendeeError)
          // Don't fail the whole request if email sending has issues
        }
      }

      res.status(201).json({ success: true, data: meeting })
    } catch (error: any) {
      console.error("Create meeting error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Get all meetings for organization
   */
  static async getMeetings(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const user_id = req.user?.userId
      const { status, type } = req.query

      const query: any = {
        org_id,
        $or: [{ organizer_id: user_id }, { "attendees.user_id": user_id }],
      }

      if (status) query.status = status
      if (type) query.meeting_type = type

      const meetings = await Meeting.find(query)
        .sort({ scheduled_at: -1 })
        .lean()

      // Populate organizer and attendee details
      const meetingsWithDetails = await Promise.all(
        meetings.map(async (meeting) => {
          const organizer = await User.findById(meeting.organizer_id).select(
            "firstName lastName email employee_id"
          )

          const attendeeDetails = await Promise.all(
            meeting.attendees.map(async (attendee) => {
              const user = await User.findById(attendee.user_id).select(
                "firstName lastName email employee_id"
              )
              return {
                ...attendee,
                user,
              }
            })
          )

          return {
            ...meeting,
            organizer,
            attendees: attendeeDetails,
          }
        })
      )

      res.status(200).json({ success: true, data: meetingsWithDetails })
    } catch (error: any) {
      console.error("Get meetings error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Get meeting by ID
   */
  static async getMeetingById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const org_id = req.user?.org_id

      const meeting = await Meeting.findOne({ _id: id, org_id }).lean()

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      // Populate organizer and attendee details
      const organizer = await User.findById(meeting.organizer_id).select(
        "firstName lastName email employee_id position"
      )

      const attendeeDetails = await Promise.all(
        meeting.attendees.map(async (attendee) => {
          const user = await User.findById(attendee.user_id).select(
            "firstName lastName email employee_id position department"
          )
          return {
            ...attendee,
            user,
          }
        })
      )

      res.status(200).json({
        success: true,
        data: {
          ...meeting,
          organizer,
          attendees: attendeeDetails,
        },
      })
    } catch (error: any) {
      console.error("Get meeting error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Get meeting by meeting_id (for public links - no auth required)
   */
  static async getMeetingByMeetingIdPublic(req: any, res: Response) {
    try {
      const { meetingId } = req.params
      const { password } = req.query

      const meeting = await Meeting.findOne({ meeting_id: meetingId }).lean()

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      // Check password if required
      if (meeting.require_password) {
        if (!password || password !== meeting.password) {
          return res.status(403).json({ 
            success: false, 
            message: "Invalid or missing password",
            require_password: true
          })
        }
      }

      // Populate organizer and attendee details
      const organizer = await User.findById(meeting.organizer_id).select(
        "firstName lastName email employee_id position"
      )

      const attendeeDetails = await Promise.all(
        meeting.attendees.map(async (attendee) => {
          const user = await User.findById(attendee.user_id).select(
            "firstName lastName email employee_id position department"
          )
          return {
            ...attendee,
            user,
          }
        })
      )

      res.status(200).json({
        success: true,
        data: {
          ...meeting,
          organizer,
          attendees: attendeeDetails,
        },
      })
    } catch (error: any) {
      console.error("Get meeting by meeting_id error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Public guest join by meeting_id (no auth required)
   */
  static async joinMeetingByMeetingIdPublic(req: any, res: Response) {
    try {
      const { meetingId } = req.params
      const { firstName, lastName, password, guest_id } = req.body || {}

      const normalizedFirstName = String(firstName || "").trim()
      const normalizedLastName = String(lastName || "").trim()

      if (!normalizedFirstName || !normalizedLastName) {
        return res.status(400).json({
          success: false,
          message: "First name and last name are required",
        })
      }

      const meeting = await Meeting.findOne({ meeting_id: meetingId })

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      if (meeting.require_password) {
        if (!password || password !== meeting.password) {
          return res.status(403).json({
            success: false,
            message: "Invalid or missing password",
            require_password: true,
          })
        }
      }

      const displayName = `${normalizedFirstName} ${normalizedLastName}`.trim()
      const generatedGuestId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const guestUserId =
        typeof guest_id === "string" && guest_id.trim().startsWith("guest_")
          ? guest_id.trim()
          : generatedGuestId

      const attendeeIndex = meeting.attendees.findIndex((attendee) => attendee.user_id === guestUserId)

      if (attendeeIndex >= 0) {
        meeting.attendees[attendeeIndex].attended = true
        meeting.attendees[attendeeIndex].joined_at = new Date()
        meeting.attendees[attendeeIndex].status = "accepted"
        ;(meeting.attendees[attendeeIndex] as any).display_name = displayName
        ;(meeting.attendees[attendeeIndex] as any).is_guest = true
      } else {
        meeting.attendees.push({
          user_id: guestUserId,
          display_name: displayName,
          is_guest: true,
          status: "accepted",
          attended: true,
          joined_at: new Date(),
        } as any)
      }

      await meeting.save()

      const organizer = await User.findById(meeting.organizer_id).select(
        "firstName lastName email employee_id position"
      )

      const attendeeDetails = await Promise.all(
        meeting.attendees.map(async (attendee: any) => {
          const user = await User.findById(attendee.user_id).select(
            "firstName lastName email employee_id position department"
          )
          return {
            ...attendee.toObject(),
            user,
          }
        })
      )

      return res.status(200).json({
        success: true,
        message: "Joined meeting successfully",
        data: {
          guest_user_id: guestUserId,
          meeting: {
            ...meeting.toObject(),
            organizer,
            attendees: attendeeDetails,
          },
        },
      })
    } catch (error: any) {
      console.error("Public join meeting error:", error)
      return res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Get meeting by meeting_id (for public links - authenticated)
   */
  static async getMeetingByMeetingId(req: AuthenticatedRequest, res: Response) {
    try {
      const { meetingId } = req.params
      const { password } = req.query
      const org_id = req.user?.org_id

      const meeting = await Meeting.findOne({ meeting_id: meetingId, org_id }).lean()

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      // Check password if required
      if (meeting.require_password) {
        if (!password || password !== meeting.password) {
          return res.status(403).json({ 
            success: false, 
            message: "Invalid or missing password" 
          })
        }
      }

      // Populate organizer and attendee details
      const organizer = await User.findById(meeting.organizer_id).select(
        "firstName lastName email employee_id position"
      )

      const attendeeDetails = await Promise.all(
        meeting.attendees.map(async (attendee) => {
          const user = await User.findById(attendee.user_id).select(
            "firstName lastName email employee_id position department"
          )
          return {
            ...attendee,
            user,
          }
        })
      )

      res.status(200).json({
        success: true,
        data: {
          ...meeting,
          organizer,
          attendees: attendeeDetails,
        },
      })
    } catch (error: any) {
      console.error("Get meeting by meeting_id error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Update meeting status
   */
  static async updateMeetingStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { status } = req.body
      const org_id = req.user?.org_id

      const meeting = await Meeting.findOneAndUpdate(
        { _id: id, org_id },
        { status },
        { new: true }
      )

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      res.status(200).json({ success: true, data: meeting })
    } catch (error: any) {
      console.error("Update meeting status error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Upload transcript and trigger AI analysis
   */
  static async uploadTranscript(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { transcript } = req.body
      const org_id = req.user?.org_id

      if (!transcript) {
        return res.status(400).json({ success: false, message: "Transcript is required" })
      }

      const meeting = await Meeting.findOne({ _id: id, org_id })

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      // Save transcript
      meeting.transcript = transcript
      meeting.ai_processing_status = "pending"
      await meeting.save()

      // Trigger AI analysis asynchronously
      MeetingController.processTranscriptWithAI(id, org_id).catch((error) => {
        console.error("AI processing failed:", error)
      })

      res.status(200).json({
        success: true,
        message: "Transcript uploaded, AI analysis in progress",
        data: meeting,
      })
    } catch (error: any) {
      console.error("Upload transcript error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Process transcript with AI (async background job)
   */
  static async processTranscriptWithAI(meetingId: string, org_id: string) {
    try {
      const meeting = await Meeting.findOne({ _id: meetingId, org_id })

      if (!meeting || !meeting.transcript) {
        throw new Error("Meeting or transcript not found")
      }

      meeting.ai_processing_status = "processing"
      await meeting.save()

      // Get attendee details for AI context
      const attendeeDetails = await Promise.all(
        meeting.attendees.map(async (attendee) => {
          const user = await User.findById(attendee.user_id)
          return {
            user_id: attendee.user_id,
            user_name: user ? `${user.firstName} ${user.lastName}` : "Unknown",
          }
        })
      )

      // Analyze with AI
      const analysis = await aiService.analyzeMeetingTranscript(
        meeting.transcript,
        attendeeDetails
      )

      // Update meeting with AI analysis
      meeting.ai_summary = analysis.summary
      meeting.key_points = analysis.key_points
      meeting.action_items = analysis.action_items
      meeting.ai_processed = true
      meeting.ai_processing_status = "completed"
      await meeting.save()

      // Create tasks for action items
      for (const actionItem of analysis.action_items) {
        if (actionItem.assigned_to !== "unassigned") {
          const task = await Task.create({
            org_id,
            user_id: actionItem.assigned_to,
            title: actionItem.description,
            description: `Action item from meeting: ${meeting.title}`,
            status: "todo",
            priority: "medium",
            due_date: actionItem.due_date,
            created_by: meeting.organizer_id,
            is_ai_reminder: true,
            meeting_id: meeting._id,
          })

          // Update action item with task ID
          const actionItemIndex = meeting.action_items.findIndex(
            (item) => item.description === actionItem.description
          )
          if (actionItemIndex !== -1) {
            meeting.action_items[actionItemIndex].task_id = task._id.toString()
          }
        }
      }

      await meeting.save()

      // Send summary emails to all attendees
      const summaryHtml = aiService.generateSummaryEmail(
        meeting.title,
        meeting.scheduled_at,
        analysis.summary,
        analysis.key_points,
        analysis.action_items
      )

      for (const attendee of meeting.attendees) {
        const user = await User.findById(attendee.user_id)
        if (user) {
          await emailService.sendEmail({
            to: user.email,
            subject: `Meeting Summary: ${meeting.title}`,
            html: summaryHtml,
            companyId: org_id,
          })
        }
      }

      console.log(`✅ AI processing completed for meeting: ${meeting.title}`)
    } catch (error: any) {
      console.error("AI processing error:", error)
      await Meeting.findOneAndUpdate(
        { _id: meetingId, org_id },
        {
          ai_processing_status: "failed",
          ai_processing_error: error.message,
        }
      )
    }
  }

  /**
   * Get upcoming meetings
   */
  static async getUpcomingMeetings(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const user_id = req.user?.userId

      const meetings = await Meeting.find({
        org_id,
        $or: [{ organizer_id: user_id }, { "attendees.user_id": user_id }],
        scheduled_at: { $gte: new Date() },
        status: { $in: ["scheduled", "in-progress"] },
      })
        .sort({ scheduled_at: 1 })
        .limit(10)
        .lean()

      res.status(200).json({ success: true, data: meetings })
    } catch (error: any) {
      console.error("Get upcoming meetings error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Delete meeting
   */
  static async deleteMeeting(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const org_id = req.user?.org_id
      const user_id = req.user?.userId

      const meeting = await Meeting.findOne({ _id: id, org_id })

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      // Only organizer can delete
      if (meeting.organizer_id !== user_id) {
        return res
          .status(403)
          .json({ success: false, message: "Only organizer can delete meetings" })
      }

      await Meeting.deleteOne({ _id: id })

      res.status(200).json({ success: true, message: "Meeting deleted" })
    } catch (error: any) {
      console.error("Delete meeting error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Process meeting with AI - transcribe, analyze, and create tasks
   */
  static async processWithAI(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { audioUrl, transcript } = req.body
      const org_id = req.user?.org_id
      const user_id = req.user?.userId

      const meeting = await Meeting.findOne({ _id: id, org_id })

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      // Update status to processing
      meeting.ai_processing_status = "processing"
      meeting.status = "in-progress"
      await meeting.save()

      // Start async processing
      MeetingController.processMeetingWithAIAsync(
        id,
        org_id,
        audioUrl,
        transcript,
        user_id,
      ).catch((error) => {
        console.error("AI processing failed:", error)
      })

      res.status(200).json({
        success: true,
        message: "Meeting AI processing started",
        data: meeting,
      })
    } catch (error: any) {
      console.error("Process with AI error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Async AI processing function
   */
  static async processMeetingWithAIAsync(
    meetingId: string,
    org_id: string,
    audioUrl?: string,
    transcript?: string,
    organizerId?: string,
  ) {
    try {
      const meeting = await Meeting.findOne({ _id: meetingId, org_id })

      if (!meeting) {
        throw new Error("Meeting not found")
      }

      let finalTranscript = transcript

      // Step 1: Transcribe audio if provided
      if (audioUrl && !transcript) {
        console.log("🎤 Transcribing audio...")
        finalTranscript = await aiMeetingService.transcribeAudio(audioUrl)
      }

      if (!finalTranscript) {
        throw new Error("No transcript provided or generated")
      }

      meeting.transcript = finalTranscript
      await meeting.save()

      // Step 2: Get attendee emails for AI context
      const attendeeEmails = await Promise.all(
        meeting.attendees.map(async (attendee) => {
          const user = await User.findById(attendee.user_id)
          return user?.email || ""
        }),
      )

      // Step 3: Analyze meeting with AI
      console.log("🤖 Analyzing meeting...")
      const analysis = await aiMeetingService.analyzeMeeting(
        finalTranscript,
        attendeeEmails.filter((e) => e),
      )

      // Step 4: Generate detailed report
      console.log("📊 Generating report...")
      const reportHtml = await aiMeetingService.generateMeetingReport(
        finalTranscript,
        analysis,
        meeting.title,
      )

      // Step 5: Update meeting with analysis
      meeting.ai_summary = analysis.summary
      meeting.key_points = analysis.keyPoints
      meeting.action_items = analysis.actionItems.map((item) => ({
        description: item.description,
        assigned_to: item.assigned_to,
        due_date: item.due_date,
        task_id: undefined,
      }))
      meeting.ai_processed = true
      meeting.ai_processing_status = "completed"
      meeting.status = "completed"
      await meeting.save()

      // Step 6: Create tasks from action items
      console.log("✅ Creating tasks...")
      const taskIds = await aiMeetingService.createTasksFromActionItems(
        meetingId,
        analysis.actionItems,
        org_id,
        organizerId || meeting.organizer_id,
      )

      // Update action items with task IDs
      for (let i = 0; i < meeting.action_items.length; i++) {
        if (i < taskIds.length) {
          meeting.action_items[i].task_id = taskIds[i]
        }
      }
      await meeting.save()

      // Step 7: Send reports to attendees
      console.log("📧 Sending reports to attendees...")
      await aiMeetingService.sendMeetingReportsToAttendees(
        meeting,
        reportHtml,
        analysis,
        async (email: string, subject: string, html: string) => {
          await emailService.sendEmail({ to: email, subject, html, companyId: org_id })
        },
      )

      console.log(`✅ AI processing completed for meeting: ${meeting.title}`)
    } catch (error: any) {
      console.error("AI processing error:", error)
      await Meeting.findOneAndUpdate(
        { _id: meetingId, org_id },
        {
          ai_processing_status: "failed",
          ai_processing_error: error.message,
        },
      )
    }
  }

  /**
   * Get meeting report
   */
  static async getMeetingReport(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const org_id = req.user?.org_id

      const meeting = await Meeting.findOne({ _id: id, org_id })

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      if (!meeting.ai_processed) {
        return res.status(400).json({
          success: false,
          message: "Meeting has not been processed by AI yet",
        })
      }

      res.status(200).json({
        success: true,
        data: {
          summary: meeting.ai_summary,
          keyPoints: meeting.key_points,
          actionItems: meeting.action_items,
          sentiment: "positive", // TODO: Add sentiment from analysis
          transcript: meeting.transcript,
          processing_status: meeting.ai_processing_status,
        },
      })
    } catch (error: any) {
      console.error("Get meeting report error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Start live meeting (update status)
   */
  static async startMeeting(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const org_id = req.user?.org_id
      const user_id = req.user?.userId

      const meeting = await Meeting.findOne({ _id: id, org_id })

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      meeting.status = "in-progress"
      if (!meeting.actual_start_time) {
        meeting.actual_start_time = new Date()
      }

      if (user_id) {
        const attendeeIndex = meeting.attendees.findIndex((a: any) => a.user_id === user_id)
        if (attendeeIndex >= 0) {
          meeting.attendees[attendeeIndex].attended = true
          meeting.attendees[attendeeIndex].status = "accepted"
          meeting.attendees[attendeeIndex].joined_at = new Date()
        } else {
          meeting.attendees.push({
            user_id,
            status: "accepted",
            attended: true,
            joined_at: new Date(),
          } as any)
        }
      }

      await meeting.save()

      res.status(200).json({
        success: true,
        message: "Meeting started",
        data: meeting,
      })
    } catch (error: any) {
      console.error("Start meeting error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * End meeting (update status and trigger AI)
   */
  static async endMeeting(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const { audioUrl, transcript } = req.body
      const org_id = req.user?.org_id
      const user_id = req.user?.userId

      const meeting = await Meeting.findOneAndUpdate(
        { _id: id, org_id },
        { 
          status: "completed",
          actual_end_time: new Date()
        },
        { new: true },
      )

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      // Trigger AI processing if transcript or audio provided
      if (audioUrl || transcript) {
        MeetingController.processMeetingWithAIAsync(id, org_id, audioUrl, transcript, user_id).catch(
          (error) => {
            console.error("AI processing failed:", error)
          },
        )
      }

      res.status(200).json({
        success: true,
        message: "Meeting ended",
        data: meeting,
      })
    } catch (error: any) {
      console.error("End meeting error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * User joins meeting - track join time
   */
  static async joinMeeting(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const org_id = req.user?.org_id
      const user_id = req.user?.userId

      const meeting = await Meeting.findOne({ _id: id, org_id })

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      // Find attendee and update join time
      const attendeeIndex = meeting.attendees.findIndex(
        (a) => a.user_id === user_id
      )

      if (attendeeIndex === -1) {
        const organizerCanJoin = meeting.organizer_id === user_id

        if (!organizerCanJoin) {
          return res.status(403).json({ 
            success: false, 
            message: "You are not invited to this meeting" 
          })
        }

        meeting.attendees.push({
          user_id: user_id as string,
          status: "accepted",
          attended: true,
          joined_at: new Date(),
        } as any)

        if (!meeting.actual_start_time) {
          meeting.actual_start_time = new Date()
          meeting.status = "in-progress"
        }

        await meeting.save()

        const newlyAdded = meeting.attendees[meeting.attendees.length - 1]
        return res.status(200).json({
          success: true,
          message: "Joined meeting successfully",
          data: {
            joined_at: newlyAdded.joined_at,
            meeting_status: meeting.status,
          },
        })
      }

      meeting.attendees[attendeeIndex].joined_at = new Date()
      meeting.attendees[attendeeIndex].attended = true

      // If this is the first attendee, set meeting as started
      if (!meeting.actual_start_time) {
        meeting.actual_start_time = new Date()
        meeting.status = "in-progress"
      }

      await meeting.save()

      res.status(200).json({
        success: true,
        message: "Joined meeting successfully",
        data: {
          joined_at: meeting.attendees[attendeeIndex].joined_at,
          meeting_status: meeting.status,
        },
      })
    } catch (error: any) {
      console.error("Join meeting error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * User leaves meeting - track leave time and calculate duration
   */
  static async leaveMeeting(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params
      const org_id = req.user?.org_id
      const user_id = req.user?.userId

      const meeting = await Meeting.findOne({ _id: id, org_id })

      if (!meeting) {
        return res.status(404).json({ success: false, message: "Meeting not found" })
      }

      // Find attendee and update leave time
      const attendeeIndex = meeting.attendees.findIndex(
        (a) => a.user_id === user_id
      )

      if (attendeeIndex === -1) {
        return res.status(403).json({ 
          success: false, 
          message: "You are not an attendee of this meeting" 
        })
      }

      const attendee = meeting.attendees[attendeeIndex]
      attendee.left_at = new Date()

      // Calculate duration if joined_at exists
      if (attendee.joined_at) {
        const durationMs = attendee.left_at.getTime() - attendee.joined_at.getTime()
        attendee.duration_minutes = Math.round(durationMs / 1000 / 60)
      }

      await meeting.save()

      res.status(200).json({
        success: true,
        message: "Left meeting successfully",
        data: {
          left_at: attendee.left_at,
          duration_minutes: attendee.duration_minutes,
        },
      })
    } catch (error: any) {
      console.error("Leave meeting error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Get meeting time statistics for a user (KPI tracking)
   */
  static async getUserMeetingStats(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const user_id = req.user?.userId
      const { startDate, endDate } = req.query

      const dateFilter: any = { org_id }
      if (startDate || endDate) {
        dateFilter.scheduled_at = {}
        if (startDate) dateFilter.scheduled_at.$gte = new Date(startDate as string)
        if (endDate) dateFilter.scheduled_at.$lte = new Date(endDate as string)
      }

      // Find all meetings where user is an attendee
      const meetings = await Meeting.find({
        ...dateFilter,
        "attendees.user_id": user_id,
      })

      let totalMeetings = 0
      let totalMinutes = 0
      let attendedMeetings = 0
      let missedMeetings = 0
      let averageDuration = 0

      meetings.forEach((meeting) => {
        const attendee = meeting.attendees.find((a) => a.user_id === user_id)
        if (attendee) {
          totalMeetings++
          
          if (attendee.attended && attendee.duration_minutes) {
            attendedMeetings++
            totalMinutes += attendee.duration_minutes
          } else if (meeting.status === "completed" && !attendee.attended) {
            missedMeetings++
          }
        }
      })

      if (attendedMeetings > 0) {
        averageDuration = Math.round(totalMinutes / attendedMeetings)
      }

      res.status(200).json({
        success: true,
        data: {
          totalMeetings,
          attendedMeetings,
          missedMeetings,
          totalMinutes,
          averageDuration,
          attendanceRate: totalMeetings > 0 
            ? Math.round((attendedMeetings / totalMeetings) * 100) 
            : 0,
        },
      })
    } catch (error: any) {
      console.error("Get meeting stats error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }

  /**
   * Get meeting time statistics for team/organization (Admin/Manager KPI tracking)
   */
  static async getTeamMeetingStats(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const { startDate, endDate, userId } = req.query

      const dateFilter: any = { org_id }
      if (startDate || endDate) {
        dateFilter.scheduled_at = {}
        if (startDate) dateFilter.scheduled_at.$gte = new Date(startDate as string)
        if (endDate) dateFilter.scheduled_at.$lte = new Date(endDate as string)
      }

      if (userId) {
        dateFilter["attendees.user_id"] = userId
      }

      const meetings = await Meeting.find(dateFilter)

      const stats: any = {
        totalMeetings: meetings.length,
        completedMeetings: 0,
        inProgressMeetings: 0,
        scheduledMeetings: 0,
        cancelledMeetings: 0,
        totalDurationMinutes: 0,
        averageDuration: 0,
        attendeeStats: {} as any,
      }

      meetings.forEach((meeting) => {
        // Meeting status counts
        switch (meeting.status) {
          case "completed":
            stats.completedMeetings++
            break
          case "in-progress":
            stats.inProgressMeetings++
            break
          case "scheduled":
            stats.scheduledMeetings++
            break
          case "cancelled":
            stats.cancelledMeetings++
            break
        }

        // Process attendee stats
        meeting.attendees.forEach((attendee) => {
          if (!stats.attendeeStats[attendee.user_id]) {
            stats.attendeeStats[attendee.user_id] = {
              totalMeetings: 0,
              attended: 0,
              missed: 0,
              totalMinutes: 0,
            }
          }

          const userStats = stats.attendeeStats[attendee.user_id]
          userStats.totalMeetings++

          if (attendee.attended && attendee.duration_minutes) {
            userStats.attended++
            userStats.totalMinutes += attendee.duration_minutes
            stats.totalDurationMinutes += attendee.duration_minutes
          } else if (meeting.status === "completed" && !attendee.attended) {
            userStats.missed++
          }
        })
      })

      if (stats.completedMeetings > 0) {
        stats.averageDuration = Math.round(
          stats.totalDurationMinutes / stats.completedMeetings
        )
      }

      res.status(200).json({
        success: true,
        data: stats,
      })
    } catch (error: any) {
      console.error("Get team meeting stats error:", error)
      res.status(500).json({ success: false, message: error.message })
    }
  }
}
