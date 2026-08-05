"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { useSearchParams } from "next/navigation"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { History, MessageSquare, Search, Send, Users } from "lucide-react"
import { TableSkeleton } from "@/components/admin/ui/page-states"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type AudienceType = "all" | "pending_quotations" | "quotation_product" | "branch" | "inactive"

interface BulkSmsClient {
  key: string
  name: string
  phone: string
  location: string
  contactPerson?: string
  quotationsCount: number
  pendingQuotationsCount: number
  quotationNumbers: string[]
  invoicesCount: number
  purchasesValue: number
  lastPurchaseAt?: string
  sources: string[]
}

interface BulkSmsCampaign {
  _id: string
  name: string
  message: string
  audienceCount: number
  sentCount: number
  failedCount: number
  skippedCount: number
  status: "completed" | "completed_with_errors" | "failed"
  createdAt: string
}


export default function BulkSmsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const initialLoadDone = useRef(false)
  const [sending, setSending] = useState(false)
  const [clients, setClients] = useState<BulkSmsClient[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [quotationNumbers, setQuotationNumbers] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<BulkSmsCampaign[]>([])
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")
  const [historyOpen, setHistoryOpen] = useState(false)

  const [branding, setBranding] = useState<{ primaryColor?: string; secondaryColor?: string }>({})
  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = `${primaryColor}14`
  const primaryBorderColor = `${primaryColor}2e`

  const [filters, setFilters] = useState({
    audienceType: "all" as AudienceType,
    search: "",
    region: "",
    quotationProductId: "",
    branchId: "",
    inactiveDays: "90",
  })

  const [products, setProducts] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])

  const [campaign, setCampaign] = useState({
    name: "",
    message: "",
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

    const message = searchParams.get("message")
    if (message) {
      setCampaign((prev) => ({ ...prev, message }))
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
    if (filters.audienceType === "quotation_product" && filters.quotationProductId.trim()) params.set("quotationProductId", filters.quotationProductId.trim())
    if (filters.audienceType === "branch" && filters.branchId.trim()) params.set("branchId", filters.branchId.trim())
    if (filters.inactiveDays.trim()) params.set("inactiveDays", filters.inactiveDays.trim())
    return params.toString()
  }, [filters])

  const selectedClients = useMemo(() => {
    return clients.filter((client) => selectedKeys.has(client.key))
  }, [clients, selectedKeys])

  const selectedCount = selectedKeys.size
  const visibleCount = clients.length
  const allVisibleSelected = visibleCount > 0 && clients.every((client) => selectedKeys.has(client.key))

  const loadCampaigns = async () => {
    const response = await fetch(`${API_URL}/api/stock/bulk-sms/campaigns`, { headers })
    const json = await response.json()
    if (!response.ok) throw new Error(json.message || "Failed to load campaigns")
    setCampaigns(json.data || [])
  }

  const loadAudience = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      setError("")
      const response = await fetch(`${API_URL}/api/stock/bulk-sms/audience?${queryString}`, { headers })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to load SMS audience")

      const data = (json.data || []) as BulkSmsClient[]
      setClients(data)
      setRegions(json.meta?.regions || [])
      setQuotationNumbers(json.meta?.quotationNumbers || [])
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
        const [productsRes, branchesRes, brandingRes] = await Promise.all([
          fetch(`${API_URL}/api/stock/products`, { headers }),
          fetch(`${API_URL}/api/branches`, { headers }),
          fetch(`${API_URL}/api/company/branding`, { headers }),
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
          setBranding(brandingJson.data || {})
        }
      } catch (err) {
        console.error("Failed to load metadata", err)
      }
    }
    loadMetadata()
  }, [headers])

  useEffect(() => {
    loadCampaigns().catch((campaignError) => setError(campaignError.message || "Failed to load campaigns"))
  }, [open, historyOpen])

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
      if (!campaign.message.trim()) throw new Error("Message is required")
      if (selectedCount === 0) throw new Error("Select at least one client")

      const response = await fetch(`${API_URL}/api/stock/bulk-sms/campaigns`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: campaign.name,
          message: campaign.message,
          filters,
          selectedRecipientKeys: Array.from(selectedKeys),
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to send campaign")

      setStatus(json.message || "Campaign sent")
      setCampaign({ name: "", message: "" })
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
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Bulk SMS campaigns</h1>
            <p className="text-sm text-muted-foreground">Build an audience from clients, quotations, regions, and purchase history.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><History className="mr-2 h-4 w-4" /> Campaign History</Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Campaign History</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {campaigns.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">No campaigns found.</div>
                  ) : (
                    campaigns.map((item) => (
                      <div key={item._id} className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-lg">{item.name}</h3>
                            <p className="text-sm text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                          </div>
                          <Badge className={
                            item.status === "completed" ? "bg-green-100 text-green-700" :
                            item.status === "completed_with_errors" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }>
                            {item.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <div className="bg-muted/30 rounded-lg p-3 text-sm italic text-muted-foreground">
                          "{item.message}"
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground uppercase font-medium">Audience</p>
                            <p className="text-xl font-bold">{item.audienceCount}</p>
                          </div>
                          <div className="space-y-1 text-green-600">
                            <p className="text-xs text-muted-foreground uppercase font-medium">Sent</p>
                            <p className="text-xl font-bold">{item.sentCount}</p>
                          </div>
                          <div className="space-y-1 text-red-600">
                            <p className="text-xs text-muted-foreground uppercase font-medium">Failed</p>
                            <p className="text-xl font-bold">{item.failedCount}</p>
                          </div>
                          <div className="space-y-1 text-muted-foreground">
                            <p className="text-xs text-muted-foreground uppercase font-medium">Skipped</p>
                            <p className="text-xl font-bold">{item.skippedCount}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={filters.audienceType}
              onChange={(event) => setFilters((prev) => ({ ...prev, audienceType: event.target.value as AudienceType }))}
            >
              <option value="all">All clients</option>
              <option value="pending_quotations">Pending quotations</option>
              <option value="quotation_product">Specific Quotation Product</option>
              <option value="branch">Clients of a certain branch</option>
              <option value="inactive">Long since purchase</option>
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

            {filters.audienceType === "quotation_product" ? (
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={filters.quotationProductId}
                onChange={(event) => setFilters((prev) => ({ ...prev, quotationProductId: event.target.value }))}
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
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

            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search client, phone, region, quotation..."
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
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
              <p className="py-8 text-center text-sm text-muted-foreground">No clients match these filters.</p>
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
                          <p className="text-xs text-muted-foreground">{client.phone} · {client.location || "No region"}</p>
                        </div>
                        <Badge variant="outline">{client.sources.join(", ")}</Badge>
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
              <CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4" /> Campaign Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label>Campaign Name</Label>
                <Input
                  placeholder="e.g. June offers for Nairobi clients"
                  value={campaign.name}
                  onChange={(event) => setCampaign((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  rows={7}
                  maxLength={800}
                  placeholder="Write the SMS message to send..."
                  value={campaign.message}
                  onChange={(event) => setCampaign((prev) => ({ ...prev, message: event.target.value }))}
                />
                <p className="text-xs text-muted-foreground">{campaign.message.length}/800 characters</p>
              </div>

              {(error || status) && (
                <p className={`text-sm ${error ? "text-red-600" : "text-green-700"}`}>{error || status}</p>
              )}

              <Button className="w-full" onClick={sendCampaign} disabled={sending} style={{ backgroundColor: primaryColor }}>
                <Send className="mr-2 h-4 w-4" />
                {sending ? "Sending Campaign..." : `Send to ${selectedCount} Client${selectedCount === 1 ? "" : "s"}`}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Recent Campaigns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {campaigns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No campaigns sent yet.</p>
              ) : (
                campaigns.map((item) => (
                  <div key={item._id} className="rounded-xl border bg-white/90 p-3 text-sm shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
                      </div>
                      <Badge className={
                        item.status === "completed" ? "bg-green-100 text-green-700" :
                        item.status === "completed_with_errors" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }>
                        {item.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <span>Total: {item.audienceCount}</span>
                      <span>Sent: {item.sentCount}</span>
                      <span>Failed: {item.failedCount}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
