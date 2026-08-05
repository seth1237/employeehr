import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { AiAssistantService, type ChatTurn } from "../services/aiAssistant/aiAssistantService"
import { buildOrgContext } from "../services/aiAssistant/orgContext"

export class AiAssistantController {
  static async getStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      const { model, provider } = AiAssistantService.getModelInfo()

      return res.status(200).json({
        success: true,
        data: {
          enabled: AiAssistantService.isConfigured(),
          model,
          provider,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to get assistant status" })
    }
  }

  static async chat(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user?.org_id) {
        return res.status(401).json({ success: false, message: "Unauthorized" })
      }

      if (!AiAssistantService.isConfigured()) {
        return res.status(503).json({
          success: false,
          message: "AI assistant is not configured. Set OPENROUTER_API_KEY in server/.env to enable it.",
        })
      }

      const { message, history } = req.body || {}

      // Build enriched org context (fetches company name from DB)
      const ctx = await buildOrgContext(req.user)

      // Sanitise conversation history
      const safeHistory: ChatTurn[] = Array.isArray(history)
        ? history
            .filter(
              (turn: any) =>
                turn &&
                (turn.role === "user" || turn.role === "assistant") &&
                typeof turn.content === "string",
            )
            .map((turn: any) => ({
              role: turn.role as "user" | "assistant",
              content: String(turn.content).slice(0, 8000),
            }))
        : []

      const result = await AiAssistantService.chat(ctx, String(message || ""), safeHistory)

      return res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error: any) {
      console.error("AI assistant chat error:", { error })
      const is503 =
        error.message?.includes("not configured") || error.message?.includes("Missing organization context")
      return res.status(is503 ? 503 : 400).json({
        success: false,
        message: error.message || "Failed to process your request",
      })
    }
  }
}
