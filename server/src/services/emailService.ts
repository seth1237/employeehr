import nodemailer from "nodemailer"
import { Company } from "../models/Company"
import { emailTransportResolver } from "./emailTransportResolver"
import type { ICompany } from "../types/interfaces"

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
    console.log("EMAIL_USER:", process.env.EMAIL_USER)
    console.log("EMAIL_PASSWORD length:", process.env.EMAIL_PASSWORD ? process.env.EMAIL_PASSWORD.length : "undefined")
    console.log("EMAIL_HOST:", process.env.EMAIL_HOST)

    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "465"),
      secure: process.env.EMAIL_SECURE === "true",
      requireTLS: process.env.EMAIL_PORT === "587",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    })

    // Verify connection
    this.transporter.verify((error, success) => {
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
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const currentYear = new Date().getFullYear();
    const roleDisplay = data.role.replace('_', ' ').toUpperCase();
    const roleDisplayNormal = data.role.replace('_', ' ');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #000000;
      background: #f5f5f7;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 560px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.08), 0 4px 16px rgba(0, 0, 0, 0.04);
    }
    .header-blue {
      background: #1800ad;
      padding: 32px 48px 28px;
      text-align: center;
    }
    .logo-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .logo-wrapper img {
      max-width: 300px;
      width: 100%;
      height: auto;
      display: block;
    }
    .content {
      padding: 40px 48px 48px;
    }
    h1 {
      font-size: 26px;
      font-weight: 600;
      color: #000000;
      letter-spacing: -0.4px;
      margin-bottom: 4px;
    }
    .greeting {
      font-size: 15px;
      color: #000000;
      margin-top: 2px;
    }
    .greeting strong {
      color: #6c0cd9;
    }
    .divider {
      height: 1px;
      background: #f0f0f2;
      margin: 24px 0;
    }
    .message {
      font-size: 15px;
      color: #000000;
      line-height: 1.6;
    }
    .message p {
      margin-bottom: 12px;
    }
    .message p:last-child {
      margin-bottom: 0;
    }
    .badge {
      display: inline-block;
      background: #f5f0ff;
      color: #6c0cd9;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
      letter-spacing: 0.2px;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .credentials {
      background: #f8f7fa;
      border-radius: 12px;
      padding: 24px 28px;
      margin: 24px 0;
      border: 1px solid #f0edf5;
    }
    .credential-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
    }
    .credential-row:not(:last-child) {
      border-bottom: 1px solid #e8e5ed;
    }
    .credential-label {
      font-size: 13px;
      color: #b4b4b4;
      font-weight: 500;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .credential-value {
      font-size: 15px;
      color: #000000;
      font-weight: 500;
      font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
      word-break: break-all;
      text-align: right;
      max-width: 60%;
    }
    .credential-value.email {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
    }
    .action {
      margin: 28px 0 8px;
      text-align: center;
    }
    .button {
      display: inline-block;
      background: #6c0cd9;
      color: #ffffff !important;
      font-weight: 600;
      font-size: 15px;
      padding: 14px 44px;
      border-radius: 10px;
      text-decoration: none;
      transition: background 0.15s ease;
      letter-spacing: 0.2px;
      border: none;
      cursor: pointer;
    }
    .button:hover {
      background: #5a0ab8;
    }
    .button-secondary {
      display: inline-block;
      color: #6c0cd9;
      font-weight: 500;
      font-size: 14px;
      text-decoration: none;
      border: 1px solid #e0d6ed;
      padding: 10px 28px;
      border-radius: 8px;
      transition: all 0.15s ease;
    }
    .button-secondary:hover {
      background: #f8f4ff;
      border-color: #6c0cd9;
    }
    .note {
      font-size: 13px;
      color: #b4b4b4;
      margin-top: 20px;
      text-align: center;
      line-height: 1.6;
    }
    .note strong {
      color: #000000;
      font-weight: 500;
    }
    .footer {
      padding: 24px 48px 32px;
      border-top: 1px solid #f0f0f2;
      text-align: center;
    }
    .social-links {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 16px;
    }
    .social-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      color: #b4b4b4;
      transition: color 0.15s ease, background 0.15s ease;
      text-decoration: none;
      background: #f8f7fa;
    }
    .social-link:hover {
      color: #6c0cd9;
      background: #f5f0ff;
    }
    .social-link svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }
    .footer-text {
      font-size: 12px;
      color: #b4b4b4;
      line-height: 1.6;
    }
    .footer-text a {
      color: #b4b4b4;
      text-decoration: none;
    }
    .footer-text a:hover {
      color: #6c0cd9;
    }
    .footer-text .separator {
      margin: 0 6px;
      color: #d6d6d6;
    }
    @media (max-width: 600px) {
      .container {
        margin: 16px;
        border-radius: 12px;
      }
      .header-blue {
        padding: 24px 24px 20px;
      }
      .logo-wrapper img {
        max-width: 200px;
      }
      .content {
        padding: 28px 24px 32px;
      }
      .footer {
        padding: 20px 24px 24px;
      }
      h1 {
        font-size: 22px;
      }
      .credentials {
        padding: 18px 20px;
      }
      .credential-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        padding: 10px 0;
      }
      .credential-value {
        max-width: 100%;
        text-align: left;
        font-size: 14px;
      }
      .button {
        padding: 14px 32px;
        font-size: 15px;
        width: 100%;
        text-align: center;
      }
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.08),0 4px 16px rgba(0,0,0,0.04);">
          <!-- Blue Header with Logo -->
          <tr>
            <td style="background:#1800ad;padding:32px 48px 28px;text-align:center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <img src="${appUrl}/ELEVATEERPLOGO.png" 
                         alt="Elevate" 
                         style="max-width:300px;width:100%;height:auto;display:block;border:0;"
                         width="300" 
                         height="100" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:40px 48px 48px;">
              <h1>Welcome aboard</h1>
              <p style="font-size:15px;color:#000000;margin-top:4px;">Hi <strong style="color:#6c0cd9;">${data.recipientName}</strong>,</p>
              
              <div style="height:1px;background:#f0f0f2;margin:24px 0;"></div>
              
              <div style="font-size:15px;color:#000000;line-height:1.6;">
                <p><strong>${data.inviterName}</strong> has invited you to join <strong>Elevate</strong> as a <span style="color:#6c0cd9;font-weight:500;">${roleDisplay}</span>.</p>
                <p>Your account is ready — here are your credentials to get started.</p>
              </div>
              
              <div style="background:#f8f7fa;border-radius:12px;padding:24px 28px;margin:24px 0;border:1px solid #f0edf5;">
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e8e5ed;">
                  <span style="font-size:13px;color:#b4b4b4;font-weight:500;letter-spacing:0.3px;text-transform:uppercase;">Email</span>
                  <span style="font-size:14px;color:#000000;font-weight:500;text-align:right;max-width:60%;">${data.recipientEmail}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e8e5ed;">
                  <span style="font-size:13px;color:#b4b4b4;font-weight:500;letter-spacing:0.3px;text-transform:uppercase;">Password</span>
                  <span style="font-size:15px;color:#000000;font-weight:500;font-family:'SF Mono','Menlo','Monaco','Courier New',monospace;text-align:right;max-width:60%;">${data.temporaryPassword}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;">
                  <span style="font-size:13px;color:#b4b4b4;font-weight:500;letter-spacing:0.3px;text-transform:uppercase;">Role</span>
                  <span style="font-size:15px;color:#000000;font-weight:500;text-align:right;max-width:60%;">${roleDisplayNormal}</span>
                </div>
              </div>
              
              <div style="margin:28px 0 8px;text-align:center;">
                <a href="${data.loginUrl}" style="display:inline-block;background:#6c0cd9;color:#ffffff !important;font-weight:600;font-size:15px;padding:14px 44px;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">Sign in to Elevate</a>
              </div>
              
              <p style="font-size:13px;color:#b4b4b4;margin-top:20px;text-align:center;line-height:1.6;">
                <strong style="color:#000000;font-weight:500;">Tip:</strong> For security, we recommend changing your password after your first login.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px 32px;border-top:1px solid #f0f0f2;text-align:center;">
              <div style="display:flex;justify-content:center;gap:20px;margin-bottom:16px;">
                <!-- LinkedIn -->
                <a href="#" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;color:#b4b4b4;text-decoration:none;background:#f8f7fa;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </a>
                <!-- Twitter/X -->
                <a href="#" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;color:#b4b4b4;text-decoration:none;background:#f8f7fa;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <!-- Instagram -->
                <a href="#" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;color:#b4b4b4;text-decoration:none;background:#f8f7fa;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
                <!-- YouTube -->
                <a href="#" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;color:#b4b4b4;text-decoration:none;background:#f8f7fa;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
                <!-- Facebook -->
                <a href="#" style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;color:#b4b4b4;text-decoration:none;background:#f8f7fa;">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              </div>
              <div style="font-size:12px;color:#b4b4b4;line-height:1.6;">
                <span>Elevate HR Platform</span>
                <span class="separator" style="margin:0 6px;color:#d6d6d6;">·</span>
                <span>© ${currentYear}</span>
                <br>
                <span style="display:inline-block;margin-top:4px;">
                  <a href="#" style="color:#b4b4b4;text-decoration:none;">Privacy</a>
                  <span class="separator" style="margin:0 6px;color:#d6d6d6;">·</span>
                  <a href="#" style="color:#b4b4b4;text-decoration:none;">Terms</a>
                  <span class="separator" style="margin:0 6px;color:#d6d6d6;">·</span>
                  <a href="#" style="color:#b4b4b4;text-decoration:none;">Support</a>
                </span>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return this.sendEmail({
    to: data.recipientEmail,
    subject: `Welcome to Elevate — You're invited by ${data.inviterName}`,
    html,
    companyId: data.companyId,
  });
  }
}

export const emailService = new EmailService()