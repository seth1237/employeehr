import nodemailer from "nodemailer"
import type { ICompany } from "../types/interfaces"
import { emailConfigTestEmail } from "../lib/email-templates"
import { decryptSecret } from "../utils/encryption"

export const EMAIL_SENDER_KEYS = [
  "default",
  "hr",
  "stock",
  "technical_service",
  "sales",
  "recruitment",
] as const

export type EmailMailKey = (typeof EMAIL_SENDER_KEYS)[number]

export type EmailSenderIdentity = {
  key: string
  fromName?: string
  fromEmail?: string
}

interface TransportResult {
  transporter: nodemailer.Transporter
  fromAddress: string
  fromName: string
  usingTenantSmtp: boolean
}

function smtpPort(value: unknown, fallback = 587) {
  const port = Number(value)
  return Number.isFinite(port) && port > 0 ? port : fallback
}

/** Port 587/25 speak SMTP then STARTTLS. Port 465 is implicit SSL. Mixing them causes "wrong version number". */
export function normalizeSmtpSettings(port: unknown, secure?: boolean) {
  const resolvedPort = smtpPort(port)
  if (resolvedPort === 465) return { port: 465, secure: true }
  if (resolvedPort === 587 || resolvedPort === 25 || resolvedPort === 2525) {
    return { port: resolvedPort, secure: false }
  }
  return { port: resolvedPort, secure: Boolean(secure) }
}

function createSmtpTransport(options: {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
}) {
  const { port, secure } = normalizeSmtpSettings(options.port, options.secure)
  return nodemailer.createTransport({
    host: options.host,
    port,
    secure,
    auth: {
      user: options.username,
      pass: options.password,
    },
    requireTLS: !secure && (port === 587 || port === 25 || port === 2525),
    tls: {
      rejectUnauthorized: false,
    },
  })
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : String(error || "")
}

function isTlsMismatch(error: unknown) {
  return /wrong version number|ssl routines|ssl3_get_record|EPROTO|unexpected eof/i.test(errorText(error))
}

function isAuthFailure(error: unknown) {
  return /535|534|535-5\.7|authentication|invalid login|invalid user|not authorized|username and password not accepted/i.test(
    errorText(error),
  )
}

function friendlySmtpError(error: unknown) {
  if (isTlsMismatch(error)) {
    return "The mail server refused the encryption mode. Port 587 uses STARTTLS (SSL off). Port 465 uses SSL."
  }
  if (isAuthFailure(error)) {
    return "The mail server rejected the username or password. Use the full mailbox address as the username (for example james@yourdomain.com), and the mailbox password."
  }
  return errorText(error) || "Failed to verify email configuration"
}

export function normalizeEmailSenders(input: unknown): EmailSenderIdentity[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const senders: EmailSenderIdentity[] = []
  for (const row of input) {
    const key = String((row as EmailSenderIdentity)?.key || "").trim()
    if (!EMAIL_SENDER_KEYS.includes(key as EmailMailKey) || seen.has(key)) continue
    seen.add(key)
    const fromEmail = String((row as EmailSenderIdentity)?.fromEmail || "")
      .trim()
      .toLowerCase()
    const fromName = String((row as EmailSenderIdentity)?.fromName || "").trim()
    if (!fromEmail && !fromName) continue
    senders.push({ key, fromName, fromEmail })
  }
  return senders
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
    this.systemFromAddress = process.env.SMTP_FROM || "noreply@codewithseth.co.ke"
    this.systemFromName = process.env.SYSTEM_FROM_NAME || "ElevateHub"

    this.systemTransporter = createSmtpTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: smtpPort(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      username: process.env.SMTP_USER || "",
      password: process.env.SMTP_PASS || "",
    })

    console.log("EmailTransportResolver initialized with system email:", this.systemFromAddress)
  }

  pickFromIdentity(company: ICompany | null, mailKey?: string) {
    const senders = company?.emailConfig?.senders || []
    const keyed = mailKey
      ? senders.find((sender) => sender.key === mailKey && sender.fromEmail)
      : undefined
    const fallback = senders.find((sender) => sender.key === "default" && sender.fromEmail)

    return {
      fromAddress:
        keyed?.fromEmail ||
        fallback?.fromEmail ||
        company?.emailConfig?.fromEmail ||
        company?.email ||
        this.systemFromAddress,
      fromName:
        keyed?.fromName ||
        fallback?.fromName ||
        company?.emailConfig?.fromName ||
        company?.name ||
        this.systemFromName,
    }
  }

  /**
   * Resolve the appropriate email transporter for a tenant.
   * Uses the company SMTP as soon as it is saved and enabled — verification is a health check, not a gate.
   */
  resolveTransporter(
    company: ICompany | null,
    options?: { mailKey?: string },
  ): TransportResult {
    const identity = this.pickFromIdentity(company, options?.mailKey)
    const smtp = company?.emailConfig?.smtp

    if (
      company?.emailConfig?.enabled &&
      smtp?.host &&
      smtp?.username &&
      smtp?.password
    ) {
      try {
        const tenantTransporter = createSmtpTransport({
          host: smtp.host,
          port: smtpPort(smtp.port),
          secure: Boolean(smtp.secure),
          username: smtp.username,
          password: decryptSecret(smtp.password),
        })

        console.log(`Using tenant email for ${company.name}: ${identity.fromAddress}`)

        return {
          transporter: tenantTransporter,
          fromAddress: identity.fromAddress,
          fromName: identity.fromName,
          usingTenantSmtp: true,
        }
      } catch (error) {
        console.error("Failed to create tenant transporter, falling back to system email:", error)
      }
    }

    console.log(`Using system email for ${company?.name || "unknown tenant"}`)
    return {
      transporter: this.systemTransporter,
      fromAddress: this.systemFromAddress,
      fromName: this.systemFromName,
      usingTenantSmtp: false,
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
    fromName?: string,
  ): Promise<{
    success: boolean
    message: string
    smtp?: { port: number; secure: boolean; username: string }
  }> {
    const normalized = normalizeSmtpSettings(port, secure)
    const usernames = [username.trim()].filter(Boolean)
    const fromUser = String(fromAddress || "").trim()
    if (fromUser.includes("@") && !usernames.includes(fromUser)) {
      usernames.push(fromUser)
    }

    const attempts: Array<{ port: number; secure: boolean; username: string }> = []
    for (const user of usernames) {
      attempts.push({ port: normalized.port, secure: normalized.secure, username: user })
      if (normalized.port === 587) {
        attempts.push({ port: 465, secure: true, username: user })
      } else if (normalized.port === 465) {
        attempts.push({ port: 587, secure: false, username: user })
      }
    }

    let lastError: unknown
    for (const attempt of attempts) {
      try {
        const testTransporter = createSmtpTransport({
          host,
          port: attempt.port,
          secure: attempt.secure,
          username: attempt.username,
          password,
        })

        await testTransporter.verify()

        const from = fromAddress || attempt.username
        const name = fromName || "ElevateHub"

        const info = await testTransporter.sendMail({
          from: `"${name}" <${from}>`,
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
          port: attempt.port,
          secure: attempt.secure,
        })

        return {
          success: true,
          message: `Mail server accepted the message (${info.response || info.messageId}). Check inbox and spam — external providers may filter mail without DKIM/DMARC.`,
          smtp: attempt,
        }
      } catch (error) {
        lastError = error
        if (!isTlsMismatch(error) && !isAuthFailure(error)) break
      }
    }

    console.error("Email config test failed:", lastError)
    return {
      success: false,
      message: friendlySmtpError(lastError),
    }
  }
}

export const emailTransportResolver = new EmailTransportResolver()
