import nodemailer from "nodemailer";
import { Company } from "../models/Company";
import { emailTransportResolver } from "./emailTransportResolver";
import type { ICompany } from "../types/interfaces";
import {
  ELEVATE_EMAIL,
  platformInvitationEmail,
  renderCompanyBrandedEmail,
  renderCalloutBox,
  renderEmailLayout,
  renderInfoPanel,
  renderPrimaryButton,
} from "../lib/email-templates";

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
      requireTLS: Number(process.env.SMTP_PORT) !== 465,
      tls: {
        rejectUnauthorized: false,
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

    const html = renderCompanyBrandedEmail({
      title: `Application received — ${jobTitle}`,
      preheader: `We received your application for ${jobTitle}`,
      headline: "Application received",
      subtitle: `Thank you for applying to ${companyName}`,
      companyName,
      logoUrl,
      accentColor: primaryColor,
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi <strong>${applicantName}</strong>,</p>
        <p style="margin:0 0 16px;">Thank you for applying for the <strong>${jobTitle}</strong> role at <strong>${companyName}</strong>. Your application is now in our recruitment system.</p>
        ${renderCalloutBox(
          `<p style="margin:0;font-size:14px;"><strong>What's next?</strong> Our team will review your profile. If it matches the role, we will contact you within 5–7 business days.</p>`,
          "neutral",
          primaryColor,
        )}
        <p class="eh-muted" style="margin:0;color:${ELEVATE_EMAIL.muted};font-size:14px;">Best regards,<br /><strong>${companyName} Recruitment Team</strong></p>`,
    });

    return this.sendEmail({
      to: applicantEmail,
      subject: `Application received — ${jobTitle} at ${companyName}`,
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

    const html = renderCompanyBrandedEmail({
      title: `New application — ${jobTitle}`,
      headline: "New application",
      subtitle: applicantName,
      logoUrl,
      accentColor: primaryColor,
      bodyHtml: `
        <p style="margin:0 0 16px;">A new application has been submitted and is ready for review.</p>
        ${renderInfoPanel("Applicant", [
          { label: "Name", value: applicantName },
          { label: "Position", value: jobTitle },
        ])}
        ${renderPrimaryButton("Review application", applicationLink)}
        <p style="margin:0;font-size:13px;color:${ELEVATE_EMAIL.muted};">Open the application to assess qualifications and move the candidate forward.</p>`,
    });

    return this.sendEmail({
      to: hrEmail,
      subject: `New application: ${jobTitle} — ${applicantName}`,
      html,
      companyId,
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
      reviewing: "Your application is currently under review by our recruitment team.",
      shortlisted: "Congratulations! You have been shortlisted for the next stage.",
      rejected: "Thank you for applying. We have decided to move forward with other candidates at this time.",
      hired: "Congratulations! We are pleased to offer you the position. HR will follow up with offer details.",
    };

    const statusColors: Record<string, string> = {
      reviewing: "#3b82f6",
      shortlisted: "#10b981",
      rejected: "#dc2626",
      hired: "#059669",
    };

    const statusColor = statusColors[status] || ELEVATE_EMAIL.primary;
    const statusText = statusMessages[status] || "Your application status has been updated.";

    const html = renderEmailLayout({
      title: `Application update — ${jobTitle}`,
      preheader: statusText,
      headline: "Application update",
      subtitle: jobTitle,
      accentColor: statusColor,
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi <strong>${applicantName}</strong>,</p>
        ${renderCalloutBox(`<p style="margin:0;font-weight:600;">${statusText}</p>`, "neutral", statusColor)}
        ${message ? renderCalloutBox(`<p style="margin:0;font-size:14px;">${message}</p>`) : ""}
        <p class="eh-muted" style="margin:0;color:${ELEVATE_EMAIL.muted};font-size:14px;">Thank you again for your interest and the time you invested in applying.</p>`,
    });

    return this.sendEmail({
      to: applicantEmail,
      subject: `Application update: ${jobTitle}`,
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
    const bodyFormatted = String(body || "")
      .trim()
      .replace(/\n/g, "<br />");

    const html = renderCompanyBrandedEmail({
      title: subject,
      headline: subject,
      subtitle: "Interview invitation",
      logoUrl,
      accentColor: primaryColor,
      bodyHtml: `
        <p style="margin:0 0 12px;">Hi <strong>${applicantName}</strong>,</p>
        ${renderCalloutBox(`<div style="line-height:1.65;">${bodyFormatted}</div>`)}
        <p class="eh-muted" style="margin:0;color:${ELEVATE_EMAIL.muted};font-size:14px;">We look forward to speaking with you.</p>`,
    });

    return this.sendEmail({
      to: applicantEmail,
      subject,
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
    const html = platformInvitationEmail({
      companyName,
      inviteLink,
      invitedByName,
      logoUrl: logo || `${process.env.FRONTEND_URL || "https://hr.codewithseth.co.ke"}/icon.svg`,
      accentColor: primaryColor,
    });

    return this.sendEmail({
      to: inviteeEmail,
      subject: `${invitedByName} invited you to join ${companyName} on ElevateHub`,
      html,
      companyId,
    });
  }
}

export default new EmailService();
