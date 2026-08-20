import nodemailer from "nodemailer"
import { Company } from "../models/Company"
import { emailTransportResolver } from "./emailTransportResolver"
import type { ICompany } from "../types/interfaces"
import { userInvitationEmail } from "../lib/email-templates"

interface EmailOptions {
  to: string
  subject: string
  html: string
  companyId?: string
}

class EmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    console.log("Initializing EmailService...")
    console.log("SMTP_USER:", process.env.SMTP_USER)
    console.log("SMTP_PASS length:", process.env.SMTP_PASS?.length)
    console.log("SMTP_HOST:", process.env.SMTP_HOST)

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || "587"),
      secure: false,
      requireTLS: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || "587") !== 465,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    })

    this.transporter.verify((error) => {
      if (error) {
        console.error("❌ Email transporter verification failed:", error)
      } else {
        console.log("✅ Email transporter is ready to send emails")
      }
    })
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      console.log(`Attempting to send email to: ${options.to}`)
      console.log(`Email subject: ${options.subject}`)

      let company: ICompany | null = null
      if (options.companyId) {
        company = await Company.findById(options.companyId)
      }

      const { transporter, fromAddress, fromName } = emailTransportResolver.resolveTransporter(company)

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
      })

      console.log("✅ Email sent successfully:", info.messageId)
      console.log("Accepted recipients:", info.accepted)
      console.log("Rejected recipients:", info.rejected)
      return true
    } catch (error) {
      console.error("❌ Failed to send email:", error)
      if (error instanceof Error) {
        console.error("Error message:", error.message)
        console.error("Error stack:", error.stack)
      }

      if (options.companyId) {
        try {
          console.log("Retrying with system email fallback...")
          const { transporter, fromAddress, fromName } = emailTransportResolver.resolveTransporter(null)
          await transporter.sendMail({
            from: `"${fromName}" <${fromAddress}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
          })
          console.log("✅ Email sent successfully with system fallback")
          return true
        } catch (fallbackError) {
          console.error("❌ System fallback failed:", fallbackError)
        }
      }

      return false
    }
  }

  async sendInvitationEmail(data: {
    recipientEmail: string
    recipientName: string
    inviterName: string
    role: string
    temporaryPassword: string
    loginUrl: string
    companyId?: string
  }): Promise<boolean> {
    const roleDisplayNormal = data.role.replace(/_/g, " ")
    const html = userInvitationEmail({
      recipientName: data.recipientName,
      inviterName: data.inviterName,
      roleLabel: roleDisplayNormal,
      recipientEmail: data.recipientEmail,
      temporaryPassword: data.temporaryPassword,
      loginUrl: data.loginUrl,
    })

    return this.sendEmail({
      to: data.recipientEmail,
      subject: `Welcome to ElevateHub — invited by ${data.inviterName}`,
      html,
      companyId: data.companyId,
    })
  }
}

export const emailService = new EmailService()
