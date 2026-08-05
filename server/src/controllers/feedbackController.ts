import type { Response } from "express"
import { Feedback } from "../models/Feedback"
import type { AuthenticatedRequest } from "../middleware/auth"

export class FeedbackController {
  static async getAllFeedback(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const feedbacks = await Feedback.find({ org_id: req.org_id }).sort({ createdAt: -1 })

      res.status(200).json({
        success: true,
        message: "All feedback fetched successfully",
        data: feedbacks,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch feedback",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async submitFeedback(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { to_user_id, rating, type, feedback_text, isAnonymous } = req.body

      const feedback = new Feedback({
        org_id: req.org_id,
        from_user_id: req.user.userId,
        to_user_id,
        rating,
        type,
        feedback_text,
        isAnonymous,
        status: "delivered",
      })

      const savedFeedback = await feedback.save()

      res.status(201).json({
        success: true,
        message: "Feedback submitted successfully",
        data: savedFeedback,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to submit feedback",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async getFeedbackForUser(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { userId } = req.params
      const feedbacks = await Feedback.find({
        org_id: req.org_id,
        to_user_id: userId,
      })

      res.status(200).json({
        success: true,
        message: "Feedback fetched successfully",
        data: feedbacks,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch feedback",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  static async get360FeedbackSummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { userId } = req.params
      const feedbacks = await Feedback.find({
        org_id: req.org_id,
        to_user_id: userId,
      })

      const summary = {
        averageRating:
          feedbacks.length > 0 ? (feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(2) : 0,
        totalFeedback: feedbacks.length,
        byType: {
          general: feedbacks.filter((f) => f.type === "general").length,
          praise: feedbacks.filter((f) => f.type === "praise").length,
          constructive: feedbacks.filter((f) => f.type === "constructive").length,
          recognition: feedbacks.filter((f) => f.type === "recognition").length,
        },
        feedbacks,
      }

      res.status(200).json({
        success: true,
        message: "Feedback summary fetched successfully",
        data: summary,
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch feedback summary",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
