import "dotenv/config"
import nodemailer from "nodemailer"
import { renderEmailLayout, ELEVATE_EMAIL } from "../src/lib/email-templates.js"

const to = process.argv[2] || "bellarinseth@gmail.com"
const host = process.env.SMTP_HOST || "mail.elevatehub.co.ke"
const port = Number(process.env.SMTP_PORT || 587)
const user = process.env.SMTP_USER || ""
const pass = process.env.SMTP_PASS || ""
const from = process.env.SMTP_FROM || user
const stamp = new Date().toISOString()

async function main() {
  if (!user || !pass) {
    console.error("SMTP_USER and SMTP_PASS must be set in server/.env")
    process.exit(1)
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    requireTLS: port === 587,
    tls: { rejectUnauthorized: false },
  })

  console.log(`Connecting to ${host}:${port} as ${user}...`)
  await transporter.verify()

  const html = renderEmailLayout({
    title: "ElevateHub email test",
    preheader: `ElevateHub test at ${stamp}`,
    headline: "Email test successful",
    subtitle: "System SMTP is configured correctly",
    bodyHtml: `
      <p style="margin:0 0 12px;">This message confirms that <strong>ElevateHub</strong> can send email through your configured SMTP server.</p>
      <p style="margin:0;color:${ELEVATE_EMAIL.muted};font-size:14px;">Sent at ${stamp}</p>`,
  })

  const info = await transporter.sendMail({
    from: `"ElevateHub" <${from}>`,
    to,
    subject: `ElevateHub email test ${stamp}`,
    text: `ElevateHub SMTP test at ${stamp}`,
    html,
  })

  console.log("\nSMTP server accepted the message:")
  console.log("  messageId:", info.messageId)
  console.log("  response:", info.response)
  console.log("  accepted:", info.accepted?.join(", ") || "(none)")
}

main().catch((error) => {
  console.error("\nSend failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
