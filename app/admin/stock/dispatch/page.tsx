"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Clock3, Truck, PackageCheck, PackageX, Search, ChevronDown, ChevronUp } from "lucide-react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"


type DispatchPackingItem = {
  requiredQuantity: number
  packedQuantity: number
}

interface DispatchInvoice {
  _id: string
  invoiceNumber: string
  client: { name: string; number: string; location: string }
  dispatch?: {
    status: "not_assigned" | "assigned" | "packing" | "packed" | "dispatched" | "delivered"
    assignedToUserId?: string
    assignedByUserId?: string
    assignedAt?: string
    packingCompleted?: boolean
    dispatchedAt?: string
    packingItems?: DispatchPackingItem[]
    courier?: {
      name?: string
      contactName?: string
      contactNumber?: string
    }
    delivery?: {
      received?: boolean
      condition?: "good" | "not_good"
      arrivalTime?: string
      everythingPacked?: boolean
      confirmedAt?: string
    }
  }
  createdAt: string
}

interface DispatchUser {
  _id: string
  firstName?: string
  lastName?: string
  first_name?: string
  last_name?: string
}

interface DispatchSmsSettingsPayload {
  officePhone: string
  messageTemplate: string
  deliveryMessageTemplate?: string
  smsSenderName?: string
  placeholders?: string[]
  deliveryPlaceholders?: string[]
  defaultTemplate?: string
  defaultDeliveryTemplate?: string
}

export default function AdminDispatchManagementPage() {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<DispatchInvoice[]>([])
  const [users, setUsers] = useState<DispatchUser[]>([])
  const [branding, setBranding] = useState<{ primaryColor?: string; secondaryColor?: string }>({})
  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = `${primaryColor}14`
  const primaryBorderColor = `${primaryColor}2e`
  const [smsSettingsLoading, setSmsSettingsLoading] = useState(true)
  const [smsSettingsSaving, setSmsSettingsSaving] = useState(false)
  const [smsSettingsError, setSmsSettingsError] = useState("")
  const [smsSettingsStatus, setSmsSettingsStatus] = useState("")
  const [smsSettings, setSmsSettings] = useState({ officePhone: "", messageTemplate: "", deliveryMessageTemplate: "", smsSenderName: "" })
  const [smsPlaceholders, setSmsPlaceholders] = useState<string[]>([])
  const [deliverySmsPlaceholders, setDeliverySmsPlaceholders] = useState<string[]>([])
  const [smsDefaultTemplate, setSmsDefaultTemplate] = useState("")
  const [deliverySmsDefaultTemplate, setDeliverySmsDefaultTemplate] = useState("")

  const [dateFilter, setDateFilter] = useState<"week" | "month" | "custom">("week")
  const [customFrom, setCustomFrom] = useState("")
  const [customTo, setCustomTo] = useState("")
  const [selectedCourier, setSelectedCourier] = useState("all")
  const [selectedStaff, setSelectedStaff] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"createdAt-desc" | "createdAt-asc" | "status" | "client">("createdAt-desc")
  const [smsSettingsOpen, setSmsSettingsOpen] = useState(false)

  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  }), [])

  const getUserName = (id?: string) => {
    if (!id) return "Unassigned"
    const user = users.find((u) => u._id === id)
    if (!user) return id
    const firstName = user.firstName || user.first_name || ""
    const lastName = user.lastName || user.last_name || ""
    return `${firstName} ${lastName}`.trim() || id
  }

  const now = new Date()

  const loadDispatchSmsSettings = async () => {
    try {
      setSmsSettingsLoading(true)
      setSmsSettingsError("")
      const response = await fetch(`${API_URL}/api/company/dispatch-sms`, { headers })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to load dispatch SMS settings")

      const data = (json.data || {}) as DispatchSmsSettingsPayload
      setSmsSettings({
        officePhone: data.officePhone || "",
        messageTemplate: data.messageTemplate || "",
        deliveryMessageTemplate: data.deliveryMessageTemplate || "",
        smsSenderName: data.smsSenderName || "",
      })
      setSmsPlaceholders(data.placeholders || [])
      setDeliverySmsPlaceholders(data.deliveryPlaceholders || [])
      setSmsDefaultTemplate(data.defaultTemplate || "")
      setDeliverySmsDefaultTemplate(data.defaultDeliveryTemplate || "")
    } catch (error: any) {
      setSmsSettingsError(error.message || "Failed to load dispatch SMS settings")
    } finally {
      setSmsSettingsLoading(false)
    }
  }

  const saveDispatchSmsSettings = async () => {
    try {
      setSmsSettingsSaving(true)
      setSmsSettingsError("")
      setSmsSettingsStatus("")

      const response = await fetch(`${API_URL}/api/company/dispatch-sms`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          officePhone: smsSettings.officePhone,
          messageTemplate: smsSettings.messageTemplate,
          deliveryMessageTemplate: smsSettings.deliveryMessageTemplate,
          smsSenderName: smsSettings.smsSenderName,
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to update dispatch SMS settings")

      const data = (json.data || {}) as DispatchSmsSettingsPayload
      setSmsSettings({
        officePhone: data.officePhone || "",
        messageTemplate: data.messageTemplate || "",
        deliveryMessageTemplate: data.deliveryMessageTemplate || "",
        smsSenderName: data.smsSenderName || "",
      })
      setSmsPlaceholders(data.placeholders || [])
      setDeliverySmsPlaceholders(data.deliveryPlaceholders || [])
      setSmsDefaultTemplate(data.defaultTemplate || "")
      setDeliverySmsDefaultTemplate(data.defaultDeliveryTemplate || "")
      setSmsSettingsStatus("Dispatch SMS settings saved")
    } catch (error: any) {
      setSmsSettingsError(error.message || "Failed to update dispatch SMS settings")
    } finally {
      setSmsSettingsSaving(false)
    }
  }

  const smsPreview = useMemo(() => {
    const template = smsSettings.messageTemplate || smsDefaultTemplate
    return template
      .replace(/\{\{\s*clientName\s*\}\}/g, "Client Name")
      .replace(/\{\{\s*invoiceNumber\s*\}\}/g, "INV-000123")
      .replace(/\{\{\s*deliveryNoteNumber\s*\}\}/g, "DN-000123")
      .replace(/\{\{\s*courierName\s*\}\}/g, "Sample Courier")
      .replace(/\{\{\s*courierContactNumber\s*\}\}/g, "+254700000000")
      .replace(/\{\{\s*officeContactNumber\s*\}\}/g, smsSettings.officePhone || "0700000000")
      .replace(/\s+/g, " ")
      .trim()
  }, [smsSettings.messageTemplate, smsSettings.officePhone, smsDefaultTemplate])

  const deliverySmsPreview = useMemo(() => {
    const template = smsSettings.deliveryMessageTemplate || deliverySmsDefaultTemplate
    return template
      .replace(/\{\{\s*clientName\s*\}\}/g, "Client Name")
      .replace(/\{\{\s*invoiceNumber\s*\}\}/g, "INV-000123")
      .replace(/\{\{\s*deliveryNoteNumber\s*\}\}/g, "DN-000123")
      .replace(/\{\{\s*courierName\s*\}\}/g, "Sample Courier")
      .replace(/\{\{\s*courierContactNumber\s*\}\}/g, "+254700000000")
      .replace(/\{\{\s*officeContactNumber\s*\}\}/g, smsSettings.officePhone || "0700000000")
      .replace(/\{\{\s*arrivalTime\s*\}\}/g, new Date().toLocaleString())
      .replace(/\{\{\s*deliveryCondition\s*\}\}/g, "good")
      .replace(/\{\{\s*deliveryNote\s*\}\}/g, "All products arrived")
      .replace(/\s+/g, " ")
      .trim()
  }, [smsSettings.deliveryMessageTemplate, smsSettings.officePhone, deliverySmsDefaultTemplate])

  const isInDateRange = (value?: string) => {
    if (!value) return false
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return false

    if (dateFilter === "custom" && customFrom && customTo) {
      const from = new Date(customFrom)
      const to = new Date(customTo)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      return date >= from && date <= to
    }

    const days = dateFilter === "week" ? 7 : 30
    const start = new Date(now)
    start.setDate(start.getDate() - days)
    return date >= start && date <= now
  }

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [invoicesRes, usersRes, brandingRes] = await Promise.all([
          fetch(`${API_URL}/api/stock/invoices`, { headers }),
          fetch(`${API_URL}/api/users`, { headers }),
          fetch(`${API_URL}/api/company/branding`, { headers }),
        ])

        const [invoicesJson, usersJson, brandingJson] = await Promise.all([
          invoicesRes.json(), 
          usersRes.json(),
          brandingRes.ok ? brandingRes.json() : Promise.resolve({})
        ])
        setInvoices(invoicesJson.data || [])
        setUsers(usersJson.data || [])
        setBranding(brandingJson.data || {})
      } finally {
        setLoading(false)
      }
    }

    load()
    loadDispatchSmsSettings()
  }, [headers])

  const couriers = useMemo(() => {
    const names = new Set<string>()
    invoices.forEach((invoice) => {
      const name = invoice.dispatch?.courier?.name
      if (name) names.add(name)
    })
    return ["all", ...Array.from(names)]
  }, [invoices])

  const staff = useMemo(() => {
    const ids = new Set<string>()
    invoices.forEach((invoice) => {
      if (invoice.dispatch?.assignedToUserId) ids.add(invoice.dispatch.assignedToUserId)
    })
    return ["all", ...Array.from(ids)]
  }, [invoices])

  const filteredInvoices = useMemo(() => {
    const data = invoices.filter((invoice) => {
      const dispatchDate = invoice.dispatch?.dispatchedAt || invoice.createdAt
      if (!isInDateRange(dispatchDate)) return false

      if (selectedCourier !== "all" && invoice.dispatch?.courier?.name !== selectedCourier) return false
      if (selectedStaff !== "all" && invoice.dispatch?.assignedToUserId !== selectedStaff) return false
      if (selectedStatus !== "all" && (invoice.dispatch?.status || "not_assigned") !== selectedStatus) return false

      if (search.trim()) {
        const q = search.toLowerCase()
        const haystack = [
          invoice.invoiceNumber,
          invoice.client.name,
          invoice.client.number,
          invoice.client.location,
          invoice.dispatch?.courier?.name || "",
        ]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })

    data.sort((a, b) => {
      if (sortBy === "client") return a.client.name.localeCompare(b.client.name)
      if (sortBy === "status") return (a.dispatch?.status || "").localeCompare(b.dispatch?.status || "")
      if (sortBy === "createdAt-asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return data
  }, [
    invoices,
    dateFilter,
    customFrom,
    customTo,
    selectedCourier,
    selectedStaff,
    selectedStatus,
    search,
    sortBy,
  ])

  const metrics = useMemo(() => {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const totalDispatchedToday = invoices.filter((invoice) => {
      const dispatchedAt = invoice.dispatch?.dispatchedAt
      return dispatchedAt && new Date(dispatchedAt) >= startOfToday
    }).length

    const pendingDispatch = filteredInvoices.filter((invoice) =>
      ["assigned", "packing"].includes(invoice.dispatch?.status || "not_assigned")
    ).length

    const deliveredOrders = filteredInvoices.filter((invoice) =>
      invoice.dispatch?.status === "delivered" && invoice.dispatch?.delivery?.received
    ).length

    const failedOrDamaged = filteredInvoices.filter((invoice) =>
      invoice.dispatch?.delivery?.condition === "not_good" || invoice.dispatch?.delivery?.everythingPacked === false
    ).length

    return { totalDispatchedToday, pendingDispatch, deliveredOrders, failedOrDamaged }
  }, [filteredInvoices, invoices])

  const deliveriesPerDay = useMemo(() => {
    const daily = new Map<string, number>()
    filteredInvoices.forEach((invoice) => {
      const deliveredAt = invoice.dispatch?.delivery?.arrivalTime || invoice.dispatch?.dispatchedAt
      if (!deliveredAt) return
      const key = new Date(deliveredAt).toISOString().slice(0, 10)
      daily.set(key, (daily.get(key) || 0) + 1)
    })

    return Array.from(daily.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, deliveries]) => ({ date: date.slice(5), deliveries }))
  }, [filteredInvoices])

  const courierPerformance = useMemo(() => {
    const map = new Map<string, { courier: string; delivered: number; failed: number; total: number; totalMinutes: number }>()

    filteredInvoices.forEach((invoice) => {
      const courier = invoice.dispatch?.courier?.name || "Unknown"
      if (!map.has(courier)) {
        map.set(courier, { courier, delivered: 0, failed: 0, total: 0, totalMinutes: 0 })
      }

      const item = map.get(courier)!
      item.total += 1

      const isDelivered = invoice.dispatch?.status === "delivered" && invoice.dispatch?.delivery?.received
      const isFailed =
        invoice.dispatch?.delivery?.condition === "not_good" || invoice.dispatch?.delivery?.everythingPacked === false

      if (isDelivered) item.delivered += 1
      if (isFailed) item.failed += 1

      const dispatchedAt = invoice.dispatch?.dispatchedAt
      const deliveredAt = invoice.dispatch?.delivery?.arrivalTime
      if (dispatchedAt && deliveredAt) {
        const mins = Math.max(
          0,
          Math.round((new Date(deliveredAt).getTime() - new Date(dispatchedAt).getTime()) / (1000 * 60))
        )
        item.totalMinutes += mins
      }
    })

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        successRate: item.total > 0 ? Math.round((item.delivered / item.total) * 100) : 0,
        avgMinutes: item.delivered > 0 ? Math.round(item.totalMinutes / item.delivered) : 0,
      }))
      .sort((a, b) => b.delivered - a.delivered)
  }, [filteredInvoices])

  const averageDeliveryTime = useMemo(() => {
    const times = filteredInvoices
      .map((invoice) => {
        const d1 = invoice.dispatch?.dispatchedAt
        const d2 = invoice.dispatch?.delivery?.arrivalTime
        if (!d1 || !d2) return null
        return Math.max(0, Math.round((new Date(d2).getTime() - new Date(d1).getTime()) / (1000 * 60)))
      })
      .filter((v): v is number => v !== null)

    if (!times.length) return { mins: 0, label: "0m" }
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    const hours = Math.floor(avg / 60)
    const mins = avg % 60
    return { mins: avg, label: `${hours > 0 ? `${hours}h ` : ""}${mins}m` }
  }, [filteredInvoices])

  const statusBreakdown = useMemo(() => {
    const buckets: Record<string, number> = {
      pending: 0,
      packing: 0,
      dispatched: 0,
      delivered: 0,
      failed: 0,
    }

    filteredInvoices.forEach((invoice) => {
      const status = invoice.dispatch?.status || "not_assigned"
      if (status === "assigned" || status === "not_assigned") buckets.pending += 1
      else if (status === "packing" || status === "packed") buckets.packing += 1
      else if (status === "dispatched") buckets.dispatched += 1
      else if (status === "delivered") buckets.delivered += 1

      if (invoice.dispatch?.delivery?.condition === "not_good" || invoice.dispatch?.delivery?.everythingPacked === false) {
        buckets.failed += 1
      }
    })

    return [
      { name: "Pending", value: buckets.pending, color: "#f59e0b" },
      { name: "Packing", value: buckets.packing, color: "#a855f7" },
      { name: "Dispatched", value: buckets.dispatched, color: "#3b82f6" },
      { name: "Delivered", value: buckets.delivered, color: "#22c55e" },
      { name: "Failed", value: buckets.failed, color: "#ef4444" },
    ]
  }, [filteredInvoices])

  if (loading) return <PageLoadingSkeleton title="Loading dispatch management" rows={8} />

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border px-4 py-3 shadow-sm" style={{ borderColor: primaryBorderColor, background: `linear-gradient(to right, ${primarySoftColor}, ${secondaryColor}14)` }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium tracking-wide" style={{ color: primaryColor }}>Dispatch</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Dispatch dashboard</h1>
            <p className="text-sm text-muted-foreground">Track courier movement, delivery quality, and client notifications from one screen.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setSmsSettingsOpen(!smsSettingsOpen)}>
              {smsSettingsOpen ? "Hide SMS Settings" : "SMS Settings"}
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Dispatched today</div>
                  <div className="mt-1 text-xl font-semibold">{metrics.totalDispatchedToday}</div>
                </div>
                <Truck className="h-5 w-5" style={{ color: primaryColor }} />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Pending dispatch</div>
                  <div className="mt-1 text-xl font-semibold text-amber-600">{metrics.pendingDispatch}</div>
                </div>
                <Clock3 className="h-5 w-5" style={{ color: secondaryColor }} />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Delivered orders</div>
                  <div className="mt-1 text-xl font-semibold text-green-600">{metrics.deliveredOrders}</div>
                </div>
                <PackageCheck className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Failed / damaged</div>
                  <div className="mt-1 text-xl font-semibold text-red-600">{metrics.failedOrDamaged}</div>
                </div>
                <PackageX className="h-5 w-5 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Dispatch SMS Settings</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Configure the dispatch and delivery-complete messages sent to clients.</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSmsSettingsOpen(!smsSettingsOpen)}
              className="flex items-center gap-1"
            >
              {smsSettingsOpen ? (
                <><ChevronUp className="w-4 h-4" /> Collapse</>
              ) : (
                <><ChevronDown className="w-4 h-4" /> Expand</>
              )}
            </Button>
          </div>
        </CardHeader>
        {smsSettingsOpen && (
        <CardContent className="space-y-4 border-t pt-4">
          {smsSettingsLoading ? (
            <p className="text-sm text-muted-foreground">Loading SMS settings...</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dispatch-office-phone">Dispatch Office Phone</Label>
                  <Input
                    id="dispatch-office-phone"
                    placeholder="e.g. 0759433906"
                    value={smsSettings.officePhone}
                    onChange={(e) => setSmsSettings((prev) => ({ ...prev, officePhone: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dispatch-sender-name">SMS Sender Name</Label>
                  <Input
                    id="dispatch-sender-name"
                    placeholder="Company Name"
                    value={smsSettings.smsSenderName}
                    onChange={(e) => setSmsSettings((prev) => ({ ...prev, smsSenderName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3 rounded-xl border bg-white/90 p-3 shadow-sm">
                  <div className="space-y-2">
                    <Label htmlFor="dispatch-message-template">SMS Message Template</Label>
                    <Textarea
                      id="dispatch-message-template"
                      rows={4}
                      value={smsSettings.messageTemplate}
                      onChange={(e) => setSmsSettings((prev) => ({ ...prev, messageTemplate: e.target.value }))}
                      placeholder="Customize dispatch SMS with placeholders"
                    />
                    <p className="text-xs text-muted-foreground">
                      Placeholders: {smsPlaceholders.length ? smsPlaceholders.join(", ") : "{{clientName}}, {{invoiceNumber}}, {{deliveryNoteNumber}}, {{courierName}}, {{courierContactNumber}}, {{officeContactNumber}}"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Dispatch Preview</p>
                    <p className="text-sm leading-6">{smsPreview || "No preview available"}</p>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border bg-white/90 p-3 shadow-sm">
                  <div className="space-y-2">
                    <Label htmlFor="delivery-message-template">Delivery Complete SMS Template</Label>
                    <Textarea
                      id="delivery-message-template"
                      rows={4}
                      value={smsSettings.deliveryMessageTemplate}
                      onChange={(e) => setSmsSettings((prev) => ({ ...prev, deliveryMessageTemplate: e.target.value }))}
                      placeholder="Customize delivery thank-you SMS with placeholders"
                    />
                    <p className="text-xs text-muted-foreground">
                      Placeholders: {deliverySmsPlaceholders.length ? deliverySmsPlaceholders.join(", ") : "{{clientName}}, {{invoiceNumber}}, {{deliveryNoteNumber}}, {{officeContactNumber}}, {{arrivalTime}}, {{deliveryCondition}}, {{deliveryNote}}"}
                    </p>
                  </div>

                  <div className="rounded-lg border p-3 bg-muted/30 space-y-1">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Delivery Complete Preview</p>
                    <p className="text-sm leading-6">{deliverySmsPreview || "No preview available"}</p>
                  </div>
                </div>
              </div>

              {(smsSettingsError || smsSettingsStatus) && (
                <p className={`text-sm ${smsSettingsError ? "text-red-600" : "text-green-600"}`}>
                  {smsSettingsError || smsSettingsStatus}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={saveDispatchSmsSettings} disabled={smsSettingsSaving}>
                  {smsSettingsSaving ? "Saving..." : "Save SMS Settings"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSmsSettings((prev) => ({
                    ...prev,
                    messageTemplate: smsDefaultTemplate || prev.messageTemplate,
                  }))}
                  disabled={!smsDefaultTemplate}
                >
                  Use Dispatch Default
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSmsSettings((prev) => ({
                    ...prev,
                    deliveryMessageTemplate: deliverySmsDefaultTemplate || prev.deliveryMessageTemplate,
                  }))}
                  disabled={!deliverySmsDefaultTemplate}
                >
                  Use Delivery Default
                </Button>
              </div>
            </>
          )}
        </CardContent>
        )}
      </Card>

      <Card className="shadow-sm">
        <CardContent className="p-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as "week" | "month" | "custom")}
          >
            <option value="week">Last 7 days</option>
            <option value="month">Last 30 days</option>
            <option value="custom">Custom range</option>
          </select>

          {dateFilter === "custom" && (
            <>
              <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </>
          )}

          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={selectedCourier}
            onChange={(e) => setSelectedCourier(e.target.value)}
          >
            {couriers.map((courier) => (
              <option key={courier} value={courier}>
                {courier === "all" ? "All Couriers" : courier}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
          >
            {staff.map((id) => (
              <option key={id} value={id}>
                {id === "all" ? "All Dispatch Staff" : getUserName(id)}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="not_assigned">Not Assigned</option>
            <option value="assigned">Assigned</option>
            <option value="packing">Packing</option>
            <option value="packed">Packed</option>
            <option value="dispatched">Dispatched</option>
            <option value="delivered">Delivered</option>
          </select>

          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "createdAt-desc" | "createdAt-asc" | "status" | "client")}
          >
            <option value="createdAt-desc">Sort: Newest first</option>
            <option value="createdAt-asc">Sort: Oldest first</option>
            <option value="status">Sort: Status</option>
            <option value="client">Sort: Client</option>
          </select>

          <div className="relative md:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice, client, courier..."
            />
          </div>
        </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Deliveries Per Day</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={deliveriesPerDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="deliveries" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Courier Performance</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courierPerformance.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="courier" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="delivered" fill="#22c55e" name="Delivered" />
                <Bar dataKey="failed" fill="#ef4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Average Delivery Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{averageDeliveryTime.label}</div>
            <p className="text-sm text-muted-foreground mt-1">Calculated from dispatch to delivery timestamps</p>
            <div className="mt-4 space-y-2">
              {courierPerformance.slice(0, 5).map((c) => (
                <div key={c.courier} className="flex items-center justify-between text-sm border-b pb-1">
                  <span>{c.courier}</span>
                  <span className="font-medium">{c.avgMinutes} min avg</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Dispatch Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" outerRadius={90} label>
                  {statusBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Dispatch Logs</CardTitle>
            <p className="text-sm text-muted-foreground">{filteredInvoices.length} records</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="hidden lg:grid grid-cols-7 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
            <span>Invoice ID</span>
            <span>Client</span>
            <span>Courier</span>
            <span>Status</span>
            <span>Packed</span>
            <span>Dispatched At</span>
            <span>Delivered At</span>
          </div>

          {filteredInvoices.map((invoice) => {
            const statusColors = 
              invoice.dispatch?.status === "delivered" ? "bg-green-100 text-green-700" :
              invoice.dispatch?.status === "dispatched" ? "bg-blue-100 text-blue-700" :
              invoice.dispatch?.status === "packed" ? "bg-purple-100 text-purple-700" :
              invoice.dispatch?.status === "packing" ? "bg-yellow-100 text-yellow-700" :
              "bg-gray-100 text-gray-700"
            
            return (
              <div key={invoice._id} className="grid grid-cols-1 items-center gap-2 rounded-xl border bg-white/90 p-3 shadow-sm transition-colors hover:bg-muted/30 lg:grid-cols-7">
                <div>
                  <p className="font-semibold">{invoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">{invoice.client.name}</p>
                  <p className="text-xs text-muted-foreground">{invoice.client.number}</p>
                </div>
                <div className="text-sm">{invoice.dispatch?.courier?.name || "—"}</div>
                <div>
                  <Badge className={statusColors}>
                    {invoice.dispatch?.status === "delivered" ? "Delivered" :
                      invoice.dispatch?.status === "dispatched" ? "Dispatched" :
                      invoice.dispatch?.status === "packed" ? "Packed" :
                      invoice.dispatch?.status === "packing" ? "Packing" :
                      invoice.dispatch?.status === "assigned" ? "Assigned" :
                      "Not assigned"}
                  </Badge>
                </div>
                <div className="text-sm">{invoice.dispatch?.packingCompleted ? "Yes" : "No"}</div>
                <div className="text-sm">{invoice.dispatch?.dispatchedAt ? new Date(invoice.dispatch.dispatchedAt).toLocaleString() : "—"}</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">
                    {invoice.dispatch?.delivery?.arrivalTime
                      ? new Date(invoice.dispatch.delivery.arrivalTime).toLocaleString()
                      : "—"}
                  </span>
                  <Button size="sm" asChild style={{ backgroundColor: primaryColor }}>
                    <Link href={`/admin/stock/dispatch/${invoice._id}`}>Open</Link>
                  </Button>
                </div>
              </div>
            )
          })}

          {filteredInvoices.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">No dispatch logs for selected filters</div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Courier Leaderboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {courierPerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No courier data available</p>
          ) : (
            courierPerformance.map((c) => (
              <div key={c.courier} className="grid grid-cols-1 gap-2 rounded-xl border bg-white/90 p-3 text-sm shadow-sm md:grid-cols-5">
                <span className="font-medium">{c.courier}</span>
                <span>Delivered: {c.delivered}</span>
                <span>Failed: {c.failed}</span>
                <span>Success: {c.successRate}%</span>
                <span>Avg Time: {c.avgMinutes}m</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
