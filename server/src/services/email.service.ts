import nodemailer from "nodemailer";
import { Company } from "../models/Company";
import { emailTransportResolver } from "./emailTransportResolver";
import type { ICompany } from "../types/interfaces";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  companyId?: string; // Optional: specify which company is sending
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    console.log("Initializing EmailService...");
    console.log("EMAIL_USER:", process.env.SMTP_USER);
    console.log("EMAIL_PASSWORD length:", process.env.SMTP_PASS?.length);
    console.log("EMAIL_HOST:", process.env.SMTP_HOST);

    // Configure system default email
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Send email with multi-tenant support
   * Automatically resolves tenant email or falls back to system email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      let company: ICompany | null = null;

      // Fetch company if companyId provided
      if (options.companyId) {
        company = await Company.findById(options.companyId);
      }

      // Resolve appropriate transporter
      const { transporter, fromAddress, fromName } =
        emailTransportResolver.resolveTransporter(company);

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || "",
        attachments: options.attachments?.map((file) => ({
          filename: file.filename,
          content: file.content,
          contentType: file.contentType || "application/pdf",
        })),
      });

      console.log("Email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("Email send error:", error);

      // If tenant email failed, retry with system email as fallback
      if (options.companyId) {
        try {
          console.log("Retrying with system email...");
          const { transporter, fromAddress, fromName } =
            emailTransportResolver.resolveTransporter(null);

          await transporter.sendMail({
            from: `"${fromName}" <${fromAddress}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || "",
            attachments: options.attachments?.map((file) => ({
              filename: file.filename,
              content: file.content,
              contentType: file.contentType || "application/pdf",
            })),
          });

          console.log("Email sent successfully with system fallback");
          return true;
        } catch (fallbackError) {
          console.error("System email fallback also failed:", fallbackError);
        }
      }

      return false;
    }
  }

  // Helper to resolve branding for templates
  private async resolveBranding(companyId?: string) {
    let company: ICompany | null = null;
    if (companyId) {
      company = await Company.findById(companyId);
    }

    const primaryColor = (company as any)?.primaryColor || "#0f766e";
    const secondaryColor = (company as any)?.secondaryColor || "#14b8a6";
    let logo = (company as any)?.logo || "";

    // If logo is relative (stored like /logo.png), turn into absolute using FRONTEND_URL
    if (logo && !/^https?:\/\//i.test(logo)) {
      const base = String(
        process.env.FRONTEND_URL || "https://hr.codewithseth.co.ke",
      ).replace(/\/$/, "");
      if (!logo.startsWith("/")) logo = `/${logo}`;
      logo = `${base}${logo}`;
    }

    return { company, primaryColor, secondaryColor, logo };
  }

  async sendApplicationReceivedEmail(
    applicantEmail: string,
    applicantName: string,
    jobTitle: string,
    companyName: string,
    companyId?: string,
  ): Promise<boolean> {
    const { primaryColor, logo } = await this.resolveBranding(companyId);
    const logoUrl =
      logo ||
      `${process.env.FRONTEND_URL || "https://hr.codewithseth.co.ke"}/icon.svg`;
    const currentYear = new Date().getFullYear();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1f2937; background: #f8fafc; line-height: 1.6; }
          .wrapper { width: 100%; padding: 24px 0; }
          .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
          .header { padding: 32px 24px; background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); color: #fff; text-align: center; }
          .logo-wrapper { margin-bottom: 16px; }
          .logo-wrapper img { max-width: 120px; height: auto; display: block; margin: 0 auto; }
          .header-title { font-size: 24px; font-weight: 700; margin: 12px 0 4px; letter-spacing: -0.5px; }
          .header-subtitle { font-size: 14px; opacity: 0.95; }
          .content { padding: 32px 24px; }
          .content-section { margin-bottom: 20px; }
          .content-section p { margin: 12px 0; line-height: 1.6; }
          .content-section p:first-child { margin-top: 0; }
          .content-section p strong { font-weight: 600; color: ${primaryColor}; }
          .highlight { background: #f0f9ff; border-left: 4px solid ${primaryColor}; padding: 12px 16px; border-radius: 4px; margin: 16px 0; }
          .footer-content { padding: 24px 24px; border-top: 1px solid #e5e7eb; text-align: center; }
          .footer-text { font-size: 12px; color: #6b7280; }
          .footer-text strong { color: #1f2937; }
          .year { color: #9ca3af; font-size: 12px; }
          @media (max-width: 600px) {
            .container { margin: 12px; border-radius: 8px; }
            .header { padding: 24px 16px; }
            .content { padding: 24px 16px; }
            .header-title { font-size: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-wrapper">
                <img src="${logoUrl}" alt="${companyName}" style="max-width: 120px; height: auto; border-radius: 4px;" />
              </div>
              <div class="header-title">Application Received</div>
              <div class="header-subtitle">Thank you for your interest in ${companyName}</div>
            </div>
            <div class="content">
              <div class="content-section">
                <p>Hi <strong>${applicantName}</strong>,</p>
              </div>
              <div class="content-section">
                <p>Thank you for applying for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>. We're excited to have your application in our system and appreciate you taking the time to submit it.</p>
              </div>
              <div class="highlight">
                <p style="margin: 0;"><strong>What's next?</strong> Our recruitment team will carefully review your application. If your profile matches what we're looking for, we'll be in touch within the next 5-7 business days to arrange an interview.</p>
              </div>
              <div class="content-section">
                <p>In the meantime, if you have any questions, please don't hesitate to reach out to our HR team.</p>
              </div>
              <div class="content-section">
                <p>Best regards,<br /><strong>${companyName} Recruitment Team</strong></p>
              </div>
            </div>
            <div class="footer-content">
              <p class="footer-text">© ${currentYear} <strong>${companyName}</strong>. All rights reserved.</p>
              <p class="footer-text" style="margin-top: 8px;">This is an automated message — please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: applicantEmail,
      subject: `Application Received - ${jobTitle} at ${companyName}`,
      html,
      companyId,
    });
  }

  async sendApplicationNotificationToHR(
    hrEmail: string,
    applicantName: string,
    jobTitle: string,
    applicationLink: string,
    companyId?: string,
  ): Promise<boolean> {
    const { primaryColor, logo } = await this.resolveBranding(companyId);
    const logoUrl =
      logo ||
      `${process.env.FRONTEND_URL || "https://hr.codewithseth.co.ke"}/icon.svg`;
    const currentYear = new Date().getFullYear();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1f2937; background: #f8fafc; line-height: 1.6; }
          .wrapper { width: 100%; padding: 24px 0; }
          .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
          .header { padding: 32px 24px; background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); color: #fff; text-align: center; }
          .logo-wrapper { margin-bottom: 16px; }
          .logo-wrapper img { max-width: 120px; height: auto; display: block; margin: 0 auto; }
          .header-title { font-size: 24px; font-weight: 700; margin: 12px 0 4px; letter-spacing: -0.5px; }
          .content { padding: 32px 24px; }
          .content-section { margin-bottom: 20px; }
          .content-section p { margin: 12px 0; line-height: 1.6; }
          .content-section p:first-child { margin-top: 0; }
          .applicant-card { background: #f0f9ff; border: 1px solid #bfdbfe; border-left: 4px solid ${primaryColor}; padding: 16px; border-radius: 6px; margin: 16px 0; }
          .applicant-card p { margin: 8px 0; }
          .applicant-card strong { color: ${primaryColor}; font-weight: 600; }
          .button { display: inline-block; padding: 12px 24px; background: ${primaryColor}; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 16px; }
          .button:hover { opacity: 0.9; }
          .footer-content { padding: 24px; border-top: 1px solid #e5e7eb; text-align: center; }
          .footer-text { font-size: 12px; color: #6b7280; }
          @media (max-width: 600px) {
            .container { margin: 12px; border-radius: 8px; }
            .header { padding: 24px 16px; }
            .content { padding: 24px 16px; }
            .header-title { font-size: 20px; }
            .button { width: 100%; text-align: center; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-wrapper">
                <img src="${logoUrl}" alt="Company Logo" style="max-width: 120px; height: auto; border-radius: 4px;" />
              </div>
              <div class="header-title">New Application Alert</div>
            </div>
            <div class="content">
              <div class="content-section">
                <p>Hello,</p>
              </div>
              <div class="applicant-card">
                <p><strong>Applicant Name:</strong> ${applicantName}</p>
                <p><strong>Position Applied:</strong> ${jobTitle}</p>
              </div>
              <div class="content-section">
                <p>A new application has been received for the <strong>${jobTitle}</strong> position. Please review the application at your earliest convenience to assess the candidate's qualifications.</p>
              </div>
              <div class="content-section">
                <a href="${applicationLink}" class="button">Review Application</a>
              </div>
              <div class="content-section">
                <p style="font-size: 13px; color: #6b7280;">Click the button above to access the full application details and manage the recruitment process.</p>
              </div>
            </div>
            <div class="footer-content">
              <p class="footer-text">© ${currentYear}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: hrEmail,
      subject: `New Application: ${jobTitle} - ${applicantName}`,
      html,
    });
  }

  async sendStatusUpdateEmail(
    applicantEmail: string,
    applicantName: string,
    jobTitle: string,
    status: string,
    message?: string,
  ): Promise<boolean> {
    const statusMessages: Record<string, string> = {
      reviewing:
        "Your application is currently under review by our recruitment team.",
      shortlisted:
        "Congratulations! You have been shortlisted for the next stage of our recruitment process.",
      rejected:
        "Thank you for your interest and the time you invested in applying. Unfortunately, we have decided to move forward with other candidates at this time.",
      hired:
        "Congratulations! We are pleased to offer you the position. Our HR team will be in touch with offer details.",
    };

    const statusColors: Record<string, string> = {
      reviewing: "#3b82f6",
      shortlisted: "#10b981",
      rejected: "#ef4444",
      hired: "#059669",
    };

    const statusIcons: Record<string, string> = {
      reviewing: "🔍",
      shortlisted: "⭐",
      rejected: "❌",
      hired: "✅",
    };

    const statusColor = statusColors[status] || "#6366f1";
    const statusIcon = statusIcons[status] || "📋";
    const currentYear = new Date().getFullYear();

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1f2937; background: #f8fafc; line-height: 1.6; }
          .wrapper { width: 100%; padding: 24px 0; }
          .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
          .header { padding: 32px 24px; background: linear-gradient(135deg, ${statusColor} 0%, ${statusColor}dd 100%); color: #fff; text-align: center; }
          .status-icon { font-size: 48px; margin-bottom: 12px; }
          .header-title { font-size: 24px; font-weight: 700; margin: 12px 0 4px; letter-spacing: -0.5px; }
          .content { padding: 32px 24px; }
          .content-section { margin-bottom: 20px; }
          .content-section p { margin: 12px 0; line-height: 1.6; }
          .content-section p:first-child { margin-top: 0; }
          .content-section p strong { font-weight: 600; }
          .status-message { background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid ${statusColor}; padding: 16px; border-radius: 6px; margin: 16px 0; }
          .status-message.rejected { background: #fef2f2; border-color: #fecaca; }
          .status-message.reviewing { background: #f0f9ff; border-color: #bfdbfe; }
          .next-steps { background: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; border-radius: 6px; margin: 16px 0; }
          .next-steps p { font-size: 14px; margin: 8px 0; }
          .footer-content { padding: 24px; border-top: 1px solid #e5e7eb; text-align: center; }
          .footer-text { font-size: 12px; color: #6b7280; }
          @media (max-width: 600px) {
            .container { margin: 12px; border-radius: 8px; }
            .header { padding: 24px 16px; }
            .content { padding: 24px 16px; }
            .header-title { font-size: 20px; }
            .status-icon { font-size: 40px; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="status-icon">${statusIcon}</div>
              <div class="header-title">Application Update</div>
            </div>
            <div class="content">
              <div class="content-section">
                <p>Hi <strong>${applicantName}</strong>,</p>
              </div>
              <div class="status-message ${status === "rejected" ? "rejected" : status === "reviewing" ? "reviewing" : ""}">
                <p style="margin: 0; font-weight: 600;">${statusMessages[status] || "Your application status has been updated."}</p>
              </div>
              <div class="content-section">
                <p>Your application for the <strong>${jobTitle}</strong> position has been reviewed.</p>
                ${message ? `<div class="next-steps"><p>${message}</p></div>` : ""}
              </div>
              <div class="content-section">
                <p>If you have any questions or concerns, please feel free to reach out to our recruitment team. We appreciate your interest in our company and the time you invested in applying.</p>
              </div>
              <div class="content-section">
                <p>Best regards,<br /><strong>The Recruitment Team</strong></p>
              </div>
            </div>
            <div class="footer-content">
              <p class="footer-text">© ${currentYear}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: applicantEmail,
      subject: `Application Update: ${jobTitle}`,
      html,
    });
  }

  async sendBulkInterviewInviteEmail(
    applicantEmail: string,
    applicantName: string,
    subject: string,
    body: string,
    companyId?: string,
  ): Promise<boolean> {
    const { primaryColor, logo } = await this.resolveBranding(companyId);
    const logoUrl =
      logo ||
      `${process.env.FRONTEND_URL || "https://hr.codewithseth.co.ke"}/icon.svg`;
    const currentYear = new Date().getFullYear();
    const bodyFormatted = String(body || "")
      .trim()
      .replace(/\n/g, "</p><p>");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1f2937; background: #f8fafc; line-height: 1.6; }
          .wrapper { width: 100%; padding: 24px 0; }
          .container { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
          .header { padding: 32px 24px; background: linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%); color: #fff; text-align: center; }
          .logo-wrapper { margin-bottom: 16px; }
          .logo-wrapper img { max-width: 120px; height: auto; display: block; margin: 0 auto; }
          .header-title { font-size: 24px; font-weight: 700; margin: 12px 0 4px; letter-spacing: -0.5px; }
          .content { padding: 32px 24px; }
          .content-section { margin-bottom: 20px; }
          .content-section p { margin: 12px 0; line-height: 1.6; }
          .content-section p:first-child { margin-top: 0; }
          .message-body { background: #f9fafb; padding: 20px; border-radius: 8px; border-left: 4px solid ${primaryColor}; margin: 16px 0; }
          .message-body p { margin: 8px 0; font-size: 14px; line-height: 1.6; }
          .message-body p:first-child { margin-top: 0; }
          .cta-button { display: inline-block; padding: 12px 24px; background: ${primaryColor}; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 12px; }
          .cta-button:hover { opacity: 0.9; }
          .footer-content { padding: 24px; border-top: 1px solid #e5e7eb; text-align: center; }
          .footer-text { font-size: 12px; color: #6b7280; }
          @media (max-width: 600px) {
            .container { margin: 12px; border-radius: 8px; }
            .header { padding: 24px 16px; }
            .content { padding: 24px 16px; }
            .header-title { font-size: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-wrapper">
                <img src="${logoUrl}" alt="Company Logo" style="max-width: 120px; height: auto; border-radius: 4px;" />
              </div>
              <div class="header-title">${subject}</div>
            </div>
            <div class="content">
              <div class="content-section">
                <p>Hi <strong>${applicantName}</strong>,</p>
              </div>
              <div class="message-body">
                <p>${bodyFormatted}</p>
              </div>
              <div class="content-section">
                <p>We look forward to speaking with you soon!</p>
              </div>
              <div class="content-section">
                <p>Best regards,<br /><strong>The Recruitment Team</strong></p>
              </div>
            </div>
            <div class="footer-content">
              <p class="footer-text">© ${currentYear}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: applicantEmail,
      subject: subject,
      html,
      companyId,
    });
  }

  async sendInvitationEmail(
    inviteeEmail: string,
    companyName: string,
    inviteLink: string,
    invitedByName: string,
    companyId?: string,
  ): Promise<boolean> {
    const { primaryColor, logo } = await this.resolveBranding(companyId);

    const html = `
        <!doctype html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #1f2937; margin:0; padding:0 }
            .wrapper { width:100%; background:#f8fafc; padding:24px 0 }
            .card { max-width:680px; margin:0 auto; background:#fff; border-radius:10px; overflow:hidden; box-shadow:0 6px 18px rgba(16,24,40,0.06) }
            .header { display:flex; align-items:center; gap:12px; padding:20px 24px; background: ${primaryColor}; color:#fff }
            .logo { height:42px }
            .title { font-size:18px; font-weight:600; margin:0 }
            .content { padding:28px 24px; line-height:1.6 }
            .cta { display:inline-block; padding:12px 20px; border-radius:8px; background:${primaryColor}; color:#fff; text-decoration:none; font-weight:600 }
            .muted { color:#6b7280; font-size:13px }
            .footer { padding:18px 24px; font-size:12px; color:#9ca3af; text-align:center }
            @media (max-width:480px){ .card { margin:0 12px } }
          </style>
        </head>
        <body>
          <div class="wrapper">
            <div class="card">
              <div class="header">
                <img src="${logo || `${process.env.FRONTEND_URL || "https://hr.codewithseth.co.ke"}/icon.svg`}" alt="logo" class="logo" />
                <div>
                  <div class="title">You're invited to join ${companyName}</div>
                  <div style="font-size:12px; opacity:0.95">Invitation from ${invitedByName}</div>
                </div>
              </div>
              <div class="content">
                <p style="margin:0 0 12px">Hello,</p>
                <p style="margin:0 0 12px"><strong>${invitedByName}</strong> has invited you to join <strong>${companyName}</strong> on our HR platform.</p>
                <p style="margin:0 0 18px">To accept the invitation and set up your account, click the button below. The link will expire in 7 days.</p>
                <p style="margin:0 0 18px"><a href="${inviteLink}" class="cta">Accept Invitation</a></p>
                <p class="muted" style="margin:0 0 12px">If the button doesn't work, copy and paste this link into your browser:</p>
                <p class="muted" style="word-break:break-all; font-size:13px;">${inviteLink}</p>
                <p style="margin:18px 0 0">Best regards,<br /><strong>${companyName} Team</strong></p>
              </div>
              <div class="footer">If you did not expect this invitation, you can ignore this message.</div>
            </div>
          </div>
        </body>
        </html>
      `;

    return this.sendEmail({
      to: inviteeEmail,
      subject: `${invitedByName} invited you to join ${companyName} on Elevate`,
      html,
      companyId,
    });
  }
}

export default new EmailService();
