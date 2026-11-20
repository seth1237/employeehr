'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, MotionConfig, type Variants } from 'framer-motion'
import {
  Users,
  UserPlus,
  AlertCircle,
  CalendarDays,
  FileText,
  DollarSign,
  Clock3,
  Activity,
  TriangleAlert,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
} from 'lucide-react'
import { PurchaseVelocityHeatmap, type DailyActivity } from '@/components/admin/activity-heatmap'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { DashboardWidgetsMenu } from '@/components/admin/personalization-panel'
import { SalesWorkflowTour } from '@/components/admin/guided-tour'
import { OnTheGoHub } from '@/components/admin/on-the-go-hub'
import { useOnTheGo } from '@/lib/on-the-go'
import {
  getDashboardWidgetOrder,
  type DashboardWidgetId,
} from '@/lib/admin-personalization'

const SalesPerformanceChart = dynamic(
  () => import('@/components/admin/dashboard-charts').then((mod) => mod.SalesPerformanceChart),
  { ssr: false, loading: () => <div className="h-full animate-pulse rounded-xl bg-slate-100" /> },
)

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
}

type DepartmentRow = {
  name: string
  headcount: number
  avgPerformance: number
  pendingLeave: number
  meetingsThisMonth: number
  reportsThisMonth: number
  attendanceRate: number
}

type StockItem = { name: string; currentQuantity?: number }

type DashboardData = {
  snapshot: boolean
  stats: {
    totalUsers: number
    activeUsers: number
    departments: number
    kpis: number
    awards: number
    avgPerformance: number
    pendingLeave: number
    meetingsThisMonth: number
    reportsThisMonth: number
    payrollProcessed: number
    invoices: number
    quotations: number
    products: number
  }
  attendanceToday: { checkedIn: number; checkedOut: number; pendingCheckOut: number }
  dispatch: { pending: number; dispatched: number; delivered: number }
  inventory: {
    quotationsGenerated: number
    invoicesConverted: number
    leadingSalesPerson: string
    leadingSalesAmount: number
  }
  departments: DepartmentRow[]
  salesAnalytics: {
    mostInStock: StockItem[]
    outOfStock: StockItem[]
    topSelling: Array<{ productName: string; soldQuantity: number; salesAmount: number }>
  }
  monthlyTrends: Array<{ key: string; label: string; meetings: number; reports: number; invoices: number; sales?: number }>
  dailyActivity: DailyActivity[]
  purchaseVelocity: {
    weeks: string[]
    products: Array<{ name: string; volumes: number[] }>
  }
  activityFeed: Array<{ label: string; detail: string; timestamp: string | Date; href: string }>
  kpiTrends: { employees: number; leave: number; meetings: number; invoices: number }
  topPurchasingClients: Array<{ name: string; spent: number; invoiceCount: number }>
  stockSeverity: {
    critical: StockItem[]
    warning: StockItem[]
    low: StockItem[]
    productCount: number
  }
}

type Branding = {
  name?: string
  logo?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  backgroundColor?: string
  textColor?: string
  borderRadius?: string
  fontFamily?: string
}

const DEFAULT_DATA: DashboardData = {
  snapshot: true,
  stats: {
    totalUsers: 0,
    activeUsers: 0,
    departments: 0,
    kpis: 0,
    awards: 0,
    avgPerformance: 0,
    pendingLeave: 0,
    meetingsThisMonth: 0,
    reportsThisMonth: 0,
    payrollProcessed: 0,
    invoices: 0,
    quotations: 0,
    products: 0,
  },
  attendanceToday: { checkedIn: 0, checkedOut: 0, pendingCheckOut: 0 },
  dispatch: { pending: 0, dispatched: 0, delivered: 0 },
  inventory: {
    quotationsGenerated: 0,
    invoicesConverted: 0,
    leadingSalesPerson: 'No sales data',
    leadingSalesAmount: 0,
  },
  departments: [],
  salesAnalytics: { mostInStock: [], outOfStock: [], topSelling: [] },
  monthlyTrends: [],
  dailyActivity: [],
  purchaseVelocity: { weeks: [], products: [] },
  activityFeed: [],
  kpiTrends: { employees: 0, leave: 0, meetings: 0, invoices: 0 },
  topPurchasingClients: [],
  stockSeverity: { critical: [], warning: [], low: [], productCount: 0 },
}

function readCachedBranding(): Branding | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('elevate_branding')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const currentUser = getUser()
  const { onTheGo, ready: onTheGoReady } = useOnTheGo()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA)
  const [branding, setBranding] = useState<Branding | null>(() => readCachedBranding())
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [trendDuration, setTrendDuration] = useState<'1' | '3' | '6'>('3')
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(() => [
    'hr-overview',
    'sales-analytics',
    'dispatch-summary',
    'departments',
    'stock-summary',
    'attention',
  ])

  useEffect(() => {
    // If the user is dispatch, immediately redirect them to their primary tool
    if (currentUser?.role === 'dispatch') {
      router.replace('/admin/stock/dispatch')
      return
    }
    setWidgetOrder(getDashboardWidgetOrder())
  }, [currentUser?.role, router])

  const isVisible = (id: DashboardWidgetId) => widgetOrder.includes(id)

  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login')
      return
    }
    if (onTheGo) return

    loadDashboard()
    const interval = setInterval(() => {
      if (!onTheGo) loadDashboard()
    }, 120000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTheGo])

  useEffect(() => {
    if (branding) return
    const cached = readCachedBranding()
    if (cached) {
      setBranding(cached)
      return
    }
    void loadBranding()
  }, [branding])

  const loadBranding = async () => {
    try {
      const res = await api.company.getBranding()
      if (res?.success && res.data) {
        setBranding({
          name: res.data.name,
          logo: res.data.logo,
          primaryColor: res.data.primaryColor,
          secondaryColor: res.data.secondaryColor,
          accentColor: res.data.accentColor,
          backgroundColor: res.data.backgroundColor,
          textColor: res.data.textColor,
          borderRadius: res.data.borderRadius,
          fontFamily: res.data.fontFamily,
        })
      }
    } catch (err) {
      console.error('Branding load error:', err)
    }
  }

  const loadDashboard = async () => {
    try {
      setError(null)

      const statsRes = await api.dashboard.getStats()

      if (!statsRes?.success) {
        throw new Error((statsRes as any)?.message || 'Failed to fetch dashboard stats')
      }
      
      const payload = (statsRes as any)?.data || {}
      setData({
        ...DEFAULT_DATA,
        ...payload,
        stats: {
          ...DEFAULT_DATA.stats,
          totalUsers: payload.users?.length ?? payload.stats?.totalUsers ?? 0,
          invoices: payload.stockInvoices?.length ?? payload.stats?.invoices ?? 0,
          quotations: payload.stockQuotations?.length ?? payload.stats?.quotations ?? 0,
          ...(payload.stats || {}),
        },
        attendanceToday: { ...DEFAULT_DATA.attendanceToday, ...(payload.attendanceToday || {}) },
        dispatch: { ...DEFAULT_DATA.dispatch, ...(payload.dispatch || {}) },
        inventory: { ...DEFAULT_DATA.inventory, ...(payload.inventory || {}) },
        departments: payload.departments || [],
        salesAnalytics: { ...DEFAULT_DATA.salesAnalytics, ...(payload.salesAnalytics || {}) },
        monthlyTrends: payload.monthlyTrends || [],
        dailyActivity: payload.dailyActivity || [],
        purchaseVelocity: payload.purchaseVelocity || DEFAULT_DATA.purchaseVelocity,
        activityFeed: payload.activityFeed || [],
        kpiTrends: { ...DEFAULT_DATA.kpiTrends, ...(payload.kpiTrends || {}) },
        topPurchasingClients: payload.topPurchasingClients || [],
        stockSeverity: { ...DEFAULT_DATA.stockSeverity, ...(payload.stockSeverity || {}) },
      })
      setLastUpdatedAt(new Date())

    } catch (err: any) {
      console.error('Dashboard error:', {
        message: err?.message || 'Unknown error',
        name: err?.name,
        stack: err?.stack,
      })
      
      // Check if this is an auth-related error
      const errorMsg = err?.message || ''
      const isAuthError = errorMsg.includes('Session expired') || 
                          errorMsg.includes('Unauthorized') || 
                          errorMsg.includes('Invalid user ID') ||
                          errorMsg.includes('invalid token')
      
      if (isAuthError) {
        console.warn('Auth error detected, redirecting to login')
        router.push('/auth/login')
        return
      }
      
      setError(err?.message || 'Failed to load dashboard data')
    } finally {
      if (loading) {
        setLoading(false)
      }
    }
  }

  const brand = useMemo(() => ({
    name: branding?.name?.trim() || 'Organization',
    logo: branding?.logo || '',
    primary: branding?.primaryColor || '#296ff0',
    secondary: branding?.secondaryColor || '#059669',
    accent: branding?.accentColor || '#f59e0b',
    background: branding?.backgroundColor || '#f5f7fb',
    text: branding?.textColor || '#111827',
  }), [branding])

  const stats = data.stats

  const departmentRows = data.departments

  const dispatchSummary = data.dispatch
  const inventorySummary = data.inventory
  const heatmapWeeks = trendDuration === '1' ? 4 : trendDuration === '3' ? 12 : 16

  const salesChartPoints = useMemo(() => {
    const days = data.dailyActivity
    const hasSales = days.some((day) => Number(day.sales || 0) > 0)
    if (!hasSales) {
      return data.monthlyTrends.slice(-Number(trendDuration)).map((row) => ({
        label: row.label,
        sales: Number(row.sales || 0),
      }))
    }

    const localIso = (date: Date) => {
      const copy = new Date(date)
      copy.setHours(0, 0, 0, 0)
      return new Date(copy.getTime() - copy.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    }
    const byDate = new Map(days.map((day) => [day.date, Number(day.sales || 0)]))
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() - heatmapWeeks * 7)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (trendDuration === '1') {
      const points: Array<{ label: string; sales: number }> = []
      const cursor = new Date(cutoff)
      while (cursor <= today) {
        points.push({
          label: cursor.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }),
          sales: byDate.get(localIso(cursor)) || 0,
        })
        cursor.setDate(cursor.getDate() + 1)
      }
      return points
    }

    const weeks: Array<{ label: string; sales: number }> = []
    const cursor = new Date(cutoff)
    cursor.setDate(cursor.getDate() - cursor.getDay())
    while (cursor <= today) {
      let sales = 0
      for (let i = 0; i < 7; i += 1) {
        const day = new Date(cursor)
        day.setDate(cursor.getDate() + i)
        sales += byDate.get(localIso(day)) || 0
      }
      weeks.push({
        label: cursor.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        sales,
      })
      cursor.setDate(cursor.getDate() + 7)
    }
    return weeks
  }, [data.dailyActivity, data.monthlyTrends, heatmapWeeks, trendDuration])

  const salesPeriodTotal = useMemo(
    () => salesChartPoints.reduce((sum, point) => sum + Number(point.sales || 0), 0),
    [salesChartPoints],
  )

  const activityFeed = useMemo(
    () =>
      data.activityFeed.map((item) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      })),
    [data.activityFeed],
  )

  const stockSeverity = data.stockSeverity
  const kpiTrends = data.kpiTrends

  const dispatchTotal = dispatchSummary.pending + dispatchSummary.dispatched + dispatchSummary.delivered
  const dispatchRows = [
    { name: 'Pending', value: dispatchSummary.pending, status: 'Needs action' },
    { name: 'Dispatched', value: dispatchSummary.dispatched, status: 'In transit' },
    { name: 'Delivered', value: dispatchSummary.delivered, status: 'Complete' },
  ]
  const conversionRate =
    inventorySummary.quotationsGenerated > 0
      ? Math.round((inventorySummary.invoicesConverted / inventorySummary.quotationsGenerated) * 100)
      : 0

  const greetingName = currentUser?.first_name?.trim() || 'there'

  const topPurchasingClients = data.topPurchasingClients

  if (onTheGoReady && onTheGo) {
    return <OnTheGoHub />
  }

  if (loading && !lastUpdatedAt) {
    return (
      <div className="min-h-screen bg-[#f6f7fb] p-4 lg:p-6">
        <div className="mx-auto w-full max-w-[1600px] animate-pulse space-y-4">
          <div className="h-8 w-64 rounded-lg bg-slate-200" />
          <div className="grid gap-3 xl:grid-cols-12">
            <div className="space-y-3 xl:col-span-8">
              <div className="h-20 rounded-2xl border border-slate-200 bg-white" />
              <div className="grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-24 rounded-2xl border border-slate-200 bg-white" />
                ))}
              </div>
              <div className="h-[228px] rounded-2xl border border-slate-200 bg-white" />
            </div>
            <div className="space-y-3 xl:col-span-4">
              <div className="h-[228px] rounded-2xl border border-slate-200 bg-white" />
              <div className="h-40 rounded-2xl border border-slate-200 bg-white" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
    <motion.div
      className="min-h-screen overflow-x-hidden bg-[#f6f7fb] p-3 sm:p-4 lg:p-5"
      style={{ color: brand.text }}
      initial="hidden"
      animate="show"
      variants={stagger}
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-4">
        <motion.div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between" variants={fadeUp}>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              Welcome back, {greetingName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              See operational activity, sales, and stock risk across {brand.name}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500 sm:inline-flex">
              <Clock3 className="h-3.5 w-3.5" />
              {lastUpdatedAt ? `Updated ${formatTime(lastUpdatedAt)}` : 'Updating...'}
            </span>
            <DashboardWidgetsMenu order={widgetOrder} onChange={setWidgetOrder} />
            <Link href="/admin/users">
              <Button size="sm" className="gap-1.5 rounded-full text-white" style={{ backgroundColor: brand.primary }}>
                <UserPlus size={14} />
                Add Staff
              </Button>
            </Link>
          </div>
        </motion.div>

        {error && (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertCircle size={18} />
                <p>{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadDashboard}>
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        <SalesWorkflowTour pathname="/admin" />

        <div data-tour="wt-dashboard" className="space-y-4">
          <motion.div variants={fadeUp} className="grid items-stretch gap-3 xl:grid-cols-12">
            <div className="flex min-w-0 flex-col gap-3 xl:col-span-8">
              {isVisible('hr-overview') ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <MetricCard trend={kpiTrends.employees} label="Total Employees" value={stats.totalUsers} sublabel={`${stats.activeUsers} active`} icon={<Users className="h-4 w-4" />} />
                  <MetricCard trend={0} label="Quotations" value={stats.quotations} sublabel="Open pipeline" icon={<FileText className="h-4 w-4" />} />
                  <MetricCard trend={kpiTrends.invoices} label="Invoices" value={stats.invoices} sublabel="Billing" icon={<DollarSign className="h-4 w-4" />} />
                  <MetricCard trend={0} label="Dispatches" value={dispatchTotal} sublabel={`${dispatchSummary.pending} pending`} icon={<Truck className="h-4 w-4" />} />
                  <MetricCard className="col-span-2 sm:col-span-1 lg:col-span-1" trend={kpiTrends.leave * -1} label="Pending Leave" value={stats.pendingLeave} sublabel="Requires review" icon={<CalendarDays className="h-4 w-4" />} />
                </div>
              ) : null}

              <div className="grid min-h-0 flex-1 items-stretch gap-3 lg:grid-cols-5">
                {isVisible('sales-analytics') ? (
                  <DashCard
                    className="lg:col-span-3"
                    title="Sales performance"
                    subtitle={`KES ${Math.round(salesPeriodTotal).toLocaleString()} invoice revenue in this period`}
                    action={
                      <div className="flex rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs">
                        {([
                          ['1', '30D'],
                          ['3', '3M'],
                          ['6', '6M'],
                        ] as const).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setTrendDuration(value)}
                            className={`rounded-full px-2.5 py-1 font-medium transition ${
                              trendDuration === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    }
                    bodyClassName="h-[208px]"
                  >
                    {salesChartPoints.length === 0 || salesPeriodTotal === 0 ? (
                      <EmptyChart label="No sales recorded in this period." />
                    ) : (
                      <SalesPerformanceChart data={salesChartPoints} fill={brand.primary} />
                    )}
                  </DashCard>
                ) : null}

                {isVisible('dispatch-summary') ? (
                  <DashCard
                    className="min-h-0 lg:col-span-2"
                    title="Recent activity"
                    action={<Activity className="h-4 w-4 text-slate-400" />}
                    bodyClassName="h-[208px] overflow-y-auto"
                  >
                    <div className="space-y-0.5">
                      {activityFeed.length === 0 ? (
                        <EmptyChart label="No recent updates found." />
                      ) : (
                        activityFeed.slice(0, 8).map((item, index) => (
                          <Link key={`${item.label}-${index}`} href={item.href} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5 transition hover:bg-slate-50">
                            <p className="truncate text-sm font-medium text-slate-800">{item.label}</p>
                            <span className="shrink-0 text-[11px] text-slate-400">{formatRelativeTime(item.timestamp)}</span>
                          </Link>
                        ))
                      )}
                    </div>
                  </DashCard>
                ) : null}
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3 xl:col-span-4">
              {isVisible('sales-analytics') ? (
                <DashCard title="Operational trends" bodyClassName="px-0 pb-0">
                  <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 border-t border-slate-100">
                    <StatCell label="Invoices converted" value={inventorySummary.invoicesConverted} />
                    <StatCell label="Conversion rate" value={`${conversionRate}%`} />
                    <StatCell label="Top seller" value={inventorySummary.leadingSalesPerson} />
                    <StatCell label="Top sales value" value={`KES ${Math.round(inventorySummary.leadingSalesAmount).toLocaleString()}`} />
                  </div>
                </DashCard>
              ) : null}

              {isVisible('stock-summary') ? (
                <DashCard
                  className="min-h-0 flex-1"
                  title="Purchase velocity"
                  subtitle="Top products · last 12 weeks"
                >
                  <PurchaseVelocityHeatmap
                    weeks={data.purchaseVelocity.weeks}
                    products={data.purchaseVelocity.products}
                    primary={brand.primary}
                    compact
                  />
                </DashCard>
              ) : null}
            </div>
          </motion.div>

          {isVisible('dispatch-summary') || isVisible('departments') || isVisible('attention') ? (
            <motion.div variants={fadeUp} className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-12">
              {isVisible('dispatch-summary') ? (
                <DashCard
                  className="xl:col-span-3"
                  title="Dispatch activity"
                  action={
                    <Link href="/admin/stock/dispatch">
                      <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-xs">Open</Button>
                    </Link>
                  }
                >
                  <div className="space-y-2">
                  {dispatchRows.map((item) => {
                    const pct = dispatchTotal === 0 ? 0 : Math.round((item.value / dispatchTotal) * 100)
                    return (
                      <div key={item.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                          <p className="text-[11px] text-slate-400">{item.status}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{item.value}</p>
                          <p className="text-[11px] text-slate-400">{pct}%</p>
                        </div>
                      </div>
                    )
                  })}
                  </div>
                </DashCard>
              ) : null}

              {isVisible('departments') ? (
                <DashCard className="xl:col-span-3" title="Top purchasing clients">
                  {topPurchasingClients.length === 0 ? (
                    <EmptyChart label="No purchasing data yet." />
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {topPurchasingClients.slice(0, 5).map((client, index) => (
                        <div key={`${client.name}-${index}`} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">{client.name}</p>
                            <p className="text-xs text-slate-500">{client.invoiceCount} invoices</p>
                          </div>
                          <p className="pl-3 text-sm font-semibold tabular-nums text-slate-900">KES {Math.round(client.spent).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </DashCard>
              ) : null}

              {isVisible('attention') ? (
                <DashCard className="xl:col-span-3" title="Stock risk center" action={<TriangleAlert className="h-4 w-4 text-slate-400" />}>
                  <div className="space-y-2">
                    <RiskRow label="Critical (0 stock)" count={stockSeverity.critical.length} tone="rose" items={stockSeverity.critical} />
                    <RiskRow label="Warning (< 5)" count={stockSeverity.warning.length} tone="amber" items={stockSeverity.warning} />
                    <RiskRow label="Low stock (< 10)" count={stockSeverity.low.length} tone="blue" items={stockSeverity.low} />
                  </div>
                </DashCard>
              ) : null}

              {isVisible('departments') ? (
                <DashCard className="xl:col-span-3" title="Department snapshot">
                  {departmentRows.length === 0 ? (
                    <EmptyChart label="No departments to show yet." />
                  ) : (
                    <div className="space-y-2">
                      {departmentRows.map((dept) => (
                        <div key={dept.name} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-slate-900">{dept.name}</p>
                            <p className="text-[11px] text-slate-400">{dept.headcount} members · {dept.attendanceRate}% att.</p>
                          </div>
                          <span className="shrink-0 text-xs text-slate-500">{dept.pendingLeave} leave</span>
                        </div>
                      ))}
                    </div>
                  )}
                </DashCard>
              ) : null}
            </motion.div>
          ) : null}
        </div>
      </div>
    </motion.div>
    </MotionConfig>
  )
}

function useCountUp(value: number) {
  const numeric = Number(value) || 0
  const [shown, setShown] = useState(0)
  const fromRef = useRef(0)
  useEffect(() => {
    const from = fromRef.current
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = numeric
      setShown(numeric)
      return
    }
    const start = performance.now()
    let frame = 0
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 650)
      const next = Math.round(from + (numeric - from) * (1 - Math.pow(1 - t, 3)))
      setShown(next)
      if (t < 1) frame = requestAnimationFrame(step)
      else fromRef.current = numeric
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [numeric])
  return shown
}

function MetricCard({
  label,
  value,
  sublabel,
  icon,
  trend,
  className,
}: {
  label: string
  value: string | number
  sublabel: string
  icon: React.ReactNode
  trend?: number
  className?: string
}) {
  const trendValue = Math.round(Number(trend || 0))
  const isPositive = trendValue >= 0
  const counted = useCountUp(typeof value === 'number' ? value : 0)
  const numericValue = typeof value === 'number' ? counted : value
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -2 }} transition={{ duration: 0.2 }} className={className}>
      <Card className="min-w-0 gap-0 rounded-2xl border-slate-200 bg-white py-0 shadow-none">
        <CardContent className="px-3 py-3">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-xs font-medium text-slate-500">{label}</p>
            <span className="shrink-0 text-slate-400">{icon}</span>
          </div>
          <p className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-900">{numericValue}</p>
          <div className="mt-1 flex items-center justify-between gap-1">
            <p className="truncate text-[11px] text-slate-500">{sublabel}</p>
            {trendValue !== 0 ? (
              <span className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(trendValue)}%
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function DashCard({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <Card className={`flex h-full flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white py-0 shadow-none ${className || ''}`}>
      {title || action ? (
        <div className="flex shrink-0 items-start justify-between gap-3 px-4 pb-2 pt-3.5">
          <div className="min-w-0">
            {title ? <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={cn('min-h-0 flex-1 px-4 pb-4', bodyClassName)}>{children}</div>
    </Card>
  )
}

function StatCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold tracking-tight text-slate-900">{value}</p>
    </div>
  )
}

function RiskRow({
  label,
  count,
  tone,
  items,
}: {
  label: string
  count: number
  tone: 'rose' | 'amber' | 'blue'
  items: StockItem[]
}) {
  const toneClass = tone === 'rose' ? 'text-rose-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-600'
  const names = items.slice(0, 2).map((item) => item.name).filter(Boolean)
  return (
    <div className="rounded-xl border border-slate-100 px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className={`text-sm font-medium ${toneClass}`}>{label}</p>
        <span className="text-sm font-semibold text-slate-900">{count}</span>
      </div>
      {names.length > 0 ? (
        <p className="mt-1 truncate text-xs text-slate-500">
          {names.join(', ')}
          {items.length > 2 ? ` +${items.length - 2} more` : ''}
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-400">None in this range</p>
      )}
    </div>
  )
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[72px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 text-center text-sm text-slate-500">
      {label}
    </div>
  )
}

function formatRelativeTime(date: Date) {
  const now = new Date().getTime()
  const diffMs = now - date.getTime()
  const diffMins = Math.max(1, Math.floor(diffMs / (1000 * 60)))
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
