/** Shared ElevateHub email layout — table-based for client compatibility. */

export const ELEVATE_EMAIL = {
  brandName: "ElevateHub",
  tagline: "Digital Solutions & Strategy",
  footerImagePath: "/elevateemail.png",
  brandLogoPath: "/elevate-logo.png",
  contactEmail: "info@elevatehub.co.ke",
  website: "https://elevatehub.co.ke",
  websiteLabel: "elevatehub.co.ke",
  primary: "#6c0cd9",
  primaryDark: "#1800ad",
  accent: "#0ea5e9",
  bg: "#eef0f5",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e6e8ee",
  otpBg: "#f4f0ff",
  otpBorder: "#ddd2ff",
} as const

export type EmailLayoutOptions = {
  title: string
  preheader?: string
  headline?: string
  subtitle?: string
  headerBadge?: string
  bodyHtml: string
  accentColor?: string
  headerHtml?: string
}

function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function isPublicHttpsUrl(value: string) {
  try {
    const parsed = new URL(value)
    const host = parsed.hostname.toLowerCase()
    return parsed.protocol === "https:" && host !== "localhost" && host !== "127.0.0.1"
  } catch {
    return false
  }
}

function publicAssetBase() {
  const configured = String(process.env.EMAIL_PUBLIC_ASSET_BASE || process.env.PUBLIC_SITE_URL || "").trim()
  if (isPublicHttpsUrl(configured)) return configured.replace(/\/$/, "")
  return "https://www.elevatehub.co.ke"
}

function publicAssetUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${publicAssetBase()}${normalized}`
}

export function resolveFooterImageUrl() {
  const configured = String(process.env.EMAIL_FOOTER_IMAGE_URL || "").trim()
  if (isPublicHttpsUrl(configured)) return configured
  return publicAssetUrl(ELEVATE_EMAIL.footerImagePath)
}

export function resolveBrandLogoUrl() {
  const configured = String(process.env.EMAIL_BRAND_LOGO_URL || "").trim()
  if (isPublicHttpsUrl(configured)) return configured
  return publicAssetUrl(ELEVATE_EMAIL.brandLogoPath)
}

function renderEmailStyles() {
  const b = ELEVATE_EMAIL

  // Keep the branded card light. Gmail/Outlook dark mode often inverts
  // backgrounds and would hide the dark logo or wash out the OTP.
  return `<style type="text/css">
    :root { color-scheme: light; supported-color-schemes: light; }
    body, .eh-body { color-scheme: light; }

    @media (prefers-color-scheme: dark) {
      .eh-body,
      .eh-body-table { background-color: ${b.bg} !important; }
      .eh-card,
      .eh-brand-row,
      .eh-footer-wrap,
      .eh-content { background-color: ${b.card} !important; }
      .eh-heading,
      .eh-wordmark,
      .eh-text,
      .eh-text p,
      .eh-text strong,
      .eh-text li { color: ${b.text} !important; }
      .eh-muted,
      .eh-muted p,
      .eh-disclaimer { color: ${b.muted} !important; }
      .eh-otp { background-color: ${b.otpBg} !important; border-color: ${b.otpBorder} !important; }
      .eh-otp-code { color: ${b.primaryDark} !important; -webkit-text-fill-color: ${b.primaryDark} !important; }
      .eh-security { background-color: #faf9ff !important; border-color: ${b.otpBorder} !important; color: #3f3a5c !important; }
      .eh-accent-bar { background-color: ${b.primary} !important; }
    }

    [data-ogsc] .eh-card,
    [data-ogsb] .eh-card,
    [data-ogsc] .eh-brand-row,
    [data-ogsb] .eh-brand-row,
    [data-ogsc] .eh-footer-wrap,
    [data-ogsb] .eh-footer-wrap,
    [data-ogsc] .eh-content,
    [data-ogsb] .eh-content { background-color: ${b.card} !important; }
    [data-ogsc] .eh-heading,
    [data-ogsb] .eh-heading,
    [data-ogsc] .eh-wordmark,
    [data-ogsb] .eh-wordmark { color: ${b.text} !important; }
    [data-ogsc] .eh-otp,
    [data-ogsb] .eh-otp { background-color: ${b.otpBg} !important; border-color: ${b.otpBorder} !important; }
    [data-ogsc] .eh-otp-code,
    [data-ogsb] .eh-otp-code { color: ${b.primaryDark} !important; -webkit-text-fill-color: ${b.primaryDark} !important; }
  </style>`
}

export function renderCalloutBox(
  innerHtml: string,
  variant: "neutral" | "warn" | "info" = "neutral",
  accentBorder?: string,
) {
  const b = ELEVATE_EMAIL
  if (variant === "warn") {
    return `<div class="eh-callout-warn eh-text" style="margin:0 0 16px;padding:16px;background:#fff7ed;border:1px solid #fed7aa;${accentBorder ? `border-left:4px solid ${accentBorder};` : ""}border-radius:12px;">${innerHtml}</div>`
  }
  if (variant === "info") {
    return `<div class="eh-callout-info eh-text" style="margin:0 0 16px;padding:14px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;">${innerHtml}</div>`
  }
  return `<div class="eh-panel eh-text" style="margin:0 0 16px;padding:16px;background:#f8fafc;border:1px solid ${b.border};${accentBorder ? `border-left:4px solid ${accentBorder};` : ""}border-radius:12px;">${innerHtml}</div>`
}

export function renderEmailFooter() {
  const b = ELEVATE_EMAIL
  const year = new Date().getFullYear()
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
  return `
    <tr>
      <td class="eh-footer-wrap" bgcolor="${b.card}" style="padding:22px 32px 28px;text-align:center;background:${b.card};border-top:1px solid ${b.border};">
        <p class="eh-muted" style="margin:0 0 10px;font-family:${font};font-size:12px;line-height:1.5;color:${b.muted};">
          ${escapeHtml(b.brandName)} · ${escapeHtml(b.tagline)}
        </p>
        <p class="eh-muted" style="margin:0 0 12px;font-family:${font};font-size:12px;line-height:1.6;color:${b.muted};">
          <a href="mailto:${b.contactEmail}" class="eh-link" style="color:${b.muted};text-decoration:none;">${b.contactEmail}</a>
          &nbsp;·&nbsp;
          <a href="${b.website}" class="eh-link" style="color:${b.muted};text-decoration:none;">${b.websiteLabel}</a>
        </p>
        <p class="eh-muted" style="margin:0;font-family:${font};font-size:11px;line-height:1.5;color:${b.muted};">
          © ${year} ${escapeHtml(b.brandName)}. All rights reserved.
        </p>
      </td>
    </tr>`
}

export function renderEmailLayout(options: EmailLayoutOptions) {
  const b = ELEVATE_EMAIL
  const preheader = escapeHtml(options.preheader || options.title)
  const headline = options.headline ? escapeHtml(options.headline) : ""
  const badge = options.headerBadge ? escapeHtml(options.headerBadge) : ""
  const logo = resolveBrandLogoUrl()
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

  const headingBlock =
    !options.headerHtml && headline
      ? `
        <h1 class="eh-heading" style="margin:8px 0 8px;font-family:${font};font-size:26px;line-height:1.25;font-weight:700;letter-spacing:-0.03em;color:${b.text};">
          ${headline}
        </h1>
        ${options.subtitle ? `<p class="eh-muted" style="margin:0 0 24px;font-family:${font};font-size:15px;line-height:1.6;color:${b.muted};">${escapeHtml(options.subtitle)}</p>` : `<div style="height:16px;line-height:16px;font-size:16px;">&nbsp;</div>`}`
      : ""

  const header = options.headerHtml || `
    <tr>
      <td class="eh-accent-bar" bgcolor="${b.primary}" style="background:${b.primary};height:4px;line-height:4px;font-size:0;">&nbsp;</td>
    </tr>
    <tr>
      <td class="eh-brand-row" bgcolor="${b.card}" style="padding:18px 32px 4px;background:${b.card};">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td valign="middle" style="vertical-align:middle;">
              <img
                src="${logo}"
                alt="${escapeHtml(b.brandName)}"
                width="108"
                style="display:block;width:108px;max-width:108px;height:auto;border:0;outline:none;text-decoration:none;"
              />
            </td>
            <td valign="middle" align="right" style="vertical-align:middle;text-align:right;">
              ${badge ? `<p style="margin:0;font-family:${font};font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${b.primary};">${badge}</p>` : `<p class="eh-wordmark" style="margin:0;font-family:${font};font-size:13px;font-weight:700;color:${b.text};letter-spacing:-0.02em;">${escapeHtml(b.brandName)}</p>`}
            </td>
          </tr>
        </table>
      </td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(options.title)}</title>
  ${renderEmailStyles()}
</head>
<body class="eh-body" style="margin:0;padding:0;background:${b.bg};color-scheme:light;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" class="eh-body-table" width="100%" cellpadding="0" cellspacing="0" bgcolor="${b.bg}" style="background:${b.bg};padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="eh-card" width="560" cellpadding="0" cellspacing="0" bgcolor="${b.card}" style="width:100%;max-width:560px;background:${b.card};border-radius:18px;overflow:hidden;border:1px solid ${b.border};box-shadow:0 10px 32px rgba(15,23,42,0.07);">
          ${header}
          <tr>
            <td class="eh-content eh-text" style="padding:28px 32px 8px;font-family:${font};color:${b.text};font-size:15px;line-height:1.65;">
              ${headingBlock}
              ${options.bodyHtml}
            </td>
          </tr>
          ${renderEmailFooter()}
        </table>
        <p class="eh-disclaimer" style="margin:16px 0 0;font-family:${font};font-size:11px;line-height:1.5;color:${b.muted};text-align:center;max-width:560px;">
          You received this message from ${escapeHtml(b.brandName)}. If you did not expect it, you can safely ignore this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function renderOtpBlock(code: string, label = "Verification code") {
  const safe = escapeHtml(String(code || "").replace(/\s+/g, ""))
  const b = ELEVATE_EMAIL
  const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
  return `
    <p class="eh-muted" style="margin:0 0 10px;font-family:${font};font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${b.muted};text-align:center;">${escapeHtml(label)}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr>
        <td class="eh-otp" bgcolor="${b.otpBg}" align="center" style="background:${b.otpBg};border:1px solid ${b.otpBorder};border-radius:12px;padding:18px 16px;">
          <span class="eh-otp-code" style="display:inline-block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,'Liberation Mono','Courier New',monospace;font-size:34px;line-height:1.2;font-weight:700;letter-spacing:0.28em;padding-left:0.28em;color:${b.primaryDark};-webkit-text-fill-color:${b.primaryDark};-webkit-user-select:all;user-select:all;">${safe}</span>
        </td>
      </tr>
    </table>`
}

export function renderSecurityNote(message?: string) {
  const b = ELEVATE_EMAIL
  const copy =
    message ||
    "<strong>Keep this code confidential.</strong> ElevateHub will never ask you to share it. If someone contacts you for this code, it is not us."
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
      <tr>
        <td class="eh-security eh-muted" style="padding:12px 14px;background:#faf9ff;border:1px solid ${b.otpBorder};border-radius:10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.55;color:#3f3a5c;">
          ${copy}
        </td>
      </tr>
    </table>`
}

export function renderPrimaryButton(label: string, href: string) {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 8px;">
      <tr>
        <td style="border-radius:10px;background:${ELEVATE_EMAIL.primary};">
          <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`
}

export function renderInfoPanel(title: string, rows: Array<{ label: string; value: string }>) {
  const items = rows
    .map(
      (row) => `
      <tr>
        <td class="eh-panel-label" style="padding:8px 0;border-bottom:1px solid ${ELEVATE_EMAIL.border};font-size:12px;font-weight:600;color:${ELEVATE_EMAIL.muted};text-transform:uppercase;letter-spacing:0.04em;width:38%;vertical-align:top;">
          ${escapeHtml(row.label)}
        </td>
        <td class="eh-panel-value" style="padding:8px 0 8px 12px;border-bottom:1px solid ${ELEVATE_EMAIL.border};font-size:14px;color:${ELEVATE_EMAIL.text};vertical-align:top;">
          ${escapeHtml(row.value)}
        </td>
      </tr>`,
    )
    .join("")
  return `
    <p class="eh-text" style="margin:0 0 10px;font-size:13px;font-weight:600;color:${ELEVATE_EMAIL.text};">${escapeHtml(title)}</p>
    <table role="presentation" class="eh-panel" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#f8fafc;border:1px solid ${ELEVATE_EMAIL.border};border-radius:12px;padding:4px 16px;">
      ${items}
    </table>`
}

export function loginOtpEmail(otp: string) {
  return renderEmailLayout({
    title: "Verify your ElevateHub sign-in",
    preheader: `Your ElevateHub login code is ${otp}. It expires in 10 minutes.`,
    headline: "Verify your sign-in",
    subtitle: "We received a sign-in attempt. Enter this code in the browser window where you started signing in.",
    headerBadge: "Account security",
    bodyHtml: `
      ${renderOtpBlock(otp, "Your verification code")}
      <p class="eh-muted" style="margin:0 0 16px;color:${ELEVATE_EMAIL.muted};font-size:14px;text-align:center;">This code expires in <strong class="eh-text" style="color:${ELEVATE_EMAIL.text};">10 minutes</strong>.</p>
      ${renderSecurityNote()}
      <p class="eh-muted" style="margin:0 0 12px;color:${ELEVATE_EMAIL.muted};font-size:13px;line-height:1.6;">If you did not try to sign in, you can ignore this email. The code will expire on its own.</p>`,
  })
}

export function passwordResetOtpEmail(otp: string) {
  return renderEmailLayout({
    title: "Reset your ElevateHub password",
    preheader: `Your ElevateHub password reset code is ${otp}. It expires in 15 minutes.`,
    headline: "Reset your password",
    subtitle: "Confirm it is you before choosing a new password. Enter this code on the reset screen.",
    headerBadge: "Account security",
    bodyHtml: `
      ${renderOtpBlock(otp, "Password reset code")}
      <p class="eh-muted" style="margin:0 0 16px;color:${ELEVATE_EMAIL.muted};font-size:14px;text-align:center;">This code expires in <strong class="eh-text" style="color:${ELEVATE_EMAIL.text};">15 minutes</strong>.</p>
      ${renderSecurityNote()}
      <p class="eh-muted" style="margin:0 0 12px;color:${ELEVATE_EMAIL.muted};font-size:13px;line-height:1.6;">If you did not request a reset, ignore this email. Your password will stay unchanged.</p>`,
  })
}

export function companyDeleteOtpEmail(params: {
  otp: string
  companyName: string
  companySlug: string
  companyId: string
  requestedBy: string
  expiresMinutes: number
}) {
  return renderEmailLayout({
    title: "Company deletion verification",
    preheader: `Deletion OTP for ${params.companyName}`,
    headline: "Confirm company deletion",
    subtitle: "This action is permanent and cannot be undone.",
    headerBadge: "Account security",
    bodyHtml: `
      ${renderInfoPanel("Deletion request", [
        { label: "Company", value: params.companyName },
        { label: "Slug", value: params.companySlug },
        { label: "ID", value: params.companyId },
        { label: "Requested by", value: params.requestedBy },
      ])}
      ${renderOtpBlock(params.otp, "Owner verification code")}
      <p class="eh-muted" style="margin:0 0 16px;color:${ELEVATE_EMAIL.muted};font-size:14px;text-align:center;">Expires in <strong class="eh-text" style="color:${ELEVATE_EMAIL.text};">${params.expiresMinutes} minutes</strong>.</p>
      ${renderSecurityNote()}
      <p class="eh-muted" style="margin:0 0 12px;color:${ELEVATE_EMAIL.muted};font-size:13px;">If you did not expect this request, ignore the email and secure the owner account immediately.</p>`,
  })
}

export function emailConfigTestEmail() {
  return renderEmailLayout({
    title: "Email configuration test",
    headline: "Email settings verified",
    subtitle: "Your outbound mail configuration is working.",
    bodyHtml: `
      <p style="margin:0 0 12px;">Your company email settings were verified successfully.</p>
      <p style="margin:0;color:${ELEVATE_EMAIL.muted};font-size:14px;">Messages from your organization can now be sent using this configuration.</p>`,
  })
}

export function meetingInvitationEmail(params: {
  title: string
  scheduledAt: string
  durationMinutes: number
  description?: string
  agenda?: string
  meetingLink: string
  meetingId: string
  password?: string
}) {
  return renderEmailLayout({
    title: `Meeting invitation: ${params.title}`,
    preheader: `You are invited to ${params.title}`,
    headline: "Meeting invitation",
    subtitle: params.title,
    bodyHtml: `
      ${renderInfoPanel("Details", [
        { label: "When", value: params.scheduledAt },
        { label: "Duration", value: `${params.durationMinutes} minutes` },
        ...(params.description ? [{ label: "Description", value: params.description }] : []),
        ...(params.agenda ? [{ label: "Agenda", value: params.agenda }] : []),
        { label: "Meeting ID", value: params.meetingId },
      ])}
      ${renderPrimaryButton("Join meeting", params.meetingLink)}
      <p style="margin:0 0 16px;word-break:break-all;font-size:13px;color:${ELEVATE_EMAIL.muted};">${escapeHtml(params.meetingLink)}</p>
      ${
        params.password
          ? renderCalloutBox(
              `<p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#92400e;">Meeting password</p>
              <p style="margin:0;font-family:monospace;font-size:16px;color:#78350f;">${escapeHtml(params.password)}</p>`,
              "info",
            )
          : ""
      }`,
  })
}

export function meetingSummaryEmail(params: {
  meetingTitle: string
  scheduledAt: string
  summary: string
  keyPoints: string[]
  actionItems: Array<{ description: string; assigned_to: string; due_date?: Date | null }>
}) {
  const keyPoints =
    params.keyPoints.length > 0
      ? `<ul style="margin:0;padding-left:20px;color:${ELEVATE_EMAIL.text};">${params.keyPoints.map((p) => `<li style="margin:0 0 8px;">${escapeHtml(p)}</li>`).join("")}</ul>`
      : `<p style="margin:0;color:${ELEVATE_EMAIL.muted};">No key points recorded.</p>`

  const actionItems =
    params.actionItems.length > 0
      ? `<ul style="margin:0;padding-left:20px;">${params.actionItems
          .map((item) => {
            const due = item.due_date ? ` · Due ${item.due_date.toLocaleDateString()}` : ""
            return `<li style="margin:0 0 10px;color:${ELEVATE_EMAIL.text};"><strong>${escapeHtml(item.description)}</strong><br /><span style="font-size:13px;color:${ELEVATE_EMAIL.muted};">Assigned to ${escapeHtml(item.assigned_to)}${due}</span></li>`
          })
          .join("")}</ul>`
      : `<p style="margin:0;color:${ELEVATE_EMAIL.muted};">No action items captured.</p>`

  return renderEmailLayout({
    title: `Meeting summary: ${params.meetingTitle}`,
    preheader: `Summary for ${params.meetingTitle}`,
    headline: "Meeting summary",
    subtitle: `${params.meetingTitle} · ${params.scheduledAt}`,
    bodyHtml: `
      ${renderCalloutBox(
        `<p class="eh-text" style="margin:0 0 8px;font-size:13px;font-weight:600;color:${ELEVATE_EMAIL.text};">Summary</p>
        <p class="eh-text" style="margin:0;color:${ELEVATE_EMAIL.text};">${escapeHtml(params.summary)}</p>`,
      )}
      <div style="margin:0 0 18px;">
        <p class="eh-text" style="margin:0 0 8px;font-size:13px;font-weight:600;color:${ELEVATE_EMAIL.text};">Key points</p>
        ${keyPoints}
      </div>
      <div style="margin:0;">
        <p class="eh-text" style="margin:0 0 8px;font-size:13px;font-weight:600;color:${ELEVATE_EMAIL.text};">Action items</p>
        ${actionItems}
      </div>
      <p class="eh-muted" style="margin:18px 0 0;font-size:13px;color:${ELEVATE_EMAIL.muted};">Tasks may have been created automatically in your dashboard.</p>`,
  })
}

export function userInvitationEmail(params: {
  recipientName: string
  inviterName: string
  roleLabel: string
  recipientEmail: string
  temporaryPassword: string
  loginUrl: string
}) {
  return renderEmailLayout({
    title: "Welcome to ElevateHub",
    preheader: `${params.inviterName} invited you to join ElevateHub`,
    headline: "You're invited",
    subtitle: `${params.inviterName} added you as ${params.roleLabel}`,
    bodyHtml: `
      <p style="margin:0 0 16px;">Hi <strong>${escapeHtml(params.recipientName)}</strong>, your account is ready. Sign in with the credentials below, then change your password after your first login.</p>
      ${renderInfoPanel("Your credentials", [
        { label: "Email", value: params.recipientEmail },
        { label: "Password", value: params.temporaryPassword },
        { label: "Role", value: params.roleLabel },
      ])}
      ${renderPrimaryButton("Sign in to ElevateHub", params.loginUrl)}
      <p style="margin:0;font-size:13px;color:${ELEVATE_EMAIL.muted};">For security, update your password immediately after signing in.</p>`,
  })
}

export function platformInvitationEmail(params: {
  companyName: string
  inviteLink: string
  invitedByName: string
  logoUrl?: string
  accentColor?: string
}) {
  return renderCompanyBrandedEmail({
    title: `Invitation to ${params.companyName}`,
    preheader: `${params.invitedByName} invited you to join ${params.companyName}`,
    headline: "You're invited",
    subtitle: `Join ${params.companyName} on ElevateHub`,
    companyName: params.companyName,
    logoUrl: params.logoUrl,
    accentColor: params.accentColor,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hello,</p>
      <p style="margin:0 0 16px;"><strong>${escapeHtml(params.invitedByName)}</strong> has invited you to join <strong>${escapeHtml(params.companyName)}</strong>.</p>
      <p style="margin:0 0 16px;color:${ELEVATE_EMAIL.muted};font-size:14px;">Accept the invitation to set up your account. The link expires in 7 days.</p>
      ${renderPrimaryButton("Accept invitation", params.inviteLink)}
      <p style="margin:12px 0 0;word-break:break-all;font-size:13px;color:${ELEVATE_EMAIL.muted};">${escapeHtml(params.inviteLink)}</p>`,
  })
}

export function documentAttachmentEmail(params: {
  documentType: "Invoice" | "Quotation"
  documentNumber: string
  recipientName: string
  companyName: string
  logoUrl?: string
  accentColor?: string
}) {
  const docLabel = params.documentType.toLowerCase()
  return renderCompanyBrandedEmail({
    title: `${params.documentType} ${params.documentNumber}`,
    preheader: `${params.documentType} ${params.documentNumber} from ${params.companyName}`,
    headline: params.documentType,
    subtitle: params.documentNumber,
    companyName: params.companyName,
    logoUrl: params.logoUrl,
    accentColor: params.accentColor,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hello <strong>${escapeHtml(params.recipientName)}</strong>,</p>
      <p style="margin:0 0 16px;">Please find attached <strong>${escapeHtml(docLabel)} ${escapeHtml(params.documentNumber)}</strong> from <strong>${escapeHtml(params.companyName)}</strong>.</p>
      <p style="margin:0;color:${ELEVATE_EMAIL.muted};font-size:14px;">If you have any questions, reply to this email or contact us directly.</p>`,
  })
}

export function renderCompanyBrandedEmail(params: {
  title: string
  preheader?: string
  headline: string
  subtitle?: string
  logoUrl?: string
  companyName?: string
  accentColor?: string
  bodyHtml: string
}) {
  const accent = params.accentColor || ELEVATE_EMAIL.primary
  const logo = params.logoUrl
    ? `<img src="${params.logoUrl}" alt="${escapeHtml(params.companyName || "Company")}" width="88" style="display:block;height:auto;border:0;outline:none;" />`
    : `<p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">${escapeHtml(params.companyName || "Company")}</p>`

  return renderEmailLayout({
    title: params.title,
    preheader: params.preheader || params.title,
    accentColor: accent,
    headerHtml: `
      <tr>
        <td class="eh-header-cell" bgcolor="${ELEVATE_EMAIL.primaryDark}" style="background:linear-gradient(135deg, ${ELEVATE_EMAIL.primaryDark} 0%, ${accent} 100%);padding:24px 32px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;">${logo}</td>
              <td style="vertical-align:middle;text-align:right;">
                <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.75);">${escapeHtml(params.companyName || "")}</p>
                <h1 style="margin:4px 0 0;font-size:22px;line-height:1.25;color:#ffffff;">${escapeHtml(params.headline)}</h1>
                ${params.subtitle ? `<p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.9);">${escapeHtml(params.subtitle)}</p>` : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>`,
    bodyHtml: params.bodyHtml,
  })
}
