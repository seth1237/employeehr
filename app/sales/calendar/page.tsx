"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  Video,
  Palmtree,
  CheckCircle2,
  CircleDot,
} from "lucide-react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { api, meetingsApi, salesApi } from "@/lib/api"
import { dateLabel, monthKey, monthLabel } from "@/lib/sales-calendar"
import { useSalesBranding } from "@/hooks/use-sales-branding"
import { SalesClientPicker } from "@/components/sales/client-picker"
import {
  SalesEmpty,
  SalesHeader,
  SalesKpi,
  SalesPage,
  SalesStatusBadge,
} from "@/components/sales/sales-ui"
import { cn } from "@/lib/utils"

type CalEvent = {
  id: string
  date: string
  endDate?: string
  title: string
  subtitle?: string
  kind: "plan" | "visit" | "follow_up" | "meeting" | "leave"
  status?: string
  meta?: Record<string, any>
}

const REASONS = [
  "Company introduction",
  "Quotation Discussion",
  "Appointment",
  "Follow-up",
  "Product presentation",
  "Service",
  "Debt Collection",
  "New business",
  "Other",
]

function todayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function daysInMonth(month: string) {
  const [year, m] = month.split("-").map(Number)
  const first = new Date(year, m - 1, 1)
  const last = new Date(year, m, 0)
  const cells: Array<{ date: string; inMonth: boolean }> = []
  for (let i = 0; i < first.getDay(); i++) cells.push({ date: "", inMonth: false })
  for (let day = 1; day <= last.getDate(); day++) {
    cells.push({
      date: `${year}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      inMonth: true,
    })
  }
  return cells
}

function weekDatesAround(anchor: string) {
  const start = new Date(`${anchor}T00:00:00`)
  start.setDate(start.getDate() - start.getDay())
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
  })
}

function ymd(value?: string | Date | null) {
  if (!value) return ""
  const s = typeof value === "string" ? value : value.toISOString()
  return String(s).slice(0, 10)
}

function kindStyle(kind: CalEvent["kind"]) {
  switch (kind) {
    case "plan":
      return { bg: "bg-sky-100 text-sky-900", dot: "bg-sky-500", label: "Plan" }
    case "visit":
      return { bg: "bg-emerald-100 text-emerald-900", dot: "bg-emerald-500", label: "Visit" }
    case "follow_up":
      return { bg: "bg-amber-100 text-amber-900", dot: "bg-amber-500", label: "Follow-up" }
    case "meeting":
      return { bg: "bg-violet-100 text-violet-900", dot: "bg-violet-500", label: "Meeting" }
    case "leave":
      return { bg: "bg-rose-100 text-rose-900", dot: "bg-rose-500", label: "Leave" }
    default:
      return { bg: "bg-slate-100 text-slate-800", dot: "bg-slate-400", label: "Event" }
  }
}

function datesInRange(start: string, end: string) {
  const out: string[] = []
  const cur = new Date(`${start}T00:00:00`)
  const last = new Date(`${end}T00:00:00`)
  if (Number.isNaN(cur.getTime()) || Number.isNaN(last.getTime())) return out
  while (cur <= last) {
    out.push(
      `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}-${String(cur.getDate()).padStart(2, "0")}`,
    )
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export default function SalesCalendarPage() {
  const { toast } = useToast()
  const branding = useSalesBranding()
  const primary = branding.primaryColor || "#0f766e"

  const [fetching, setFetching] = useState(true)
  const [view, setView] = useState<"month" | "week" | "agenda">("month")
  const [month, setMonth] = useState(monthKey(todayKey()))
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [saving, setSaving] = useState(false)

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [clientName, setClientName] = useState("")
  const [clientId, setClientId] = useState("")
  const [reason, setReason] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [location, setLocation] = useState("")
  const [notes, setNotes] = useState("")
  const [expectedOutcome, setExpectedOutcome] = useState("")
  const [kindFilters, setKindFilters] = useState<Set<CalEvent["kind"]>>(
    () => new Set(["plan", "visit", "follow_up", "meeting", "leave"]),
  )
  const [dayPanelOpen, setDayPanelOpen] = useState(true)

  const load = useCallback(async () => {
    setFetching(true)
    try {
      const [plannerRes, historyRes, meetingsRes, leaveRes] = await Promise.all([
        api.sales.getPlanners().catch(() => ({ success: false, data: [] })),
        salesApi.getHistory().catch(() => ({ data: { visits: [] } })),
        meetingsApi.getAll().catch(() => ({ success: false, data: [] })),
        api.leave.getMyRequests().catch(() => ({ success: false, data: [] })),
      ])

      const next: CalEvent[] = []

      for (const plan of plannerRes.data || []) {
        const date = ymd(plan.date)
        if (!date) continue
        for (const visit of plan.visits || []) {
          next.push({
            id: `plan-${plan._id}-${visit.clientName}`,
            date,
            title: visit.clientName || "Planned visit",
            subtitle: visit.reason === "Other" ? visit.customReason : visit.reason,
            kind: "plan",
            status: plan.status,
            meta: { plan, visit, location: visit.location },
          })
        }
        if (!(plan.visits || []).length) {
          next.push({
            id: `plan-${plan._id}`,
            date,
            title: "Day plan",
            subtitle: plan.status,
            kind: "plan",
            status: plan.status,
            meta: { plan },
          })
        }
      }

      for (const visit of historyRes.data?.visits || []) {
        const date =
          ymd(visit.visitDate) || ymd(visit.checkInAt) || ymd(visit.createdAt)
        if (!date) continue
        next.push({
          id: `visit-${visit._id}`,
          date,
          title: visit.clientName || "Visit logged",
          subtitle: visit.outcome || visit.visitType || "Completed visit",
          kind: "visit",
          status: "completed",
          meta: { visit },
        })
        const follow = ymd(visit.followUpDate)
        if (follow) {
          next.push({
            id: `follow-${visit._id}`,
            date: follow,
            title: `Follow-up: ${visit.clientName || "Client"}`,
            subtitle: visit.nextAction || "Follow-up due",
            kind: "follow_up",
            status: "due",
            meta: { visit },
          })
        }
      }

      for (const meeting of meetingsRes.data || []) {
        const date = ymd(meeting.scheduled_at)
        if (!date) continue
        if (["cancelled"].includes(String(meeting.status || ""))) continue
        next.push({
          id: `meeting-${meeting._id}`,
          date,
          title: meeting.title || "Meeting",
          subtitle: meeting.meeting_type || meeting.status,
          kind: "meeting",
          status: meeting.status,
          meta: { meeting },
        })
      }

      for (const leave of leaveRes.data || []) {
        if (leave.status === "rejected") continue
        const start = ymd(leave.startDate)
        const end = ymd(leave.endDate) || start
        if (!start) continue
        for (const date of datesInRange(start, end)) {
          next.push({
            id: `leave-${leave._id}-${date}`,
            date,
            endDate: end,
            title: `${leave.type || "Leave"}`,
            subtitle: leave.status,
            kind: "leave",
            status: leave.status,
            meta: { leave },
          })
        }
      }

      setEvents(next)
    } catch (error: any) {
      toast({
        title: "Could not load calendar",
        description: error?.message || "Try again",
        variant: "destructive",
      })
    } finally {
      setFetching(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const event of events) {
      if (!kindFilters.has(event.kind)) continue
      const list = map.get(event.date) || []
      list.push(event)
      map.set(event.date, list)
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title))
    }
    return map
  }, [events, kindFilters])

  const toggleKind = (kind: CalEvent["kind"]) => {
    setKindFilters((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) {
        if (next.size > 1) next.delete(kind)
      } else {
        next.add(kind)
      }
      return next
    })
  }

  const selectDay = (date: string) => {
    setSelectedDate(date)
    setMonth(monthKey(date))
    setDayPanelOpen(true)
  }

  const monthCells = useMemo(() => daysInMonth(month), [month])
  const weekDays = useMemo(() => weekDatesAround(selectedDate), [selectedDate])

  const selectedEvents = eventsByDate.get(selectedDate) || []

  const monthStats = useMemo(() => {
    const inMonth = events.filter((e) => e.date.startsWith(month))
    return {
      plans: inMonth.filter((e) => e.kind === "plan").length,
      visits: inMonth.filter((e) => e.kind === "visit").length,
      followUps: inMonth.filter((e) => e.kind === "follow_up").length,
      meetings: inMonth.filter((e) => e.kind === "meeting").length,
    }
  }, [events, month])

  const agendaEvents = useMemo(() => {
    return [...events]
      .filter((e) => e.date >= todayKey())
      .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
      .slice(0, 40)
  }, [events])

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number)
    const next = new Date(y, m - 1 + delta, 1)
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
    setMonth(key)
    setSelectedDate(`${key}-01`)
  }

  const openSchedule = (date?: string) => {
    if (date) setSelectedDate(date)
    setClientName("")
    setClientId("")
    setReason("")
    setCustomReason("")
    setLocation("")
    setNotes("")
    setExpectedOutcome("")
    setScheduleOpen(true)
  }

  const submitSchedule = async () => {
    const date = selectedDate
    if (!date) return
    if (!clientName.trim() || !reason || (reason === "Other" && !customReason.trim())) {
      toast({
        title: "Client and reason required",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const existing = (await api.sales.getPlanners()).data?.find(
        (p: any) => p.date === date,
      )
      const visits = [
        ...(existing?.visits || []),
        {
          clientName: clientName.trim(),
          clientId: clientId || undefined,
          reason,
          customReason: reason === "Other" ? customReason.trim() : undefined,
          expectedOutcome: expectedOutcome.trim() || undefined,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
          interestCategories: [],
        },
      ]
      await api.sales.createPlanner({
        date,
        projectedExpenses: Number(existing?.projectedExpenses || 0),
        budget: existing?.budget || { transport: 0, nightOut: false },
        visits,
      })
      toast({
        title: "Visit scheduled",
        description: `${clientName} added to ${dateLabel(date)}. Submit or refine in Planner if needed.`,
      })
      setScheduleOpen(false)
      await load()
    } catch (error: any) {
      toast({
        title: "Could not schedule",
        description: error?.message || "Try again",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (fetching && events.length === 0) {
    return <PageLoadingSkeleton title="Loading calendar" rows={4} />
  }

  return (
    <SalesPage>
      <SalesHeader
        color={primary}
        eyebrow="Field sales"
        title="Calendar"
        description="Tap a day to review activity, or schedule a visit."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => void load()}
              disabled={fetching}
            >
              <RefreshCw className={cn("h-4 w-4 mr-1", fetching && "animate-spin")} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => openSchedule(selectedDate)} style={{ backgroundColor: primary }}>
              <Plus className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Schedule</span>
            </Button>
            <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
              <Link href={`/sales/planner`}>Open planner</Link>
            </Button>
          </div>
        }
      />

      {/* Desktop-only stats — hidden on phone */}
      <div className="hidden sm:grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SalesKpi label="Planned visits" value={monthStats.plans} icon={CircleDot} color={primary} />
        <SalesKpi label="Logged visits" value={monthStats.visits} icon={CheckCircle2} tone="success" />
        <SalesKpi label="Follow-ups" value={monthStats.followUps} icon={Clock} tone="alert" />
        <SalesKpi label="Meetings" value={monthStats.meetings} icon={Video} color={primary} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {(["month", "week", "agenda"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition sm:text-sm",
                  view === v
                    ? "text-white shadow"
                    : "text-slate-600 hover:bg-slate-50",
                )}
                style={view === v ? { backgroundColor: primary } : undefined}
              >
                {v}
              </button>
            ))}
          </div>
          {view !== "agenda" && (
            <div className="flex flex-1 items-center justify-end gap-1 sm:justify-start sm:flex-none">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <p className="min-w-[120px] text-center text-sm font-semibold text-slate-800">
                {monthLabel(`${month}-01`)}
              </p>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  const t = todayKey()
                  selectDay(t)
                }}
              >
                Today
              </Button>
            </div>
          )}
        </div>

        {/* Interactive legend / filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(["plan", "visit", "follow_up", "meeting", "leave"] as const).map((kind) => {
            const style = kindStyle(kind)
            const active = kindFilters.has(kind)
            return (
              <button
                key={kind}
                type="button"
                onClick={() => toggleKind(kind)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                  active
                    ? cn(style.bg, "border-transparent shadow-sm")
                    : "border-slate-200 bg-white text-slate-400 opacity-60",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", style.dot)} />
                {style.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {view === "month" && (
            <>
              <div className="grid grid-cols-7 border-b bg-slate-50/80 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:text-[11px]">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div key={`${d}-${i}`} className="px-0.5 py-2 sm:px-1">
                    <span className="sm:hidden">{d}</span>
                    <span className="hidden sm:inline">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthCells.map((cell, idx) => {
                  if (!cell.inMonth || !cell.date) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="min-h-[52px] border-b border-r bg-slate-50/50 sm:min-h-[96px]"
                      />
                    )
                  }
                  const dayEvents = eventsByDate.get(cell.date) || []
                  const isToday = cell.date === todayKey()
                  const isSelected = cell.date === selectedDate
                  const kindsPresent = [...new Set(dayEvents.map((e) => e.kind))]
                  return (
                    <button
                      key={cell.date}
                      type="button"
                      onClick={() => selectDay(cell.date)}
                      onDoubleClick={() => openSchedule(cell.date)}
                      className={cn(
                        "group relative flex min-h-[52px] flex-col items-center gap-0.5 border-b border-r p-1 text-left transition active:scale-[0.98] sm:min-h-[96px] sm:items-stretch sm:p-1.5",
                        isSelected
                          ? "bg-teal-50 z-[1] shadow-[inset_0_0_0_2px_rgba(13,148,136,0.45)]"
                          : "hover:bg-slate-50",
                        isToday && !isSelected && "bg-teal-50/40",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition sm:h-6 sm:w-6",
                          isToday && "text-white shadow",
                          !isToday && isSelected && "bg-teal-100 text-teal-900",
                          !isToday && !isSelected && "text-slate-700 group-hover:bg-slate-100",
                        )}
                        style={isToday ? { backgroundColor: primary } : undefined}
                      >
                        {Number(cell.date.slice(8))}
                      </span>

                      {/* Mobile: colored dots */}
                      <div className="flex max-w-full flex-wrap justify-center gap-0.5 px-0.5 sm:hidden">
                        {kindsPresent.slice(0, 4).map((kind) => (
                          <span
                            key={kind}
                            className={cn("h-1.5 w-1.5 rounded-full", kindStyle(kind).dot)}
                          />
                        ))}
                        {dayEvents.length > 4 ? (
                          <span className="text-[9px] leading-none text-slate-400">+</span>
                        ) : null}
                      </div>

                      {/* Desktop: event chips */}
                      <div className="mt-0.5 hidden space-y-0.5 overflow-hidden sm:block">
                        {dayEvents.slice(0, 3).map((event) => {
                          const style = kindStyle(event.kind)
                          return (
                            <div
                              key={event.id}
                              className={cn(
                                "truncate rounded-md px-1 py-0.5 text-[10px] font-medium transition group-hover:brightness-95",
                                style.bg,
                              )}
                              title={event.title}
                            >
                              {event.title}
                            </div>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <p className="text-[10px] font-medium text-slate-500">
                            +{dayEvents.length - 3} more
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {view === "week" && (
            <div className="flex gap-2 overflow-x-auto p-2 sm:grid sm:grid-cols-7 sm:gap-0 sm:overflow-visible sm:p-0">
              {weekDays.map((date) => {
                const dayEvents = eventsByDate.get(date) || []
                const isToday = date === todayKey()
                const isSelected = date === selectedDate
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => selectDay(date)}
                    className={cn(
                      "min-h-[160px] w-[42vw] shrink-0 rounded-xl border p-2.5 text-left transition active:scale-[0.99] sm:w-auto sm:rounded-none sm:border-0 sm:border-b sm:border-r sm:min-h-[200px]",
                      isSelected
                        ? "border-teal-500 bg-teal-50 shadow-sm"
                        : "border-slate-200 bg-white hover:bg-slate-50",
                    )}
                  >
                    <p className="text-[11px] font-semibold uppercase text-slate-500">
                      {new Date(`${date}T00:00:00`).toLocaleDateString("en-KE", {
                        weekday: "short",
                      })}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold",
                        isToday && "text-white",
                        !isToday && "text-slate-900",
                      )}
                      style={isToday ? { backgroundColor: primary } : undefined}
                    >
                      {Number(date.slice(8))}
                    </p>
                    <div className="mt-2 space-y-1">
                      {dayEvents.map((event) => {
                        const style = kindStyle(event.kind)
                        return (
                          <div
                            key={event.id}
                            className={cn("rounded-lg px-1.5 py-1 text-[11px]", style.bg)}
                          >
                            <p className="font-medium truncate">{event.title}</p>
                            {event.subtitle ? (
                              <p className="truncate opacity-80">{event.subtitle}</p>
                            ) : null}
                          </div>
                        )
                      })}
                      {!dayEvents.length && (
                        <p className="text-[11px] text-slate-400">Free</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {view === "agenda" && (
            <div className="divide-y">
              {agendaEvents.filter((e) => kindFilters.has(e.kind)).length === 0 ? (
                <div className="p-8">
                  <SalesEmpty
                    title="Nothing upcoming"
                    description="Schedule a visit or submit a day plan to fill your calendar."
                  />
                </div>
              ) : (
                agendaEvents
                  .filter((e) => kindFilters.has(e.kind))
                  .map((event) => {
                    const style = kindStyle(event.kind)
                    return (
                      <button
                        key={event.id}
                        type="button"
                        className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-slate-50 active:bg-slate-100"
                        onClick={() => {
                          selectDay(event.date)
                          setView("month")
                        }}
                      >
                        <div className="w-14 shrink-0 text-center sm:w-16">
                          <p className="text-[11px] font-semibold uppercase text-slate-500">
                            {new Date(`${event.date}T00:00:00`).toLocaleDateString("en-KE", {
                              month: "short",
                            })}
                          </p>
                          <p className="text-xl font-semibold text-slate-900">
                            {Number(event.date.slice(8))}
                          </p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                style.bg,
                              )}
                            >
                              {style.label}
                            </span>
                            {event.status ? <SalesStatusBadge status={event.status} /> : null}
                          </div>
                          <p className="mt-1 font-medium text-slate-900">{event.title}</p>
                          {event.subtitle ? (
                            <p className="text-sm text-slate-600">{event.subtitle}</p>
                          ) : null}
                        </div>
                      </button>
                    )
                  })
              )}
            </div>
          )}
        </div>

        {/* Day detail — always under calendar on phone, side panel on desktop */}
        {dayPanelOpen && (
          <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Selected day
                  </p>
                  <h2 className="text-base font-semibold text-slate-900 leading-snug">
                    {dateLabel(selectedDate)}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {selectedEvents.length} activit{selectedEvents.length === 1 ? "y" : "ies"}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 rounded-full"
                  onClick={() => openSchedule(selectedDate)}
                  style={{ backgroundColor: primary }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Plan
                </Button>
              </div>

              <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto sm:max-h-none">
                {selectedEvents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center">
                    <CalendarDays className="mx-auto h-7 w-7 text-slate-300" />
                    <p className="mt-2 text-sm font-medium text-slate-700">Free day</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Tap Plan to schedule a client visit.
                    </p>
                    <Button
                      size="sm"
                      className="mt-3 rounded-full"
                      onClick={() => openSchedule(selectedDate)}
                      style={{ backgroundColor: primary }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Schedule visit
                    </Button>
                  </div>
                ) : (
                  selectedEvents.map((event) => {
                    const style = kindStyle(event.kind)
                    return (
                      <div
                        key={event.id}
                        className="rounded-xl border border-slate-200 p-3 transition hover:border-slate-300 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
                          <span className="text-[11px] font-semibold uppercase text-slate-500">
                            {style.label}
                          </span>
                          {event.status ? <SalesStatusBadge status={event.status} /> : null}
                        </div>
                        <p className="mt-1.5 font-medium text-slate-900">{event.title}</p>
                        {event.subtitle ? (
                          <p className="text-sm text-slate-600">{event.subtitle}</p>
                        ) : null}
                        {event.meta?.location || event.meta?.visit?.location ? (
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3 w-3" />
                            {event.meta?.location || event.meta?.visit?.location}
                          </p>
                        ) : null}
                      </div>
                    )
                  })
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href={`/sales/report`}>Log visit</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href={`/sales/planner`}>Full plan</Link>
                </Button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile floating schedule */}
      <button
        type="button"
        onClick={() => openSchedule(selectedDate)}
        className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg lg:hidden"
        style={{ backgroundColor: primary }}
        aria-label="Schedule visit"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule visit — {dateLabel(selectedDate)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Client</Label>
              <SalesClientPicker
                value={clientName}
                clientId={clientId}
                required
                onChange={(next) => {
                  setClientName(next.name)
                  setClientId(next.clientId || "")
                  if (next.location && !location) setLocation(next.location)
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reason === "Other" && (
              <div className="space-y-1.5">
                <Label>Custom reason</Label>
                <Input
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Area / facility"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expected outcome</Label>
              <Input
                value={expectedOutcome}
                onChange={(e) => setExpectedOutcome(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <p className="text-xs text-slate-500 flex items-start gap-1.5">
              <Palmtree className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Adds the visit to your day plan for admin review.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitSchedule()}
              disabled={saving}
              style={{ backgroundColor: primary }}
            >
              {saving ? "Saving…" : "Schedule visit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SalesPage>
  )
}
