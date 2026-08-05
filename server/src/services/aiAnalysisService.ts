import axios from "axios"

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
    const keyPointsHtml = keyPoints.map((point) => `<li>${point}</li>`).join("")
    const actionItemsHtml = actionItems
      .map(
        (item) => `
      <li>
        <strong>${item.description}</strong><br/>
        <small>Assigned to: ${item.assigned_to}${item.due_date ? ` | Due: ${item.due_date.toLocaleDateString()}` : ""}</small>
      </li>
    `
      )
      .join("")

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; }
          .section { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #667eea; }
          .section h3 { margin-top: 0; color: #667eea; }
          ul { padding-left: 20px; }
          li { margin: 10px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 Meeting Summary</h1>
            <p><strong>${meetingTitle}</strong></p>
            <p>${scheduledAt.toLocaleString()}</p>
          </div>
          
          <div class="content">
            <div class="section">
              <h3>📋 Summary</h3>
              <p>${summary}</p>
            </div>
            
            <div class="section">
              <h3>🔑 Key Points</h3>
              <ul>${keyPointsHtml}</ul>
            </div>
            
            ${
              actionItems.length > 0
                ? `
            <div class="section">
              <h3>✅ Action Items</h3>
              <ul>${actionItemsHtml}</ul>
            </div>
            `
                : ""
            }
          </div>
          
          <div class="footer">
            <p>This summary was generated by AI. Tasks have been automatically created in your dashboard.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }
}
