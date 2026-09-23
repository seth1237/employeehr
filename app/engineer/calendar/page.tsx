"use client"

import { useEffect, useMemo, useState, type CSSProperties } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EngineerHeader, EngineerPage, EngineerStatusBadge } from "@/components/engineer/engineer-ui"
import { useEngineerBranding } from "@/components/engineer/branding"
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

export default function EngineerCalendarPage() {
  const branding = useEngineerBranding()
  const today = useMemo(() => new Date(), [])
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])

  const from = startOfMonth(cursor)
  const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59)

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
      <EngineerHeader title="Calendar" description="Your scheduled jobs this month." />

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
              const isToday = isSameDay(new Date(cursor.getFullYear(), cursor.getMonth(), day), today)
              const isSelected = day === selectedDay
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "flex h-14 flex-col items-center justify-start rounded-xl pt-0.5 sm:h-auto sm:min-h-24 sm:items-stretch sm:rounded-lg sm:p-1.5 sm:text-left sm:pt-1.5",
                    isSelected && "sm:text-white sm:[background-color:var(--cal-brand)]",
                  )}
                  style={{ ["--cal-brand"]: branding.primaryColor } as CSSProperties}
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold sm:hidden",
                      isSelected && "text-white",
                    )}
                    style={
                      isSelected
                        ? { backgroundColor: branding.primaryColor }
                        : isToday
                          ? { boxShadow: `inset 0 0 0 2px ${branding.primaryColor}` }
                          : undefined
                    }
                  >
                    {day}
                  </span>
                  <span
                    className={cn("hidden text-sm font-semibold sm:inline", isToday && !isSelected && "underline")}
                    style={isSelected ? { color: "white" } : undefined}
                  >
                    {day}
                  </span>
                  <span className="mt-0.5 flex h-3.5 items-center justify-center sm:hidden">
                    {jobs.length === 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
                    ) : jobs.length === 1 ? (
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
                    ) : (
                      <span
                        className="min-w-3 rounded-full px-1 text-[9px] font-semibold leading-3 text-white"
                        style={{ backgroundColor: branding.primaryColor }}
                      >
                        {jobs.length}
                      </span>
                    )}
                  </span>
                  <div className="mt-1 hidden space-y-1 sm:block">
                    {jobs.slice(0, 3).map((job) => (
                      <Link
                        key={job._id}
                        href={`/engineer/work-orders/${job._id}`}
                        className="block truncate rounded px-1 py-0.5 text-[11px] hover:opacity-80"
                        style={{
                          backgroundColor: isSelected ? "rgba(255,255,255,0.18)" : branding.primarySoft,
                          color: isSelected ? "white" : branding.primaryColor,
                        }}
                      >
                        {job.serviceType || job.woNumber}
                      </Link>
                    ))}
                    {jobs.length > 3 ? (
                      <p className={cn("text-[10px]", isSelected ? "text-white/80" : "text-muted-foreground")}>
                        +{jobs.length - 3} more
                      </p>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <section className="sm:hidden">
        <div
          className="mb-2 flex items-center justify-between rounded-xl border px-3 py-2"
          style={{
            borderColor: branding.primaryBorder,
            background: branding.primarySoft,
          }}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: branding.primaryColor }}>
              {selectedIsToday ? "Today" : selectedDate.toLocaleDateString(undefined, { weekday: "long" })}
            </p>
            <p className="text-sm font-semibold text-slate-900">
              {selectedDate.toLocaleDateString(undefined, { day: "numeric", month: "long" })}
            </p>
          </div>
          <p className="text-xs font-medium text-slate-600">
            {selectedJobs.length} job{selectedJobs.length === 1 ? "" : "s"}
          </p>
        </div>
        {selectedJobs.length === 0 ? (
          <div className="rounded-2xl border bg-white px-4 py-10 text-center">
            <p className="text-sm font-medium text-slate-800">Nothing scheduled</p>
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
                  <span
                    className="h-10 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: branding.primaryColor }}
                  />
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
