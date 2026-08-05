import type { Response } from "express"
import { Suggestion } from "../models/Suggestion"
import type { AuthenticatedRequest } from "../middleware/auth"

export class SuggestionController {
  // Get all suggestions
  static async getSuggestions(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { status, category } = req.query
      const query: any = { org_id: req.org_id }

      if (status) query.status = status
      if (category) query.category = category

      const suggestions = await Suggestion.find(query).sort({ created_at: -1 })

      return res.status(200).json({
        success: true,
        message: "Suggestions fetched successfully",
        data: suggestions,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch suggestions",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Create suggestion
  static async createSuggestion(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { is_anonymous, title, description, category } = req.body

      const suggestion = await Suggestion.create({
        org_id: req.org_id,
        user_id: is_anonymous ? null : req.user.userId,
        is_anonymous,
        title,
        description,
        category,
      })

      return res.status(201).json({
        success: true,
        message: "Suggestion created successfully",
        data: suggestion,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create suggestion",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Upvote suggestion
  static async upvoteSuggestion(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { suggestionId } = req.params

      const suggestion = await Suggestion.findOne({
        _id: suggestionId,
        org_id: req.org_id,
      })

      if (!suggestion) {
        return res.status(404).json({ success: false, message: "Suggestion not found" })
      }

      // Check if already upvoted
      const hasUpvoted = suggestion.upvoted_by.some(
        (id) => id.toString() === req.user!.userId
      )

      if (hasUpvoted) {
        // Remove upvote
        suggestion.upvoted_by = suggestion.upvoted_by.filter(
          (id) => id.toString() !== req.user!.userId
        )
        suggestion.upvotes = Math.max(0, suggestion.upvotes - 1)
      } else {
        // Add upvote
        suggestion.upvoted_by.push(req.user.userId as any)
        suggestion.upvotes += 1
      }

      await suggestion.save()

      return res.status(200).json({
        success: true,
        message: hasUpvoted ? "Upvote removed" : "Suggestion upvoted",
        data: suggestion,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to upvote suggestion",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Update suggestion status (admin/manager only)
  static async updateSuggestionStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      // Check role
      if (!['company_admin', 'hr', 'admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Insufficient permissions" })
      }

      const { suggestionId } = req.params
      const { status, admin_response } = req.body

      const suggestion = await Suggestion.findOneAndUpdate(
        { _id: suggestionId, org_id: req.org_id },
        {
          $set: {
            status,
            ...(admin_response && { admin_response }),
          },
        },
        { new: true }
      )

      if (!suggestion) {
        return res.status(404).json({ success: false, message: "Suggestion not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Suggestion updated successfully",
        data: suggestion,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update suggestion",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Respond to suggestion (admin)
  static async respondToSuggestion(req: AuthenticatedRequest, res: Response) {
    try {
      const { suggestionId } = req.params
      const { admin_response } = req.body

      if (!admin_response) {
        return res.status(400).json({ success: false, message: "Response text required" })
      }

      const suggestion = await Suggestion.findByIdAndUpdate(
        suggestionId,
        {
          admin_response,
          status: "reviewed",
          responded_at: new Date(),
        },
        { new: true }
      )

      if (!suggestion) {
        return res.status(404).json({ success: false, message: "Suggestion not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Response added successfully",
        data: suggestion,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to add response",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }}