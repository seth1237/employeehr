"use client"

import { Button } from "@/components/ui/button"
import { monthKey, monthLabel, shortDateLabel, weekOfMonth } from "@/lib/sales-calendar"

export function MonthWeekDayNav({
  dates,
  selectedMonth,
  selectedWeek,
  selectedDate,
  onSelectMonth,
  onSelectWeek,
  onSelectDate,
}: {
  dates: string[]
  selectedMonth: string
  selectedWeek: number | null
  selectedDate: string
  onSelectMonth: (month: string) => void
  onSelectWeek: (week: number | null) => void
  onSelectDate: (date: string) => void
}) {
  const months = Array.from(
    dates.reduce((map, date) => {
      const key = monthKey(date)
      if (!key) return map
      const current = map.get(key)
      if (current) current.count += 1
      else map.set(key, { key, label: monthLabel(date), count: 1 })
      return map
    }, new Map<string, { key: string; label: string; count: number }>()),
  ).map(([, value]) => value)

  const weeks = selectedMonth
    ? Array.from(
        dates
          .filter((date) => monthKey(date) === selectedMonth)
          .reduce((map, date) => {
            const week = weekOfMonth(date)
            map.set(week, (map.get(week) || 0) + 1)
            return map
          }, new Map<number, number>()),
      )
        .sort((a, b) => a[0] - b[0])
        .map(([week, count]) => ({ week, count }))
    : []

  const days = selectedMonth && selectedWeek
    ? Array.from(
        new Set(
          dates.filter(
            (date) => monthKey(date) === selectedMonth && weekOfMonth(date) === selectedWeek,
          ),
        ),
      ).sort()
    : []

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="min-w-0">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Month</p>
        <div className="flex flex-wrap gap-1">
          {months.length === 0 ? (
            <p className="text-xs text-muted-foreground">No dates yet.</p>
          ) : (
            months.map((month) => (
              <Button
                key={month.key}
                size="sm"
                variant={selectedMonth === month.key ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => onSelectMonth(month.key)}
              >
                {month.label}
                <span className="ml-1 opacity-70">{month.count}</span>
              </Button>
            ))
          )}
        </div>
      </div>

      <div className="min-w-0">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Week</p>
        <div className="flex flex-wrap gap-1">
          {selectedMonth ? (
            weeks.map((item) => (
              <Button
                key={item.week}
                size="sm"
                variant={selectedWeek === item.week ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => onSelectWeek(item.week)}
              >
                Wk {item.week}
                <span className="ml-1 opacity-70">{item.count}</span>
              </Button>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Pick a month</p>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Day</p>
        <div className="flex flex-wrap gap-1">
          {selectedWeek ? (
            days.map((date) => (
              <Button
                key={date}
                size="sm"
                variant={selectedDate === date ? "default" : "outline"}
                className="h-7 px-2 text-xs"
                onClick={() => onSelectDate(date)}
              >
                {shortDateLabel(date)}
              </Button>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">Pick a week</p>
          )}
        </div>
      </div>
    </div>
  )
}
