import type { Response } from "express"
import type { AuthenticatedRequest } from "../middleware/auth"
import { Company } from "../models/Company"
import {
  emailTransportResolver,
  normalizeEmailSenders,
  normalizeSmtpSettings,
} from "../services/emailTransportResolver"
import { encryptSecret, decryptSecret } from "../utils/encryption"

function publicEmailConfig(company: {
  name?: string
  email?: string
  emailConfig?: {
    enabled?: boolean
    verified?: boolean
    fromName?: string
    fromEmail?: string
    smtp?: {
      host?: string
      port?: number
      secure?: boolean
      username?: string
      password?: string
    }
    senders?: Array<{ key?: string; fromName?: string; fromEmail?: string }>
  } | null
}) {
  const config = company.emailConfig
  if (!config) return null
  return {
    enabled: Boolean(config.enabled),
    verified: Boolean(config.verified),
    fromName: config.fromName || company.name || "",
    fromEmail: config.fromEmail || company.email || "",
    hasPassword: Boolean(config.smtp?.password),
    senders: (config.senders || []).map((sender) => ({
      key: sender.key,
      fromName: sender.fromName || "",
      fromEmail: sender.fromEmail || "",
    })),
    smtp: config.smtp
      ? {
          host: config.smtp.host || "",
          port: Number(config.smtp.port || 587),
          secure: Boolean(config.smtp.secure),
          username: config.smtp.username || "",
        }
      : undefined,
  }
}

export class CompanyEmailController {
  static async getEmailConfig(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const company = await Company.findById(req.org_id)
      if (!company) {
        return res.status(404).json({ success: false, message: "Company not found" })
      }

      res.status(200).json({
        success: true,
        data: publicEmailConfig(company),
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

  static async updateEmailConfig(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.org_id) {
        return res.status(400).json({ success: false, message: "Organization ID required" })
      }

      const { enabled, fromName, fromEmail, smtp, senders } = req.body
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

      const stored = company.emailConfig?.smtp
      const hasExistingPassword = Boolean(stored?.password)
      if (enabled && (!smtpPayload.host || !smtpPayload.username || (!smtpPayload.password && !hasExistingPassword))) {
        return res.status(400).json({
          success: false,
          message: "SMTP host, username, and password are required when email is enabled",
        })
      }

      const passwordToStore = smtpPayload.password
        ? encryptSecret(smtpPayload.password)
        : stored?.password

      const nextHost = String(smtpPayload.host || stored?.host || "").trim()
      const normalizedSmtp = normalizeSmtpSettings(
        smtpPayload.port || stored?.port || 587,
        smtpPayload.secure ?? stored?.secure ?? false,
      )
      const nextPort = normalizedSmtp.port
      const nextSecure = normalizedSmtp.secure
      const nextUsername = String(smtpPayload.username || stored?.username || "").trim()
      const smtpChanged = Boolean(
        smtpPayload.password ||
          nextHost !== String(stored?.host || "") ||
          nextPort !== Number(stored?.port || 587) ||
          nextSecure !== Boolean(stored?.secure) ||
          nextUsername !== String(stored?.username || ""),
      )

      const nextSenders =
        senders !== undefined
          ? normalizeEmailSenders(senders)
          : normalizeEmailSenders(company.emailConfig?.senders)

      company.emailConfig = {
        enabled: Boolean(enabled),
        verified: smtpChanged ? false : Boolean(company.emailConfig?.verified),
        fromName: fromName || company.name,
        fromEmail: fromEmail || company.email,
        smtp: nextHost
          ? {
              host: nextHost,
              port: nextPort,
              secure: nextSecure,
              username: nextUsername,
              password: passwordToStore || "",
            }
          : undefined,
        senders: nextSenders,
      }
      company.markModified("emailConfig")

      await company.save()

      res.status(200).json({
        success: true,
        message: company.emailConfig.enabled
          ? "Company mailbox saved. Outbound mail will use this SMTP."
          : "Email configuration updated",
        data: publicEmailConfig(company),
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
      const normalizedSmtp = normalizeSmtpSettings(
        smtpOverride?.port || stored?.port || 587,
        smtpOverride?.secure ?? stored?.secure,
      )
      const port = normalizedSmtp.port
      const secure = normalizedSmtp.secure
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
        fromName || company.emailConfig?.fromName || company.name,
      )

      if (result?.success) {
        company.emailConfig = {
          enabled: enabled !== false,
          verified: true,
          fromName: fromName || company.emailConfig?.fromName || company.name,
          fromEmail: fromEmail || company.emailConfig?.fromEmail || username,
          smtp: {
            host,
            port: result.smtp?.port ?? port,
            secure: result.smtp?.secure ?? secure,
            username: result.smtp?.username || username,
            password: encryptSecret(password),
          },
          senders: normalizeEmailSenders(company.emailConfig?.senders),
        }
        company.markModified("emailConfig")
        await company.save()

        return res.status(200).json({
          success: true,
          message: "SMTP verified. Notifications will use your company email.",
          data: publicEmailConfig(company),
        })
      }

      if (company.emailConfig) {
        company.emailConfig.verified = false
        company.markModified("emailConfig")
        await company.save()
      }

      return res.status(400).json({
        success: false,
        message: result.message,
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
        company.markModified("emailConfig")
        await company.save()
      }

      res.status(200).json({
        success: true,
        message: "Company email disabled. System email will be used for all communications.",
        data: publicEmailConfig(company),
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
