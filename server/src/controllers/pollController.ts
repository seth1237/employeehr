import type { Response } from "express"
import { Poll, VoteRecord } from "../models/Poll"
import type { AuthenticatedRequest } from "../middleware/auth"

export class PollController {
  // Get all polls
  static async getPolls(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { type, status } = req.query
      const query: any = { org_id: req.org_id }

      if (type) query.poll_type = type
      if (status) query.status = status

      const polls = await Poll.find(query).sort({ created_at: -1 })

      // Get user's voted polls if authenticated
      let votedPollIds: string[] = []
      if (req.user?.userId) {
        const voteRecords = await VoteRecord.find({
          user_id: req.user.userId,
          org_id: req.org_id,
        }).select("poll_id")
        votedPollIds = voteRecords.map((v) => v.poll_id.toString())
      }

      return res.status(200).json({
        success: true,
        message: "Polls fetched successfully",
        data: polls,
        votedPollIds,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch polls",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Create poll (admin/manager only)
  static async createPoll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      // Check role - allow company_admin, hr, admin, and manager
      if (!["admin", "company_admin", "hr", "manager"].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Insufficient permissions" })
      }

      const poll = await Poll.create({
        org_id: req.org_id,
        created_by: req.user.userId,
        ...req.body,
      })

      return res.status(201).json({
        success: true,
        message: "Poll created successfully",
        data: poll,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create poll",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Vote on poll
  static async vote(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      const { pollId } = req.params
      const { option_ids } = req.body

      const poll = await Poll.findOne({ _id: pollId, org_id: req.org_id })

      if (!poll) {
        return res.status(404).json({ success: false, message: "Poll not found" })
      }

      if (poll.status !== "active") {
        return res.status(400).json({ success: false, message: "Poll is not active" })
      }

      // Check if already voted
      const hasVoted = await VoteRecord.findOne({
        poll_id: pollId,
        user_id: req.user.userId,
      })

      if (hasVoted && !poll.allow_multiple_votes) {
        return res.status(400).json({ success: false, message: "Already voted" })
      }

      // Validate option_ids
      if (!Array.isArray(option_ids) || option_ids.length === 0) {
        return res.status(400).json({ success: false, message: "Invalid options" })
      }

      // Update poll options
      for (const option_id of option_ids) {
        const option = poll.options.find((o) => o._id?.toString() === option_id)
        if (option) {
          option.votes += 1
          if (!poll.is_anonymous) {
            option.voted_by.push(req.user.userId as any)
          }
        }
      }

      poll.total_votes += 1
      await poll.save()

      // Record vote - create a record for each option voted on
      for (const option_id of option_ids) {
        const optionIndex = poll.options.findIndex((o) => o._id?.toString() === option_id)
        if (optionIndex !== -1) {
          await VoteRecord.create({
            poll_id: pollId,
            user_id: poll.is_anonymous ? undefined : req.user.userId,
            option_index: optionIndex,
            org_id: req.org_id,
          })
        }
      }

      return res.status(200).json({
        success: true,
        message: "Vote recorded successfully",
        data: poll,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to vote",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get poll results
  static async getResults(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { pollId } = req.params

      const poll = await Poll.findOne({ _id: pollId, org_id: req.org_id })

      if (!poll) {
        return res.status(404).json({ success: false, message: "Poll not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Results fetched successfully",
        data: {
          poll_id: poll._id,
          title: poll.title,
          total_votes: poll.total_votes,
          options: poll.options.map((opt) => ({
            _id: opt._id,
            text: opt.text,
            votes: opt.votes,
            percentage:
              poll.total_votes > 0 ? ((opt.votes / poll.total_votes) * 100).toFixed(1) : "0",
          })),
        },
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch results",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Close poll (admin/manager only)
  static async closePoll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      // Check role - allow company_admin, hr, admin, and manager
      if (!["admin", "company_admin", "hr", "manager"].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Insufficient permissions" })
      }

      const { pollId } = req.params

      const poll = await Poll.findOneAndUpdate(
        { _id: pollId, org_id: req.org_id },
        { $set: { status: "closed" } },
        { new: true }
      )

      if (!poll) {
        return res.status(404).json({ success: false, message: "Poll not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Poll closed successfully",
        data: poll,
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to close poll",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Delete poll
  static async deletePoll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Missing required data" })
      }

      // Check if user is admin - allow company_admin, hr, or admin
      if (!["admin", "company_admin", "hr"].includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Insufficient permissions" })
      }

      const { pollId } = req.params

      const poll = await Poll.findOneAndDelete({
        _id: pollId,
        org_id: req.org_id,
      })

      if (!poll) {
        return res.status(404).json({ success: false, message: "Poll not found" })
      }

      return res.status(200).json({
        success: true,
        message: "Poll deleted successfully",
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete poll",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
