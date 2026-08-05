import type { Response } from "express"
import { Message } from "../models/Message"
import { User } from "../models/User"
import type { AuthenticatedRequest } from "../middleware/auth"

export class MessageController {
  /**
   * Get inbox messages (messages received by user)
   */
  static async getInboxMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      const orgId = req.org_id

      const messages = await Message.find({
        org_id: orgId,
        to_user_id: userId,
      })
        .populate("from_user_id", "first_name last_name email employee_id")
        .sort({ created_at: -1 })
        .lean()

      res.status(200).json({ success: true, data: messages })
    } catch (error: any) {
      console.error("Get inbox messages error:", error)
      res.status(500).json({ success: false, message: "Failed to fetch inbox messages" })
    }
  }

  /**
   * Get sent messages (messages sent by user)
   */
  static async getSentMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      const orgId = req.org_id

      const messages = await Message.find({
        org_id: orgId,
        from_user_id: userId,
      })
        .populate("to_user_id", "first_name last_name email employee_id")
        .sort({ created_at: -1 })
        .lean()

      res.status(200).json({ success: true, data: messages })
    } catch (error: any) {
      console.error("Get sent messages error:", error)
      res.status(500).json({ success: false, message: "Failed to fetch sent messages" })
    }
  }

  /**
   * Get message by ID
   */
  static async getMessageById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params
      const userId = req.user?.userId
      const orgId = req.org_id

      const message = await Message.findOne({
        _id: messageId,
        org_id: orgId,
        $or: [{ from_user_id: userId }, { to_user_id: userId }],
      })
        .populate("from_user_id", "first_name last_name email employee_id position")
        .populate("to_user_id", "first_name last_name email employee_id position")
        .lean()

      if (!message) {
        res.status(404).json({ success: false, message: "Message not found" })
        return
      }

      res.status(200).json({ success: true, data: message })
    } catch (error: any) {
      console.error("Get message error:", error)
      res.status(500).json({ success: false, message: "Failed to fetch message" })
    }
  }

  /**
   * Send a new message
   */
  static async sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId
      const orgId = req.org_id
      const { to_user_id, subject, body, attachments } = req.body

      if (!to_user_id || !subject || !body) {
        res.status(400).json({ 
          success: false, 
          message: "Recipient, subject, and body are required" 
        })
        return
      }

      // Check if recipient exists in the same organization
      const recipient = await User.findOne({ 
        _id: to_user_id, 
        org_id: orgId,
        is_active: true 
      })

      if (!recipient) {
        res.status(404).json({ 
          success: false, 
          message: "Recipient not found in your organization" 
        })
        return
      }

      const message = await Message.create({
        org_id: orgId,
        from_user_id: userId,
        to_user_id,
        subject,
        body,
        attachments: attachments || [],
      })

      const populatedMessage = await Message.findById(message._id)
        .populate("from_user_id", "first_name last_name email employee_id")
        .populate("to_user_id", "first_name last_name email employee_id")
        .lean()

      res.status(201).json({ 
        success: true, 
        message: "Message sent successfully",
        data: populatedMessage 
      })
    } catch (error: any) {
      console.error("Send message error:", error)
      res.status(500).json({ success: false, message: "Failed to send message" })
    }
  }

  /**
   * Mark message as read
   */
  static async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params
      const userId = req.user?.userId
      const orgId = req.org_id

      const message = await Message.findOneAndUpdate(
        {
          _id: messageId,
          org_id: orgId,
          to_user_id: userId,
        },
        {
          is_read: true,
          read_at: new Date(),
        },
        { new: true }
      )
        .populate("from_user_id", "first_name last_name email employee_id")
        .lean()

      if (!message) {
        res.status(404).json({ success: false, message: "Message not found" })
        return
      }

      res.status(200).json({ 
        success: true, 
        message: "Message marked as read",
        data: message 
      })
    } catch (error: any) {
      console.error("Mark as read error:", error)
      res.status(500).json({ success: false, message: "Failed to mark message as read" })
    }
  }

  /**
   * Reply to a message
   */
  static async replyToMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params
      const userId = req.user?.userId
      const orgId = req.org_id
      const { body, attachments } = req.body

      if (!body) {
        res.status(400).json({ 
          success: false, 
          message: "Reply body is required" 
        })
        return
      }

      // Find original message
      const originalMessage = await Message.findOne({
        _id: messageId,
        org_id: orgId,
        $or: [{ from_user_id: userId }, { to_user_id: userId }],
      })

      if (!originalMessage) {
        res.status(404).json({ success: false, message: "Original message not found" })
        return
      }

      // Determine recipient (reply to sender)
      const recipientId = originalMessage.from_user_id.toString() === userId 
        ? originalMessage.to_user_id 
        : originalMessage.from_user_id

      // Create reply message
      const replyMessage = await Message.create({
        org_id: orgId,
        from_user_id: userId,
        to_user_id: recipientId,
        subject: `Re: ${originalMessage.subject}`,
        body,
        attachments: attachments || [],
        replied_to: originalMessage._id,
      })

      const populatedReply = await Message.findById(replyMessage._id)
        .populate("from_user_id", "first_name last_name email employee_id")
        .populate("to_user_id", "first_name last_name email employee_id")
        .lean()

      res.status(201).json({ 
        success: true, 
        message: "Reply sent successfully",
        data: populatedReply 
      })
    } catch (error: any) {
      console.error("Reply to message error:", error)
      res.status(500).json({ success: false, message: "Failed to send reply" })
    }
  }

  /**
   * Delete message
   */
  static async deleteMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { messageId } = req.params
      const userId = req.user?.userId
      const orgId = req.org_id

      const message = await Message.findOneAndDelete({
        _id: messageId,
        org_id: orgId,
        $or: [{ from_user_id: userId }, { to_user_id: userId }],
      })

      if (!message) {
        res.status(404).json({ success: false, message: "Message not found" })
        return
      }

      res.status(200).json({ 
        success: true, 
        message: "Message deleted successfully" 
      })
    } catch (error: any) {
      console.error("Delete message error:", error)
      res.status(500).json({ success: false, message: "Failed to delete message" })
    }
  }
}
