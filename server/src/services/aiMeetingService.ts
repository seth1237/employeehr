import axios from "axios"
import OpenAI from "openai"
import { Task } from "../models/Task"
import { User } from "../models/User"

interface ActionItem {
  description: string
  assigned_to: string
  due_date?: Date
  priority: "low" | "medium" | "high" | "urgent"
}

interface MeetingAnalysis {
  summary: string
  keyPoints: string[]
  actionItems: ActionItem[]
  sentiment: "positive" | "neutral" | "negative"
  topics: string[]
}

export class AIMeetingService {
  private openaiClient: OpenAI | null

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY
    this.openaiClient = apiKey
      ? new OpenAI({
          apiKey,
        })
      : null
  }

  private requireOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      throw new Error("OPENAI_API_KEY is not configured")
    }
    return this.openaiClient
  }

  /**
   * Transcribe audio from a meeting using OpenAI Whisper API
   * @param audioUrl - URL to the audio file or base64 encoded audio
   * @returns Transcript text
   */
  async transcribeAudio(audioUrl: string): Promise<string> {
    try {
      const openaiClient = this.requireOpenAIClient()
      // If using a file path or buffer, you would handle it differently
      const response = await openaiClient.audio.transcriptions.create({
        file: audioUrl as any,
        model: "whisper-1",
      })

      return response.text
    } catch (error) {
      console.error("Transcription error:", error)
      throw new Error("Failed to transcribe audio")
    }
  }

  /**
   * Analyze meeting transcript using GPT
   * @param transcript - The meeting transcript
   * @param attendeeEmails - List of attendee emails for task assignment
   * @returns Structured analysis with summary, key points, and action items
   */
  async analyzeMeeting(
    transcript: string,
    attendeeEmails: string[],
  ): Promise<MeetingAnalysis> {
    try {
      const openaiClient = this.requireOpenAIClient()
      const prompt = `You are an expert meeting analyst. Analyze the following meeting transcript and provide:
1. A concise summary (2-3 sentences)
2. Key points discussed (list 3-5 key points)
3. Action items with assignments (identify what needs to be done, who should do it, and when)
4. Overall meeting sentiment (positive, neutral, or negative)
5. Main topics discussed

Meeting Transcript:
"""
${transcript}
"""

Possible assignees (use these emails exactly as provided for assignments): ${attendeeEmails.join(", ")}

Respond in JSON format like this:
{
  "summary": "...",
  "keyPoints": ["point1", "point2", ...],
  "actionItems": [
    {
      "description": "...",
      "assigned_to": "email@example.com",
      "due_date": "YYYY-MM-DD" (optional, infer from context),
      "priority": "high|medium|low|urgent"
    }
  ],
  "sentiment": "positive|neutral|negative",
  "topics": ["topic1", "topic2", ...]
}

Only respond with valid JSON, no additional text.`

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert meeting analyst that extracts insights from meeting transcripts.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      })

      const content = response.choices[0].message.content
      if (!content) {
        throw new Error("No response from OpenAI")
      }

      const analysis = JSON.parse(content)

      return {
        summary: analysis.summary,
        keyPoints: analysis.keyPoints,
        actionItems: analysis.actionItems.map(
          (item: {
            description: string
            assigned_to: string
            due_date?: string
            priority: "low" | "medium" | "high" | "urgent"
          }) => ({
            description: item.description,
            assigned_to: item.assigned_to,
            due_date: item.due_date ? new Date(item.due_date) : undefined,
            priority: item.priority,
          }),
        ),
        sentiment: analysis.sentiment,
        topics: analysis.topics,
      }
    } catch (error) {
      console.error("Meeting analysis error:", error)
      throw new Error("Failed to analyze meeting")
    }
  }

  /**
   * Generate a detailed meeting report with insights
   * @param transcript - Meeting transcript
   * @param analysis - Previous analysis results
   * @param meetingTitle - Title of the meeting
   * @returns HTML formatted report
   */
  async generateMeetingReport(
    transcript: string,
    analysis: MeetingAnalysis,
    meetingTitle: string,
  ): Promise<string> {
    try {
      const openaiClient = this.requireOpenAIClient()
      const prompt = `Generate a professional meeting report in HTML format based on the following:

Meeting Title: ${meetingTitle}
Summary: ${analysis.summary}
Key Points: ${analysis.keyPoints.join(", ")}
Sentiment: ${analysis.sentiment}
Topics: ${analysis.topics.join(", ")}

Create an HTML report that includes:
1. Executive Summary
2. Attendee Highlights
3. Key Discussion Points (formatted nicely)
4. Action Items with assignments
5. Next Steps
6. Follow-up Required

Return only the HTML content, properly formatted with CSS styles.`

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a professional report writer that creates well-formatted HTML reports.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      })

      const content = response.choices[0].message.content
      if (!content) {
        throw new Error("No response from OpenAI")
      }

      return content
    } catch (error) {
      console.error("Report generation error:", error)
      throw new Error("Failed to generate meeting report")
    }
  }

  /**
   * Create tasks from action items
   * @param meetingId - The meeting ID
   * @param actionItems - List of action items to create tasks from
   * @param orgId - Organization ID
   * @param organizerId - User ID of the organizer (for assigned_by field)
   * @returns List of created task IDs
   */
  async createTasksFromActionItems(
    meetingId: string,
    actionItems: ActionItem[],
    orgId: string,
    organizerId: string,
  ): Promise<string[]> {
    try {
      const taskIds: string[] = []

      for (const item of actionItems) {
        // Find user by email
        const user = await User.findOne({
          email: item.assigned_to,
          org_id: orgId,
        })

        if (!user) {
          console.warn(`User not found for email: ${item.assigned_to}`)
          continue
        }

        const task = await Task.create({
          org_id: orgId,
          title: item.description,
          description: `Action item from meeting: ${item.description}`,
          assigned_to: user._id,
          assigned_by: organizerId,
          priority: item.priority,
          due_date: item.due_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
          status: "pending",
          is_ai_generated: true,
          meeting_id: meetingId,
          is_ai_reminder: true,
          ai_source: "Meeting action item",
        })

        taskIds.push(task._id as string)
      }

      return taskIds
    } catch (error) {
      console.error("Task creation error:", error)
      throw new Error("Failed to create tasks from action items")
    }
  }

  /**
   * Send meeting reports to all attendees
   * @param meeting - Meeting document
   * @param reportHtml - HTML report content
   * @param analysis - Meeting analysis
   * @param sendEmail - Email sending function
   */
  async sendMeetingReportsToAttendees(
    meeting: any,
    reportHtml: string,
    analysis: MeetingAnalysis,
    sendEmail: (email: string, subject: string, html: string) => Promise<void>,
  ): Promise<void> {
    try {
      for (const attendee of meeting.attendees) {
        const user = await User.findById(attendee.user_id)
        if (!user) continue

        const emailSubject = `Meeting Report: ${meeting.title}`
        const emailBody = this.generateAttendeeEmailBody(
          user.first_name || "Attendee",
          meeting.title,
          analysis,
          reportHtml,
        )

        await sendEmail(user.email, emailSubject, emailBody)
      }
    } catch (error) {
      console.error("Error sending meeting reports:", error)
      throw new Error("Failed to send meeting reports")
    }
  }

  /**
   * Generate personalized email body for an attendee
   */
  private generateAttendeeEmailBody(
    attendeeName: string,
    meetingTitle: string,
    analysis: MeetingAnalysis,
    reportHtml: string,
  ): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Meeting Report: ${meetingTitle}</h2>
          <p>Hi ${attendeeName},</p>
          <p>Your meeting has been analyzed by our AI assistant. Here are the key details:</p>
          
          <h3>Summary</h3>
          <p>${analysis.summary}</p>
          
          <h3>Key Points</h3>
          <ul>
            ${analysis.keyPoints.map((point) => `<li>${point}</li>`).join("")}
          </ul>
          
          <h3>Action Items Assigned to You</h3>
          <ul>
            ${analysis.actionItems
              .filter((item) => item.assigned_to === "your_email")
              .map(
                (item) =>
                  `<li><strong>${item.description}</strong> - Priority: ${item.priority}${item.due_date ? `, Due: ${item.due_date.toDateString()}` : ""}</li>`,
              )
              .join("")}
          </ul>
          
          <h3>Full Report</h3>
          ${reportHtml}
          
          <p>Your assigned action items have been automatically created as tasks in the system.</p>
          <p>Best regards,<br>Elevate AI Assistant</p>
        </body>
      </html>
    `
  }
}
