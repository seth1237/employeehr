import nodemailer from "nodemailer"
import type { ICompany } from "../types/interfaces"
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
    this.systemFromName = process.env.SYSTEM_FROM_NAME || "Elevate HR Platform"

    this.systemTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
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
      await testTransporter.sendMail({
        from: `"Email Settings Test" <${from}>`,
        to: testEmail,
        subject: "Email Configuration Test - Elevate HR",
        html: `
          <h2>Email Configuration Successful</h2>
          <p>Your company email settings have been verified successfully.</p>
          <p>All emails sent from your organization will now use this email address.</p>
          <br>
          <p style="color: #666; font-size: 12px;">This is a test email from Elevate HR Platform</p>
        `,
      })

      return {
        success: true,
        message: "Email configuration verified successfully",
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
