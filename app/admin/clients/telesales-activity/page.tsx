"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  Activity,
  CalendarClock,
  Download,
  FileText,
  RefreshCw,
  UserPlus,
  Wrench,
  Quote,
  ArrowRightLeft,
  PhoneCall,
} from "lucide-react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { crmApi } from "@/lib/api"
import type { TenantBranding } from "@/lib/stock-document-pdf"

type PeriodPreset = "day" | "week" | "month" | "quarter" | "custom"

interface TelesalesActivityData {
  period: { from: string; to: string }
  performance: {
    quotesGenerated: number
    invoicesConverted: number
    newClientsOnboarded: number
    quotationFollowUps: number
    callsLogged?: number
    quoteValue: number
    convertedValue: number
    conversionRate: number
  }
  activity: {
    quotations: Array<{
      _id: string
      quotationNumber: string
      clientName: string
      clientPhone: string
      status: string
      subTotal: number
      createdByName: string
      createdAt?: string
    }>
    conversions: Array<{
      _id: string
      quotationNumber: string
      invoiceNumber: string
      clientName: string
      subTotal: number
      createdByName: string
      convertedAt?: string
    }>
    newClients: Array<{
      _id: string
      name: string
      phone: string
      location: string
      contactPerson: string
      createdByName: string
      createdAt?: string
    }>
    followUps: Array<{
      _id: string
      quotationId: string
      quotationNumber: string
      clientName: string
      note: string
      callMade: boolean
      outcome: string
      createdByName: string
      createdAt?: string
    }>
    callLogs?: Array<{
      _id: string
      clientName: string
      clientPhone: string
      callPurpose: string
      focusCategories: string[]
      outcome: string
      note: string
      followUpNeeded: boolean
      followUpDate?: string
      status: string
      hasLead: boolean
      createdByName: string
      createdAt?: string
    }>
  }
  planner: {
    services: Array<{
      _id: string
      type: string
      title: string
      clientName: string
      productName?: string
      scheduledDate?: string
      status: string
      notes?: string
      overdue?: boolean
    }>
    installations: Array<{
      _id: string
      title: string
      clientName: string
      serialNumber?: string
      location?: string
      status: string
      installationDate?: string
      nextServiceDate?: string
    }>
    followUps: Array<{
      _id: string
      title: string
      clientName: string
      clientPhone?: string
      note?: string
      followUpDate?: string
      status: string
      callPurpose?: string
      focusCategories?: string[]
      outcome?: string
      assignedToName: string
      overdue?: boolean
    }>
  }
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function startOfDayIso(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function endOfDayIso(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

function presetRange(preset: PeriodPreset): { from: string; to: string } {
  const now = new Date()
  const to = endOfDayIso(now)
  if (preset === "day") {
    return { from: startOfDayIso(now), to }
  }
  if (preset === "week") {
    const from = new Date(now)
    from.setDate(from.getDate() - 6)
    return { from: startOfDayIso(from), to }
  }
  if (preset === "quarter") {
    const month = now.getMonth()
    const qStart = new Date(now.getFullYear(), Math.floor(month / 3) * 3, 1)
    return { from: startOfDayIso(qStart), to }
  }
  // month default
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return { from: startOfDayIso(from), to }
}

function formatMoney(n: number) {
  return `KES ${Number(n || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`
}

function formatDate(value?: string) {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function statusBadgeClass(status?: string) {
  const s = String(status || "").toLowerCase()
  if (s.includes("converted") || s === "done" || s === "active")
    return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (s.includes("pending") || s.includes("draft") || s.includes("follow"))
    return "bg-amber-50 text-amber-800 border-amber-200"
  if (s.includes("overdue") || s.includes("cancel"))
    return "bg-red-50 text-red-700 border-red-200"
  return "bg-slate-50 text-slate-700 border-slate-200"
}

export default function TelesalesActivityPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [branding, setBranding] = useState<TenantBranding>({})
  const [data, setData] = useState<TelesalesActivityData | null>(null)
  const [preset, setPreset] = useState<PeriodPreset>("month")
  const [fromInput, setFromInput] = useState("")
  const [toInput, setToInput] = useState("")
  const [exportMode, setExportMode] = useState<"day" | "period" | "custom">("period")
  const [exportFrom, setExportFrom] = useState("")
  const [exportTo, setExportTo] = useState("")

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  const periodLabel = useMemo(() => {
    if (!data?.period) return ""
    const from = formatDate(data.period.from)
    const to = formatDate(data.period.to)
    return from === to ? from : `${from} – ${to}`
  }, [data?.period])

  const load = useCallback(async (from: string, to: string) => {
    setLoading(true)
    try {
      const token = getToken()
      const [activityRes, brandingRes] = await Promise.all([
        crmApi.getTelesalesActivity({ from, to }),
        fetch(`${API_URL}/api/company/branding`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ])

      if (!activityRes.success) {
        throw new Error(activityRes.message || "Failed to load activity")
      }
      setData(activityRes.data as TelesalesActivityData)

      if (brandingRes.ok) {
        const brandingJson = await brandingRes.json()
        setBranding(brandingJson.data || {})
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to load telesales activity",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    const range = presetRange("month")
    setFromInput(range.from.slice(0, 10))
    setToInput(range.to.slice(0, 10))
    setExportFrom(range.from.slice(0, 10))
    setExportTo(range.to.slice(0, 10))
    void load(range.from, range.to)
  }, [load])

  const applyPreset = (next: PeriodPreset) => {
    setPreset(next)
    if (next === "custom") return
    const range = presetRange(next)
    setFromInput(range.from.slice(0, 10))
    setToInput(range.to.slice(0, 10))
    void load(range.from, range.to)
  }

  const applyCustom = () => {
    if (!fromInput || !toInput) {
      toast({
        title: "Select dates",
        description: "Choose both from and to dates",
        variant: "destructive",
      })
      return
    }
    setPreset("custom")
    void load(startOfDayIso(new Date(fromInput)), endOfDayIso(new Date(toInput)))
  }

  const resolveExportRange = () => {
    if (exportMode === "day") {
      const today = presetRange("day")
      return {
        from: today.from,
        to: today.to,
        label: formatDate(today.from),
        title: "Daily Telesales Report",
      }
    }
    if (exportMode === "custom") {
      if (!exportFrom || !exportTo) {
        throw new Error("Choose export from and to dates")
      }
      const from = startOfDayIso(new Date(exportFrom))
      const to = endOfDayIso(new Date(exportTo))
      const fromLabel = formatDate(from)
      const toLabel = formatDate(to)
      return {
        from,
        to,
        label: fromLabel === toLabel ? fromLabel : `${fromLabel} – ${toLabel}`,
        title: "Telesales Activity Report",
      }
    }
    return {
      from: data?.period.from || presetRange(preset).from,
      to: data?.period.to || presetRange(preset).to,
      label: periodLabel || "Selected period",
      title: "Telesales Activity Report",
    }
  }

  const exportPdf = async () => {
    try {
      setExporting(true)
      const range = resolveExportRange()
      let reportData = data

      const needsReload =
        !reportData ||
        reportData.period.from !== range.from ||
        reportData.period.to !== range.to

      if (needsReload) {
        const res = await crmApi.getTelesalesActivity({
          from: range.from,
          to: range.to,
        })
        if (!res.success) {
          throw new Error(res.message || "Failed to load report data")
        }
        reportData = res.data as TelesalesActivityData
      }

      if (!reportData) throw new Error("No report data available")

      const { generateTelesalesActivityPdf } = await import(
        "@/lib/stock-document-pdf"
      )
      generateTelesalesActivityPdf({
        performance: {
          ...reportData.performance,
          callsLogged: reportData.performance.callsLogged ?? 0,
        },
        activity: reportData.activity,
        planner: reportData.planner,
        branding,
        periodStr: range.label,
        reportTitle: range.title,
      })
      toast({
        title: "Report exported",
        description: `${range.title} · ${range.label}`,
      })
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error?.message || "Could not generate PDF",
        variant: "destructive",
      })
    } finally {
      setExporting(false)
    }
  }

  if (loading && !data) {
    return <PageLoadingSkeleton title="Loading telesales activity" rows={8} />
  }

  const perf = data?.performance
  const activity = data?.activity
  const planner = data?.planner

  const kpis = [
    {
      label: "Calls logged",
      value: perf?.callsLogged ?? activity?.callLogs?.length ?? 0,
      hint: "Telesales call activities",
      icon: PhoneCall,
    },
    {
      label: "Quotes generated",
      value: perf?.quotesGenerated ?? 0,
      hint: formatMoney(perf?.quoteValue || 0),
      icon: Quote,
      highlight: true,
    },
    {
      label: "Invoices converted",
      value: perf?.invoicesConverted ?? 0,
      hint: `${perf?.conversionRate ?? 0}% · ${formatMoney(perf?.convertedValue || 0)}`,
      icon: ArrowRightLeft,
    },
    {
      label: "New clients",
      value: perf?.newClientsOnboarded ?? 0,
      hint: "CRM directory additions",
      icon: UserPlus,
    },
    {
      label: "Follow-ups",
      value: perf?.quotationFollowUps ?? 0,
      hint: "Logged call / note follow-ups",
      icon: Activity,
    },
  ]

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border px-4 py-3 shadow-sm"
        style={{
          borderColor: primaryBorderColor,
          background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})`,
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: primaryColor }}
            >
              Telesales
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Activity dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Performance, quotation activity, and planner for services and follow-ups.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void load(
                  data?.period.from || presetRange(preset).from,
                  data?.period.to || presetRange(preset).to,
                )
              }
            >
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              style={{ backgroundColor: primaryColor }}
              className="text-white hover:opacity-90"
              disabled={!data || exporting}
              onClick={() => void exportPdf()}
            >
              <Download className="h-4 w-4 mr-1.5" />
              {exporting ? "Exporting…" : "Export PDF"}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/clients/telesales">
                <PhoneCall className="h-4 w-4 mr-1.5" />
                Open Telesales
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((kpi) => {
            const Icon = kpi.icon
            return (
              <Card key={kpi.label} className="shadow-sm">
                <CardContent className="p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {kpi.label}
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div
                      className="text-xl font-semibold tabular-nums"
                      style={kpi.highlight ? { color: secondaryColor } : undefined}
                    >
                      {kpi.value}
                    </div>
                    <div
                      className="rounded-lg p-1.5"
                      style={{ backgroundColor: primarySoftColor, color: primaryColor }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground truncate" title={kpi.hint}>
                    {kpi.hint}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-3 rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_160px_auto] lg:items-end">
            <div className="space-y-2">
              <Label>Quick presets</Label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["day", "Today"],
                    ["week", "This week"],
                    ["month", "This month"],
                    ["quarter", "This quarter"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={preset === key ? "default" : "outline"}
                    style={
                      preset === key
                        ? { backgroundColor: primaryColor, color: "#fff" }
                        : undefined
                    }
                    onClick={() => applyPreset(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Input
                type="date"
                value={fromInput}
                onChange={(e) => {
                  setPreset("custom")
                  setFromInput(e.target.value)
                }}
                className="h-9 w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input
                type="date"
                value={toInput}
                onChange={(e) => {
                  setPreset("custom")
                  setToInput(e.target.value)
                }}
                className="h-9 w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={applyCustom}>
                Apply period
              </Button>
            </div>
          </div>
          {periodLabel ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing activity for: <span className="font-medium text-foreground">{periodLabel}</span>
            </p>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance & activity</TabsTrigger>
          <TabsTrigger value="planner">Planner</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <ActivityTable
              title="Quotes generated"
              empty="No quotations in this period"
              headers={["Date", "Quote", "Client", "Status", "Amount", "By"]}
              rows={(activity?.quotations || []).map((q) => [
                formatDate(q.createdAt),
                q.quotationNumber,
                q.clientName,
                <Badge key={q._id} variant="outline" className={statusBadgeClass(q.status)}>
                  {q.status}
                </Badge>,
                formatMoney(q.subTotal),
                q.createdByName,
              ])}
            />
            <ActivityTable
              title="Invoices converted"
              empty="No conversions in this period"
              headers={["Date", "Quote", "Invoice", "Client", "Amount", "By"]}
              rows={(activity?.conversions || []).map((c) => [
                formatDate(c.convertedAt),
                c.quotationNumber,
                c.invoiceNumber,
                c.clientName,
                formatMoney(c.subTotal),
                c.createdByName,
              ])}
            />
            <ActivityTable
              title="New clients onboarded"
              empty="No new clients in this period"
              headers={["Date", "Client", "Phone", "Location", "By"]}
              rows={(activity?.newClients || []).map((c) => [
                formatDate(c.createdAt),
                c.name,
                c.phone || "—",
                c.location || "—",
                c.createdByName,
              ])}
            />
            <ActivityTable
              title="Quotation follow-ups"
              empty="No follow-ups logged in this period"
              headers={["Date", "Quote", "Client", "Note", "By"]}
              rows={(activity?.followUps || []).map((f) => [
                formatDate(f.createdAt),
                f.quotationNumber,
                f.clientName,
                f.note,
                f.createdByName,
              ])}
            />
          </div>
        </TabsContent>

        <TabsContent value="planner" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4" style={{ color: primaryColor }} />
                  Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[420px] overflow-y-auto p-4">
                {(planner?.services || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No scheduled services.</p>
                ) : (
                  planner?.services.map((item) => (
                    <PlannerRow
                      key={`${item.type}-${item._id}`}
                      title={item.title}
                      subtitle={item.clientName}
                      date={formatDate(item.scheduledDate)}
                      status={item.status}
                      overdue={item.overdue}
                      meta={item.productName}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" style={{ color: primaryColor }} />
                  Installations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[420px] overflow-y-auto p-4">
                {(planner?.installations || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No installations in range.</p>
                ) : (
                  planner?.installations.map((item) => (
                    <PlannerRow
                      key={item._id}
                      title={item.title}
                      subtitle={item.clientName}
                      date={formatDate(item.installationDate || item.nextServiceDate)}
                      status={item.status}
                      meta={item.location || item.serialNumber}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <PhoneCall className="h-4 w-4" style={{ color: primaryColor }} />
                  Client follow-ups
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[420px] overflow-y-auto p-4">
                {(planner?.followUps || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No follow-ups scheduled.</p>
                ) : (
                  planner?.followUps.map((item) => (
                    <PlannerRow
                      key={item._id}
                      title={item.clientName}
                      subtitle={[
                        item.callPurpose || item.title,
                        ...(item.focusCategories || []),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      date={formatDate(item.followUpDate) || "Date TBD"}
                      status={item.status}
                      overdue={item.overdue}
                      meta={item.assignedToName}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="border-b bg-muted/30 pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" style={{ color: primaryColor }} />
                Export branded PDF report
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              <p className="text-sm text-muted-foreground max-w-2xl">
                Download a statement-style report with performance summary, call
                logs, planner activities, quotes, and conversions — using your
                company logo and colours.
              </p>

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["day", "Download today"],
                    ["period", "Download current view"],
                    ["custom", "Choose period"],
                  ] as const
                ).map(([mode, label]) => (
                  <Button
                    key={mode}
                    size="sm"
                    variant={exportMode === mode ? "default" : "outline"}
                    style={
                      exportMode === mode
                        ? { backgroundColor: primaryColor, color: "#fff" }
                        : undefined
                    }
                    onClick={() => setExportMode(mode)}
                  >
                    {label}
                  </Button>
                ))}
              </div>

              {exportMode === "custom" ? (
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      From
                    </Label>
                    <Input
                      type="date"
                      value={exportFrom}
                      onChange={(e) => setExportFrom(e.target.value)}
                      className="h-9 w-[150px]"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      To
                    </Label>
                    <Input
                      type="date"
                      value={exportTo}
                      onChange={(e) => setExportTo(e.target.value)}
                      className="h-9 w-[150px]"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {exportMode === "day"
                    ? `Will export activities for ${formatDate(new Date().toISOString())}.`
                    : `Will export the currently loaded period: ${periodLabel || "—"}.`}
                </p>
              )}

              <Button
                style={{ backgroundColor: primaryColor }}
                className="text-white hover:opacity-90"
                disabled={exporting}
                onClick={() => void exportPdf()}
              >
                <Download className="h-4 w-4 mr-1.5" />
                {exporting ? "Generating PDF…" : "Download PDF report"}
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <ActivityTable
              title="Call log activity"
              empty="No calls logged in this period"
              headers={["Date", "Client", "Purpose", "Focus", "Outcome", "By"]}
              rows={(activity?.callLogs || []).map((c) => [
                formatDate(c.createdAt),
                c.clientName,
                c.callPurpose,
                (c.focusCategories || []).join(", ") || "—",
                <span key={c._id} className="inline-flex items-center gap-1">
                  <Badge variant="outline" className={statusBadgeClass(c.outcome)}>
                    {c.outcome}
                  </Badge>
                  {c.hasLead ? (
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                      Lead
                    </Badge>
                  ) : null}
                </span>,
                c.createdByName,
              ])}
            />
            <ActivityTable
              title="Planner — client follow-ups"
              empty="No follow-ups in planner"
              headers={["Date", "Client", "Purpose", "Status", "Assigned"]}
              rows={(planner?.followUps || []).map((f) => [
                formatDate(f.followUpDate) || "TBD",
                f.clientName,
                f.callPurpose || f.title,
                <Badge
                  key={f._id}
                  variant="outline"
                  className={statusBadgeClass(f.overdue ? "overdue" : f.status)}
                >
                  {f.overdue ? "overdue" : f.status}
                </Badge>,
                f.assignedToName,
              ])}
            />
            <ActivityTable
              title="Planner — services"
              empty="No scheduled services"
              headers={["Date", "Service", "Client", "Status"]}
              rows={(planner?.services || []).map((s) => [
                formatDate(s.scheduledDate),
                s.title,
                s.clientName,
                <Badge
                  key={s._id}
                  variant="outline"
                  className={statusBadgeClass(s.overdue ? "overdue" : s.status)}
                >
                  {s.overdue ? "overdue" : s.status}
                </Badge>,
              ])}
            />
            <ActivityTable
              title="Planner — installations"
              empty="No installations in range"
              headers={["Date", "Product", "Client", "Status"]}
              rows={(planner?.installations || []).map((s) => [
                formatDate(s.installationDate || s.nextServiceDate),
                s.title,
                s.clientName,
                <Badge key={s._id} variant="outline" className={statusBadgeClass(s.status)}>
                  {s.status}
                </Badge>,
              ])}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ActivityTable({
  title,
  empty,
  headers,
  rows,
}: {
  title: string
  empty: string
  headers: string[]
  rows: Array<Array<ReactNode>>
}) {
  return (
    <Card className="overflow-hidden shadow-sm">
      <CardHeader className="border-b bg-muted/30 pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[320px] overflow-auto">
          <table className="min-w-[600px] w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-muted/80 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
              <tr className="border-b">
                {headers.map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 font-medium whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    {empty}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-muted/40 transition-colors">
                    {row.map((cell, i) => (
                      <td key={i} className="px-3 py-2 align-top whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function PlannerRow({
  title,
  subtitle,
  date,
  status,
  overdue,
  meta,
}: {
  title: string
  subtitle: string
  date: string
  status: string
  overdue?: boolean
  meta?: string
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5 shadow-sm transition-colors hover:bg-muted/20">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 leading-snug truncate">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        <Badge
          variant="outline"
          className={`flex-shrink-0 ${statusBadgeClass(overdue ? "overdue" : status)}`}
        >
          {overdue ? "overdue" : status}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{date}</span>
        {meta ? <span className="truncate max-w-[50%]">{meta}</span> : null}
      </div>
    </div>
  )
}