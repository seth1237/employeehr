"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import {
  Activity,
  CalendarClock,
  ChevronDown,
  Download,
  FileText,
  History,
  Phone,
  RefreshCw,
  UserPlus,
  Wrench,
  Quote,
  ArrowRightLeft,
  PhoneCall,
  Package,
} from "lucide-react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import { getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { crmApi } from "@/lib/api"
import type { TenantBranding } from "@/lib/stock-document-pdf"

type PeriodPreset = "day" | "week" | "month" | "quarter" | "custom"

interface TelesalesActivityData {
  period: { from: string; to: string }
  filter?: { userId?: string | null; userName?: string | null }
  telesalesPeople?: Array<{ _id: string; name: string; activityCount: number }>
  performance: {
    quotesGenerated: number
    invoicesConverted: number
    newClientsOnboarded: number
    quotationFollowUps: number
    callsLogged?: number
    machineFollowUps?: number
    machinesScheduled?: number
    machineServicesCompleted?: number
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
      conversationId?: string
      leadId?: string
      customerId?: string
      leadStatus?: string
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
    machineFollowUps?: Array<{
      _id: string
      clientName: string
      machineName: string
      serialNumber?: string
      note: string
      outcome: string
      followUpNeeded?: boolean
      followUpDate?: string
      status: string
      createdByName: string
      createdAt?: string
    }>
    machineServicesCompleted?: Array<{
      _id: string
      title: string
      clientName: string
      productName?: string
      serialNumber?: string
      technician?: string
      completedDate?: string
      notes?: string
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
      installedBy?: string
      attendant?: string
      attendantRole?: string
    }>
    machineServicesDue?: Array<{
      _id: string
      title: string
      clientName: string
      serialNumber?: string
      location?: string
      status: string
      nextServiceDate?: string
      overdue?: boolean
    }>
    followUps: Array<{
      _id: string
      conversationId?: string
      leadId?: string
      customerId?: string
      leadStatus?: string
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
    machineFollowUps?: Array<{
      _id: string
      title: string
      clientName: string
      serialNumber?: string
      note?: string
      followUpDate?: string
      status: string
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

type LeadTemperatureStatus = "Warm Lead" | "Cold Lead" | "Dropped"

const LEAD_STATUS_OPTIONS: LeadTemperatureStatus[] = [
  "Warm Lead",
  "Cold Lead",
  "Dropped",
]

type LeadActionTarget = {
  conversationId: string
  leadId?: string
  clientName: string
  clientPhone?: string
  callPurpose?: string
  leadStatus?: string
  note?: string
}

type HistoryTimelineItem = {
  type: "conversation" | "status"
  _id: string
  at?: string
  clientName?: string
  callPurpose?: string
  note?: string
  outcome?: string
  status?: string
  followUpDate?: string
  createdByName?: string
  from?: string
  to?: string
}

function leadStatusBadgeClass(status?: string) {
  const s = String(status || "Warm Lead")
  if (s === "Cold Lead") return "bg-sky-50 text-sky-800 border-sky-200"
  if (s === "Dropped") return "bg-slate-100 text-slate-700 border-slate-300"
  return "bg-amber-50 text-amber-800 border-amber-200"
}

function tomorrowDateInput() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

type ReportSectionKey =
  | "summary"
  | "callLogs"
  | "machineFollowUps"
  | "plannerServices"
  | "plannerInstallations"
  | "plannerServicesDue"
  | "plannerMachineFollowUps"
  | "plannerClientFollowUps"
  | "servicesCompleted"
  | "quotations"
  | "conversions"
  | "newClients"

const REPORT_SECTION_OPTIONS: Array<{ key: ReportSectionKey; label: string }> = [
  { key: "summary", label: "Performance summary" },
  { key: "callLogs", label: "Call log activity" },
  { key: "machineFollowUps", label: "Machine follow-up responses" },
  { key: "plannerServices", label: "Planner — scheduled services" },
  { key: "plannerInstallations", label: "Planner — scheduled installations" },
  { key: "plannerServicesDue", label: "Planner — machine services due" },
  { key: "plannerMachineFollowUps", label: "Planner — machine follow-ups" },
  { key: "plannerClientFollowUps", label: "Planner — client follow-ups" },
  { key: "servicesCompleted", label: "Services completed" },
  { key: "quotations", label: "Quotations generated" },
  { key: "conversions", label: "Invoices converted" },
  { key: "newClients", label: "New clients onboarded" },
]

const DEFAULT_REPORT_SECTIONS = Object.fromEntries(
  REPORT_SECTION_OPTIONS.map((option) => [option.key, true]),
) as Record<ReportSectionKey, boolean>

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
  const [exportPersonId, setExportPersonId] = useState<string>("all")
  const [viewPersonId, setViewPersonId] = useState<string>("all")
  const [reportSections, setReportSections] = useState<Record<ReportSectionKey, boolean>>(
    () => ({ ...DEFAULT_REPORT_SECTIONS }),
  )
  const [pdfSectionsOpen, setPdfSectionsOpen] = useState(true)
  const [followUpTarget, setFollowUpTarget] = useState<LeadActionTarget | null>(null)
  const [historyTarget, setHistoryTarget] = useState<LeadActionTarget | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyTimeline, setHistoryTimeline] = useState<HistoryTimelineItem[]>([])
  const [historyLeadStatus, setHistoryLeadStatus] = useState<string>("")
  const [statusSavingId, setStatusSavingId] = useState<string>("")
  const [savingFollowUp, setSavingFollowUp] = useState(false)
  const [followUpForm, setFollowUpForm] = useState({
    note: "",
    outcome: "Follow-up Needed",
    followUpNeeded: true,
    followUpDate: tomorrowDateInput(),
  })

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

  const load = useCallback(async (from: string, to: string, userId: string = "all") => {
    setLoading(true)
    try {
      const token = getToken()
      const personId = userId && userId !== "all" ? userId : undefined
      const [activityRes, brandingRes] = await Promise.all([
        crmApi.getTelesalesActivity({ from, to, userId: personId }),
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
    void load(range.from, range.to, viewPersonId)
  }, [load])

  const applyPreset = (next: PeriodPreset) => {
    setPreset(next)
    if (next === "custom") return
    const range = presetRange(next)
    setFromInput(range.from.slice(0, 10))
    setToInput(range.to.slice(0, 10))
    void load(range.from, range.to, viewPersonId)
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
    void load(
      startOfDayIso(new Date(fromInput)),
      endOfDayIso(new Date(toInput)),
      viewPersonId,
    )
  }

  const applyPersonFilter = (personId: string) => {
    setViewPersonId(personId)
    setExportPersonId(personId)
    const from = data?.period.from || presetRange(preset).from
    const to = data?.period.to || presetRange(preset).to
    void load(from, to, personId)
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

  const selectedReportSectionCount = useMemo(
    () => REPORT_SECTION_OPTIONS.filter((option) => reportSections[option.key]).length,
    [reportSections],
  )

  const toggleReportSection = (key: ReportSectionKey, checked: boolean) => {
    setReportSections((prev) => ({ ...prev, [key]: checked }))
  }

  const selectAllReportSections = () => {
    setReportSections({ ...DEFAULT_REPORT_SECTIONS })
  }

  const clearReportSections = () => {
    setReportSections(
      Object.fromEntries(
        REPORT_SECTION_OPTIONS.map((option) => [option.key, false]),
      ) as Record<ReportSectionKey, boolean>,
    )
  }

  const refresh = () => {
    const from = data?.period.from || presetRange(preset).from
    const to = data?.period.to || presetRange(preset).to
    void load(from, to, viewPersonId)
  }

  const toLeadTarget = (item: {
    _id: string
    conversationId?: string
    leadId?: string
    clientName: string
    clientPhone?: string
    callPurpose?: string
    leadStatus?: string
    note?: string
    title?: string
  }): LeadActionTarget => ({
    conversationId: item.conversationId || item._id,
    leadId: item.leadId || "",
    clientName: item.clientName,
    clientPhone: item.clientPhone || "",
    callPurpose: item.callPurpose || item.title || "",
    leadStatus: item.leadStatus || "Warm Lead",
    note: item.note || "",
  })

  const openFollowUp = (item: LeadActionTarget) => {
    setFollowUpTarget(item)
    setFollowUpForm({
      note: "",
      outcome: "Follow-up Needed",
      followUpNeeded: true,
      followUpDate: tomorrowDateInput(),
    })
  }

  const openHistory = async (item: LeadActionTarget) => {
    setHistoryTarget(item)
    setHistoryTimeline([])
    setHistoryLeadStatus(item.leadStatus || "Warm Lead")
    setHistoryLoading(true)
    try {
      const res = await crmApi.getClientTelesalesHistory({
        conversationId: item.conversationId,
        leadId: item.leadId,
        clientName: item.clientName !== "—" ? item.clientName : undefined,
        clientPhone: item.clientPhone,
      })
      if (!res.success) {
        throw new Error(res.message || "Failed to load history")
      }
      setHistoryTimeline(res.data?.timeline || [])
      setHistoryLeadStatus(res.data?.lead?.leadStatus || item.leadStatus || "Warm Lead")
    } catch (error: any) {
      toast({
        title: "History unavailable",
        description: error?.message || "Failed to load client history",
        variant: "destructive",
      })
    } finally {
      setHistoryLoading(false)
    }
  }

  const changeLeadStatus = async (item: LeadActionTarget, to: LeadTemperatureStatus) => {
    if (!to || to === item.leadStatus) return
    const key = item.conversationId || item.clientName
    setStatusSavingId(key)
    try {
      const res = await crmApi.setTelesalesLeadStatus({
        to,
        conversationId: item.conversationId,
        leadId: item.leadId,
        clientName: item.clientName !== "—" ? item.clientName : undefined,
        clientPhone: item.clientPhone,
        callPurpose: item.callPurpose,
        reason: `Changed to ${to} from telesales activity`,
      })
      if (!res.success) {
        throw new Error(res.message || "Failed to update status")
      }
      toast({
        title: "Lead status updated",
        description: `${item.clientName} is now ${to}`,
      })
      refresh()
    } catch (error: any) {
      toast({
        title: "Could not update status",
        description: error?.message || "Failed to change lead status",
        variant: "destructive",
      })
    } finally {
      setStatusSavingId("")
    }
  }

  const saveFollowUp = async () => {
    if (!followUpTarget || !followUpForm.note.trim()) return
    const followUpNeeded =
      followUpForm.followUpNeeded || followUpForm.outcome === "Follow-up Needed"
    if (followUpNeeded && !followUpForm.followUpDate) {
      toast({
        title: "Follow-up date required",
        description: "Choose the next follow-up date",
        variant: "destructive",
      })
      return
    }
    setSavingFollowUp(true)
    try {
      const res = await crmApi.createConversation({
        roomName: "Telesales",
        note: followUpForm.note.trim(),
        callPurpose: followUpTarget.callPurpose || "Quotation follow up",
        outcome: followUpForm.outcome,
        status: followUpForm.outcome,
        followUpNeeded,
        followUpDate: followUpNeeded ? followUpForm.followUpDate : undefined,
        clientName: followUpTarget.clientName,
        clientPhone: followUpTarget.clientPhone,
        lead_id: followUpTarget.leadId || undefined,
        parentConversationId: followUpTarget.conversationId,
        source: "telesales_activity",
      })
      if (!res.success) {
        throw new Error(res.message || "Failed to save follow-up")
      }
      setFollowUpTarget(null)
      toast({
        title: "Follow-up saved",
        description: followUpNeeded
          ? "Previous item closed and the next follow-up was added to the planner."
          : "Previous follow-up closed and the call was logged.",
      })
      refresh()
    } catch (error: any) {
      toast({
        title: "Could not save follow-up",
        description: error?.message || "Failed to log follow-up",
        variant: "destructive",
      })
    } finally {
      setSavingFollowUp(false)
    }
  }

  const renderLeadActions = (item: LeadActionTarget) => {
    const saving = statusSavingId === (item.conversationId || item.clientName)
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => openFollowUp(item)}
        >
          <Phone className="mr-1 h-3 w-3" />
          Follow up
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => void openHistory(item)}
        >
          <History className="mr-1 h-3 w-3" />
          History
        </Button>
        <select
          className="h-7 rounded-md border bg-background px-1.5 text-xs"
          value={item.leadStatus || "Warm Lead"}
          disabled={saving}
          onChange={(event) =>
            void changeLeadStatus(item, event.target.value as LeadTemperatureStatus)
          }
        >
          {LEAD_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
    )
  }

  const exportPdf = async () => {
    try {
      if (selectedReportSectionCount === 0) {
        throw new Error("Select at least one section to include in the report")
      }
      setExporting(true)
      const range = resolveExportRange()
      const personId =
        exportPersonId && exportPersonId !== "all" ? exportPersonId : undefined
      const personLabel =
        !personId
          ? "All telesales"
          : data?.telesalesPeople?.find((p) => p._id === personId)?.name ||
            data?.filter?.userName ||
            "Selected person"

      const res = await crmApi.getTelesalesActivity({
        from: range.from,
        to: range.to,
        userId: personId,
      })
      if (!res.success) {
        throw new Error(res.message || "Failed to load report data")
      }
      const reportData = res.data as TelesalesActivityData

      const { generateTelesalesActivityPdf } = await import(
        "@/lib/stock-document-pdf"
      )
      generateTelesalesActivityPdf({
        performance: {
          ...reportData.performance,
          callsLogged: reportData.performance.callsLogged ?? 0,
          machineFollowUps: reportData.performance.machineFollowUps ?? 0,
          machinesScheduled: reportData.performance.machinesScheduled ?? 0,
          machineServicesCompleted:
            reportData.performance.machineServicesCompleted ?? 0,
        },
        activity: reportData.activity,
        planner: reportData.planner,
        branding,
        periodStr: range.label,
        reportTitle: range.title,
        personLabel,
        sections: reportSections,
      })
      toast({
        title: "Report exported",
        description: `${range.title} · ${personLabel} · ${range.label}`,
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
      label: "Machine follow-ups",
      value: perf?.machineFollowUps ?? activity?.machineFollowUps?.length ?? 0,
      hint: "Installed machine call responses",
      icon: Package,
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
      label: "Machines scheduled",
      value: perf?.machinesScheduled ?? 0,
      hint: "Installations & services in range",
      icon: CalendarClock,
    },
  ]

  const telesalesPeople = data?.telesalesPeople || []

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
              Performance, machine follow-ups, scheduled installations/services, and planner.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Telesales person
              </Label>
              <select
                value={viewPersonId}
                onChange={(e) => applyPersonFilter(e.target.value)}
                className="h-9 min-w-[180px] rounded-md border bg-background px-3 text-sm"
              >
                <option value="all">All telesales</option>
                {telesalesPeople.map((person) => (
                  <option key={person._id} value={person._id}>
                    {person.name}
                    {person.activityCount ? ` (${person.activityCount})` : ""}
                  </option>
                ))}
              </select>
            </div>
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
              disabled={!data || exporting || selectedReportSectionCount === 0}
              onClick={() => void exportPdf()}
            >
              <Download className="h-4 w-4 mr-1.5" />
              {exporting ? "Exporting…" : "Export PDF"}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/clients/clients-list">
                <PhoneCall className="h-4 w-4 mr-1.5" />
                Open Telesales
              </Link>
            </Button>
          </div>
        </div>

        <Collapsible open={pdfSectionsOpen} onOpenChange={setPdfSectionsOpen}>
          <div
            className="mt-3 rounded-xl border-2 bg-white p-4 space-y-3 shadow-sm"
            style={{ borderColor: primaryColor }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: primaryColor }}>
                      Include in PDF report
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tick what should appear in the export · {selectedReportSectionCount} selected
                    </p>
                  </div>
                  <ChevronDown
                    className={`mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${
                      pdfSectionsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={selectAllReportSections}>
                  Select all
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={clearReportSections}>
                  Clear
                </Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {REPORT_SECTION_OPTIONS.map((option) => (
                  <label
                    key={option.key}
                    className="flex cursor-pointer items-start gap-2 rounded-md border bg-background px-2.5 py-2 text-sm hover:bg-muted/40"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-teal-700"
                      checked={reportSections[option.key]}
                      onChange={(e) => toggleReportSection(option.key, e.target.checked)}
                    />
                    <span className="leading-snug">{option.label}</span>
                  </label>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

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

      <Tabs defaultValue="reports" className="space-y-4">
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
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wrench className="h-4 w-4" style={{ color: primaryColor }} />
                  Scheduled services
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
                  Scheduled installations
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
                      meta={[
                        item.installedBy ? `Engineer: ${item.installedBy}` : "",
                        item.location || item.serialNumber || "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    />
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b bg-muted/30 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" style={{ color: primaryColor }} />
                  Machine follow-ups
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[420px] overflow-y-auto p-4">
                {(planner?.machineFollowUps || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No machine follow-ups.</p>
                ) : (
                  planner?.machineFollowUps.map((item) => (
                    <PlannerRow
                      key={item._id}
                      title={item.title}
                      subtitle={item.clientName}
                      date={formatDate(item.followUpDate) || "Date TBD"}
                      status={item.status}
                      overdue={item.overdue}
                      meta={[
                        item.serialNumber || "",
                        item.outcome || "",
                        item.assignedToName || "",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
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
                      leadStatus={item.leadStatus || "Warm Lead"}
                      onTitleClick={() => void openHistory(toLeadTarget(item))}
                      actions={renderLeadActions(toLeadTarget(item))}
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
                Download a branded PDF with performance, machine follow-up
                responses, scheduled installations/services, call logs, quotes,
                and conversions. Choose one telesales person or all.
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

              <div className="space-y-1 max-w-sm">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Telesales person
                </Label>
                <select
                  value={exportPersonId}
                  onChange={(e) => setExportPersonId(e.target.value)}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="all">All telesales</option>
                  {telesalesPeople.map((person) => (
                    <option key={person._id} value={person._id}>
                      {person.name}
                    </option>
                  ))}
                </select>
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

              <p className="text-xs text-muted-foreground">
                Section checklist is at the top of this page under{" "}
                <span className="font-medium text-foreground">Include in PDF report</span>.
              </p>

              <Button
                style={{ backgroundColor: primaryColor }}
                className="text-white hover:opacity-90"
                disabled={exporting || selectedReportSectionCount === 0}
                onClick={() => void exportPdf()}
              >
                <Download className="h-4 w-4 mr-1.5" />
                {exporting
                  ? "Generating PDF…"
                  : exportPersonId === "all"
                    ? "Download all telesales PDF"
                    : "Download person PDF"}
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <ActivityTable
              title="Call log activity"
              empty="No calls logged in this period"
              headers={["Client", "Purpose", "Status", "Notes discussed", "Actions"]}
              rows={(activity?.callLogs || []).map((c) => [
                <button
                  key={`${c._id}-client`}
                  type="button"
                  className="font-medium whitespace-nowrap text-left hover:underline"
                  onClick={() => void openHistory(toLeadTarget(c))}
                >
                  {c.clientName || "—"}
                </button>,
                <span key={`${c._id}-purpose`} className="whitespace-nowrap">
                  {c.callPurpose || "—"}
                </span>,
                <Badge
                  key={`${c._id}-lead`}
                  variant="outline"
                  className={leadStatusBadgeClass(c.leadStatus)}
                >
                  {c.leadStatus || (c.hasLead ? "Warm Lead" : "No lead")}
                </Badge>,
                <span
                  key={`${c._id}-note`}
                  className="block max-w-[280px] whitespace-normal text-[10px] leading-tight text-muted-foreground"
                  title={c.note || undefined}
                >
                  {c.note?.trim() ? c.note.trim() : "—"}
                </span>,
                <div key={`${c._id}-actions`} className="min-w-[220px]">
                  {renderLeadActions(toLeadTarget(c))}
                </div>,
              ])}
            />
            <ActivityTable
              title="Machine follow-up responses"
              empty="No machine follow-ups in this period"
              headers={["Date", "Client", "Machine", "Outcome", "Follow-up", "By"]}
              rows={(activity?.machineFollowUps || []).map((f) => [
                formatDate(f.createdAt),
                f.clientName,
                `${f.machineName}${f.serialNumber ? ` (${f.serialNumber})` : ""}`,
                <Badge key={f._id} variant="outline" className={statusBadgeClass(f.outcome)}>
                  {f.outcome}
                </Badge>,
                formatDate(f.followUpDate),
                f.createdByName,
              ])}
            />
            <ActivityTable
              title="Planner — machine follow-ups"
              empty="No machine follow-ups in planner"
              headers={["Date", "Client", "Machine", "Status", "Assigned"]}
              rows={(planner?.machineFollowUps || []).map((f) => [
                formatDate(f.followUpDate) || "TBD",
                f.clientName,
                `${f.title}${f.serialNumber ? ` (${f.serialNumber})` : ""}`,
                <Badge
                  key={f._id}
                  variant="outline"
                  className={statusBadgeClass(f.overdue ? "overdue" : f.status)}
                >
                  {f.overdue ? "Overdue" : f.status}
                </Badge>,
                f.assignedToName,
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
                  {f.overdue ? "Overdue" : f.status}
                </Badge>,
                f.assignedToName,
              ])}
            />
            <ActivityTable
              title="Planner — scheduled services"
              empty="No scheduled services"
              headers={["Date", "Service", "Client", "Machine", "Status"]}
              rows={(planner?.services || []).map((s) => [
                formatDate(s.scheduledDate),
                s.title,
                s.clientName,
                s.productName || "—",
                <Badge
                  key={s._id}
                  variant="outline"
                  className={statusBadgeClass(s.overdue ? "overdue" : s.status)}
                >
                  {s.overdue ? "Overdue" : s.status}
                </Badge>,
              ])}
            />
            <ActivityTable
              title="Planner — scheduled installations"
              empty="No installations in range"
              headers={["Date", "Product", "Client", "Engineer", "Status"]}
              rows={(planner?.installations || []).map((s) => [
                formatDate(s.installationDate || s.nextServiceDate),
                s.title,
                s.clientName,
                s.installedBy || "—",
                <Badge key={s._id} variant="outline" className={statusBadgeClass(s.status)}>
                  {s.status}
                </Badge>,
              ])}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(followUpTarget)} onOpenChange={(open) => !open && setFollowUpTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Follow up — {followUpTarget?.clientName || "Client"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Outcome</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={followUpForm.outcome}
                onChange={(event) => {
                  const outcome = event.target.value
                  setFollowUpForm((current) => ({
                    ...current,
                    outcome,
                    followUpNeeded:
                      outcome === "Follow-up Needed" ? true : current.followUpNeeded,
                  }))
                }}
              >
                <option value="Interested">Interested</option>
                <option value="Follow-up Needed">Follow-up Needed</option>
                <option value="Not Interested">Not Interested</option>
                <option value="No Answer">No Answer</option>
                <option value="Quote Requested">Quote Requested</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-teal-700"
                checked={
                  followUpForm.followUpNeeded ||
                  followUpForm.outcome === "Follow-up Needed"
                }
                onChange={(event) =>
                  setFollowUpForm((current) => ({
                    ...current,
                    followUpNeeded: event.target.checked,
                  }))
                }
              />
              Schedule another follow-up
            </label>
            {(followUpForm.followUpNeeded ||
              followUpForm.outcome === "Follow-up Needed") && (
              <div className="space-y-1">
                <Label>Next follow-up date</Label>
                <Input
                  type="date"
                  value={followUpForm.followUpDate}
                  onChange={(event) =>
                    setFollowUpForm((current) => ({
                      ...current,
                      followUpDate: event.target.value,
                    }))
                  }
                />
              </div>
            )}
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={followUpForm.note}
                onChange={(event) =>
                  setFollowUpForm((current) => ({
                    ...current,
                    note: event.target.value,
                  }))
                }
                placeholder="What was discussed?"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void saveFollowUp()}
              disabled={savingFollowUp || !followUpForm.note.trim()}
            >
              {savingFollowUp ? "Saving…" : "Save follow-up"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(historyTarget)} onOpenChange={(open) => !open && setHistoryTarget(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              History — {historyTarget?.clientName || "Client"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {historyLeadStatus ? (
              <Badge variant="outline" className={leadStatusBadgeClass(historyLeadStatus)}>
                {historyLeadStatus}
              </Badge>
            ) : null}
            {historyTarget?.clientPhone ? (
              <span className="text-muted-foreground">{historyTarget.clientPhone}</span>
            ) : null}
          </div>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {historyLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Loading history…
              </p>
            ) : historyTimeline.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No logged interactions yet.
              </p>
            ) : (
              historyTimeline.map((item) => (
                <div key={item._id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">
                      {item.type === "status"
                        ? `Status: ${item.from} → ${item.to}`
                        : item.callPurpose || "Telesales"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.at ? new Date(item.at).toLocaleString() : ""}
                    </span>
                  </div>
                  {item.note ? <p className="mt-2">{item.note}</p> : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.type === "status" && item.to ? (
                      <Badge variant="outline" className={leadStatusBadgeClass(item.to)}>
                        {item.to}
                      </Badge>
                    ) : null}
                    {item.outcome || item.status ? (
                      <Badge variant="outline">{item.outcome || item.status}</Badge>
                    ) : null}
                    {item.followUpDate ? (
                      <Badge variant="secondary">
                        Follow-up: {new Date(item.followUpDate).toLocaleDateString()}
                      </Badge>
                    ) : null}
                    {item.createdByName ? (
                      <span className="text-xs text-muted-foreground">{item.createdByName}</span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
                      <td key={i} className="px-3 py-2 align-top">
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
  leadStatus,
  onTitleClick,
  actions,
}: {
  title: string
  subtitle: string
  date: string
  status: string
  overdue?: boolean
  meta?: string
  leadStatus?: string
  onTitleClick?: () => void
  actions?: ReactNode
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5 shadow-sm transition-colors hover:bg-muted/20">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {onTitleClick ? (
            <button
              type="button"
              className="text-sm font-semibold text-slate-900 leading-snug truncate hover:underline text-left"
              onClick={onTitleClick}
            >
              {title}
            </button>
          ) : (
            <p className="text-sm font-semibold text-slate-900 leading-snug truncate">{title}</p>
          )}
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          {leadStatus ? (
            <Badge variant="outline" className={leadStatusBadgeClass(leadStatus)}>
              {leadStatus}
            </Badge>
          ) : null}
          <Badge
            variant="outline"
            className={statusBadgeClass(overdue ? "overdue" : status)}
          >
            {overdue ? "overdue" : status}
          </Badge>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{date}</span>
        {meta ? <span className="truncate max-w-[50%]">{meta}</span> : null}
      </div>
      {actions ? <div className="pt-1">{actions}</div> : null}
    </div>
  )
}