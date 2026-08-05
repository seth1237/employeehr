import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Company } from "../models/Company"
import Invitation from "../models/Invitation"
import { User } from "../models/User"
import EmailService from "../services/email.service"
import crypto from "crypto"

export class InvitationController {
  // Send invitations to team members
  static async sendInvitations(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id || !req.user) {
        return res.status(400).json({ success: false, message: "Organization context required" })
      }

      const { team_members } = req.body

      if (!team_members || !Array.isArray(team_members) || team_members.length === 0) {
        return res.status(400).json({ success: false, message: "team_members array is required" })
      }

      // Always derive tenant domain from company org_id and env config
      const TENANT_BASE_DOMAIN = process.env.TENANT_BASE_DOMAIN || "codewithseth.co.ke"
      const TENANT_SUBDOMAIN = process.env.TENANT_SUBDOMAIN || "hr"

      // Get company details
      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      const invitations: any[] = []
      const failed: string[] = []

      // Generate invitations for each team member
      for (const member of team_members) {
        try {
          // Skip if email is empty
          if (!member.email || !member.email.trim()) continue

          // Check if user already exists
          const existingUser = await User.findOne({ email: member.email })
          if (existingUser && existingUser.org_id === req.org_id) {
            continue // User already in org
          }

          // Generate unique token
          const invite_token = crypto.randomBytes(32).toString("hex")
          const expires_at = new Date()
          expires_at.setDate(expires_at.getDate() + 7) // Invite valid for 7 days

          // Create invitation
          const invitation = await Invitation.create({
            org_id: req.org_id,
            email: member.email.toLowerCase(),
            role: member.role || "employee",
            invite_token,
            invited_by: req.user.userId,
            expires_at,
          })

          // Build tenant domain using org_id as fallback if slug missing
          const tenantIdentifier = company.slug || req.org_id
          const tenantDomain = `${TENANT_SUBDOMAIN}.${TENANT_BASE_DOMAIN}`

          // Build invite link with tenant domain, org_id, and company name
          const encodedCompanyName = encodeURIComponent(company.name)
          const invite_link = `https://${tenantDomain}/auth/login?invite=${invite_token}&org_id=${req.org_id}&company=${encodedCompanyName}&email=${encodeURIComponent(member.email)}`

          // Send invitation email and track failures
          const emailSent = await EmailService.sendInvitationEmail(
            member.email,
            company.name,
            invite_link,
            req.user.firstName || "Admin",
            req.org_id
          )
          if (!emailSent) {
            failed.push(member.email)
          } else {
            invitations.push({
              _id: invitation._id,
              email: invitation.email,
              role: invitation.role,
              status: invitation.status,
            })
          }
        } catch (error) {
          console.error(`Failed to send invitation to ${member.email}:`, error)
          failed.push(member.email)
        }
      }

      res.status(201).json({
        success: true,
        message: "Invitations sent successfully",
        data: {
          sent: invitations,
          failed,
          total_sent: invitations.length,
          total_failed: failed.length,
        },
      })
    } catch (error) {
      console.error("Send invitations error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to send invitations",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Accept invitation and create user
  static async acceptInvitation(req: any, res: Response) {
    try {
      const { invite_token, firstName, lastName, password, email } = req.body

      if (!invite_token || !password) {
        return res.status(400).json({ success: false, message: "invite_token and password required" })
      }

      // Find invitation
      const invitation = await Invitation.findOne({
        invite_token,
        status: "pending",
        expires_at: { $gt: new Date() },
      })

      if (!invitation) {
        return res
          .status(404)
          .json({ success: false, message: "Invitation not found, expired, or already used" })
      }

      // Verify email matches (if provided)
      if (email && email.toLowerCase() !== invitation.email.toLowerCase()) {
        return res.status(400).json({ success: false, message: "Email does not match invitation" })
      }

      // Check if user already exists
      let user = await User.findOne({ email: invitation.email })

      if (user) {
        // User exists but might not be in this org
        if (user.org_id !== invitation.org_id.toString()) {
          // Add org_id if it doesn't exist
          user.org_id = invitation.org_id.toString()
          user.role = invitation.role
          await user.save()
        }
      } else {
        // Create new user
        user = await User.create({
          org_id: invitation.org_id.toString(),
          email: invitation.email,
          firstName: firstName || "User",
          lastName: lastName || "",
          password, // Hash would be done by pre-save hook in User model
          role: invitation.role,
          status: "active",
        })
      }

      // Mark invitation as accepted
      invitation.status = "accepted"
      invitation.accepted_at = new Date()
      await invitation.save()

      res.status(200).json({
        success: true,
        message: "Invitation accepted successfully",
        data: {
          user_id: user._id,
          email: user.email,
          role: user.role,
        },
      })
    } catch (error) {
      console.error("Accept invitation error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to accept invitation",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Get pending invitations for organization
  static async getPendingInvitations(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const invitations = await Invitation.find({
        org_id: req.org_id,
        status: "pending",
      }).sort({ created_at: -1 })

      res.status(200).json({
        success: true,
        data: invitations,
        count: invitations.length,
      })
    } catch (error) {
      console.error("Get pending invitations error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch invitations",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  // Resend invitation
  static async resendInvitation(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { invitation_id } = req.body

      if (!invitation_id) {
        return res.status(400).json({ success: false, message: "invitation_id is required" })
      }

      const invitation = await Invitation.findOne({
        _id: invitation_id,
        org_id: req.org_id,
      })

      if (!invitation) {
        return res.status(404).json({ success: false, message: "Invitation not found" })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      // Update expiration
      invitation.expires_at = new Date()
      invitation.expires_at.setDate(invitation.expires_at.getDate() + 7)
      await invitation.save()

      // Resend email with tenant domain
      const TENANT_BASE_DOMAIN = process.env.TENANT_BASE_DOMAIN || "codewithseth.co.ke"
      const TENANT_SUBDOMAIN = process.env.TENANT_SUBDOMAIN || "hr"
      const tenantDomain = `${TENANT_SUBDOMAIN}.${TENANT_BASE_DOMAIN}`
      const encodedCompanyName = encodeURIComponent(company.name)
      const invite_link = `https://${tenantDomain}/auth/login?invite=${invitation.invite_token}&org_id=${req.org_id}&company=${encodedCompanyName}&email=${encodeURIComponent(invitation.email)}`
      await EmailService.sendInvitationEmail(
        invitation.email,
        company.name,
        invite_link,
        req.user?.firstName || "Admin",
        req.org_id
      )

      res.status(200).json({
        success: true,
        message: "Invitation resent successfully",
      })
    } catch (error) {
      console.error("Resend invitation error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to resend invitation",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
