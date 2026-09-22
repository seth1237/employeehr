"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export default function EngineerCalendarPage() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
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
      const key = new Date(row.scheduledDate).toISOString().slice(0, 10)
      map.set(key, [...(map.get(key) || []), row])
    }
    return map
  }, [rows])

  const firstWeekday = startOfMonth(cursor).getDay()
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: firstWeekday + daysInMonth }, (_, index) => {
    if (index < firstWeekday) return null
    return index - firstWeekday + 1
  })

  if (loading && rows.length === 0) return <PageLoadingSkeleton title="Calendar" />

  return (
    <div className="space-y-4 p-4 pb-24 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Engineering calendar</h1>
          <p className="text-sm text-muted-foreground">Work orders scheduled this month.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-36 text-center text-sm font-medium">
            {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </p>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="min-h-24 rounded-md bg-muted/20" />
              const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
              const jobs = byDay.get(key) || []
              return (
                <div key={key} className="min-h-24 rounded-md border p-1.5">
                  <p className="text-xs font-medium">{day}</p>
                  <div className="mt-1 space-y-1">
                    {jobs.slice(0, 3).map((job) => (
                      <Link
                        key={job._id}
                        href={`/engineer/work-orders/${job._id}`}
                        className="block truncate rounded bg-teal-50 px-1 py-0.5 text-[11px] text-teal-900 hover:bg-teal-100"
                      >
                        {job.serviceType || job.woNumber}
                      </Link>
                    ))}
                    {jobs.length > 3 ? (
                      <p className="text-[10px] text-muted-foreground">+{jobs.length - 3} more</p>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
