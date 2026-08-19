"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays, ChevronLeft, ChevronRight, List, Plus, Send, Trash2 } from "lucide-react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { api, salesApi } from "@/lib/api"
import { dateLabel, monthKey, monthLabel } from "@/lib/sales-calendar"
import { useSalesBranding } from "@/hooks/use-sales-branding"
import { SalesClientPicker } from "@/components/sales/client-picker"
import { SalesEmpty, SalesHeader, SalesPage, SalesStatusBadge } from "@/components/sales/sales-ui"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const REASONS = [
  "Company introduction",
  "Quotation Discussion",
  "Business Inquiry",
  "Appointment",
  "Installation",
  "Service",
  "Debt Collection",
  "Product presentation",
  "Follow-up",
  "Order collection",
  "Relationship management",
  "New business",
  "Product demonstration",
  "Complaint resolution",
  "Payment follow-up",
  "Other",
]

const emptyVisit = () => ({
  clientName: "",
  clientId: "",
  reason: "",
  customReason: "",
  expectedOutcome: "",
  plannedTime: "",
  priority: "medium",
  location: "",
  notes: "",
  followUpDate: "",
  interestCategories: [] as string[],
  expenses: { transport: "", accommodation: "", meals: "", other: "" },
})

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

export default function SalesPlannerPage() {
  const { toast } = useToast()
  const branding = useSalesBranding()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [planners, setPlanners] = useState<any[]>([])
  const [loggedVisits, setLoggedVisits] = useState<any[]>([])
  const [categories, setCategories] = useState<Array<{ _id: string; name: string }>>([])
  const [view, setView] = useState<"list" | "week" | "calendar">("list")
  const [formOpen, setFormOpen] = useState(false)
  const [date, setDate] = useState(todayKey())
  const [visits, setVisits] = useState([emptyVisit()])
  const [calendarMonth, setCalendarMonth] = useState(monthKey(todayKey()))

  const loadData = useCallback(async () => {
    setFetching(true)
    try {
      const [plannerRes, historyRes, catRes] = await Promise.all([
        api.sales.getPlanners(),
        salesApi.getHistory().catch(() => ({ data: { visits: [] } })),
        salesApi.getCategories().catch(() => ({ data: [] })),
      ])
      if (plannerRes.success) setPlanners(plannerRes.data || [])
      setLoggedVisits(historyRes.data?.visits || [])
      setCategories(catRes.data || [])
    } catch (error: any) {
      toast({ title: "Could not load planner", description: error.message, variant: "destructive" })
    } finally {
      setFetching(false)
    }
  }, [toast])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const completedKey = useMemo(() => {
    const set = new Set<string>()
    for (const visit of loggedVisits) {
      const day = String(visit.visitDate || "").slice(0, 10) || String(visit.checkInAt || "").slice(0, 10)
      set.add(`${day}|${String(visit.clientName || "").toLowerCase()}`)
    }
    return set
  }, [loggedVisits])

  const isDone = (planDate: string, clientName: string) =>
    completedKey.has(`${planDate}|${String(clientName || "").toLowerCase()}`)

  const weekDates = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    start.setDate(start.getDate() - start.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
    })
  }, [])

  const todayPlans = planners.filter((p) => p.date === todayKey())
  const upcoming = planners.filter((p) => p.date > todayKey()).sort((a, b) => a.date.localeCompare(b.date))
  const past = planners.filter((p) => p.date < todayKey()).sort((a, b) => b.date.localeCompare(a.date))
  const plansByDate = useMemo(() => {
    const map = new Map<string, any>()
    for (const p of planners) map.set(p.date, p)
    return map
  }, [planners])

  const updateVisit = (index: number, patch: Record<string, any>) => {
    setVisits((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const expenseTotal = visits.reduce((sum, visit) => {
    const e = visit.expenses
    return sum + Number(e.transport || 0) + Number(e.accommodation || 0) + Number(e.meals || 0) + Number(e.other || 0)
  }, 0)

  const handleSubmit = async () => {
    if (!date) return toast({ title: "Date is required", variant: "destructive" })
    if (visits.some((v) => !v.clientName || !v.reason || (v.reason === "Other" && !v.customReason))) {
      return toast({ title: "Each visit needs a client and reason", variant: "destructive" })
    }
    setLoading(true)
    try {
      await api.sales.createPlanner({
        date,
        projectedExpenses: expenseTotal,
        visits: visits.map((visit) => ({
          ...visit,
          expenses: {
            transport: Number(visit.expenses.transport || 0),
            accommodation: Number(visit.expenses.accommodation || 0),
            meals: Number(visit.expenses.meals || 0),
            other: Number(visit.expenses.other || 0),
          },
        })),
      })
      toast({ title: "Visit plan submitted for approval" })
      setVisits([emptyVisit()])
      setFormOpen(false)
      void loadData()
    } catch (error: any) {
      toast({ title: "Could not submit plan", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const shiftMonth = (delta: number) => {
    const [y, m] = calendarMonth.split("-").map(Number)
    const next = new Date(y, m - 1 + delta, 1)
    setCalendarMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`)
  }

  const VisitCard = ({ plan, visit }: { plan: any; visit: any }) => {
    const done = isDone(plan.date, visit.clientName)
    const overdue = plan.date < todayKey() && !done
    const status = done ? "completed" : overdue ? "overdue" : plan.status === "rejected" ? "cancelled" : "planned"
    return (
      <Card className="border-slate-200">
        <CardContent className="space-y-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{visit.clientName}</p>
              <p className="text-xs text-slate-500">
                {plan.date === todayKey() ? "Today" : dateLabel(plan.date)}
                {visit.plannedTime ? ` · ${visit.plannedTime}` : ""}
              </p>
            </div>
            <SalesStatusBadge status={status} />
          </div>
          <p className="text-sm text-slate-700">{visit.reason === "Other" ? visit.customReason : visit.reason}</p>
          {visit.location ? <p className="text-xs text-slate-500">{visit.location}</p> : null}
          {visit.expectedOutcome ? <p className="text-xs text-slate-600">Expect: {visit.expectedOutcome}</p> : null}
          {visit.priority ? (
            <p className="text-xs capitalize text-slate-500">Priority: {visit.priority}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" className="min-h-10">
              <Link href="/sales/report">{done ? "View" : "Complete"}</Link>
            </Button>
            {plan.status === "pending" ? (
              <Button
                size="sm"
                variant="outline"
                className="min-h-10"
                onClick={() => {
                  setDate(plan.date)
                  setVisits(
                    (plan.visits || []).map((item: any) => ({
                      ...emptyVisit(),
                      ...item,
                      expenses: {
                        transport: String(item.expenses?.transport || ""),
                        accommodation: String(item.expenses?.accommodation || ""),
                        meals: String(item.expenses?.meals || ""),
                        other: String(item.expenses?.other || ""),
                      },
                      interestCategories: item.interestCategories || [],
                    })),
                  )
                  setFormOpen(true)
                }}
              >
                {overdue ? "Reschedule" : "Edit"}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <SalesPage>
      <SalesHeader
        color={branding.primaryColor}
        title="Planner"
        description="Plan who to visit, why, and what it should cost. Submit for admin approval."
        actions={
          <>
            <div className="flex rounded-md border border-slate-200 p-0.5">
              <Button size="sm" variant={view === "list" ? "secondary" : "ghost"} onClick={() => setView("list")}>
                <List className="mr-1 h-4 w-4" /> List
              </Button>
              <Button size="sm" variant={view === "week" ? "secondary" : "ghost"} onClick={() => setView("week")}>
                Week
              </Button>
              <Button size="sm" variant={view === "calendar" ? "secondary" : "ghost"} className="hidden sm:inline-flex" onClick={() => setView("calendar")}>
                <CalendarDays className="mr-1 h-4 w-4" /> Month
              </Button>
            </div>
            <Button className="min-h-10" onClick={() => setFormOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New plan
            </Button>
          </>
        }
      />

      {view === "calendar" ? (
        <Card className="hidden border-slate-200 sm:block">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{monthLabel(`${calendarMonth}-01`)}</CardTitle>
            <div className="flex gap-1">
              <Button size="icon" variant="outline" onClick={() => shiftMonth(-1)} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => shiftMonth(1)} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {daysInMonth(calendarMonth).map((cell, index) => {
                const plan = cell.date ? plansByDate.get(cell.date) : null
                const count = plan?.visits?.length || 0
                return (
                  <button
                    key={`${cell.date}-${index}`}
                    type="button"
                    disabled={!cell.inMonth}
                    onClick={() => {
                      if (!cell.date) return
                      setDate(cell.date)
                      if (!plan) setFormOpen(true)
                    }}
                    className={`min-h-16 rounded-md border p-1 text-left text-xs ${
                      cell.date === todayKey()
                        ? "border-teal-600 bg-teal-50"
                        : plan
                          ? "border-slate-300 bg-white"
                          : "border-transparent bg-slate-50 text-slate-400"
                    }`}
                  >
                    <span className="font-medium">{cell.date ? Number(cell.date.slice(8)) : ""}</span>
                    {count ? (
                      <span className="mt-1 block text-[10px] text-slate-600">
                        {count} visit{count === 1 ? "" : "s"} · {plan.status}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {view === "week" ? (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weekDates.map((day) => {
              const plan = plansByDate.get(day)
              const count = plan?.visits?.length || 0
              const isToday = day === todayKey()
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setDate(day)
                    if (!plan) setFormOpen(true)
                  }}
                  className={`min-w-[4.5rem] shrink-0 rounded-md border px-2 py-2 text-center ${
                    isToday ? "border-teal-700 bg-teal-50" : plan ? "border-slate-300 bg-white" : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="text-[11px] font-medium text-slate-500">
                    {new Date(`${day}T00:00:00`).toLocaleDateString("en-KE", { weekday: "short" })}
                  </p>
                  <p className="text-sm font-semibold">{Number(day.slice(8))}</p>
                  <p className="text-[11px] text-slate-500">{count ? `${count}` : "—"}</p>
                </button>
              )
            })}
          </div>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {weekDates.flatMap((day) => {
              const plan = plansByDate.get(day)
              if (!plan) return []
              return (plan.visits || []).map((visit: any, index: number) => (
                <VisitCard key={`${plan._id}-${index}`} plan={plan} visit={visit} />
              ))
            })}
          </div>
          {weekDates.every((day) => !plansByDate.get(day)) ? (
            <SalesEmpty
              title="Nothing planned this week"
              action={
                <Button onClick={() => setFormOpen(true)}>Plan a visit</Button>
              }
            />
          ) : null}
        </div>
      ) : null}

      {fetching ? (
        <PageLoadingSkeleton title="Loading plans" rows={4} />
      ) : view === "list" ? (
        <div className="space-y-5">
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Today</h2>
            {todayPlans.length === 0 ? (
              <SalesEmpty
                title="No visits planned today"
                action={
                  <Button onClick={() => { setDate(todayKey()); setFormOpen(true) }}>
                    Plan a visit
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {todayPlans.flatMap((plan) =>
                  (plan.visits || []).map((visit: any, index: number) => (
                    <VisitCard key={`${plan._id}-${index}`} plan={plan} visit={visit} />
                  )),
                )}
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming plans.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {upcoming.flatMap((plan) =>
                  (plan.visits || []).map((visit: any, index: number) => (
                    <VisitCard key={`${plan._id}-${index}`} plan={plan} visit={visit} />
                  )),
                )}
              </div>
            )}
          </section>

          {past.length > 0 ? (
            <section className="hidden space-y-2 lg:block">
              <h2 className="text-sm font-semibold">Earlier</h2>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {past.slice(0, 9).flatMap((plan) =>
                  (plan.visits || []).map((visit: any, index: number) => (
                    <VisitCard key={`${plan._id}-${index}`} plan={plan} visit={visit} />
                  )),
                )}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Plan visits</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Date *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11" />
            </div>
            {visits.map((visit, index) => (
              <div key={index} className="space-y-3 rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Visit {index + 1}</p>
                  {visits.length > 1 ? (
                    <Button type="button" size="icon" variant="ghost" onClick={() => setVisits(visits.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
                <SalesClientPicker
                  value={visit.clientName}
                  clientId={visit.clientId}
                  required
                  onChange={(next) =>
                    updateVisit(index, {
                      clientName: next.name,
                      clientId: next.clientId || "",
                      location: next.location || visit.location,
                    })
                  }
                />
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Visit details</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Reason *</Label>
                    <Select value={visit.reason} onValueChange={(val) => updateVisit(index, { reason: val })}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select reason" /></SelectTrigger>
                      <SelectContent>
                        {REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Priority</Label>
                    <Select value={visit.priority} onValueChange={(val) => updateVisit(index, { priority: val })}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["low", "medium", "high", "critical"].map((item) => (
                          <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {visit.reason === "Other" ? (
                  <div className="space-y-1">
                    <Label>Custom reason *</Label>
                    <Input value={visit.customReason} onChange={(e) => updateVisit(index, { customReason: e.target.value })} className="h-11" />
                  </div>
                ) : null}
                <div className="space-y-1">
                  <Label>Location</Label>
                  <Input value={visit.location} onChange={(e) => updateVisit(index, { location: e.target.value })} placeholder="Facility / area" className="h-11" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>Planned time</Label>
                    <Input type="time" value={visit.plannedTime} onChange={(e) => updateVisit(index, { plannedTime: e.target.value })} className="h-11" />
                  </div>
                  <div className="space-y-1">
                    <Label>Follow-up date</Label>
                    <Input type="date" value={visit.followUpDate} onChange={(e) => updateVisit(index, { followUpDate: e.target.value })} className="h-11" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Expected outcome</Label>
                  <Input value={visit.expectedOutcome} onChange={(e) => updateVisit(index, { expectedOutcome: e.target.value })} placeholder="What should this visit achieve?" className="h-11" />
                </div>
                <div className="space-y-1">
                  <Label>Product category of interest</Label>
                  <select
                    className="h-11 w-full rounded-md border bg-background px-3 text-sm"
                    value=""
                    onChange={(e) => {
                      const name = e.target.value
                      if (!name || visit.interestCategories.includes(name)) return
                      updateVisit(index, { interestCategories: [...visit.interestCategories, name] })
                    }}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category._id} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                  {visit.interestCategories.length > 0 ? (
                    <p className="text-xs text-slate-600">{visit.interestCategories.join(", ")}</p>
                  ) : null}
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Projected expenses</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["transport", "accommodation", "meals", "other"] as const).map((key) => (
                    <div key={key} className="space-y-1">
                      <Label className="capitalize">{key} (KES)</Label>
                      <Input
                        type="number"
                        className="h-11"
                        value={visit.expenses[key]}
                        onChange={(e) => updateVisit(index, { expenses: { ...visit.expenses, [key]: e.target.value } })}
                      />
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Textarea value={visit.notes} onChange={(e) => updateVisit(index, { notes: e.target.value })} />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={() => setVisits((current) => [...current, emptyVisit()])}>
              <Plus className="mr-1 h-4 w-4" /> Add another visit
            </Button>
            <p className="text-sm text-slate-600">Projected expenses: KES {expenseTotal.toLocaleString("en-KE")}</p>
            <Button className="min-h-11 w-full" onClick={() => void handleSubmit()} disabled={loading}>
              <Send className="mr-1.5 h-4 w-4" />
              {loading ? "Submitting…" : "Submit plan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Button
        className="fixed bottom-20 right-4 z-30 h-12 rounded-full px-4 shadow-lg lg:hidden"
        onClick={() => setFormOpen(true)}
      >
        <Plus className="mr-1 h-4 w-4" />
        Plan
      </Button>
    </SalesPage>
  )
}
