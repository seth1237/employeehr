"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts"

type TrendPoint = {
  month: string
  units: number
  revenue: number
  profit: number
}

type ComparisonRow = {
  name: string
  revenue: number
  quantity: number
}

export function ProductTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="units"
          stroke="#2563eb"
          name="Units Sold"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#10b981"
          name="Revenue"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="profit"
          stroke="#f59e0b"
          name="Profit"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function ProductComparisonChart({ data }: { data: ComparisonRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="revenue" fill="#2563eb" name="Revenue" />
        <Bar dataKey="quantity" fill="#10b981" name="Quantity" />
      </BarChart>
    </ResponsiveContainer>
  )
}
