"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { api, engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EngineerHeader, EngineerPage, EngineerStatusBadge, ResponseTrack } from "@/components/engineer/engineer-ui"
import { cn } from "@/lib/utils"

const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"]
const WEEKDAYS_LONG = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function toDayKey(value: string) {
  const iso = String(value || "").slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return dayKey(date.getFullYear(), date.getMonth(), date.getDate())
}

function shiftDayKey(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number)
  const date = new Date(year, month - 1, day + days)
  return dayKey(date.getFullYear(), date.getMonth(), date.getDate())
}

function expandLeaveDays(startDate: string, endDate: string) {
  const keys: string[] = []
  let current = toDayKey(startDate)
  const last = toDayKey(endDate) || current
  if (!current) return keys
  while (current <= last && keys.length < 400) {
    keys.push(current)
    current = shiftDayKey(current, 1)
  }
  return keys
}

type LeaveRow = {
  _id: string
  type?: string
  status?: string
  startDate?: string
  endDate?: string
  reason?: string
}

export default function EngineerCalendarPage() {
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [leaveRows, setLeaveRows] = useState<LeaveRow[]>([])

  const from = startOfMonth(cursor)
  const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59)

  useEffect(() => {
    api.leave
      .getMyRequests()
      .then((res) => setLeaveRows(res.data || []))
      .catch(() => setLeaveRows([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    engineeringApi
      .getWorkOrders({
        filter: "mine",
        from: from.toISOString(),
        to: to.toISOString(),
      })
      .then((res) => setRows(res.data || []))
      .finally(() => setLoading(false))
  }, [monthKey(cursor)])

  const byDay = useMemo(() => {
    const map = new Map<string, any[]>()
    for (const row of rows) {
      if (!row.scheduledDate) continue
      const date = new Date(row.scheduledDate)
      const key = dayKey(date.getFullYear(), date.getMonth(), date.getDate())
      map.set(key, [...(map.get(key) || []), row])
    }
    return map
  }, [rows])

  const leaveByDay = useMemo(() => {
    const map = new Map<string, LeaveRow[]>()
    for (const row of leaveRows) {
      if (String(row.status || "").toLowerCase() !== "approved") continue
      if (!row.startDate) continue
      for (const key of expandLeaveDays(row.startDate, row.endDate || row.startDate)) {
        map.set(key, [...(map.get(key) || []), row])
      }
    }
    return map
  }, [leaveRows])

  const firstWeekday = startOfMonth(cursor).getDay()
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const trailing = (7 - ((firstWeekday + daysInMonth) % 7)) % 7
  const cells = Array.from({ length: firstWeekday + daysInMonth + trailing }, (_, index) => {
    if (index < firstWeekday) return null
    const day = index - firstWeekday + 1
    return day > daysInMonth ? null : day
  })

  const selectedKey = dayKey(cursor.getFullYear(), cursor.getMonth(), selectedDay)
  const selectedJobs = byDay.get(selectedKey) || []
  const selectedLeave = leaveByDay.get(selectedKey) || []
  const selectedDate = new Date(cursor.getFullYear(), cursor.getMonth(), selectedDay)
  const selectedIsToday = isSameDay(selectedDate, today)
  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" })

  const shiftMonth = (delta: number) => {
    const next = new Date(cursor.getFullYear(), cursor.getMonth() + delta, 1)
    setCursor(next)
    const inThisMonth = next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth()
    setSelectedDay(inThisMonth ? today.getDate() : 1)
  }

  const goToday = () => {
    setCursor(startOfMonth(today))
    setSelectedDay(today.getDate())
  }

  if (loading && rows.length === 0) return <PageLoadingSkeleton title="Calendar" />

  return (
    <EngineerPage>
      <EngineerHeader title="Calendar" description="Jobs this month, with approved leave days highlighted." />

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b px-3 py-2.5 sm:px-4">
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold sm:text-base">{monthLabel}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8 shrink-0 px-2.5 text-xs"
            onClick={goToday}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => shiftMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <CardContent className="p-2 sm:p-4">
          <div className="grid grid-cols-7">
            {WEEKDAYS_SHORT.map((day, index) => (
              <div
                key={`${day}-${index}`}
                className="py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-[11px]"
              >
                <span className="sm:hidden">{day}</span>
                <span className="hidden sm:inline">{WEEKDAYS_LONG[index]}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="h-14 sm:min-h-24" />
              const key = dayKey(cursor.getFullYear(), cursor.getMonth(), day)
              const jobs = byDay.get(key) || []
              const leave = leaveByDay.get(key) || []
              const hasLeave = leave.length > 0
              const isToday = isSameDay(new Date(cursor.getFullYear(), cursor.getMonth(), day), today)
              const isSelected = day === selectedDay
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "flex h-14 flex-col items-center justify-start rounded-xl pt-0.5 sm:h-auto sm:min-h-24 sm:items-stretch sm:rounded-lg sm:p-1.5 sm:text-left sm:pt-1.5",
                    hasLeave && !isSelected && "bg-amber-50",
                    isSelected && "erp-selected",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold sm:hidden",
                      isSelected && "erp-selected",
                      isToday && !isSelected && "text-slate-900 underline decoration-slate-400 underline-offset-2",
                    )}
                  >
                    {day}
                  </span>
                  <span
                    className={cn(
                      "hidden text-sm font-semibold sm:inline",
                      isToday && !isSelected && "underline decoration-slate-400 underline-offset-2",
                    )}
                  >
                    {day}
                  </span>
                  <span className="mt-0.5 flex h-3.5 items-center justify-center gap-0.5 sm:hidden">
                    {jobs.length === 0 && !hasLeave ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                    ) : null}
                    {jobs.length === 1 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    ) : jobs.length > 1 ? (
                      <span className="min-w-3 rounded-full bg-slate-700 px-1 text-[9px] font-semibold leading-3 text-white">
                        {jobs.length}
                      </span>
                    ) : null}
                    {hasLeave ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> : null}
                  </span>
                  <div className="mt-1 hidden space-y-1 sm:block">
                    {hasLeave ? (
                      <span className="block truncate rounded bg-amber-100 px-1 py-0.5 text-[11px] font-medium text-amber-800">
                        Leave
                      </span>
                    ) : null}
                    {jobs.slice(0, hasLeave ? 2 : 3).map((job) => (
                      <Link
                        key={job._id}
                        href={`/engineer/work-orders/${job._id}`}
                        className="block truncate rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-700 hover:bg-slate-200"
                      >
                        {job.serviceType || job.woNumber}
                      </Link>
                    ))}
                    {jobs.length > (hasLeave ? 2 : 3) ? (
                      <p className="text-[10px] text-muted-foreground">
                        +{jobs.length - (hasLeave ? 2 : 3)} more
                      </p>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 px-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Jobs
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Approved leave
            </span>
          </div>
        </CardContent>
      </Card>

      <section className="sm:hidden">
        <div className="erp-page-header mb-2 flex items-center justify-between rounded-xl px-3 py-2">
          <div>
            <p className="erp-page-eyebrow text-[11px] font-semibold uppercase tracking-wide">
              {selectedIsToday ? "Today" : selectedDate.toLocaleDateString(undefined, { weekday: "long" })}
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {selectedDate.toLocaleDateString(undefined, { day: "numeric", month: "long" })}
            </p>
          </div>
          <p className="text-xs font-medium text-slate-600">
            {selectedJobs.length} job{selectedJobs.length === 1 ? "" : "s"}
            {selectedLeave.length > 0 ? " · leave" : ""}
          </p>
        </div>
        {selectedLeave.length > 0 ? (
          <div className="mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-800">Approved leave</p>
            {selectedLeave.map((row) => (
              <p key={row._id} className="mt-0.5 text-sm text-amber-950">
                {row.type || "Leave"}
                {row.reason ? ` · ${row.reason}` : ""}
              </p>
            ))}
          </div>
        ) : null}
        {selectedJobs.length === 0 ? (
          <div className="rounded-2xl border bg-white px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-800">
              {selectedLeave.length > 0 ? "On approved leave" : "Nothing scheduled"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Tap another day or open work orders to plan a visit.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {selectedJobs.map((job) => (
              <li key={job._id}>
                <Link
                  href={`/engineer/work-orders/${job._id}`}
                  className="flex items-center gap-3 rounded-2xl border bg-white px-3 py-3 shadow-sm"
                >
                  <span className="h-10 w-1 shrink-0 rounded-full bg-slate-300" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-semibold leading-tight">
                        {job.woNumber || job.serviceType || "Work order"}
                      </p>
                      <EngineerStatusBadge status={job.status} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-slate-600">
                      {job.machine?.productName || job.serviceType || "Job"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {job.machine?.client?.name || "No client"}
                    </p>
                    <ResponseTrack
                      raised={job.createdAt || job.scheduledDate}
                      resolved={job.completedDate}
                    />
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </EngineerPage>
  )
}
