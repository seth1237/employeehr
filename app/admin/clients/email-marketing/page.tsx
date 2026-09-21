"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { useSearchParams } from "next/navigation"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { History, Search, Users, ChevronDown, X } from "lucide-react"
import { TableSkeleton } from "@/components/admin/ui/page-states"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { EmailComposer } from "@/components/admin/email-marketing/email-composer"
import {
  createDefaultBlocks,
  getMarketingTemplates,
  type MarketingBranding,
} from "@/lib/marketing-email"

type AudienceType = "all" | "pending_quotations" | "quotation_product" | "branch" | "inactive" | "exhibition"

interface BulkEmailClient {
  key: string
  name: string
  phone: string
  email: string
  location: string
  contactPerson?: string
  contactRole?: string
  contactName?: string
  quotationsCount: number
  pendingQuotationsCount: number
  quotationNumbers: string[]
  invoicesCount: number
  purchasesValue: number
  lastPurchaseAt?: string
  sources: string[]
}

interface ClientGroupOption {
  _id: string
  name: string
  memberKeys?: string[]
}

interface BulkEmailRecipient {
  key: string
  name: string
  email: string
  location?: string
  status: "sent" | "delivered" | "failed" | "skipped" | "opened" | "clicked" | "bounced"
  skipReason?: "duplicate" | "invalid_email" | "other"
  duplicateOfName?: string
  errorMessage?: string
  sentAt?: string
  deliveredAt?: string
}

interface BulkEmailCampaign {
  _id: string
  name: string
  subject: string
  htmlBody: string
  audienceCount: number
  sentCount: number
  deliveredCount?: number
  openedCount?: number
  clickedCount?: number
  uniqueClickedCount?: number
  linkClicks?: Array<{ url: string; clicks: number }>
  failedCount: number
  skippedCount: number
  duplicateCount?: number
  status: "draft" | "scheduled" | "sending" | "completed" | "completed_with_errors" | "failed"
  recipients?: BulkEmailRecipient[]
  createdAt: string
}

function MultiSelectFilter({
  label,
  emptyLabel,
  options,
  selected,
  onChange,
}: {
  label: string
  emptyLabel: string
  options: Array<{ value: string; label: string }>
  selected: string[]
  onChange: (next: string[]) => void
}) {
  const selectedSet = useMemo(() => new Set(selected), [selected])
  const summary =
    selected.length === 0
      ? emptyLabel
      : selected.length === 1
        ? options.find((option) => option.value === selected[0])?.label || `${selected.length} selected`
        : `${selected.length} ${label.toLowerCase()} selected`

  const toggle = (value: string) => {
    if (selectedSet.has(value)) {
      onChange(selected.filter((entry) => entry !== value))
    } else {
      onChange([...selected, value])
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full justify-between px-3 font-normal"
        >
          <span className="truncate text-left">{summary}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-2">
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {selected.length > 0 ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              onClick={() => onChange([])}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No options available.</p>
          ) : (
            options.map((option) => {
              const checked = selectedSet.has(option.value)
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(option.value)}
                    className="mt-0.5"
                  />
                  <span className="leading-snug">{option.label}</span>
                </label>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}


export default function BulkSmsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const initialLoadDone = useRef(false)
  const [sending, setSending] = useState(false)
  const [clients, setClients] = useState<BulkEmailClient[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [quotationNumbers, setQuotationNumbers] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<BulkEmailCampaign[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  const [branding, setBranding] = useState<MarketingBranding>({})
  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = `${primaryColor}14`
  const primaryBorderColor = `${primaryColor}2e`

  const [filters, setFilters] = useState({
    audienceType: "all" as AudienceType,
    search: "",
    region: "",
    contactRoles: [] as string[],
    groupIds: [] as string[],
    quotationCategoryId: "",
    quotationProductId: "",
    branchId: "",
    inactiveDays: "90",
    exhibitionId: "",
  })

  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([])
  const [branches, setBranches] = useState<any[]>([])
  const [contactRoles, setContactRoles] = useState<string[]>([])
  const [clientGroups, setClientGroups] = useState<ClientGroupOption[]>([])
  const [exhibitions, setExhibitions] = useState<any[]>([])

  const [campaign, setCampaign] = useState({
    name: "",
    subject: getMarketingTemplates().find((item) => item.id === "exhibition_followup")?.subject || "",
    blocks: createDefaultBlocks(),
  })

  const searchParams = useSearchParams()

  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }), [])

  useEffect(() => {
    if (!searchParams) return

    const selectedKeys = searchParams.getAll("selectedKey")
    const extraSelected = searchParams.get("selectedKeys")
    const keys = new Set<string>()

    selectedKeys.forEach((value) => {
      const decoded = decodeURIComponent(value || "").trim()
      if (decoded) keys.add(decoded)
    })

    if (extraSelected) {
      extraSelected.split(",").forEach((value) => {
        const decoded = decodeURIComponent(value || "").trim()
        if (decoded) keys.add(decoded)
      })
    }

    if (keys.size > 0) {
      setSelectedKeys(keys)
    }

    const subject = searchParams.get("subject")
    if (subject) {
      setCampaign((prev) => ({ ...prev, subject }))
    }

    const name = searchParams.get("name")
    if (name) {
      setCampaign((prev) => ({ ...prev, name }))
    }
  }, [searchParams])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set("audienceType", filters.audienceType)
    if (filters.search.trim()) params.set("search", filters.search.trim())
    if (filters.region.trim()) params.set("region", filters.region.trim())
    filters.contactRoles.forEach((role) => {
      if (role.trim()) params.append("contactRoles", role.trim())
    })
    filters.groupIds.forEach((groupId) => {
      if (groupId.trim()) params.append("groupIds", groupId.trim())
    })
    if (filters.audienceType === "quotation_product") {
      if (filters.quotationCategoryId.trim()) {
        params.set("quotationCategoryId", filters.quotationCategoryId.trim())
      }
      if (filters.quotationProductId.trim()) {
        params.set("quotationProductId", filters.quotationProductId.trim())
      }
    }
    if (filters.audienceType === "branch" && filters.branchId.trim()) params.set("branchId", filters.branchId.trim())
    if (filters.inactiveDays.trim()) params.set("inactiveDays", filters.inactiveDays.trim())
    if (filters.audienceType === "exhibition" && filters.exhibitionId.trim()) params.set("exhibitionId", filters.exhibitionId.trim())
    return params.toString()
  }, [filters])

  const selectedGroupNames = useMemo(
    () =>
      filters.groupIds
        .map((id) => clientGroups.find((group) => group._id === id)?.name || id)
        .filter(Boolean),
    [clientGroups, filters.groupIds],
  )

  const selectedClients = useMemo(() => {
    return clients.filter((client) => selectedKeys.has(client.key))
  }, [clients, selectedKeys])

  const productsForFilter = useMemo(() => {
    if (!filters.quotationCategoryId.trim()) return products
    return products.filter(
      (product) => String(product.category || "") === filters.quotationCategoryId,
    )
  }, [products, filters.quotationCategoryId])

  const selectedCount = selectedKeys.size
  const visibleCount = clients.length
  const allVisibleSelected = visibleCount > 0 && clients.every((client) => selectedKeys.has(client.key))
  const previewClient = selectedClients[0] || clients[0] || null

  const loadCampaigns = async () => {
    const response = await fetch(`${API_URL}/api/stock/bulk-email/campaigns`, { headers })
    const json = await response.json()
    if (!response.ok) throw new Error(json.message || "Failed to load campaigns")
    setCampaigns(json.data || [])
  }

  const loadAudience = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      setError("")
      const response = await fetch(`${API_URL}/api/stock/bulk-email/audience?${queryString}`, { headers })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to load SMS audience")

      const data = (json.data || []) as BulkEmailClient[]
      setClients(data)
      setRegions(json.meta?.regions || [])
      setQuotationNumbers(json.meta?.quotationNumbers || [])
      if (Array.isArray(json.meta?.contactRoles) && json.meta.contactRoles.length > 0) {
        setContactRoles(json.meta.contactRoles)
      }
      setSelectedKeys((prev) => {
        const visible = new Set(data.map((client) => client.key))
        return new Set(Array.from(prev).filter((key) => visible.has(key)))
      })
    } catch (loadError: any) {
      setClients([])
      setError(loadError.message || "Failed to load SMS audience")
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  useEffect(() => {
    loadAudience({ silent: initialLoadDone.current })
    initialLoadDone.current = true
  }, [queryString])

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [productsRes, branchesRes, brandingRes, rolesRes, groupsRes, categoriesRes, exhibitionsRes] = await Promise.all([
          fetch(`${API_URL}/api/stock/products`, { headers }),
          fetch(`${API_URL}/api/branches`, { headers }),
          fetch(`${API_URL}/api/company/branding`, { headers }),
          fetch(`${API_URL}/api/stock/clients/contact-roles`, { headers }),
          fetch(`${API_URL}/api/stock/clients/groups`, { headers }),
          fetch(`${API_URL}/api/stock/categories`, { headers }),
          fetch(`${API_URL}/api/exhibitions`, { headers }),
        ])
        if (productsRes.ok) {
          const productsJson = await productsRes.json()
          setProducts(productsJson.data || [])
        }
        if (branchesRes.ok) {
          const branchesJson = await branchesRes.json()
          setBranches(branchesJson.data || [])
        }
        if (brandingRes.ok) {
          const brandingJson = await brandingRes.json()
          const next = (brandingJson.data || {}) as MarketingBranding
          setBranding(next)
          setCampaign((prev) => ({
            ...prev,
            blocks: prev.blocks.map((block) => {
              if (block.type === "logo" && !block.src && next.logo) return { ...block, src: next.logo }
              if (block.type === "footer" && !block.companyName && next.name) {
                return { ...block, companyName: next.name }
              }
              if (block.type === "social") {
                return {
                  ...block,
                  website: block.website || next.website,
                  instagram: block.instagram || next.instagram,
                  facebook: block.facebook || next.facebook,
                  linkedin: block.linkedin || next.linkedin,
                }
              }
              if (block.type === "button" && !block.url && next.website) {
                return { ...block, url: next.website }
              }
              return block
            }),
          }))
        }
        if (rolesRes.ok) {
          const rolesJson = await rolesRes.json()
          if (Array.isArray(rolesJson.data) && rolesJson.data.length > 0) {
            setContactRoles(rolesJson.data)
          }
        }
        if (groupsRes.ok) {
          const groupsJson = await groupsRes.json()
          setClientGroups((groupsJson.data || []) as ClientGroupOption[])
        }
        if (categoriesRes.ok) {
          const categoriesJson = await categoriesRes.json()
          setCategories(
            ((categoriesJson.data || []) as Array<{ _id: string; name: string }>).map((category) => ({
              _id: String(category._id),
              name: String(category.name || "Untitled category"),
            })),
          )
        }
        if (exhibitionsRes.ok) {
          const exhibitionsJson = await exhibitionsRes.json()
          setExhibitions(exhibitionsJson.data || [])
        }
      } catch (err) {
        console.error("Failed to load metadata", err)
      }
    }
    loadMetadata()
  }, [headers])

  useEffect(() => {
    loadCampaigns().catch((campaignError) => setError(campaignError.message || "Failed to load campaigns"))
  }, [])

  const toggleClient = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAllVisible = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        clients.forEach((client) => next.delete(client.key))
      } else {
        clients.forEach((client) => next.add(client.key))
      }
      return next
    })
  }

  const sendCampaign = async () => {
    try {
      setSending(true)
      setError("")
      setStatus("")

      if (!campaign.name.trim()) throw new Error("Campaign name is required")
      if (!campaign.subject.trim()) throw new Error("Subject is required")
      if (campaign.blocks.length === 0) throw new Error("Add at least one content block")
      if (selectedCount === 0) throw new Error("Select at least one client")

      const response = await fetch(`${API_URL}/api/stock/bulk-email/campaigns`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: campaign.name,
          subject: campaign.subject,
          blocks: campaign.blocks,
          filters,
          selectedRecipientKeys: Array.from(selectedKeys),
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to send campaign")

      setStatus(json.message || "Campaign sent")
      setCampaign({
        name: "",
        subject: getMarketingTemplates(branding).find((item) => item.id === "exhibition_followup")?.subject || "",
        blocks: createDefaultBlocks(branding),
      })
      setSelectedKeys(new Set())
      await loadCampaigns()
    } catch (sendError: any) {
      setError(sendError.message || "Failed to send campaign")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border px-4 py-3 shadow-sm" style={{ borderColor: primaryBorderColor, background: `linear-gradient(to right, ${primarySoftColor}, ${secondaryColor}14)` }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium tracking-wide" style={{ color: primaryColor }}>Clients</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Email Marketing campaigns</h1>
            <p className="text-sm text-muted-foreground">
              Build branded emails from blocks, hosted images, and ERP products. The live preview is the same HTML Nodemailer sends.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/clients/email-marketing/history">
                <History className="mr-2 h-4 w-4" /> Campaign History
              </Link>
            </Button>
            <Button variant="outline" onClick={() => loadAudience({ silent: true })} disabled={loading || refreshing}>
              {refreshing ? "Refreshing..." : "Refresh Audience"}
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Visible audience</div>
              <div className="mt-1 flex items-center gap-2 text-xl font-semibold"><Users className="h-5 w-5" />{visibleCount}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Selected</div>
              <div className="mt-1 text-xl font-semibold" style={{ color: primaryColor }}>{selectedCount}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Regions</div>
              <div className="mt-1 text-xl font-semibold" style={{ color: secondaryColor }}>{regions.length}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Recent campaigns</div>
              <div className="mt-1 text-xl font-semibold">{campaigns.length}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={filters.audienceType}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  audienceType: event.target.value as AudienceType,
                  quotationCategoryId:
                    event.target.value === "quotation_product" ? prev.quotationCategoryId : "",
                  quotationProductId:
                    event.target.value === "quotation_product" ? prev.quotationProductId : "",
                  branchId: event.target.value === "branch" ? prev.branchId : "",
                  exhibitionId: event.target.value === "exhibition" ? prev.exhibitionId : "",
                }))
              }
            >
              <option value="all">All clients</option>
              <option value="pending_quotations">Pending quotations</option>
              <option value="quotation_product">Specific Quotation Product</option>
              <option value="branch">Clients of a certain branch</option>
              <option value="inactive">Long since purchase</option>
              <option value="exhibition">Exhibition Leads</option>
            </select>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={filters.region}
              onChange={(event) => setFilters((prev) => ({ ...prev, region: event.target.value }))}
            >
              <option value="">All regions</option>
              {regions.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>

            <MultiSelectFilter
              label="Groups"
              emptyLabel="All groups / counties"
              options={clientGroups.map((group) => ({
                value: group._id,
                label: `${group.name} (${group.memberKeys?.length || 0})`,
              }))}
              selected={filters.groupIds}
              onChange={(groupIds) => setFilters((prev) => ({ ...prev, groupIds }))}
            />

            <MultiSelectFilter
              label="Contact roles"
              emptyLabel="All contact roles"
              options={contactRoles.map((role) => ({ value: role, label: role }))}
              selected={filters.contactRoles}
              onChange={(roles) => setFilters((prev) => ({ ...prev, contactRoles: roles }))}
            />

            {filters.audienceType === "quotation_product" ? (
              <>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={filters.quotationCategoryId}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      quotationCategoryId: event.target.value,
                      // Reset product when category changes so the list stays coherent
                      quotationProductId: "",
                    }))
                  }
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={filters.quotationProductId}
                  onChange={(event) =>
                    setFilters((prev) => ({ ...prev, quotationProductId: event.target.value }))
                  }
                >
                  <option value="">
                    {filters.quotationCategoryId
                      ? "All products in category"
                      : "Select product (or pick a category)"}
                  </option>
                  {productsForFilter.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            {filters.audienceType === "branch" ? (
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={filters.branchId}
                onChange={(event) => setFilters((prev) => ({ ...prev, branchId: event.target.value }))}
              >
                <option value="">Select branch...</option>
                {branches.map((b) => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            ) : null}

            {filters.audienceType === "inactive" ? (
              <Input
                type="number"
                min={1}
                placeholder="Days since purchase"
                value={filters.inactiveDays}
                onChange={(event) => setFilters((prev) => ({ ...prev, inactiveDays: event.target.value }))}
              />
            ) : null}

            {filters.audienceType === "exhibition" ? (
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={filters.exhibitionId}
                onChange={(event) => setFilters((prev) => ({ ...prev, exhibitionId: event.target.value }))}
              >
                <option value="">Select an exhibition...</option>
                {exhibitions.map((exhibition) => (
                  <option key={exhibition._id} value={exhibition._id}>
                    {exhibition.name} ({new Date(exhibition.date).getFullYear()})
                  </option>
                ))}
              </select>
            ) : null}

            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search client, phone, region, role, quotation..."
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
            </div>
          </div>

          {(filters.contactRoles.length > 0 || filters.groupIds.length > 0) ? (
            <div className="mt-3 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {filters.groupIds.map((groupId) => {
                  const name = clientGroups.find((group) => group._id === groupId)?.name || groupId
                  return (
                    <Badge key={`group-${groupId}`} variant="outline" className="gap-1 pr-1">
                      Group: {name}
                      <button
                        type="button"
                        className="rounded-sm p-0.5 hover:bg-muted"
                        onClick={() =>
                          setFilters((prev) => ({
                            ...prev,
                            groupIds: prev.groupIds.filter((id) => id !== groupId),
                          }))
                        }
                        aria-label={`Remove group ${name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )
                })}
                {filters.contactRoles.map((role) => (
                  <Badge key={`role-${role}`} variant="secondary" className="gap-1 pr-1">
                    Role: {role}
                    <button
                      type="button"
                      className="rounded-sm p-0.5 hover:bg-muted"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          contactRoles: prev.contactRoles.filter((entry) => entry !== role),
                        }))
                      }
                      aria-label={`Remove role ${role}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {filters.contactRoles.length > 0 ? (
                  <>
                    Showing contacts with role{filters.contactRoles.length === 1 ? "" : "s"}{" "}
                    <strong>{filters.contactRoles.join(", ")}</strong>
                    {filters.region ? <> in <strong>{filters.region}</strong></> : null}
                    {selectedGroupNames.length > 0 ? (
                      <> within group{selectedGroupNames.length === 1 ? "" : "s"}{" "}
                        <strong>{selectedGroupNames.join(", ")}</strong>
                      </>
                    ) : null}
                    . Emails go to each contact&apos;s own email address (contacts without an email are hidden — add emails in Client CRM).
                  </>
                ) : (
                  <>
                    Showing facilities in group{selectedGroupNames.length === 1 ? "" : "s"}{" "}
                    <strong>{selectedGroupNames.join(", ")}</strong>
                    {filters.region ? <> and region <strong>{filters.region}</strong></> : null}.
                    Add contact roles to target specific people (e.g. Lab Techs, Directors).
                  </>
                )}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
        <Card className="shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-base">Recipients</CardTitle>
              <Button variant="outline" size="sm" onClick={toggleAllVisible} disabled={clients.length === 0}>
                {allVisibleSelected ? "Clear Visible" : "Select Visible"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && clients.length === 0 ? (
              <TableSkeleton rows={8} />
            ) : clients.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No clients with email addresses match these filters. Add emails in Client CRM, or pick different filters.
              </p>
            ) : (
              <div className="max-h-[680px] space-y-2 overflow-auto pr-1">
                {clients.map((client) => (
                  <label key={client.key} className="grid cursor-pointer grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border bg-white/90 p-3 shadow-sm transition-colors hover:bg-muted/30">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={selectedKeys.has(client.key)}
                      onChange={() => toggleClient(client.key)}
                    />
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{client.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {client.email} · {client.location || "No region"}
                          </p>
                          {client.contactRole || client.contactName || client.contactPerson ? (
                            <p className="mt-1 text-xs font-medium text-foreground/80">
                              {client.contactRole ? `${client.contactRole}: ` : ""}
                              {client.contactName || client.contactPerson}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {client.contactRole ? (
                            <Badge variant="secondary">{client.contactRole}</Badge>
                          ) : null}
                          <Badge variant="outline">{client.sources.join(", ")}</Badge>
                        </div>
                      </div>
                      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                        <span>Quotes: {client.quotationsCount}</span>
                        <span>Pending: {client.pendingQuotationsCount}</span>
                        <span>Invoices: {client.invoicesCount}</span>
                        <span>Purchases: {Number(client.purchasesValue || 0).toLocaleString("en-KE")}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last purchase: {client.lastPurchaseAt ? new Date(client.lastPurchaseAt).toLocaleDateString() : "Never"}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Email composer</CardTitle>
            </CardHeader>
            <CardContent>
              <EmailComposer
                branding={branding}
                products={products}
                previewPerson={previewClient}
                selectedCount={selectedCount}
                sending={sending}
                error={error}
                status={status}
                name={campaign.name}
                subject={campaign.subject}
                blocks={campaign.blocks}
                onNameChange={(value) => setCampaign((prev) => ({ ...prev, name: value }))}
                onSubjectChange={(value) => setCampaign((prev) => ({ ...prev, subject: value }))}
                onBlocksChange={(blocks) => setCampaign((prev) => ({ ...prev, blocks }))}
                onSend={() => void sendCampaign()}
                onSocialSaved={(social) => setBranding((prev) => ({ ...prev, ...social }))}
              />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Recent Campaigns</CardTitle>
              <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                <Link href="/admin/clients/email-marketing/history">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No campaigns sent yet.</p>
              ) : (
                campaigns.slice(0, 5).map((item) => (
                  <Link
                    key={item._id}
                    href="/admin/clients/email-marketing/history"
                    className="block rounded-xl border bg-white/90 p-3 text-sm shadow-sm transition hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      <Badge className={
                        item.status === "completed" ? "bg-green-100 text-green-700" :
                        item.status === "completed_with_errors" ? "bg-amber-100 text-amber-700" :
                        item.status === "sending" ? "bg-blue-100 text-blue-700" :
                        "bg-red-100 text-red-700"
                      }>
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-5">
                      <span>Total: {item.audienceCount}</span>
                      <span>Sent: {item.sentCount}</span>
                      <span>Opened: {item.openedCount || 0}</span>
                      <span>Clicks: {item.clickedCount || 0}</span>
                      <span>Failed: {item.failedCount}</span>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
