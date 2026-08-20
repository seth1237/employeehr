import nodemailer from "nodemailer"
import type { ICompany } from "../types/interfaces"
import { emailConfigTestEmail } from "../lib/email-templates"
import { decryptSecret } from "../utils/encryption"

interface TransportResult {
  transporter: nodemailer.Transporter
  fromAddress: string
  fromName: string
}

/**
 * Email Transport Resolver
 * Determines which SMTP configuration to use based on tenant settings
 */
export class EmailTransportResolver {
  private systemTransporter: nodemailer.Transporter
  private systemFromAddress: string
  private systemFromName: string

  constructor() {
    // Initialize system default transporter
    this.systemFromAddress = process.env.SMTP_FROM || "noreply@codewithseth.co.ke"
    this.systemFromName = process.env.SYSTEM_FROM_NAME || "ElevateHub"

    this.systemTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      requireTLS: Number(process.env.SMTP_PORT) === 465 ? false : true,
      tls: {
        rejectUnauthorized: false,
      },
    })

    console.log("EmailTransportResolver initialized with system email:", this.systemFromAddress)
  }

  /**
   * Resolve the appropriate email transporter for a tenant
   * Falls back to system email if tenant email is not configured or verified
   */
  resolveTransporter(company: ICompany | null): TransportResult {
    // Check if tenant has custom email configured and verified
    if (
      company?.emailConfig?.enabled &&
      company?.emailConfig?.verified &&
      company?.emailConfig?.smtp?.host &&
      company?.emailConfig?.smtp?.username &&
      company?.emailConfig?.smtp?.password
    ) {
      try {
        // Create tenant-specific transporter
        const tenantTransporter = nodemailer.createTransport({
          host: company.emailConfig.smtp.host,
          port: company.emailConfig.smtp.port || 587,
          secure: company.emailConfig.smtp.secure || false,
          auth: {
            user: company.emailConfig.smtp.username,
            pass: decryptSecret(company.emailConfig.smtp.password),
          },
        })

        console.log(`Using tenant email for ${company.name}: ${company.emailConfig.fromEmail}`)

        return {
          transporter: tenantTransporter,
          fromAddress: company.emailConfig.fromEmail || company.email,
          fromName: company.emailConfig.fromName || company.name,
        }
      } catch (error) {
        console.error("Failed to create tenant transporter, falling back to system email:", error)
      }
    }

    // Fallback to system email
    console.log(`Using system email for ${company?.name || "unknown tenant"}`)
    return {
      transporter: this.systemTransporter,
      fromAddress: this.systemFromAddress,
      fromName: this.systemFromName,
    }
  }

  /**
   * Test email configuration by sending a test email
   */
  async testEmailConfig(
    host: string,
    port: number,
    secure: boolean,
    username: string,
    password: string,
    testEmail: string,
    fromAddress?: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const testTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user: username,
          pass: password,
        },
        // Port 587 typically needs STARTTLS (secure:false); 465 uses TLS (secure:true)
        requireTLS: !secure && port === 587,
        tls: {
          rejectUnauthorized: false,
        },
      })

      // Verify connection
      await testTransporter.verify()

      const from = fromAddress || username

      // Send test email
      const info = await testTransporter.sendMail({
        from: `"ElevateHub" <${from}>`,
        to: testEmail,
        subject: "ElevateHub email configuration test",
        text: "Your ElevateHub email settings are working.",
        html: emailConfigTestEmail(),
      })

      console.log("Test email queued:", {
        to: testEmail,
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
      })

      return {
        success: true,
        message: `Mail server accepted the message (${info.response || info.messageId}). Check inbox and spam — external providers may filter mail without DKIM/DMARC.`,
      }
    } catch (error) {
      console.error("Email config test failed:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to verify email configuration",
      }
    }
  }
}

// Singleton instance
export const emailTransportResolver = new EmailTransportResolver()
