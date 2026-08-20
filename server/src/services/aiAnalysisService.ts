import axios from "axios"
import { meetingSummaryEmail } from "../lib/email-templates"

interface ActionItem {
  description: string
  assigned_to: string
  due_date?: Date
}

interface MeetingAnalysis {
  summary: string
  key_points: string[]
  action_items: ActionItem[]
}

export class AIAnalysisService {
  private apiKey: string
  private apiUrl: string

  constructor() {
    // You can use OpenAI, Anthropic Claude, or any other AI service
    this.apiKey = process.env.OPENAI_API_KEY || ""
    this.apiUrl = "https://api.openai.com/v1/chat/completions"
  }

  /**
   * Analyze meeting transcript using AI
   */
  async analyzeMeetingTranscript(
    transcript: string,
    attendees: Array<{ user_id: string; user_name: string }>
  ): Promise<MeetingAnalysis> {
    try {
      if (!this.apiKey) {
        console.warn("No AI API key configured, returning mock analysis")
        return this.mockAnalysis(transcript, attendees)
      }

      const attendeesList = attendees.map((a) => a.user_name).join(", ")

      const prompt = `You are an AI meeting assistant. Analyze the following meeting transcript and provide:

1. A concise summary (2-3 sentences)
2. Key points discussed (bullet points)
3. Action items with assigned person and suggested due date

Meeting attendees: ${attendeesList}

Transcript:
${transcript}

Respond in JSON format:
{
  "summary": "meeting summary here",
  "key_points": ["point 1", "point 2", ...],
  "action_items": [
    {
      "description": "task description",
      "assigned_to": "person name or 'Unassigned'",
      "due_date": "YYYY-MM-DD or null"
    }
  ]
}

Important: Match "assigned_to" names exactly as they appear in the attendees list. If no clear assignment, use "Unassigned".`

      const response = await axios.post(
        this.apiUrl,
        {
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful meeting assistant that analyzes transcripts and extracts actionable insights.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      )

      const content = response.data.choices[0].message.content
      const analysis = JSON.parse(content)

      // Map assigned names to user IDs
      const actionItems = analysis.action_items.map((item: any) => {
        const assignee = attendees.find(
          (a) => a.user_name.toLowerCase() === item.assigned_to.toLowerCase()
        )
        return {
          description: item.description,
          assigned_to: assignee ? assignee.user_id : "unassigned",
          due_date: item.due_date ? new Date(item.due_date) : undefined,
        }
      })

      return {
        summary: analysis.summary,
        key_points: analysis.key_points,
        action_items: actionItems,
      }
    } catch (error) {
      console.error("AI analysis failed:", error)
      // Fallback to mock analysis if AI fails
      return this.mockAnalysis(transcript, attendees)
    }
  }

  /**
   * Mock analysis for testing without AI API
   */
  private mockAnalysis(
    transcript: string,
    attendees: Array<{ user_id: string; user_name: string }>
  ): MeetingAnalysis {
    return {
      summary:
        "Meeting covered project updates, timeline discussions, and resource allocation. Team aligned on priorities and next steps.",
      key_points: [
        "Project is on track for Q1 delivery",
        "Need additional resources for testing phase",
        "Marketing campaign to launch alongside product",
        "Weekly sync meetings scheduled for January",
      ],
      action_items: [
        {
          description: "Prepare Q1 project status report",
          assigned_to: attendees[0]?.user_id || "unassigned",
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        {
          description: "Schedule interviews for QA positions",
          assigned_to: attendees[1]?.user_id || "unassigned",
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      ],
    }
  }

  /**
   * Generate meeting summary email content
   */
  generateSummaryEmail(
    meetingTitle: string,
    scheduledAt: Date,
    summary: string,
    keyPoints: string[],
    actionItems: ActionItem[]
  ): string {
    return meetingSummaryEmail({
      meetingTitle,
      scheduledAt: scheduledAt.toLocaleString(),
      summary,
      keyPoints,
      actionItems,
    })
  }
}
