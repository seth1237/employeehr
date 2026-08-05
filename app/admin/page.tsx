'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  TrendingUp,
  UserPlus,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Search,
  Bell,
  CalendarDays,
  ClipboardCheck,
  FileText,
  BadgeCheck,
  DollarSign,
  MessageSquare,
  Clock3,
  BriefcaseBusiness,
  Settings,
  Activity,
  PackageCheck,
  TriangleAlert,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { getUser } from '@/lib/auth'
import type { User } from '@/lib/types'
import { DashboardWidgetsMenu } from '@/components/admin/personalization-panel'
import { SalesWorkflowTour } from '@/components/admin/guided-tour'
import {
  getDashboardWidgetOrder,
  type DashboardWidgetId,
} from '@/lib/admin-personalization'

type DepartmentRow = {
  name: string
  headcount: number
  avgPerformance: number
  pendingLeave: number
  meetingsThisMonth: number
  reportsThisMonth: number
  attendanceRate: number
}

type DashboardData = {
  users: User[]
  kpis: any[]
  awards: any[]
  performances: any[]
  attendance: any[]
  leaveRequests: any[]
  payroll: any[]
  meetings: any[]
  reports: any[]
  feedback: any[]
  pdps: any[]
  stockInvoices: any[]
  stockProducts: any[]
  stockQuotations: any[]
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
  users: [],
  kpis: [],
  awards: [],
  performances: [],
  attendance: [],
  leaveRequests: [],
  payroll: [],
  meetings: [],
  reports: [],
  feedback: [],
  pdps: [],
  stockInvoices: [],
  stockProducts: [],
  stockQuotations: [],
}

const departmentOrder = ['HR', 'Operations', 'Finance', 'Sales', 'Engineering', 'Support']

export default function AdminDashboard() {
  const router = useRouter()
  const currentUser = getUser()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData>(DEFAULT_DATA)
  const [branding, setBranding] = useState<Branding | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [dashboardSearch, setDashboardSearch] = useState('')
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [trendDuration, setTrendDuration] = useState<'1' | '3' | '6'>('6')
  const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(() => [
    'hr-overview',
    'sales-analytics',
    'dispatch-summary',
    'departments',
    'stock-summary',
    'attention',
  ])

  useEffect(() => {
    setWidgetOrder(getDashboardWidgetOrder())
  }, [])

  const leftWidgets = useMemo(() => {
    const leftIds: DashboardWidgetId[] = [
      'hr-overview',
      'sales-analytics',
      'dispatch-summary',
      'departments',
    ]
    return widgetOrder.filter((id) => leftIds.includes(id))
  }, [widgetOrder])

  const rightWidgets = useMemo(() => {
    const rightIds: DashboardWidgetId[] = ['stock-summary', 'attention']
    return widgetOrder.filter((id) => rightIds.includes(id))
  }, [widgetOrder])

  useEffect(() => {
    if (!currentUser) {
      router.push('/auth/login')
      return
    }

    loadDashboard()
    // Refresh every 2 minutes instead of 30 seconds for better performance
    const interval = setInterval(() => {
      loadDashboard()
    }, 120000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadBranding()
  }, [])

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
      setIsRefreshing(true)
      setError(null)

      const statsRes = await api.dashboard.getStats()
      
      if (!statsRes.success) {
        throw new Error((statsRes as any).message || 'Failed to fetch dashboard stats')
      }
      
      const payload = (statsRes as any).data

      setData({
        users: payload.users || [],
        kpis: payload.kpis || [],
        awards: payload.awards || [],
        performances: payload.performances || [],
        attendance: payload.attendance || [],
        leaveRequests: payload.leaveRequests || [],
        payroll: payload.payroll || [],
        meetings: payload.meetings || [],
        reports: payload.reports || [],
        feedback: payload.feedback || [],
        pdps: payload.pdps || [],
        stockInvoices: payload.stockInvoices || [],
        stockProducts: payload.stockProducts || [],
        stockQuotations: payload.stockQuotations || [],
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
      setIsRefreshing(false)
    }
  }

  const brand = useMemo(() => ({
    name: branding?.name?.trim() || 'Organization',
    logo: branding?.logo || '',
    primary: branding?.primaryColor || '#2563eb',
    secondary: branding?.secondaryColor || '#059669',
    accent: branding?.accentColor || '#f59e0b',
    background: branding?.backgroundColor || '#f5f7fb',
    text: branding?.textColor || '#111827',
  }), [branding])

  const stats = useMemo(() => {
    const users = data.users
    const activeUsers = users.filter((u) => u.status !== 'inactive').length
    const departments = Array.from(new Set(users.map((u) => u.department).filter(Boolean)))
    const totalLeavePending = data.leaveRequests.filter((r: any) => r.status === 'pending').length
    const meetingsThisMonth = data.meetings.filter((m: any) => {
      const date = new Date(m.scheduled_at || m.scheduled_start || m.createdAt)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length
    const reportsThisMonth = data.reports.filter((r: any) => {
      const date = new Date(r.createdAt || r.created_at)
      const now = new Date()
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }).length
    const payrollProcessed = data.payroll.filter((p: any) => ['processed', 'paid'].includes(p.status)).length
    const avgPerformance = data.performances.length
      ? data.performances.reduce((sum: number, p: any) => sum + Number(p.overall_score || 0), 0) / data.performances.length
      : 0

    return {
      totalUsers: users.length,
      activeUsers,
      departments: departments.length,
      kpis: data.kpis.length,
      awards: data.awards.length,
      avgPerformance,
      pendingLeave: totalLeavePending,
      meetingsThisMonth,
      reportsThisMonth,
      payrollProcessed,
    }
  }, [data])

  const departmentRows = useMemo<DepartmentRow[]>(() => {
    const now = new Date()
    const users = data.users
    const meetingSet = data.meetings.filter((m: any) => {
      const date = new Date(m.scheduled_at || m.createdAt)
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    })

    return departmentOrder
      .map((name) => {
        const departmentUsers = users.filter((u) => (u.department || 'Unassigned') === name)
        const deptUserIds = departmentUsers.map((u) => String(u._id || (u as any).userId))
        const deptPerformances = data.performances.filter((p: any) => deptUserIds.includes(String(p.user_id)))
        const pendingLeave = data.leaveRequests.filter((r: any) => deptUserIds.includes(String(r.user_id)) && r.status === 'pending').length
        const reportsThisMonth = data.reports.filter((r: any) => {
          const userId = String(r.user_id?._id || r.user_id)
          return deptUserIds.includes(userId)
        }).length
        const attendanceRecords = data.attendance.filter((a: any) => deptUserIds.includes(String(a.user_id)))
        const attended = attendanceRecords.filter((a: any) => ['present', 'late', 'half_day'].includes(a.status)).length
        const attendanceRate = attendanceRecords.length ? Math.round((attended / attendanceRecords.length) * 100) : 0
        const avgPerformance = deptPerformances.length
          ? deptPerformances.reduce((sum: number, p: any) => sum + Number(p.overall_score || 0), 0) / deptPerformances.length
          : 0

        return {
          name,
          headcount: departmentUsers.length,
          avgPerformance: Number(avgPerformance.toFixed(1)),
          pendingLeave,
          meetingsThisMonth: meetingSet.filter((m: any) => deptUserIds.includes(String(m.organizer_id))).length,
          reportsThisMonth,
          attendanceRate,
        }
      })
      .filter((row) => row.headcount > 0)
      .sort((a, b) => b.headcount - a.headcount)
  }, [data])

  const performanceChart = useMemo(() => departmentRows.map((d) => ({ name: d.name, performance: d.avgPerformance })), [departmentRows])

  const attentionItems = useMemo(() => {
    const items: Array<{ label: string; value: string; tone?: string }> = []
    const lowAttendance = departmentRows.filter((d) => d.attendanceRate > 0 && d.attendanceRate < 85)
    if (lowAttendance.length > 0) {
      items.push({ label: 'Attendance below 85%', value: lowAttendance.map((d) => d.name).join(', '), tone: 'text-amber-700' })
    }
    if (stats.pendingLeave > 0) {
      items.push({ label: 'Pending leave requests', value: String(stats.pendingLeave), tone: 'text-blue-700' })
    }
    if (stats.reportsThisMonth > 0) {
      items.push({ label: 'Reports this month', value: String(stats.reportsThisMonth), tone: 'text-emerald-700' })
    }
    if (items.length === 0) {
      items.push({ label: 'System status', value: 'Stable across departments', tone: 'text-emerald-700' })
    }
    return items.slice(0, 3)
  }, [departmentRows, stats.pendingLeave, stats.reportsThisMonth])

  const dispatchSummary = useMemo(() => {
    const now = new Date()
    const monthlyInvoices = data.stockInvoices.filter((invoice: any) => {
      const activityDate = new Date(
        invoice.dispatch?.delivery?.arrivalTime ||
        invoice.dispatch?.dispatchedAt ||
        invoice.createdAt ||
        invoice.updatedAt ||
        0,
      )
      return activityDate.getMonth() === now.getMonth() && activityDate.getFullYear() === now.getFullYear()
    })

    const pendingStatuses = new Set(['not_assigned', 'assigned', 'packing', 'packed'])

    const pending = monthlyInvoices.filter((invoice: any) => pendingStatuses.has(invoice.dispatch?.status || 'not_assigned')).length
    const dispatched = monthlyInvoices.filter((invoice: any) => (invoice.dispatch?.status || '') === 'dispatched').length
    const delivered = monthlyInvoices.filter((invoice: any) => (invoice.dispatch?.status || '') === 'delivered').length

    return { pending, dispatched, delivered }
  }, [data.stockInvoices])

  const attendanceToday = useMemo(() => {
    const now = new Date()
    const isSameDay = (value: any) => {
      const date = new Date(value)
      return date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    }

    const todayRecords = data.attendance.filter((row: any) => isSameDay(row.date || row.createdAt))
    const checkedIn = todayRecords.filter((row: any) => Boolean(row.checkIn)).length
    const checkedOut = todayRecords.filter((row: any) => Boolean(row.checkOut)).length
    const pendingCheckOut = Math.max(0, checkedIn - checkedOut)

    return {
      checkedIn,
      checkedOut,
      pendingCheckOut,
    }
  }, [data.attendance])

  const inventorySummary = useMemo(() => {
    const quotationsGenerated = data.stockQuotations.length
    const invoicesConverted = data.stockInvoices.filter((invoice: any) => invoice.quotationId || invoice.quotationNumber).length

    const salesByUser = new Map<string, number>()
    data.stockInvoices.forEach((invoice: any) => {
      const actorId = String(invoice.createdBy || '')
      if (!actorId) return
      salesByUser.set(actorId, (salesByUser.get(actorId) || 0) + Number(invoice.subTotal || 0))
    })

    let leadingSalesPerson = 'No sales data'
    let leadingSalesAmount = 0
    for (const [userId, amount] of salesByUser.entries()) {
      if (amount > leadingSalesAmount) {
        const user = data.users.find((u) => String(u._id) === userId)
        leadingSalesPerson = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : userId
        leadingSalesAmount = amount
      }
    }

    return {
      quotationsGenerated,
      invoicesConverted,
      leadingSalesPerson,
      leadingSalesAmount,
    }
  }, [data.stockInvoices, data.stockQuotations, data.users])

  const salesAnalytics = useMemo(() => {
    const products = data.stockProducts || []
    const mostInStock = products
      .slice()
      .sort((a: any, b: any) => Number(b.currentQuantity || 0) - Number(a.currentQuantity || 0))
      .slice(0, 5)

    const outOfStock = products
      .filter((product: any) => Number(product.currentQuantity || 0) <= 0)
      .sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')))

    const salesByProduct = new Map<string, { productName: string; soldQuantity: number; salesAmount: number }>()
    data.stockInvoices.forEach((invoice: any) => {
      const items = Array.isArray(invoice.items) ? invoice.items : []
      items.forEach((item: any) => {
        const key = String(item.productId || item.productName || '')
        if (!key) return
        const existing = salesByProduct.get(key) || {
          productName: String(item.productName || item.product?.name || item.name || 'Unknown'),
          soldQuantity: 0,
          salesAmount: 0,
        }
        existing.soldQuantity += Number(item.quantity || 0)
        existing.salesAmount += Number(item.lineTotal || 0)
        salesByProduct.set(key, existing)
      })
    })

    const topSelling = Array.from(salesByProduct.values())
      .sort((a, b) => b.soldQuantity - a.soldQuantity)
      .slice(0, 5)

    return {
      mostInStock,
      outOfStock,
      topSelling,
    }
  }, [data.stockInvoices, data.stockProducts])

  const monthlyTrends = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: Number(trendDuration) }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (Number(trendDuration) - 1 - index), 1)
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString('default', { month: 'short' }),
        meetings: 0,
        reports: 0,
        invoices: 0,
      }
    })

    const indexByMonth = new Map(months.map((month, index) => [month.key, index]))

    const attach = (value: any, field: 'meetings' | 'reports' | 'invoices') => {
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const monthIndex = indexByMonth.get(key)
      if (monthIndex === undefined) return
      months[monthIndex][field] += 1
    }

    data.meetings.forEach((meeting: any) => attach(meeting.scheduled_at || meeting.createdAt, 'meetings'))
    data.reports.forEach((report: any) => attach(report.createdAt || report.created_at, 'reports'))
    data.stockInvoices.forEach((invoice: any) => attach(invoice.createdAt || invoice.updatedAt, 'invoices'))

    return months
  }, [data.meetings, data.reports, data.stockInvoices, trendDuration])

  const quickActions = useMemo(() => {
    const actions = [
      { label: 'New invoice', description: 'Create stock invoice', href: '/admin/stock/invoices' },
      { label: 'Add product', description: 'Open stock products', href: '/admin/stock' },
      { label: 'Dispatch', description: 'Manage dispatch pipeline', href: '/admin/stock/dispatch' },
      { label: 'Add staff', description: 'Register employee account', href: '/admin/users' },
      { label: 'Review leave', description: 'Pending leave requests', href: '/admin/leave' },
      { label: 'Open reports', description: 'View submitted reports', href: '/admin/reports' },
    ]

    const query = dashboardSearch.trim().toLowerCase()
    if (!query) return actions.slice(0, 4)
    return actions.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(query)).slice(0, 6)
  }, [dashboardSearch])

  const activityFeed = useMemo(() => {
    const items: Array<{ label: string; detail: string; timestamp: Date; href: string }> = []

    data.stockInvoices.slice(0, 8).forEach((invoice: any) => {
      const time = new Date(invoice.updatedAt || invoice.createdAt || 0)
      if (Number.isNaN(time.getTime())) return
      const invoiceNumber = invoice.invoiceNumber || invoice.number || String(invoice._id || '').slice(-6)
      items.push({
        label: `Invoice ${invoiceNumber}`,
        detail: 'Updated in stock billing',
        timestamp: time,
        href: '/admin/stock/invoices',
      })
    })

    data.leaveRequests.slice(0, 8).forEach((request: any) => {
      const time = new Date(request.updatedAt || request.createdAt || 0)
      if (Number.isNaN(time.getTime())) return
      items.push({
        label: `Leave ${request.status || 'request'}`,
        detail: `${request.leave_type || 'Leave'} request updated`,
        timestamp: time,
        href: '/admin/leave',
      })
    })

    data.meetings.slice(0, 8).forEach((meeting: any) => {
      const time = new Date(meeting.updatedAt || meeting.scheduled_at || meeting.createdAt || 0)
      if (Number.isNaN(time.getTime())) return
      items.push({
        label: meeting.title || 'Meeting update',
        detail: 'Meeting activity captured',
        timestamp: time,
        href: '/admin/meetings',
      })
    })

    return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 6)
  }, [data.leaveRequests, data.meetings, data.stockInvoices])

  const stockSeverity = useMemo(() => {
    const products = data.stockProducts || []
    const critical = products.filter((product: any) => Number(product.currentQuantity || 0) <= 0)
    const warning = products.filter((product: any) => Number(product.currentQuantity || 0) > 0 && Number(product.currentQuantity || 0) < 5)
    const low = products.filter((product: any) => Number(product.currentQuantity || 0) >= 5 && Number(product.currentQuantity || 0) < 10)
    return { critical, warning, low }
  }, [data.stockProducts])

  const kpiTrends = useMemo(() => {
    const now = new Date()
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const previousMonth = previousMonthDate.getMonth()
    const previousYear = previousMonthDate.getFullYear()

    const countInMonth = (rows: any[], valueGetter: (row: any) => any) => {
      let current = 0
      let previous = 0
      rows.forEach((row) => {
        const value = valueGetter(row)
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) return
        const month = date.getMonth()
        const year = date.getFullYear()
        if (month === thisMonth && year === thisYear) current += 1
        if (month === previousMonth && year === previousYear) previous += 1
      })
      return { current, previous }
    }

    const newEmployees = countInMonth(data.users, (row) => row.createdAt)
    const leaveRequests = countInMonth(data.leaveRequests, (row) => row.createdAt || row.updatedAt)
    const meetings = countInMonth(data.meetings, (row) => row.scheduled_at || row.createdAt)
    const invoices = countInMonth(data.stockInvoices, (row) => row.createdAt || row.updatedAt)

    const toPercentDelta = (current: number, previous: number) => {
      if (previous <= 0) {
        if (current <= 0) return 0
        return 100
      }
      return Math.round(((current - previous) / previous) * 100)
    }

    return {
      employees: toPercentDelta(newEmployees.current, newEmployees.previous),
      leave: toPercentDelta(leaveRequests.current, leaveRequests.previous),
      meetings: toPercentDelta(meetings.current, meetings.previous),
      invoices: toPercentDelta(invoices.current, invoices.previous),
    }
  }, [data.leaveRequests, data.meetings, data.stockInvoices, data.users])

  const dispatchChartData = useMemo(() => [
    { name: 'Pending', value: dispatchSummary.pending, color: brand.accent },
    { name: 'Dispatched', value: dispatchSummary.dispatched, color: brand.primary },
    { name: 'Delivered', value: dispatchSummary.delivered, color: brand.secondary },
  ], [brand.accent, brand.primary, brand.secondary, dispatchSummary.delivered, dispatchSummary.dispatched, dispatchSummary.pending])

  const topPurchasingClients = useMemo(() => {
    const clientSpending = new Map<string, { name: string; spent: number; invoiceCount: number }>()
    data.stockInvoices.forEach((invoice: any) => {
      const rawClient = invoice.clientName || invoice.client || invoice.buyer || 'Unknown'
      const clientName = typeof rawClient === 'string'
        ? rawClient
        : typeof rawClient === 'number'
          ? String(rawClient)
          : rawClient && typeof rawClient === 'object'
            ? String(rawClient.name || rawClient.companyName || rawClient.number || rawClient.location || rawClient.email || 'Unknown')
            : 'Unknown'
      const key = clientName.toLowerCase()
      const spent = Number(invoice.subTotal || 0)
      if (!clientSpending.has(key)) {
        clientSpending.set(key, { name: clientName, spent: 0, invoiceCount: 0 })
      }
      const existing = clientSpending.get(key)!
      existing.spent += spent
      existing.invoiceCount += 1
    })

    return Array.from(clientSpending.values())
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 8)
  }, [data.stockInvoices])

  const stockTrends = useMemo(() => {
    return salesAnalytics.topSelling
      .slice(0, 6)
      .map((item) => ({
        name: item.productName,
        soldQuantity: item.soldQuantity,
      }))
  }, [salesAnalytics.topSelling])

  const totalAlerts = stockSeverity.critical.length + stats.pendingLeave

  if (loading && !data.users.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse space-y-4 w-full max-w-4xl px-6">
          <div className="h-8 bg-slate-200 rounded w-72" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
            ))}
          </div>
          <div className="grid xl:grid-cols-[1.7fr_1fr] gap-4">
            <div className="h-96 bg-slate-200 rounded-2xl" />
            <div className="h-96 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden p-2 sm:p-4 lg:p-6 bg-slate-50"
      style={{
        color: brand.text,
      }}
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-4 lg:space-y-6">
        <div
          className="rounded-2xl border px-4 sm:px-5 py-3 sm:py-4 shadow-sm"
          style={{
            borderColor: hexToRgba(brand.primary, 0.2),
            background: `linear-gradient(120deg, ${hexToRgba(brand.primary, 0.1)} 0%, #ffffff 55%)`,
          }}
        >
          <div className="flex flex-col gap-3 lg:gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Administration</p>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">Here&apos;s what&apos;s happening today across {brand.name}.</p>
              <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <Badge variant="secondary" className="bg-white/80 text-slate-700 text-xs">{stats.activeUsers} active staff</Badge>
                <Badge variant="secondary" className="bg-white/80 text-slate-700 text-xs">{stats.pendingLeave} leave pending</Badge>
                <Badge variant="secondary" className="bg-white/80 text-slate-700 text-xs">{data.stockInvoices.length} invoices</Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 sm:justify-end">
              <Badge variant="outline" className="gap-1.5 border-slate-300 bg-white text-slate-700 text-xs sm:text-sm hidden sm:flex">
                <Clock3 className="h-3.5 w-3.5" />
                {lastUpdatedAt ? `Last updated ${formatTime(lastUpdatedAt)}` : 'Updating...'}
              </Badge>
              <Button variant="outline" size="sm" className="bg-white text-slate-700" onClick={loadDashboard}>
                <RefreshCw className={`mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <DashboardWidgetsMenu order={widgetOrder} onChange={setWidgetOrder} />
              <Button variant="outline" size="sm" className="gap-1.5 bg-white">
                <Bell className="h-3.5 w-3.5" />
                {totalAlerts > 0 && <span className="rounded-full bg-rose-500 px-1 text-[9px] font-semibold text-white">{totalAlerts}</span>}
              </Button>
              <Link href="/admin/users">
                <Button size="sm" className="gap-1.5 text-white" style={{ backgroundColor: brand.primary }}>
                  <UserPlus size={14} />
                  <span className="hidden sm:inline">Add Staff</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

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

        {/* Main grid */}
        <div className="grid gap-4 lg:gap-6 xl:grid-cols-[1.65fr_1fr]">
          <div className="space-y-4 lg:space-y-6">
            {leftWidgets.map((widgetId) => {
              if (widgetId === 'hr-overview') {
                return (
            <div key={widgetId} className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-2 lg:grid-cols-5">
              <MetricCard accentColor={brand.primary} trend={kpiTrends.employees} label="Total Employees" mobileLabel="Employees" value={stats.totalUsers} sublabel={`${stats.activeUsers} active`} mobileSublabel={`${stats.activeUsers} active`} icon={<Users className="h-5 w-5" />} />
              <MetricCard className="hidden sm:block" accentColor={brand.secondary} trend={kpiTrends.meetings} label="Meetings" mobileLabel="Meet" value={stats.meetingsThisMonth} sublabel="Scheduled this month" mobileSublabel="month" icon={<ClipboardCheck className="h-5 w-5" />} />
              <MetricCard accentColor={brand.accent} trend={kpiTrends.leave * -1} label="Pending Leave" mobileLabel="Leave" value={stats.pendingLeave} sublabel="Requires review" mobileSublabel="pending" icon={<CalendarDays className="h-5 w-5" />} />
              <MetricCard accentColor={brand.primary} trend={kpiTrends.invoices} label="Invoices" mobileLabel="Invoices" value={data.stockInvoices.length} sublabel="Billing activity" mobileSublabel="bills" icon={<DollarSign className="h-5 w-5" />} />
              <MetricCard accentColor={brand.secondary} trend={0} label="Quotations" mobileLabel="Quotation" value={data.stockQuotations.length} sublabel="Stock quotations" mobileSublabel="quotes" icon={<FileText className="h-5 w-5" />} />
            </div>
                )
              }

              if (widgetId === 'sales-analytics') {
                return (
            <div key={widgetId} className="grid gap-4 xl:grid-cols-2">
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg font-semibold text-slate-900">Operational trends</CardTitle>
                    <Select value={trendDuration} onValueChange={(value) => setTrendDuration(value as '1' | '3' | '6')}>
                      <SelectTrigger className="w-32 h-9">
                        <SelectValue placeholder="Duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 month</SelectItem>
                        <SelectItem value="3">3 months</SelectItem>
                        <SelectItem value="6">6 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="h-44 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="invoices" stroke={brand.primary} strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="meetings" stroke={brand.secondary} strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="reports" stroke={brand.accent} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg font-semibold text-slate-900">Sales performance</CardTitle>
                </CardHeader>
                <CardContent className="h-40 sm:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceChart}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="performance" radius={[8, 8, 0, 0]} fill={brand.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
                )
              }

              if (widgetId === 'dispatch-summary') {
                return (
            <div key={widgetId} className="grid gap-4 xl:grid-cols-2">
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base sm:text-lg font-semibold text-slate-900">Dispatch activity</CardTitle>
                    <Link href="/admin/stock/dispatch"><Button variant="outline" size="sm">Open dispatch</Button></Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="space-y-2">
                      {dispatchChartData.map((item) => (
                        <div key={item.name} className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{item.name}</span>
                            <span className="font-semibold text-slate-900">{item.value}</span>
                          </div>
                          <Progress value={dispatchChartData.reduce((sum, entry) => sum + entry.value, 0) === 0 ? 0 : (item.value / dispatchChartData.reduce((sum, entry) => sum + entry.value, 0)) * 100} className="mt-2 h-2" />
                        </div>
                      ))}
                    </div>
                    <div className="hidden h-32 w-32 sm:block sm:h-40 sm:w-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={dispatchChartData} innerRadius={46} outerRadius={70} paddingAngle={2} dataKey="value">
                            {dispatchChartData.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg font-semibold text-slate-900">Recent activity</CardTitle>
                    <Activity className="h-4 w-4 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activityFeed.length === 0 ? (
                    <p className="text-sm text-slate-500">No recent updates found.</p>
                  ) : (
                    activityFeed.map((item, index) => (
                      <Link key={`${item.label}-${index}`} href={item.href}>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-white">
                          <div className="flex items-center justify-between gap-3">
                            <p className="truncate text-sm font-medium text-slate-800">{item.label}</p>
                            <span className="shrink-0 text-[11px] text-slate-500">{formatRelativeTime(item.timestamp)}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">{item.detail}</p>
                        </div>
                      </Link>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
                )
              }

              if (widgetId === 'departments') {
                return (
            <div key={widgetId} className="grid gap-4 lg:grid-cols-2">
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg font-semibold text-slate-900">Department snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                    {departmentRows.map((dept) => (
                      <div key={dept.name} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">{dept.name}</p>
                            <p className="text-xs text-slate-500">{dept.headcount} members</p>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{dept.reportsThisMonth} reports</Badge>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500"><span>Attendance</span><span>{dept.attendanceRate}%</span></div>
                            <Progress value={dept.attendanceRate} className="h-2" />
                          </div>
                          <div>
                            <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500"><span>Performance</span><span>{dept.avgPerformance}</span></div>
                            <Progress value={Math.min(100, Math.round((dept.avgPerformance || 0) * 10))} className="h-2" />
                          </div>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-[10px]">
                          <StatPill label="Leave" value={`${dept.pendingLeave}`} />
                          <StatPill label="Meetings" value={`${dept.meetingsThisMonth}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base sm:text-lg font-semibold text-slate-900">Top purchasing clients</CardTitle>
                </CardHeader>
                <CardContent>
                  {topPurchasingClients.length === 0 ? (
                    <p className="text-sm text-slate-500">No purchasing data yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {topPurchasingClients.map((client, index) => (
                        <div key={`${client.name}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">{client.name}</p>
                            <p className="text-xs text-slate-500">{client.invoiceCount} invoices</p>
                          </div>
                          <div className="text-right pl-2">
                            <p className="text-sm font-semibold text-slate-900">KES {Math.round(client.spent).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
                )
              }

              return null
            })}
          </div>

          <div className="space-y-4 lg:space-y-6">
            {rightWidgets.map((widgetId) => {
              if (widgetId === 'stock-summary') {
                return (
            <Card key={widgetId} className="overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Inventory insights</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">Summary</h2>
              </div>
              <CardContent className="space-y-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <SidebarMetric accentColor={brand.primary} label="Quotations" value={inventorySummary.quotationsGenerated} />
                  <SidebarMetric accentColor={brand.secondary} label="Invoices Converted" value={inventorySummary.invoicesConverted} />
                  <SidebarMetric accentColor={brand.accent} label="Top Seller" value={inventorySummary.leadingSalesPerson} />
                  <SidebarMetric accentColor={brand.primary} label="Top Sales Value" value={`KES ${Math.round(inventorySummary.leadingSalesAmount).toLocaleString()}`} />
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <InsightRow label="Out-of-stock ratio" value={`${data.stockProducts.length ? Math.round((stockSeverity.critical.length / data.stockProducts.length) * 100) : 0}%`} progress={data.stockProducts.length ? (stockSeverity.critical.length / data.stockProducts.length) * 100 : 0} />
                  <InsightRow label="Quotation conversion" value={`${inventorySummary.quotationsGenerated ? Math.round((inventorySummary.invoicesConverted / inventorySummary.quotationsGenerated) * 100) : 0}%`} progress={inventorySummary.quotationsGenerated ? (inventorySummary.invoicesConverted / inventorySummary.quotationsGenerated) * 100 : 0} />
                  <InsightRow label="Attendance checkout completion" value={`${attendanceToday.checkedIn ? Math.round((attendanceToday.checkedOut / attendanceToday.checkedIn) * 100) : 0}%`} progress={attendanceToday.checkedIn ? (attendanceToday.checkedOut / attendanceToday.checkedIn) * 100 : 0} />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
                    <PackageCheck className="h-4 w-4" />
                    Stock quick links
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/admin/stock/quotations"><Button variant="secondary" className="w-full justify-start">Quotations</Button></Link>
                    <Link href="/admin/stock/invoices"><Button variant="secondary" className="w-full justify-start">Invoices</Button></Link>
                    <Link href="/admin/stock/dispatch"><Button variant="secondary" className="w-full justify-start">Dispatch</Button></Link>
                    <Link href="/admin/stock/sales"><Button variant="secondary" className="w-full justify-start">Sales</Button></Link>
                  </div>
                </div>
              </CardContent>
            </Card>
                )
              }

              if (widgetId === 'attention') {
                return (
            <div key={widgetId} className="space-y-4">
            <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-900">Stock risk center</CardTitle>
                  <TriangleAlert className="h-4 w-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible defaultValue="critical" className="w-full space-y-2">
                  <AccordionItem value="critical" className="rounded-xl border border-rose-200 bg-rose-50 px-3">
                    <AccordionTrigger className="py-3 text-sm font-medium text-rose-700 hover:no-underline">
                      Critical (0 stock) • {stockSeverity.critical.length}
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <SeverityList items={stockSeverity.critical} tone="critical" />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="warning" className="rounded-xl border border-amber-200 bg-amber-50 px-3">
                    <AccordionTrigger className="py-3 text-sm font-medium text-amber-700 hover:no-underline">
                      Warning (&lt; 5) • {stockSeverity.warning.length}
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <SeverityList items={stockSeverity.warning} tone="warning" />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="low" className="rounded-xl border border-blue-200 bg-blue-50 px-3">
                    <AccordionTrigger className="py-3 text-sm font-medium text-blue-700 hover:no-underline">
                      Low stock (&lt; 10) • {stockSeverity.low.length}
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <SeverityList items={stockSeverity.low} tone="low" />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="stock-trend" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <AccordionTrigger className="px-5 py-4 text-left hover:no-underline">
                  <div className="flex w-full items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Analytics</p>
                      <h3 className="text-base sm:text-lg font-semibold text-slate-900">Stock trend centre</h3>
                    </div>
                    <BarChart3 className="h-4 w-4 shrink-0 text-slate-400" />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5">
                  <div className="h-56 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stockTrends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={72} />
                        <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="soldQuantity" fill={brand.primary} radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            </div>
                )
              }

              return null
            })}
          </div>

        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  mobileLabel,
  value,
  sublabel,
  mobileSublabel,
  icon,
  accentColor,
  trend,
  className,
}: {
  label: string
  mobileLabel?: string
  value: string | number
  sublabel: string
  mobileSublabel?: string
  icon: React.ReactNode
  accentColor?: string
  trend?: number
  className?: string
}) {
  const trendValue = Math.round(Number(trend || 0))
  const isPositive = trendValue >= 0
  return (
    <Card className={`min-w-0 rounded-md border-slate-200 bg-white shadow-sm sm:rounded-2xl ${className || ''}`}>
      <CardContent className="h-[68px] px-1 py-1.5 sm:h-auto sm:p-3.5">
        <div className="flex h-full min-w-0 flex-col items-center justify-center text-center sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:text-left">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold uppercase leading-none tracking-normal text-slate-500 sm:text-xs sm:font-medium sm:tracking-wide">
              <span className="sm:hidden">{mobileLabel || label}</span>
              <span className="hidden sm:inline">{label}</span>
            </p>
            <p className="mt-1 truncate text-lg font-semibold leading-none text-slate-900 sm:mt-2 sm:text-3xl">{value}</p>
            <p className="mt-1 truncate text-[9.5px] leading-none text-slate-500 sm:hidden">{mobileSublabel || sublabel}</p>
            <div className="mt-1 flex min-w-0 items-center justify-center sm:mt-2 sm:justify-start sm:gap-2">
              <p className="hidden min-w-0 flex-1 truncate text-xs text-slate-500 sm:block">{sublabel}</p>
              <span className={`inline-flex max-w-full shrink-0 items-center justify-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none sm:text-[10px] ${isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {isPositive ? <ArrowUpRight className="hidden h-3 w-3 sm:block" /> : <ArrowDownRight className="hidden h-3 w-3 sm:block" />} {Math.abs(trendValue)}%
              </span>
            </div>
          </div>
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 sm:flex" style={{ color: accentColor || '#334155' }}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function SmallMetric({ icon, label, value, accentColor }: { icon: React.ReactNode; label: string; value: number | string; accentColor?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-md" style={{ color: accentColor || '#475569' }}>{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function SidebarMetric({ label, value, accentColor }: { label: string; value: number | string; accentColor?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function InsightRow({ label, value, progress }: { label: string; value: string; progress: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{value}</span>
      </div>
      <Progress value={Math.max(0, Math.min(100, progress))} className="h-2" />
    </div>
  )
}

function SeverityList({ items, tone }: { items: any[]; tone: 'critical' | 'warning' | 'low' }) {
  if (!items.length) {
    return <p className="text-xs text-slate-500">No products in this range.</p>
  }

  const textClass = tone === 'critical' ? 'text-rose-700' : tone === 'warning' ? 'text-amber-700' : 'text-blue-700'

  return (
    <div className="space-y-1.5">
      {items.slice(0, 6).map((product: any) => (
        <div key={String(product._id || product.name)} className="flex items-center justify-between rounded-md border border-white/70 bg-white/70 px-2 py-1.5 text-xs">
          <span className={`truncate pr-2 ${textClass}`}>{product.name}</span>
          <span className={`font-semibold ${textClass}`}>{Number(product.currentQuantity || 0)}</span>
        </div>
      ))}
      {items.length > 6 && <p className="text-[11px] text-slate-500">+{items.length - 6} more products</p>}
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white border border-slate-200 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function hexToRgba(color: string, alpha: number) {
  if (!color) return `rgba(37, 99, 235, ${alpha})`

  const normalized = color.replace('#', '')
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16)
    const g = parseInt(normalized[1] + normalized[1], 16)
    const b = parseInt(normalized[2] + normalized[2], 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  if (normalized.length === 6) {
    const r = parseInt(normalized.slice(0, 2), 16)
    const g = parseInt(normalized.slice(2, 4), 16)
    const b = parseInt(normalized.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return color
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
