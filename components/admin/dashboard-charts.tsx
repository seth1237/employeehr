"use client"

import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
} from "recharts"

type TrendPoint = { label: string; meetings: number; reports: number; invoices: number }
type PerformancePoint = { name: string; performance: number }
type StockPoint = { name: string; soldQuantity: number }

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium text-slate-700">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-slate-500">
          {entry.name}: <span className="font-semibold text-slate-800">{entry.value}</span>
        </p>
      ))}
    </div>
  )
}

export function TrendAreaChart({
  data,
  primary,
}: {
  data: TrendPoint[]
  primary: string
  secondary?: string
  accent?: string
}) {
  const fillId = `trend-fill-${primary.replace("#", "")}`
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primary} stopOpacity={0.18} />
            <stop offset="100%" stopColor={primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#eef0f3" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="invoices"
          name="Invoices"
          stroke={primary}
          strokeWidth={2.2}
          fill={`url(#${fillId})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: primary }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function formatKes(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return `${Math.round(value)}`
}

export function SalesPerformanceChart({
  data,
  fill,
}: {
  data: Array<{ label: string; sales: number }>
  fill: string
}) {
  const fillId = `sales-fill-${fill.replace("#", "")}`
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={0.22} />
            <stop offset="100%" stopColor={fill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#eef0f3" vertical={false} strokeDasharray="0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          minTickGap={28}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          tickFormatter={(value) => formatKes(Number(value || 0))}
          width={36}
          tickCount={4}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const value = Number(payload[0]?.value || 0)
            return (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
                <p className="font-medium text-slate-700">{label}</p>
                <p className="mt-0.5 text-slate-500">
                  Sales: <span className="font-semibold text-slate-900">KES {Math.round(value).toLocaleString()}</span>
                </p>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="sales"
          name="Sales"
          stroke={fill}
          strokeWidth={2.4}
          fill={`url(#${fillId})`}
          dot={false}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff", fill }}
          animationDuration={900}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function PerformanceAreaChart({
  data,
  fill,
}: {
  data: PerformancePoint[]
  fill: string
}) {
  return <SalesPerformanceChart data={data.map((row) => ({ label: row.name, sales: row.performance }))} fill={fill} />
}

export function StockAreaChart({
  data,
  fill,
}: {
  data: StockPoint[]
  fill: string
}) {
  const fillId = `stock-fill-${fill.replace("#", "")}`
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 8 }}>
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity={0.16} />
            <stop offset="100%" stopColor={fill} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#eef0f3" vertical={false} />
        <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={{ fill: "#94a3b8", fontSize: 10 }} />
        <YAxis tickLine={false} axisLine={false} allowDecimals={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="soldQuantity"
          name="Sold"
          stroke={fill}
          strokeWidth={2.2}
          fill={`url(#${fillId})`}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const TrendLineChart = TrendAreaChart
export const PerformanceBarChart = PerformanceAreaChart
export const StockBarChart = StockAreaChart
