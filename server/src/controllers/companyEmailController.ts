import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Company } from "../models/Company"
import { emailTransportResolver } from "../services/emailTransportResolver"
import { encryptSecret, decryptSecret } from "../utils/encryption"

export class CompanyEmailController {
  /**
   * Get company email configuration
   */
  static async getEmailConfig(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      // Return config without sensitive password
      const config = company.emailConfig
        ? {
            enabled: company.emailConfig.enabled,
            verified: company.emailConfig.verified,
            fromName: company.emailConfig.fromName,
            fromEmail: company.emailConfig.fromEmail,
            smtp: company.emailConfig.smtp
              ? {
                  host: company.emailConfig.smtp.host,
                  port: company.emailConfig.smtp.port,
                  secure: company.emailConfig.smtp.secure,
                  username: company.emailConfig.smtp.username,
                  // Don't return password
                }
              : undefined,
          }
        : null

      res.status(200).json({
        success: true,
        data: config,
      })
    } catch (error) {
      console.error("Get email config error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to fetch email configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Update company email configuration
   */
  static async updateEmailConfig(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { enabled, fromName, fromEmail, smtp } = req.body
      const smtpPayload = {
        host: smtp?.host || req.body.smtpHost,
        port: smtp?.port || req.body.smtpPort,
        secure: smtp?.secure ?? req.body.smtpSecure ?? false,
        username: smtp?.username || req.body.smtpUsername || req.body.smtpUser,
        password: smtp?.password || req.body.smtpPassword,
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      // Validate required fields if enabled
      const hasExistingPassword = Boolean(company.emailConfig?.smtp?.password)
      if (enabled && (!smtpPayload.host || !smtpPayload.username || (!smtpPayload.password && !hasExistingPassword))) {
        return res.status(400).json({
          success: false,
          message: "SMTP host, username, and password are required when email is enabled",
        })
      }

      const passwordToStore = smtpPayload.password
        ? encryptSecret(smtpPayload.password)
        : company.emailConfig?.smtp?.password

      // Update email config
      company.emailConfig = {
        enabled: enabled || false,
        verified: false, // Reset verification status on update
        fromName: fromName || company.name,
        fromEmail: fromEmail || company.email,
        smtp: smtpPayload.host
          ? {
              host: smtpPayload.host,
              port: smtpPayload.port || 587,
              secure: smtpPayload.secure || false,
              username: smtpPayload.username,
              password: passwordToStore || "",
            }
          : undefined,
      }

      await company.save()

      res.status(200).json({
        success: true,
        message: "Email configuration updated successfully",
        data: {
          enabled: company.emailConfig.enabled,
          verified: company.emailConfig.verified,
          fromName: company.emailConfig.fromName,
          fromEmail: company.emailConfig.fromEmail,
        },
      })
    } catch (error) {
      console.error("Update email config error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to update email configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Test and verify email configuration.
   * Accepts optional smtp overrides from the form so users can test
   * credentials they just typed without a separate save first.
   */
  static async verifyEmailConfig(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { testEmail, smtp: smtpOverride, fromEmail, fromName, enabled } = req.body

      if (!testEmail) {
        return res.status(400).json({
          success: false,
          message: "Test email address is required",
        })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      const stored = company.emailConfig?.smtp
      const host = String(smtpOverride?.host || stored?.host || "").trim()
      const port = Number(smtpOverride?.port || stored?.port || 587)
      const secure = Boolean(
        smtpOverride?.secure ?? stored?.secure ?? (port === 465),
      )
      const username = String(smtpOverride?.username || stored?.username || "").trim()
      const typedPassword = String(smtpOverride?.password || "").trim()

      let password = ""
      try {
        password = typedPassword
          ? typedPassword
          : stored?.password
            ? decryptSecret(stored.password)
            : ""
      } catch (decryptError) {
        console.error("Failed to decrypt stored SMTP password:", decryptError)
        return res.status(400).json({
          success: false,
          message:
            "Stored SMTP password could not be decrypted. Re-enter the password and save again.",
        })
      }

      if (!host || !username || !password) {
        return res.status(400).json({
          success: false,
          message:
            "SMTP host, username, and password are required. Enter them in the form, then send the test email.",
        })
      }

      const result = await emailTransportResolver.testEmailConfig(
        host,
        port,
        secure,
        username,
        password,
        String(testEmail).trim(),
        fromEmail || company.emailConfig?.fromEmail || username,
      )

      if (result.success) {
        // Persist verified config from the values that actually worked
        company.emailConfig = {
          enabled: enabled !== false,
          verified: true,
          fromName: fromName || company.emailConfig?.fromName || company.name,
          fromEmail: fromEmail || company.emailConfig?.fromEmail || username,
          smtp: {
            host,
            port,
            secure,
            username,
            password: encryptSecret(password),
          },
        }
        await company.save()

        return res.status(200).json({
          success: true,
          message: "SMTP verified. Notifications will use your company email.",
          data: {
            verified: true,
            enabled: true,
          },
        })
      }

      // Keep company unverified so system email remains the fallback
      if (company.emailConfig) {
        company.emailConfig.verified = false
        await company.save()
      }

      const smtpHint =
        /535|authentication|invalid login/i.test(result.message)
          ? " The mail server rejected the username/password (SMTP auth). Check the password, and for Gmail use an App Password."
          : ""

      return res.status(400).json({
        success: false,
        message: `SMTP connection failed: ${result.message}.${smtpHint}`,
      })
    } catch (error) {
      console.error("Verify email config error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to verify email configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  /**
   * Disable company email (fall back to system email)
   */
  static async disableEmailConfig(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      if (company.emailConfig) {
        company.emailConfig.enabled = false
        await company.save()
      }

      res.status(200).json({
        success: true,
        message: "Company email disabled. System email will be used for all communications.",
      })
    } catch (error) {
      console.error("Disable email config error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to disable email configuration",
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }
}
