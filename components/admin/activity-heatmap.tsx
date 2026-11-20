"use client"

import { useMemo, useState } from "react"

export type DailyActivity = {
  date: string
  invoices: number
  meetings: number
  reports: number
  sales?: number
}

type Metric = "total" | "invoices" | "meetings" | "reports"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function mixHex(primary: string, whiteRatio: number) {
  const raw = (primary || "#296ff0").replace("#", "")
  const hex = raw.length === 3 ? raw.split("").map((c) => c + c).join("") : raw
  if (hex.length !== 6) return `rgba(41, 111, 240, ${1 - whiteRatio})`
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const mix = (channel: number) => Math.round(channel + (255 - channel) * whiteRatio)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

function shadeFor(level: number, primary: string) {
  if (level <= 0) return "#e8eaee"
  if (level === 1) return mixHex(primary, 0.72)
  if (level === 2) return mixHex(primary, 0.48)
  if (level === 3) return mixHex(primary, 0.24)
  return primary
}

function valueOf(day: DailyActivity | undefined, metric: Metric) {
  if (!day) return 0
  if (metric === "invoices") return day.invoices
  if (metric === "meetings") return day.meetings
  if (metric === "reports") return day.reports
  return day.invoices + day.meetings + day.reports
}

function iso(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  const offset = copy.getTimezoneOffset()
  const local = new Date(copy.getTime() - offset * 60000)
  return local.toISOString().slice(0, 10)
}

function startOfWeek(date: Date) {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  copy.setDate(copy.getDate() - copy.getDay())
  return copy
}

export function ActivityHeatmap({
  days,
  primary,
  weeks = 16,
  metric = "total",
}: {
  days: DailyActivity[]
  primary: string
  weeks?: number
  metric?: Metric
}) {
  const [hover, setHover] = useState<{ label: string; value: number; x: number; y: number } | null>(null)

  const grid = useMemo(() => {
    const byDate = new Map(days.map((day) => [day.date, day]))
    const today = new Date()
    const end = startOfWeek(today)
    end.setDate(end.getDate() + 6)
    const start = startOfWeek(new Date(today))
    start.setDate(start.getDate() - (weeks - 1) * 7)

    const columns: Array<{ label: string; days: Array<{ iso: string; value: number; date: Date }> }> = []
    const cursor = new Date(start)
    while (cursor <= end) {
      const weekStart = new Date(cursor)
      const weekDays = Array.from({ length: 7 }, (_, index) => {
        const cell = new Date(weekStart)
        cell.setDate(weekStart.getDate() + index)
        const key = iso(cell)
        return { iso: key, value: valueOf(byDate.get(key), metric), date: cell }
      })
      const month = weekStart.toLocaleString("default", { month: "short" })
      const prev = columns[columns.length - 1]
      columns.push({
        label: prev?.label === month ? "" : month,
        days: weekDays,
      })
      cursor.setDate(cursor.getDate() + 7)
    }

    const max = Math.max(1, ...columns.flatMap((column) => column.days.map((day) => day.value)))
    return { columns, max }
  }, [days, metric, weeks])

  const levelFor = (value: number) => {
    if (value <= 0) return 0
    const ratio = value / grid.max
    if (ratio <= 0.25) return 1
    if (ratio <= 0.5) return 2
    if (ratio <= 0.75) return 3
    return 4
  }

  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="flex flex-col justify-between py-[2px] text-[10px] text-slate-400">
          {DAY_LABELS.map((label, index) => (
            <span key={label} className="h-[11px] leading-[11px]">
              {index % 2 === 1 ? label : ""}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex gap-[3px] text-[10px] text-slate-400">
            {grid.columns.map((column, index) => (
              <div key={`${column.label}-${index}`} className="w-[11px] shrink-0">
                {column.label}
              </div>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {grid.columns.map((column, columnIndex) => (
              <div key={columnIndex} className="flex w-[11px] shrink-0 flex-col gap-[3px]">
                {column.days.map((day) => {
                  const level = levelFor(day.value)
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      aria-label={`${day.iso}: ${day.value}`}
                      className="h-[11px] w-[11px] rounded-[2px] origin-center transition-transform duration-200 hover:scale-125"
                      style={{
                        backgroundColor: shadeFor(level, primary),
                        animation: "dash-pop 420ms ease both",
                        animationDelay: `${columnIndex * 18}ms`,
                      }}
                      onMouseEnter={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect()
                        setHover({
                          label: day.date.toLocaleDateString("en-KE", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          }),
                          value: day.value,
                          x: rect.left,
                          y: rect.top,
                        })
                      }}
                      onMouseLeave={() => setHover(null)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className="h-[11px] w-[11px] rounded-[2px]"
            style={{ backgroundColor: shadeFor(level, primary) }}
          />
        ))}
        <span>More</span>
      </div>
      {hover ? (
        <div className="pointer-events-none fixed z-50 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md" style={{ left: hover.x + 14, top: hover.y - 34 }}>
          <span className="font-semibold text-slate-900">{hover.value}</span>
          <span className="text-slate-500"> · {hover.label}</span>
        </div>
      ) : null}
    </div>
  )
}

export function PixelColumnChart({
  points,
  primary,
  rows = 14,
}: {
  points: Array<{ label: string; value: number }>
  primary: string
  rows?: number
}) {
  const [hover, setHover] = useState<{ label: string; value: number; x: number; y: number } | null>(null)
  const max = Math.max(1, ...points.map((point) => point.value))
  const labelEvery = points.length > 16 ? Math.ceil(points.length / 6) : 1

  return (
    <div className="relative flex h-full min-h-0 items-end gap-[3px] sm:gap-1">
      {points.map((point, pointIndex) => {
        const filled = Math.max(point.value > 0 ? 1 : 0, Math.round((point.value / max) * rows))
        const ratio = point.value / max
        const level = point.value <= 0 ? 0 : ratio <= 0.25 ? 1 : ratio <= 0.5 ? 2 : ratio <= 0.75 ? 3 : 4
        return (
          <div key={`${point.label}-${pointIndex}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <button
              type="button"
              className="flex w-full flex-1 flex-col-reverse gap-[3px]"
              onMouseEnter={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                setHover({ label: point.label, value: point.value, x: rect.left, y: rect.top })
              }}
              onMouseLeave={() => setHover(null)}
            >
              {Array.from({ length: rows }, (_, index) => (
                <span
                  key={index}
                  className="block w-full rounded-[2px]"
                  style={{
                    height: 6,
                    backgroundColor: index < filled ? shadeFor(level, primary) : "#eef0f3",
                  }}
                />
              ))}
            </button>
            <span className="h-3 truncate text-[10px] text-slate-400">
              {pointIndex % labelEvery === 0 ? point.label : ""}
            </span>
          </div>
        )
      })}
      {hover ? (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: hover.x, top: hover.y - 36 }}
        >
          <span className="font-semibold text-slate-900">{hover.value}</span>
          <span className="text-slate-500"> · {hover.label}</span>
        </div>
      ) : null}
    </div>
  )
}

function volumeLevel(units: number) {
  if (units <= 0) return 0
  if (units <= 10) return 1
  if (units <= 50) return 2
  if (units <= 100) return 3
  return 4
}

export function PurchaseVelocityHeatmap({
  weeks,
  products,
  primary,
  compact = false,
}: {
  weeks: string[]
  products: Array<{ name: string; volumes: number[] }>
  primary: string
  compact?: boolean
}) {
  const [hover, setHover] = useState<{ name: string; week: string; value: number; x: number; y: number } | null>(null)
  const labels = weeks.length ? weeks : Array.from({ length: 12 }, (_, index) => `Wk ${index + 1}`)

  if (!products.length) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500 ${compact ? "min-h-[88px]" : "min-h-[140px]"}`}>
        No product sales in the last 12 weeks.
      </div>
    )
  }

  const columns = compact
    ? `minmax(4.5rem, 5.75rem) repeat(${labels.length}, minmax(0, 1fr))`
    : `minmax(8.5rem, 12rem) repeat(${labels.length}, minmax(0, 1fr))`

  return (
    <div className="min-w-0 w-full">
      <div className="overflow-x-auto">
        <div className={compact ? "w-full min-w-0" : "w-full min-w-[640px] sm:min-w-0"}>
          <div className={`mb-1.5 grid w-full items-center ${compact ? "gap-1" : "mb-2 gap-1.5"}`} style={{ gridTemplateColumns: columns }}>
            <span />
            {labels.map((week) => (
              <span key={week} className={`text-center font-medium text-slate-400 ${compact ? "truncate text-[9px]" : "text-[10px]"}`}>
                {week}
              </span>
            ))}
          </div>
          <div className={compact ? "space-y-1" : "space-y-1.5"}>
            {products.map((product) => (
              <div key={product.name} className={`grid w-full items-center ${compact ? "gap-1" : "gap-1.5"}`} style={{ gridTemplateColumns: columns }}>
                <p className={`truncate pr-1.5 font-medium text-slate-700 ${compact ? "text-[10px]" : "text-xs"}`} title={product.name}>
                  {product.name}
                </p>
                {labels.map((week, index) => {
                  const value = Number(product.volumes[index] || 0)
                  return (
                    <button
                      key={`${product.name}-${week}`}
                      type="button"
                      className={`w-full min-w-0 transition-transform duration-150 hover:brightness-95 ${compact ? "h-4 rounded-sm" : "h-8 rounded-md"}`}
                      style={{ backgroundColor: shadeFor(volumeLevel(value), primary) }}
                      aria-label={`${product.name} ${week}: ${value} units`}
                      onMouseEnter={(event) => {
                        const rect = event.currentTarget.getBoundingClientRect()
                        setHover({ name: product.name, week, value, x: rect.left, y: rect.top })
                      }}
                      onMouseLeave={() => setHover(null)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={`flex flex-wrap items-center justify-end gap-1.5 text-[10px] text-slate-400 ${compact ? "mt-2" : "mt-3"}`}>
        <span className="mr-1">Sales volume (units)</span>
        {[
          [0, "0"],
          [1, "1–10"],
          [2, "11–50"],
          [3, "51–100"],
          [4, ">100"],
        ].map(([level, label]) => (
          <span key={String(label)} className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: shadeFor(Number(level), primary) }} />
            {label}
          </span>
        ))}
      </div>
      {hover ? (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
          style={{ left: hover.x + 14, top: hover.y - 38 }}
        >
          <span className="font-semibold text-slate-900">{hover.value} units</span>
          <span className="text-slate-500">
            {" "}
            · {hover.name} · {hover.week}
          </span>
        </div>
      ) : null}
    </div>
  )
}
