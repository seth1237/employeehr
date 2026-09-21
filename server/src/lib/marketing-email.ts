export type EmailBlockType =
  | "logo"
  | "hero"
  | "heading"
  | "text"
  | "button"
  | "image"
  | "product"
  | "divider"
  | "social"
  | "footer"

export type EmailBlock = {
  id: string
  type: EmailBlockType
  text?: string
  url?: string
  src?: string
  alt?: string
  name?: string
  price?: string
  description?: string
  productId?: string
  imageSrc?: string
  companyName?: string
  address?: string
  extra?: string
  instagram?: string
  facebook?: string
  linkedin?: string
  website?: string
}

export type MarketingBranding = {
  name?: string
  logo?: string
  website?: string
  instagram?: string
  facebook?: string
  linkedin?: string
  email?: string
  phone?: string
  city?: string
  country?: string
  primaryColor?: string
  secondaryColor?: string
}

export type RenderMarketingEmailOptions = {
  blocks: EmailBlock[]
  branding?: MarketingBranding
  subject?: string
  preheader?: string
  assetBaseUrl?: string
  trackingPixelUrl?: string
  wrapLink?: (url: string) => string
}

export function newEmailBlockId() {
  return `b_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`
}

export function escapeEmailHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function personalizeMarketingText(
  template: string,
  vars: {
    contactName?: string
    firstName?: string
    clientName?: string
    location?: string
    role?: string
    email?: string
    phone?: string
  },
) {
  const contactName = vars.contactName || "Jane Doe"
  const firstName = vars.firstName || contactName.split(/\s+/).filter(Boolean)[0] || contactName
  const clientName = vars.clientName || "Acme Clinic"
  const location = vars.location || "Nairobi"
  const role = vars.role || "Contact"
  return String(template || "")
    .replace(/\{Contact person name\}/gi, contactName)
    .replace(/\{Contact person\}/gi, contactName)
    .replace(/\{contact_person_name\}/gi, contactName)
    .replace(/\{contact_name\}/gi, contactName)
    .replace(/\{name\}/gi, contactName)
    .replace(/\{first_name\}/gi, firstName)
    .replace(/\{First name\}/gi, firstName)
    .replace(/\{client_name\}/gi, clientName)
    .replace(/\{Client name\}/gi, clientName)
    .replace(/\{facility\}/gi, clientName)
    .replace(/\{Facility\}/gi, clientName)
    .replace(/\{location\}/gi, location)
    .replace(/\{Location\}/gi, location)
    .replace(/\{role\}/gi, role)
    .replace(/\{Role\}/gi, role)
    .replace(/\{email\}/gi, vars.email || "")
    .replace(/\{phone\}/gi, vars.phone || "")
}

export const MARKETING_TOKENS = [
  { token: "{first_name}", label: "First name" },
  { token: "{Contact person name}", label: "Contact name" },
  { token: "{client_name}", label: "Facility" },
  { token: "{location}", label: "Location" },
  { token: "{role}", label: "Role" },
] as const

export function stripLocalApiPrefix(value: string) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//i, "")
}

export function normalizeWebsiteUrl(raw?: string) {
  let value = stripLocalApiPrefix(String(raw || "").trim())
  if (!value) return ""
  if (/^(mailto:|tel:|cid:|data:)/i.test(value)) return value
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith("//")) return `https:${value}`
  if (value.startsWith("/uploads/")) return value
  value = value.replace(/^\/+/, "")
  if (/^(www\.|[a-z0-9-]+(\.[a-z0-9-]+)+)/i.test(value)) {
    return `https://${value}`
  }
  return value
}

function resolveAssetUrl(src: string | undefined, assetBaseUrl?: string) {
  const value = stripLocalApiPrefix(String(src || "").trim())
  if (!value) return ""
  if (/^(https?:|cid:|data:)/i.test(value)) return value
  if (!value.startsWith("/uploads/") && /^(www\.|[a-z0-9-]+(\.[a-z0-9-]+)+)/i.test(value)) {
    return `https://${value.replace(/^\/+/, "")}`
  }
  const pathValue = value.startsWith("/") ? value : `/${value}`
  const base = String(assetBaseUrl || "").replace(/\/$/, "")
  if (!base || !pathValue.startsWith("/uploads/")) return pathValue
  return `${base}${pathValue}`
}

function formatMultiline(text: string) {
  return escapeEmailHtml(text).replace(/\n/g, "<br />")
}

function bulletproofButton(label: string, href: string, color: string) {
  const safeHref = escapeEmailHtml(href || "#")
  const safeLabel = escapeEmailHtml(label || "Learn more")
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:8px auto 4px;">
      <tr>
        <td align="center" bgcolor="${color}" style="border-radius:8px;background:${color};">
          <a href="${safeHref}" target="_blank" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>`
}

function renderBlock(
  block: EmailBlock,
  branding: MarketingBranding,
  assetBaseUrl?: string,
  wrapLink?: (url: string) => string,
) {
  const primary = branding.primaryColor || "#0f766e"
  const muted = "#64748b"
  const text = "#0f172a"
  const linkWrap = (url: string) => {
    const resolved = normalizeWebsiteUrl(url) || url
    return wrapLink ? wrapLink(resolved) : resolved
  }

  switch (block.type) {
    case "logo": {
      const src = resolveAssetUrl(block.src || branding.logo, assetBaseUrl)
      const name = escapeEmailHtml(branding.name || "Company")
      if (!src) {
        return `<p style="margin:0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;color:${primary};">${name}</p>`
      }
      return `<img src="${escapeEmailHtml(src)}" alt="${name}" width="180" style="display:block;margin:0 auto;width:180px;max-width:180px;height:auto;border:0;outline:none;" />`
    }
    case "hero": {
      const src = resolveAssetUrl(block.src, assetBaseUrl)
      if (!src) {
        return `<div style="height:160px;background:#e2e8f0;border-radius:8px;"></div>`
      }
      return `<img src="${escapeEmailHtml(src)}" alt="${escapeEmailHtml(block.alt || "Campaign image")}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:8px;outline:none;" />`
    }
    case "heading":
      return `<h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.3;font-weight:700;color:${text};text-align:center;">${formatMultiline(block.text || "")}</h1>`
    case "text":
      return `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${text};">${formatMultiline(block.text || "")}</p>`
    case "button":
      return bulletproofButton(block.text || "View more", linkWrap(block.url || branding.website || "#"), primary)
    case "image": {
      const src = resolveAssetUrl(block.src, assetBaseUrl)
      if (!src) return ""
      const img = `<img src="${escapeEmailHtml(src)}" alt="${escapeEmailHtml(block.alt || "")}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:8px;outline:none;" />`
      if (block.url) {
        return `<a href="${escapeEmailHtml(linkWrap(block.url))}" target="_blank" style="text-decoration:none;">${img}</a>`
      }
      return img
    }
    case "product": {
      const src = resolveAssetUrl(block.imageSrc || block.src, assetBaseUrl)
      const name = escapeEmailHtml(block.name || "Product")
      const price = escapeEmailHtml(block.price || "")
      const description = formatMultiline(block.description || "")
      const img = src
        ? `<img src="${escapeEmailHtml(src)}" alt="${name}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:8px 8px 0 0;outline:none;" />`
        : ""
      return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          ${img ? `<tr><td style="padding:0;">${img}</td></tr>` : ""}
          <tr>
            <td style="padding:16px 18px 18px;background:#ffffff;">
              <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:17px;font-weight:700;color:${text};">${name}</p>
              ${price ? `<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:${primary};">${price}</p>` : ""}
              ${description ? `<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:${muted};">${description}</p>` : ""}
              ${block.url ? bulletproofButton(block.text || "View product", linkWrap(block.url), primary) : ""}
            </td>
          </tr>
        </table>`
    }
    case "divider":
      return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:4px 0;" />`
    case "social": {
      const links = [
        { label: "Website", href: block.website || branding.website },
        { label: "Instagram", href: block.instagram || branding.instagram },
        { label: "Facebook", href: block.facebook || branding.facebook },
        { label: "LinkedIn", href: block.linkedin || branding.linkedin },
      ].filter((item) => item.href)
      if (!links.length) return ""
      return `<p style="margin:0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${muted};">
        ${links
          .map(
            (item, index) =>
              `${index > 0 ? " &nbsp;|&nbsp; " : ""}<a href="${escapeEmailHtml(linkWrap(item.href || ""))}" style="color:${primary};text-decoration:underline;">${item.label}</a>`,
          )
          .join("")}
      </p>`
    }
    case "footer": {
      const company = escapeEmailHtml(block.companyName || branding.name || "")
      const address = escapeEmailHtml(
        block.address ||
          [branding.city, branding.country].filter(Boolean).join(", "),
      )
      const extra = formatMultiline(block.extra || "")
      const contact = [branding.email, branding.phone].filter(Boolean).join(" · ")
      return `
        <p style="margin:0 0 4px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:${text};">${company}</p>
        ${address ? `<p style="margin:0 0 4px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${muted};">${address}</p>` : ""}
        ${contact ? `<p style="margin:0 0 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${muted};">${escapeEmailHtml(contact)}</p>` : ""}
        ${extra ? `<p style="margin:0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:${muted};">${extra}</p>` : ""}`
    }
    default:
      return ""
  }
}

export function renderMarketingEmail(options: RenderMarketingEmailOptions) {
  const branding = options.branding || {}
  const primary = branding.primaryColor || "#0f766e"
  const bg = "#f3f4f8"
  const card = "#ffffff"
  const subject = options.subject || branding.name || "Update"
  const preheader = escapeEmailHtml(options.preheader || subject)
  const blocks = Array.isArray(options.blocks) ? options.blocks : []

  const inner = blocks
    .map((block) => {
      const html = renderBlock(block, branding, options.assetBaseUrl, options.wrapLink)
      if (!html) return ""
      const flush = block.type === "hero" || block.type === "image" || block.type === "product"
      return `<tr><td style="padding:${flush ? "0 0 20px" : "0 0 20px"};">${html}</td></tr>`
    })
    .join("")

  const pixel = options.trackingPixelUrl
    ? `<img src="${escapeEmailHtml(options.trackingPixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`
    : ""

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeEmailHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${bg}" style="background:${bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" bgcolor="${card}" style="width:100%;max-width:600px;background:${card};border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td bgcolor="${primary}" style="background:${primary};height:6px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 32px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${inner || `<tr><td style="font-family:Arial,Helvetica,sans-serif;color:#64748b;text-align:center;">Add content blocks to build this email.</td></tr>`}
              </table>
            </td>
          </tr>
        </table>
        ${pixel}
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function createDefaultBlocks(branding: MarketingBranding = {}): EmailBlock[] {
  const company = branding.name || "our team"
  return [
    { id: newEmailBlockId(), type: "logo", src: branding.logo },
    { id: newEmailBlockId(), type: "hero", src: "", alt: "Campaign banner" },
    {
      id: newEmailBlockId(),
      type: "heading",
      text: "Thank you for connecting with us",
    },
    {
      id: newEmailBlockId(),
      type: "text",
      text: `Hi {first_name},\n\nIt was a pleasure meeting you. ${company} is ready to support your facility with quality healthcare solutions.`,
    },
    {
      id: newEmailBlockId(),
      type: "button",
      text: "View products",
      url: branding.website || "",
    },
    { id: newEmailBlockId(), type: "divider" },
    {
      id: newEmailBlockId(),
      type: "social",
      website: branding.website,
      instagram: branding.instagram,
      facebook: branding.facebook,
      linkedin: branding.linkedin,
    },
    {
      id: newEmailBlockId(),
      type: "footer",
      companyName: branding.name,
      extra: "",
    },
  ]
}

export type MarketingTemplate = {
  id: string
  name: string
  description: string
  subject: string
  blocks: EmailBlock[]
}

export function getMarketingTemplates(branding: MarketingBranding = {}): MarketingTemplate[] {
  const company = branding.name || "our team"
  const website = branding.website || ""
  const logo = branding.logo
  const footer = (): EmailBlock[] => [
    { id: newEmailBlockId(), type: "divider" },
    { id: newEmailBlockId(), type: "social", website, instagram: branding.instagram, facebook: branding.facebook, linkedin: branding.linkedin },
    {
      id: newEmailBlockId(),
      type: "footer",
      companyName: branding.name,
      extra: "",
    },
  ]

  return [
    {
      id: "exhibition_followup",
      name: "Exhibition follow-up",
      description: "Thank-you email after a booth visit",
      subject: "Thank you for visiting {client_name} at our booth",
      blocks: [
        { id: newEmailBlockId(), type: "logo", src: logo },
        { id: newEmailBlockId(), type: "hero", src: "", alt: "Exhibition banner" },
        { id: newEmailBlockId(), type: "heading", text: "Thank you for visiting us" },
        {
          id: newEmailBlockId(),
          type: "text",
          text: `Hi {first_name},\n\nIt was a pleasure meeting you at the exhibition. We would love to continue the conversation with {client_name} and share products that fit your facility.`,
        },
        { id: newEmailBlockId(), type: "button", text: "View products", url: website },
        ...footer(),
      ],
    },
    {
      id: "product_promotion",
      name: "Product promotion",
      description: "Promote a featured product or offer",
      subject: "A solution {client_name} should see",
      blocks: [
        { id: newEmailBlockId(), type: "logo", src: logo },
        { id: newEmailBlockId(), type: "heading", text: "Featured for your facility" },
        {
          id: newEmailBlockId(),
          type: "text",
          text: `Hi {first_name},\n\n${company} has a product that teams like {client_name} are using to improve patient care.`,
        },
        {
          id: newEmailBlockId(),
          type: "product",
          name: "Insert a product",
          price: "",
          description: "Use Insert → Product to pull live ERP catalogue data.",
          url: website,
          text: "Request a quote",
        },
        ...footer(),
      ],
    },
    {
      id: "new_product",
      name: "New product announcement",
      description: "Announce a launch from inventory",
      subject: "New from {client_name}'s healthcare partner",
      blocks: [
        { id: newEmailBlockId(), type: "logo", src: logo },
        { id: newEmailBlockId(), type: "heading", text: "Just launched" },
        {
          id: newEmailBlockId(),
          type: "text",
          text: `Hi {first_name},\n\nWe have added a new solution to our catalogue and wanted {client_name} to hear it first.`,
        },
        { id: newEmailBlockId(), type: "button", text: "See the launch", url: website },
        ...footer(),
      ],
    },
    {
      id: "quotation_followup",
      name: "Quotation follow-up",
      description: "Remind a prospect about an open quotation",
      subject: "Following up on your quotation",
      blocks: [
        { id: newEmailBlockId(), type: "logo", src: logo },
        { id: newEmailBlockId(), type: "heading", text: "Your quotation is ready" },
        {
          id: newEmailBlockId(),
          type: "text",
          text: `Hi {first_name},\n\nWe prepared a quotation for {client_name} and would be happy to walk through it with you.`,
        },
        { id: newEmailBlockId(), type: "button", text: "Reply to this email", url: website },
        ...footer(),
      ],
    },
    {
      id: "invoice_notification",
      name: "Invoice notification",
      description: "Polite finance reminder",
      subject: "Account update for {client_name}",
      blocks: [
        { id: newEmailBlockId(), type: "logo", src: logo },
        { id: newEmailBlockId(), type: "heading", text: "Account update" },
        {
          id: newEmailBlockId(),
          type: "text",
          text: `Hi {first_name},\n\nPlease find an update related to {client_name}'s account. If you have already settled this, thank you — you can ignore this note.`,
        },
        { id: newEmailBlockId(), type: "button", text: "Contact accounts", url: website },
        ...footer(),
      ],
    },
    {
      id: "customer_appreciation",
      name: "Customer appreciation",
      description: "Simple thank-you to existing clients",
      subject: "Thank you, {client_name}",
      blocks: [
        { id: newEmailBlockId(), type: "logo", src: logo },
        { id: newEmailBlockId(), type: "heading", text: "We appreciate you" },
        {
          id: newEmailBlockId(),
          type: "text",
          text: `Hi {first_name},\n\nThank you for trusting ${company}. We are grateful to support {client_name} and remain available whenever you need us.`,
        },
        { id: newEmailBlockId(), type: "button", text: "Get in touch", url: website },
        ...footer(),
      ],
    },
    {
      id: "newsletter",
      name: "Newsletter",
      description: "Short branded update",
      subject: `${company} newsletter`,
      blocks: [
        { id: newEmailBlockId(), type: "logo", src: logo },
        { id: newEmailBlockId(), type: "hero", src: "", alt: "Newsletter banner" },
        { id: newEmailBlockId(), type: "heading", text: "This month from our team" },
        {
          id: newEmailBlockId(),
          type: "text",
          text: `Hi {first_name},\n\nHere is a short update for {client_name}. Add your news, then insert a product or image from the library.`,
        },
        { id: newEmailBlockId(), type: "button", text: "Read more", url: website },
        ...footer(),
      ],
    },
    {
      id: "event_invitation",
      name: "Event invitation",
      description: "Invite contacts to an exhibition or training",
      subject: "You're invited, {first_name}",
      blocks: [
        { id: newEmailBlockId(), type: "logo", src: logo },
        { id: newEmailBlockId(), type: "hero", src: "", alt: "Event banner" },
        { id: newEmailBlockId(), type: "heading", text: "Join us" },
        {
          id: newEmailBlockId(),
          type: "text",
          text: `Hi {first_name},\n\nWe would be delighted to host {client_name} at our upcoming event. Save the date and we will share the details.`,
        },
        { id: newEmailBlockId(), type: "button", text: "RSVP", url: website },
        ...footer(),
      ],
    },
    {
      id: "company_announcement",
      name: "Company announcement",
      description: "Internal-style branded notice",
      subject: `An update from ${company}`,
      blocks: [
        { id: newEmailBlockId(), type: "logo", src: logo },
        { id: newEmailBlockId(), type: "heading", text: "An announcement from our team" },
        {
          id: newEmailBlockId(),
          type: "text",
          text: `Hi {first_name},\n\nWe have an update to share with {client_name}. Replace this paragraph with your announcement.`,
        },
        ...footer(),
      ],
    },
  ]
}

export const BLOCK_CATALOG: Array<{ type: EmailBlockType; label: string }> = [
  { type: "logo", label: "Logo" },
  { type: "hero", label: "Hero image" },
  { type: "heading", label: "Heading" },
  { type: "text", label: "Paragraph" },
  { type: "button", label: "Button" },
  { type: "image", label: "Image" },
  { type: "product", label: "Product" },
  { type: "divider", label: "Divider" },
  { type: "social", label: "Social links" },
  { type: "footer", label: "Footer" },
]

export function createEmptyBlock(type: EmailBlockType, branding: MarketingBranding = {}): EmailBlock {
  const id = newEmailBlockId()
  switch (type) {
    case "logo":
      return { id, type, src: branding.logo }
    case "hero":
      return { id, type, src: "", alt: "Hero image" }
    case "heading":
      return { id, type, text: "Your heading" }
    case "text":
      return { id, type, text: "Write your message here. You can use {first_name} and {client_name}." }
    case "button":
      return { id, type, text: "Learn more", url: branding.website || "" }
    case "image":
      return { id, type, src: "", alt: "Campaign image" }
    case "product":
      return { id, type, name: "Select a product", text: "View product", url: branding.website || "" }
    case "divider":
      return { id, type }
    case "social":
      return {
        id,
        type,
        website: branding.website,
        instagram: branding.instagram,
        facebook: branding.facebook,
        linkedin: branding.linkedin,
      }
    case "footer":
      return {
        id,
        type,
        companyName: branding.name,
        extra: "",
      }
  }
}
