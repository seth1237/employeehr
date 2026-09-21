import type { Response } from "express"
import path from "path"
import { promises as fs } from "fs"
import sharp from "sharp"
import type { AuthenticatedRequest } from "../middleware/auth"
import { EmailAsset, EMAIL_ASSET_CATEGORIES } from "../models/EmailAsset"
import { EmailCampaign } from "../models/EmailCampaign"
import { Company } from "../models/Company"
import { isAdminRole } from "./stock/stockShared"
import emailService from "../services/email.service"
import {
  personalizeMarketingText,
  renderMarketingEmail,
  normalizeWebsiteUrl,
  type EmailBlock,
  type MarketingBranding,
} from "../lib/marketing-email"

const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
)

function publicApiBase(req: AuthenticatedRequest) {
  if (process.env.API_URL) return String(process.env.API_URL).replace(/\/$/, "")
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "http").split(",")[0]
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost:5010").split(",")[0]
  return `${proto}://${host}`.replace(/\/$/, "")
}

async function companyBranding(orgId: string, assetBaseUrl: string): Promise<MarketingBranding> {
  const company = await Company.findById(orgId)
    .select("name logo website instagram facebook linkedin email phone city country primaryColor secondaryColor")
    .lean()
  if (!company) return {}
  const logo = company.logo
    ? company.logo.startsWith("http")
      ? company.logo
      : `${assetBaseUrl}/uploads/logos/${company.logo}`
    : undefined
  return {
    name: company.name,
    logo,
    website: normalizeWebsiteUrl(company.website),
    instagram: normalizeWebsiteUrl(company.instagram),
    facebook: normalizeWebsiteUrl(company.facebook),
    linkedin: normalizeWebsiteUrl(company.linkedin),
    email: company.email,
    phone: company.phone,
    city: company.city,
    country: company.country,
    primaryColor: company.primaryColor,
    secondaryColor: company.secondaryColor,
  }
}

function sanitizeBlocks(raw: any): EmailBlock[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((block) => block && typeof block === "object" && typeof block.type === "string")
    .map((block) => ({
      id: String(block.id || ""),
      type: block.type,
      text: block.text,
      url: normalizeWebsiteUrl(block.url) || block.url,
      src: block.src,
      alt: block.alt,
      name: block.name,
      price: block.price,
      description: block.description,
      productId: block.productId,
      imageSrc: block.imageSrc,
      companyName: block.companyName,
      address: block.address,
      extra: block.extra,
      instagram: normalizeWebsiteUrl(block.instagram) || block.instagram,
      facebook: normalizeWebsiteUrl(block.facebook) || block.facebook,
      linkedin: normalizeWebsiteUrl(block.linkedin) || block.linkedin,
      website: normalizeWebsiteUrl(block.website) || block.website,
    }))
}

export function renderCampaignHtml(params: {
  blocks: EmailBlock[]
  htmlBody?: string
  branding: MarketingBranding
  subject: string
  assetBaseUrl: string
  trackingPixelUrl?: string
  wrapLink?: (url: string) => string
}) {
  if (params.blocks.length > 0) {
    return renderMarketingEmail({
      blocks: params.blocks,
      branding: params.branding,
      subject: params.subject,
      assetBaseUrl: params.assetBaseUrl,
      trackingPixelUrl: params.trackingPixelUrl,
      wrapLink: params.wrapLink,
    })
  }
  const fallback = String(params.htmlBody || "").trim()
  if (!fallback) return renderMarketingEmail({
    blocks: [],
    branding: params.branding,
    subject: params.subject,
    assetBaseUrl: params.assetBaseUrl,
  })
  return renderMarketingEmail({
    blocks: [{ id: "legacy", type: "text", text: fallback.replace(/<[^>]+>/g, "") }],
    branding: params.branding,
    subject: params.subject,
    assetBaseUrl: params.assetBaseUrl,
    trackingPixelUrl: params.trackingPixelUrl,
  })
}

export class EmailMarketingController {
  static async listAssets(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can manage email assets" })
      }
      const category = String(req.query.category || "").trim()
      const query: Record<string, any> = { org_id }
      if (category && EMAIL_ASSET_CATEGORIES.includes(category as any)) query.category = category
      const assets = await EmailAsset.find(query).sort({ createdAt: -1 }).limit(200).lean()
      return res.status(200).json({ success: true, data: assets })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to list assets" })
    }
  }

  static async uploadAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      const userId = req.user?.userId
      if (!org_id || !userId) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can upload email assets" })
      }
      const file = req.file
      if (!file) return res.status(400).json({ success: false, message: "Image file is required" })

      const categoryRaw = String(req.body?.category || "campaign")
      const category = EMAIL_ASSET_CATEGORIES.includes(categoryRaw as any) ? categoryRaw : "campaign"
      const name = String(req.body?.name || file.originalname || "Untitled").trim()
      const filename = `email-${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`
      const uploadDir = path.join(process.cwd(), "uploads/email")
      await fs.mkdir(uploadDir, { recursive: true })
      const uploadPath = path.join(uploadDir, filename)

      const maxWidth = category === "banner" || category === "campaign" ? 1200 : 900
      const pipeline = sharp(file.buffer).rotate().resize({
        width: maxWidth,
        withoutEnlargement: true,
      })
      const output = await pipeline.webp({ quality: 78 }).toFile(uploadPath)
      const url = `/uploads/email/${filename}`

      const asset = await EmailAsset.create({
        org_id,
        name: name.slice(0, 120),
        category,
        url,
        filename,
        mimeType: "image/webp",
        size: output.size,
        width: output.width,
        height: output.height,
        createdBy: String(userId),
      })

      return res.status(201).json({ success: true, data: asset })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to upload asset" })
    }
  }

  static async deleteAsset(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can delete email assets" })
      }
      const asset = await EmailAsset.findOne({ _id: req.params.id, org_id })
      if (!asset) return res.status(404).json({ success: false, message: "Asset not found" })
      const filePath = path.join(process.cwd(), asset.url.replace(/^\//, ""))
      await fs.unlink(filePath).catch(() => undefined)
      await asset.deleteOne()
      return res.status(200).json({ success: true, message: "Asset deleted" })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to delete asset" })
    }
  }

  static async preview(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
      const assetBaseUrl = publicApiBase(req)
      const branding = await companyBranding(org_id, assetBaseUrl)
      const subject = String(req.body?.subject || "Preview")
      const html = renderCampaignHtml({
        blocks: sanitizeBlocks(req.body?.blocks),
        htmlBody: req.body?.htmlBody,
        branding,
        subject,
        assetBaseUrl,
      })
      return res.status(200).json({ success: true, data: { html } })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to preview email" })
    }
  }

  static async sendTest(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can send test emails" })
      }
      const to = String(req.body?.to || "").trim().toLowerCase()
      const subject = String(req.body?.subject || "").trim()
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return res.status(400).json({ success: false, message: "A valid test email address is required" })
      }
      if (!subject) return res.status(400).json({ success: false, message: "Subject is required" })

      const assetBaseUrl = publicApiBase(req)
      const branding = await companyBranding(org_id, assetBaseUrl)
      const html = personalizeMarketingText(
        renderCampaignHtml({
          blocks: sanitizeBlocks(req.body?.blocks),
          htmlBody: req.body?.htmlBody,
          branding,
          subject,
          assetBaseUrl,
        }),
        {
          contactName: "Jane Doe",
          firstName: "Jane",
          clientName: "Sample Clinic",
          location: "Nairobi",
          role: "Lab Manager",
          email: to,
        },
      )
      const personalizedSubject = personalizeMarketingText(subject, {
        contactName: "Jane Doe",
        firstName: "Jane",
        clientName: "Sample Clinic",
        location: "Nairobi",
        role: "Lab Manager",
      })

      const sent = await emailService.sendEmail({
        to,
        subject: `[TEST] ${personalizedSubject}`,
        html,
        companyId: org_id,
      })
      if (!sent) {
        return res.status(500).json({ success: false, message: "SMTP did not accept the test email" })
      }
      return res.status(200).json({ success: true, message: `Test email sent to ${to}` })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to send test email" })
    }
  }

  static async saveSocialProfiles(req: AuthenticatedRequest, res: Response) {
    try {
      const org_id = req.user?.org_id
      if (!org_id) return res.status(401).json({ success: false, message: "Unauthorized" })
      if (!isAdminRole(req.user?.role)) {
        return res.status(403).json({ success: false, message: "Only admin/HR can save social profiles" })
      }
      const website = normalizeWebsiteUrl(req.body?.website)
      const instagram = normalizeWebsiteUrl(req.body?.instagram)
      const facebook = normalizeWebsiteUrl(req.body?.facebook)
      const linkedin = normalizeWebsiteUrl(req.body?.linkedin)
      const company = await Company.findByIdAndUpdate(
        org_id,
        { $set: { website, instagram, facebook, linkedin } },
        { new: true, select: "website instagram facebook linkedin" },
      )
      if (!company) return res.status(404).json({ success: false, message: "Company not found" })
      return res.status(200).json({
        success: true,
        message: "Social profiles saved",
        data: {
          website: company.website,
          instagram: company.instagram,
          facebook: company.facebook,
          linkedin: company.linkedin,
        },
      })
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message || "Failed to save social profiles" })
    }
  }

  static async trackOpen(req: AuthenticatedRequest, res: Response) {
    try {
      const { campaignId, recipientKey } = req.params
      const campaign = await EmailCampaign.findById(campaignId)
      if (campaign) {
        const recipient = campaign.recipients.find((item) => item.key === decodeURIComponent(recipientKey))
        if (recipient && recipient.status !== "opened" && recipient.status !== "clicked") {
          if (recipient.status === "sent" || recipient.status === "delivered") {
            recipient.status = "opened"
            recipient.openedAt = new Date()
            campaign.openedCount = (campaign.openedCount || 0) + 1
            await campaign.save()
          }
        }
      }
    } catch (error) {
      console.error("[EmailMarketing] open tracking failed", error)
    }
    res.setHeader("Content-Type", "image/gif")
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    return res.status(200).send(TRANSPARENT_GIF)
  }

  static async trackClick(req: AuthenticatedRequest, res: Response) {
    const target = normalizeWebsiteUrl(String(req.query.u || "").trim())
    try {
      const { campaignId, recipientKey } = req.params
      const campaign = await EmailCampaign.findById(campaignId)
      if (campaign) {
        const key = decodeURIComponent(recipientKey)
        const recipient = campaign.recipients.find((item) => item.key === key)
        campaign.clickedCount = (campaign.clickedCount || 0) + 1
        const linkStats = Array.isArray(campaign.linkClicks) ? campaign.linkClicks : []
        const existing = linkStats.find((item) => item.url === target)
        if (existing) existing.clicks += 1
        else linkStats.push({ url: target, clicks: 1 })
        campaign.linkClicks = linkStats

        if (recipient) {
          const alreadyClicked = (recipient.clickCount || 0) > 0
          recipient.clickCount = (recipient.clickCount || 0) + 1
          recipient.clickedAt = new Date()
          recipient.clickedUrls = Array.from(new Set([...(recipient.clickedUrls || []), target].filter(Boolean)))
          if (recipient.status === "sent" || recipient.status === "delivered" || recipient.status === "opened") {
            recipient.status = "clicked"
          }
          if (!alreadyClicked) {
            campaign.uniqueClickedCount = (campaign.uniqueClickedCount || 0) + 1
          }
        }
        await campaign.save()
      }
    } catch (error) {
      console.error("[EmailMarketing] click tracking failed", error)
    }
    if (!target || !/^https?:\/\//i.test(target)) {
      return res.redirect(302, "https://elevatehub.co.ke")
    }
    return res.redirect(302, target)
  }
}

export { publicApiBase, companyBranding, sanitizeBlocks }
