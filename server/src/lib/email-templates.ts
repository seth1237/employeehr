/** Shared ElevateHub email layout — table-based for client compatibility. */

export const ELEVATE_EMAIL = {
  brandName: "ElevateHub",
  tagline: "Digital Solutions & Strategy",
  footerImagePath: "/elevateemail.png",
  contactEmail: "info@elevatehub.co.ke",
  website: "https://elevatehub.co.ke",
  websiteLabel: "elevatehub.co.ke",
  primary: "#6c0cd9",
  primaryDark: "#1800ad",
  accent: "#0ea5e9",
  bg: "#f3f4f8",
  card: "#fefefe",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  dark: {
    bg: "#0f1117",
    card: "#1a1d27",
    text: "#f1f5f9",
    muted: "#94a3b8",
    border: "#2d3548",
    panel: "#252a37",
    otpBg: "#2a2540",
    otpBorder: "#4c3d78",
    otpCode: "#c4b5fd",
    link: "#93c5fd",
  },
} as const

export type EmailLayoutOptions = {
  title: string
  preheader?: string
  headline?: string
  subtitle?: string
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

export function resolveFooterImageUrl() {
  const configured = String(process.env.EMAIL_FOOTER_IMAGE_URL || "").trim()
  if (configured) return configured

  const base = String(process.env.FRONTEND_URL || "https://elevatehub.co.ke").replace(/\/$/, "")
  return `${base}${ELEVATE_EMAIL.footerImagePath}`
}

function renderEmailStyles() {
  const b = ELEVATE_EMAIL
  const d = b.dark

  const darkBlock = `
    .eh-body,
    .eh-body-table { background-color: ${d.bg} !important; }
    .eh-card { background-color: ${d.card} !important; border-color: ${d.border} !important; }
    .eh-content,
    .eh-text,
    .eh-text p,
    .eh-text strong,
    .eh-text li { color: ${d.text} !important; }
    .eh-muted,
    .eh-muted p { color: ${d.muted} !important; }
    .eh-disclaimer { color: ${d.muted} !important; }
    .eh-panel { background-color: ${d.panel} !important; border-color: ${d.border} !important; }
    .eh-panel-label { color: ${d.muted} !important; border-color: ${d.border} !important; }
    .eh-panel-value { color: ${d.text} !important; border-color: ${d.border} !important; }
    .eh-otp { background-color: ${d.otpBg} !important; border-color: ${d.otpBorder} !important; }
    .eh-otp-code { color: ${d.otpCode} !important; -webkit-text-fill-color: ${d.otpCode} !important; }
    .eh-callout-warn { background-color: #3d2a1a !important; border-color: #9a5b20 !important; }
    .eh-callout-warn,
    .eh-callout-warn p,
    .eh-callout-warn strong { color: #fcd9b6 !important; }
    .eh-callout-info { background-color: #3d3518 !important; border-color: #a68b1a !important; }
    .eh-callout-info,
    .eh-callout-info p,
    .eh-callout-info span { color: #fde68a !important; }
    .eh-header-cell { background: linear-gradient(135deg, ${b.primaryDark} 0%, ${b.primary} 100%) !important; }
    .eh-footer-bar { background-color: ${b.primaryDark} !important; }
    .eh-footer-logo-wrap { background-color: #ffffff !important; }
    .eh-link { color: ${d.link} !important; }`

  return `<style type="text/css">
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body { color-scheme: light dark; }

    @media (prefers-color-scheme: dark) {
      ${darkBlock}
    }

    [data-ogsc] .eh-body,
    [data-ogsc] .eh-body-table { background-color: ${d.bg} !important; }
    [data-ogsc] .eh-card { background-color: ${d.card} !important; border-color: ${d.border} !important; }
    [data-ogsc] .eh-content,
    [data-ogsc] .eh-text,
    [data-ogsc] .eh-text p,
    [data-ogsc] .eh-text strong { color: ${d.text} !important; }
    [data-ogsc] .eh-muted { color: ${d.muted} !important; }
    [data-ogsc] .eh-panel { background-color: ${d.panel} !important; border-color: ${d.border} !important; }
    [data-ogsc] .eh-otp { background-color: ${d.otpBg} !important; border-color: ${d.otpBorder} !important; }
    [data-ogsc] .eh-otp-code { color: ${d.otpCode} !important; }
    [data-ogsb] .eh-body,
    [data-ogsb] .eh-body-table { background-color: ${d.bg} !important; }
    [data-ogsb] .eh-card { background-color: ${d.card} !important; }
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
  const footerImage = resolveFooterImageUrl()
  return `
    <tr>
      <td class="eh-footer-logo-wrap" bgcolor="#ffffff" style="padding:28px 32px 20px;text-align:center;background:#ffffff;border-top:1px solid ${b.border};">
        <img
          class="eh-footer-img"
          src="${footerImage}"
          alt="${escapeHtml(b.brandName)}"
          width="300"
          height="100"
          style="display:block;width:100%;max-width:300px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;"
        />
      </td>
    </tr>
    <tr>
      <td class="eh-footer-bar" bgcolor="${b.primaryDark}" style="background:${b.primaryDark};padding:20px 24px;text-align:center;">
        <p style="margin:0 0 6px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;letter-spacing:0.2px;">
          ${escapeHtml(b.brandName)} | ${escapeHtml(b.tagline)}
        </p>
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:13px;line-height:1.6;color:rgba(255,255,255,0.88);">
          Email:
          <a href="mailto:${b.contactEmail}" class="eh-link" style="color:#ffffff;text-decoration:underline;">${b.contactEmail}</a>
          &nbsp;·&nbsp;
          Website:
          <a href="${b.website}" class="eh-link" style="color:#ffffff;text-decoration:underline;">${b.websiteLabel}</a>
        </p>
      </td>
    </tr>`
}

export function renderEmailLayout(options: EmailLayoutOptions) {
  const b = ELEVATE_EMAIL
  const accent = options.accentColor || b.primary
  const preheader = escapeHtml(options.preheader || options.title)
  const headline = options.headline ? escapeHtml(options.headline) : escapeHtml(options.title)
  const subtitle = options.subtitle ? `<p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.92);">${escapeHtml(options.subtitle)}</p>` : ""

  const header = options.headerHtml || `
    <tr>
      <td class="eh-header-cell" bgcolor="${b.primaryDark}" style="background:linear-gradient(135deg, ${b.primaryDark} 0%, ${accent} 100%);padding:28px 32px;text-align:left;">
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.78);">
          ${escapeHtml(b.brandName)}
        </p>
        <h1 style="margin:6px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:24px;line-height:1.25;font-weight:700;color:#ffffff;">
          ${headline}
        </h1>
        ${subtitle}
      </td>
    </tr>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${escapeHtml(options.title)}</title>
  ${renderEmailStyles()}
</head>
<body class="eh-body" style="margin:0;padding:0;background:${b.bg};color-scheme:light dark;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" class="eh-body-table" width="100%" cellpadding="0" cellspacing="0" bgcolor="${b.bg}" style="background:${b.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" class="eh-card" width="600" cellpadding="0" cellspacing="0" bgcolor="${b.card}" style="width:100%;max-width:600px;background:${b.card};border-radius:16px;overflow:hidden;border:1px solid ${b.border};box-shadow:0 8px 30px rgba(15,23,42,0.08);">
          ${header}
          <tr>
            <td class="eh-content eh-text" style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:${b.text};font-size:15px;line-height:1.65;">
              ${options.bodyHtml}
            </td>
          </tr>
          ${renderEmailFooter()}
        </table>
        <p class="eh-disclaimer" style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;font-size:11px;line-height:1.5;color:${b.muted};text-align:center;max-width:600px;">
          You received this message from ${escapeHtml(b.brandName)}. If you did not expect it, you can safely ignore this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function renderOtpBlock(code: string, label = "Your verification code") {
  const safe = escapeHtml(code)
  return `
    <p class="eh-muted" style="margin:0 0 12px;color:${ELEVATE_EMAIL.muted};font-size:14px;">${escapeHtml(label)}</p>
    <div class="eh-otp" style="margin:0 0 20px;padding:18px 20px;background:#f8f7ff;border:1px solid #e9e0ff;border-radius:12px;text-align:center;">
      <span class="eh-otp-code" style="display:inline-block;font-family:'SF Mono',Menlo,Monaco,Consolas,monospace;font-size:32px;font-weight:700;letter-spacing:0.35em;color:${ELEVATE_EMAIL.primaryDark};">${safe}</span>
    </div>`
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
    title: "Login verification code",
    preheader: `Your ElevateHub login code is ${otp}`,
    headline: "Verify your login",
    subtitle: "Use this one-time code to finish signing in.",
    bodyHtml: `
      ${renderOtpBlock(otp, "Enter this code on the login screen")}
      <p class="eh-muted" style="margin:0 0 8px;color:${ELEVATE_EMAIL.muted};font-size:14px;">This code expires in <strong class="eh-text" style="color:${ELEVATE_EMAIL.text};">10 minutes</strong>.</p>
      <p class="eh-muted" style="margin:0;color:${ELEVATE_EMAIL.muted};font-size:14px;">If you did not attempt to sign in, ignore this email and secure your account.</p>`,
  })
}

export function passwordResetOtpEmail(otp: string) {
  return renderEmailLayout({
    title: "Password reset code",
    preheader: `Your ElevateHub password reset code is ${otp}`,
    headline: "Reset your password",
    subtitle: "Confirm it is you before choosing a new password.",
    accentColor: "#dc2626",
    bodyHtml: `
      ${renderOtpBlock(otp, "Password reset code")}
      <p class="eh-muted" style="margin:0 0 8px;color:${ELEVATE_EMAIL.muted};font-size:14px;">This code expires in <strong class="eh-text" style="color:${ELEVATE_EMAIL.text};">15 minutes</strong>.</p>
      <p class="eh-muted" style="margin:0;color:${ELEVATE_EMAIL.muted};font-size:14px;">If you did not request a reset, ignore this email. Your password will stay unchanged.</p>`,
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
    accentColor: "#dc2626",
    bodyHtml: `
      ${renderInfoPanel("Deletion request", [
        { label: "Company", value: params.companyName },
        { label: "Slug", value: params.companySlug },
        { label: "ID", value: params.companyId },
        { label: "Requested by", value: params.requestedBy },
      ])}
      ${renderOtpBlock(params.otp, "Owner verification code")}
      <p class="eh-muted" style="margin:0 0 8px;color:${ELEVATE_EMAIL.muted};font-size:14px;">Expires in <strong class="eh-text" style="color:${ELEVATE_EMAIL.text};">${params.expiresMinutes} minutes</strong>.</p>
      <p class="eh-muted" style="margin:0;color:${ELEVATE_EMAIL.muted};font-size:14px;">If you did not expect this request, ignore the email and secure the owner account immediately.</p>`,
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
