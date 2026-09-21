"use client"

import { useMemo, useRef, useState } from "react"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  BLOCK_CATALOG,
  MARKETING_TOKENS,
  createEmptyBlock,
  getMarketingTemplates,
  normalizeWebsiteUrl,
  personalizeMarketingText,
  renderMarketingEmail,
  type EmailBlock,
  type EmailBlockType,
  type MarketingBranding,
} from "@/lib/marketing-email"
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Library,
  Mail,
  Monitor,
  Package,
  Send,
  Smartphone,
  Trash2,
  Upload,
} from "lucide-react"

type EmailAsset = {
  _id: string
  name: string
  category: string
  url: string
}

type ProductOption = {
  _id: string
  name: string
  sellingPrice?: number
  imageUrl?: string
  description?: string
}

type PreviewPerson = {
  contactName?: string
  contactPerson?: string
  name?: string
  location?: string
  contactRole?: string
  email?: string
  phone?: string
}

const ASSET_CATEGORIES = [
  { id: "campaign", label: "Campaign" },
  { id: "banner", label: "Banners" },
  { id: "logo", label: "Logos" },
  { id: "product", label: "Products" },
  { id: "social", label: "Social" },
]

function assetUrl(url?: string) {
  if (!url) return ""
  if (/^https?:\/\//i.test(url)) return url
  return `${API_URL}${url.startsWith("/") ? url : `/${url}`}`
}

function formatKes(value?: number) {
  if (typeof value !== "number") return ""
  return `KES ${value.toLocaleString("en-KE")}`
}

export function EmailComposer({
  branding,
  products,
  previewPerson,
  selectedCount,
  sending,
  error,
  status,
  name,
  subject,
  blocks,
  onNameChange,
  onSubjectChange,
  onBlocksChange,
  onSend,
  onSocialSaved,
}: {
  branding: MarketingBranding
  products: ProductOption[]
  previewPerson?: PreviewPerson | null
  selectedCount: number
  sending: boolean
  error?: string
  status?: string
  name: string
  subject: string
  blocks: EmailBlock[]
  onNameChange: (value: string) => void
  onSubjectChange: (value: string) => void
  onBlocksChange: (blocks: EmailBlock[]) => void
  onSend: () => void
  onSocialSaved?: (social: Pick<MarketingBranding, "website" | "instagram" | "facebook" | "linkedin">) => void
}) {
  const templates = useMemo(() => getMarketingTemplates(branding), [branding])
  const [templateId, setTemplateId] = useState("exhibition_followup")
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop")
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryTarget, setLibraryTarget] = useState<string | null>(null)
  const [assets, setAssets] = useState<EmailAsset[]>([])
  const [assetCategory, setAssetCategory] = useState("campaign")
  const [uploading, setUploading] = useState(false)
  const [testTo, setTestTo] = useState("")
  const [testing, setTesting] = useState(false)
  const [testStatus, setTestStatus] = useState("")
  const [socialSaveStatus, setSocialSaveStatus] = useState("")
  const fileRef = useRef<HTMLInputElement | null>(null)
  const uploadTargetRef = useRef<string | null>(null)

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  const previewHtml = useMemo(() => {
    const contactName =
      previewPerson?.contactName ||
      previewPerson?.contactPerson ||
      previewPerson?.name ||
      "Jane Doe"
    const html = renderMarketingEmail({
      blocks,
      branding,
      subject,
      assetBaseUrl: API_URL,
    })
    return personalizeMarketingText(html, {
      contactName,
      firstName: contactName.split(/\s+/).filter(Boolean)[0] || contactName,
      clientName: previewPerson?.name || "Acme Clinic",
      location: previewPerson?.location || "Nairobi",
      role: previewPerson?.contactRole || "Contact",
      email: previewPerson?.email,
      phone: previewPerson?.phone,
    })
  }, [blocks, branding, previewPerson, subject])

  const subjectPreview = personalizeMarketingText(subject, {
    contactName:
      previewPerson?.contactName ||
      previewPerson?.contactPerson ||
      previewPerson?.name ||
      "Jane Doe",
    clientName: previewPerson?.name || "Acme Clinic",
    location: previewPerson?.location || "Nairobi",
    role: previewPerson?.contactRole || "Contact",
  })

  const updateBlock = (id: string, patch: Partial<EmailBlock>) => {
    onBlocksChange(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)))
  }

  const persistSocialProfiles = async (block: EmailBlock) => {
    const latest = blocks.find((item) => item.id === block.id) || block
    const merged = { ...latest, ...block }
    const payload = {
      website: normalizeWebsiteUrl(merged.website || branding.website),
      instagram: normalizeWebsiteUrl(merged.instagram || branding.instagram),
      facebook: normalizeWebsiteUrl(merged.facebook || branding.facebook),
      linkedin: normalizeWebsiteUrl(merged.linkedin || branding.linkedin),
    }
    updateBlock(block.id, payload)
    try {
      const response = await fetch(`${API_URL}/api/stock/bulk-email/social-profiles`, {
        method: "PUT",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Could not save social profiles")
      onSocialSaved?.(payload)
      setSocialSaveStatus("Social links saved for this company")
    } catch (error: any) {
      setSocialSaveStatus(error.message || "Could not save social profiles")
    }
  }

  const moveBlock = (index: number, direction: -1 | 1) => {
    const next = [...blocks]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    onBlocksChange(next)
  }

  const applyTemplate = (id: string) => {
    const template = templates.find((item) => item.id === id)
    if (!template) return
    setTemplateId(id)
    onSubjectChange(template.subject)
    onBlocksChange(template.blocks)
  }

  const insertToken = (token: string) => {
    const textBlock = [...blocks].reverse().find((block) => block.type === "text" || block.type === "heading")
    if (!textBlock) return
    updateBlock(textBlock.id, { text: `${textBlock.text || ""}${token}` })
  }

  const loadAssets = async (category = assetCategory) => {
    const response = await fetch(
      `${API_URL}/api/stock/bulk-email/assets?category=${encodeURIComponent(category)}`,
      { headers },
    )
    const json = await response.json()
    if (response.ok) setAssets(json.data || [])
  }

  const openLibrary = async (blockId: string) => {
    setLibraryTarget(blockId)
    setLibraryOpen(true)
    await loadAssets(assetCategory)
  }

  const handleUpload = async (file: File, blockId?: string) => {
    setUploading(true)
    try {
      const body = new FormData()
      body.append("file", file)
      body.append("category", assetCategory)
      body.append("name", file.name)
      const response = await fetch(`${API_URL}/api/stock/bulk-email/assets`, {
        method: "POST",
        headers,
        body,
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Upload failed")
      const url = json.data?.url as string
      if (blockId && url) {
        const block = blocks.find((item) => item.id === blockId)
        if (block?.type === "product") updateBlock(blockId, { imageSrc: url })
        else updateBlock(blockId, { src: url })
      }
      await loadAssets()
    } catch (error: any) {
      window.alert(error.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const chooseAsset = (asset: EmailAsset) => {
    if (!libraryTarget) return
    const block = blocks.find((item) => item.id === libraryTarget)
    if (block?.type === "product") updateBlock(libraryTarget, { imageSrc: asset.url })
    else updateBlock(libraryTarget, { src: asset.url, alt: asset.name })
    setLibraryOpen(false)
  }

  const sendTest = async () => {
    if (!testTo.trim()) return window.alert("Enter a test email address")
    setTesting(true)
    setTestStatus("")
    try {
      const response = await fetch(`${API_URL}/api/stock/bulk-email/test`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testTo.trim(),
          subject,
          blocks,
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Test send failed")
      setTestStatus(json.message || "Test email sent")
    } catch (error: any) {
      setTestStatus(error.message || "Test send failed")
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Campaign name</Label>
            <Input value={name} onChange={(event) => onNameChange(event.target.value)} placeholder="WHX follow-up" />
          </div>
          <div className="space-y-1.5">
            <Label>Template</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={templateId}
              onChange={(event) => applyTemplate(event.target.value)}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Input value={subject} onChange={(event) => onSubjectChange(event.target.value)} placeholder="Thank you for visiting us" />
          {subject.trim() ? (
            <p className="text-xs text-muted-foreground">Preview: {subjectPreview}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {MARKETING_TOKENS.map((item) => (
            <button
              key={item.token}
              type="button"
              className="rounded-full border bg-muted/40 px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
              onClick={() => insertToken(item.token)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {BLOCK_CATALOG.map((item) => (
            <Button
              key={item.type}
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={() => onBlocksChange([...blocks, createEmptyBlock(item.type, branding)])}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          {blocks.map((block, index) => (
            <div key={block.id} className="rounded-xl border bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <Badge variant="secondary" className="capitalize">{block.type}</Badge>
                <div className="flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBlock(index, -1)}>
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveBlock(index, 1)}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onBlocksChange(blocks.filter((item) => item.id !== block.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {(block.type === "heading" || block.type === "text") && (
                <Textarea
                  rows={block.type === "heading" ? 2 : 5}
                  value={block.text || ""}
                  onChange={(event) => updateBlock(block.id, { text: event.target.value })}
                />
              )}

              {block.type === "button" && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input value={block.text || ""} placeholder="Button label" onChange={(event) => updateBlock(block.id, { text: event.target.value })} />
                  <Input
                    value={block.url || ""}
                    placeholder="elevatehub.co.ke"
                    onChange={(event) => updateBlock(block.id, { url: event.target.value })}
                    onBlur={() => updateBlock(block.id, { url: normalizeWebsiteUrl(block.url) })}
                  />
                </div>
              )}

              {(block.type === "hero" || block.type === "image" || block.type === "logo") && (
                <div className="space-y-2">
                  {block.src ? (
                    <img src={assetUrl(block.src)} alt="" className="max-h-28 rounded-md border object-contain" />
                  ) : (
                    <p className="text-xs text-muted-foreground">No image selected. Upload or pick from the library — emails use hosted URLs, not huge attachments.</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { uploadTargetRef.current = block.id; fileRef.current?.click() }}>
                      <Upload className="mr-1.5 h-3.5 w-3.5" /> Upload
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => void openLibrary(block.id)}>
                      <Library className="mr-1.5 h-3.5 w-3.5" /> Library
                    </Button>
                  </div>
                </div>
              )}

              {block.type === "product" && (
                <div className="space-y-2">
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={block.productId || ""}
                    onChange={(event) => {
                      const product = products.find((item) => item._id === event.target.value)
                      if (!product) return
                      updateBlock(block.id, {
                        productId: product._id,
                        name: product.name,
                        price: formatKes(product.sellingPrice),
                        description: product.description || "",
                        imageSrc: product.imageUrl || block.imageSrc,
                      })
                    }}
                  >
                    <option value="">Insert ERP product</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>{product.name}</option>
                    ))}
                  </select>
                  <Input value={block.name || ""} placeholder="Product name" onChange={(event) => updateBlock(block.id, { name: event.target.value })} />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input value={block.price || ""} placeholder="KES 0" onChange={(event) => updateBlock(block.id, { price: event.target.value })} />
                    <Input value={block.url || ""} placeholder="Product link" onChange={(event) => updateBlock(block.id, { url: event.target.value })} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { uploadTargetRef.current = block.id; fileRef.current?.click() }}>
                      <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Image
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => void openLibrary(block.id)}>
                      <Package className="mr-1.5 h-3.5 w-3.5" /> Library
                    </Button>
                  </div>
                </div>
              )}

              {block.type === "social" && (
                <div className="space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={block.website || ""}
                      placeholder="elevatehub.co.ke"
                      onChange={(event) => updateBlock(block.id, { website: event.target.value })}
                      onBlur={(event) => void persistSocialProfiles({ ...block, website: event.target.value })}
                    />
                    <Input
                      value={block.instagram || ""}
                      placeholder="instagram.com/yourpage"
                      onChange={(event) => updateBlock(block.id, { instagram: event.target.value })}
                      onBlur={(event) => void persistSocialProfiles({ ...block, instagram: event.target.value })}
                    />
                    <Input
                      value={block.facebook || ""}
                      placeholder="facebook.com/yourpage"
                      onChange={(event) => updateBlock(block.id, { facebook: event.target.value })}
                      onBlur={(event) => void persistSocialProfiles({ ...block, facebook: event.target.value })}
                    />
                    <Input
                      value={block.linkedin || ""}
                      placeholder="linkedin.com/company/yourpage"
                      onChange={(event) => updateBlock(block.id, { linkedin: event.target.value })}
                      onBlur={(event) => void persistSocialProfiles({ ...block, linkedin: event.target.value })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the domain only if you like — it is saved as https:// and reused on the next campaign.
                    {socialSaveStatus ? ` ${socialSaveStatus}.` : ""}
                  </p>
                </div>
              )}

              {block.type === "footer" && (
                <div className="space-y-2">
                  <Input value={block.companyName || ""} placeholder="Company name" onChange={(event) => updateBlock(block.id, { companyName: event.target.value })} />
                  <Input value={block.address || ""} placeholder="City, country" onChange={(event) => updateBlock(block.id, { address: event.target.value })} />
                  <Textarea rows={2} value={block.extra || ""} onChange={(event) => updateBlock(block.id, { extra: event.target.value })} />
                </div>
              )}
            </div>
          ))}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleUpload(file, uploadTargetRef.current || undefined)
            event.target.value = ""
          }}
        />

        {(error || status || testStatus) && (
          <p className={`text-sm ${error || testStatus.toLowerCase().includes("fail") ? "text-red-600" : "text-green-700"}`}>
            {error || status || testStatus}
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input
            type="email"
            placeholder="Send a test to yourself"
            value={testTo}
            onChange={(event) => setTestTo(event.target.value)}
          />
          <Button type="button" variant="outline" onClick={() => void sendTest()} disabled={testing || uploading}>
            <Mail className="mr-2 h-4 w-4" />
            {testing ? "Sending test..." : "Send test"}
          </Button>
        </div>

        <Button className="w-full" onClick={onSend} disabled={sending} style={{ backgroundColor: branding.primaryColor || "#0f766e" }}>
          <Send className="mr-2 h-4 w-4" />
          {sending ? "Sending campaign..." : `Send to ${selectedCount} recipient${selectedCount === 1 ? "" : "s"}`}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Live preview</p>
          <div className="flex gap-1">
            <Button type="button" variant={previewMode === "desktop" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("desktop")}>
              <Monitor className="h-4 w-4" />
            </Button>
            <Button type="button" variant={previewMode === "mobile" ? "default" : "outline"} size="sm" onClick={() => setPreviewMode("mobile")}>
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border bg-[#f3f4f8]">
          <iframe
            title="Email preview"
            className="h-[720px] bg-[#f3f4f8]"
            style={{ width: previewMode === "mobile" ? 360 : "100%", maxWidth: "100%", margin: "0 auto", display: "block" }}
            srcDoc={previewHtml}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          This is the same table-based HTML Nodemailer sends. Images are hosted URLs, not attached files.
        </p>
      </div>

      <Dialog open={libraryOpen} onOpenChange={setLibraryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email assets</DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {ASSET_CATEGORIES.map((item) => (
              <Button
                key={item.id}
                type="button"
                size="sm"
                variant={assetCategory === item.id ? "default" : "outline"}
                onClick={() => {
                  setAssetCategory(item.id)
                  void loadAssets(item.id)
                }}
              >
                {item.label}
              </Button>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="mr-1.5 h-3.5 w-3.5" /> {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
          {assets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No images in this folder yet. Upload once, then reuse across campaigns.</p>
          ) : (
            <div className="grid max-h-[420px] grid-cols-2 gap-3 overflow-auto sm:grid-cols-3">
              {assets.map((asset) => (
                <button
                  key={asset._id}
                  type="button"
                  className="overflow-hidden rounded-lg border bg-muted/20 text-left hover:border-foreground/40"
                  onClick={() => chooseAsset(asset)}
                >
                  <img src={assetUrl(asset.url)} alt={asset.name} className="h-24 w-full object-cover" />
                  <p className="truncate px-2 py-1.5 text-xs">{asset.name}</p>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
