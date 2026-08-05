"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { 
  Target, 
  CheckSquare, 
  Mail, 
  Package, 
  Clock, 
  ClipboardList, 
  Wallet, 
  CalendarDays, 
  Bell, 
  ChevronRight,
  ListChecks,
  Truck,
  FileText,
  MessageSquare,
  LayoutDashboard
} from "lucide-react"
import API_URL from "@/lib/apiBase"
import { getToken, getUser } from "@/lib/auth"
import { api } from "@/lib/api"

interface Task {
  _id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  due_date?: string
  completed_at?: string
  createdAt: string
  source_label?: string
  related_entity_type?: string
  related_entity_id?: string
  is_packaging_duty?: boolean
}

interface PerformanceRecord {
  _id: string
  user_id: string
  period: string
  overall_score: number
  attendance_score: number
  feedback_score: number
  status: "pending" | "completed" | "reviewed"
  kpi_scores: Array<{ kpi_id: string; score: number; achieved?: number; target?: number }>
}

interface MessageItem {
  _id: string
  is_read?: boolean
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const COLORS = ["#2563eb", "#059669", "#f59e0b", "#8b5cf6"]

function getCurrentPeriod() {
  const now = new Date()
  const quarter = Math.floor(now.getMonth() / 3) + 1
  return `${now.getFullYear()}-Q${quarter}`
}

export default function EmployeeDashboard() {
  const [user, setUser] = useState<any>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [messagesUnread, setMessagesUnread] = useState(0)
  const [performance, setPerformance] = useState<PerformanceRecord | null>(null)
  const [leaveBalance, setLeaveBalance] = useState<any>(null)
  const [payslipsCount, setPayslipsCount] = useState(0)
  const [meetingsCount, setMeetingsCount] = useState(0)
  const [alertsCount, setAlertsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [branding, setBranding] = useState<{ primaryColor?: string; secondaryColor?: string }>({})

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  useEffect(() => {
    const currentUser = getUser()
    setUser(currentUser)
  }, [])

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const token = getToken()
        const currentUser = getUser()
        if (!token || !currentUser) return

        const userId = currentUser.userId || currentUser._id
        const period = getCurrentPeriod()

        // Load branding first
        try {
          const brandingRes = await fetch(`${API_URL}/api/company/branding`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const brandingData = await brandingRes.json()
          if (brandingData.success) {
            setBranding(brandingData.data || {})
          }
        } catch {
          // Silently fail
        }

        const [tasksRes, messagesRes, performanceRes, alertsRes, leaveRes, payslipsRes, meetingsRes] = await Promise.all([
          fetch(`${API_URL}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/messages/inbox`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/performance/${userId}/${period}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/alerts`, { headers: { Authorization: `Bearer ${token}` } }),
          api.leave.getBalance(),
          api.payroll.getMyPayslips(),
          api.meetings.getAll(),
        ])

        const [tasksJson, messagesJson, performanceJson, alertsJson] = await Promise.all([
          tasksRes.json(),
          messagesRes.json(),
          performanceRes.json(),
          alertsRes.json(),
        ])

        if (tasksJson.success) setTasks(tasksJson.data || [])
        if (messagesJson.success) {
          const unread = ((messagesJson.data as MessageItem[]) || []).filter((message) => !message.is_read).length
          setMessagesUnread(unread)
        }
        if (performanceJson.success) setPerformance(performanceJson.data || null)
        if (alertsJson.success) {
          setAlertsCount(((alertsJson.data as any[]) || []).filter((alert) => !(alert.isRead ?? alert.is_read)).length)
        }
        if (leaveRes.success) setLeaveBalance(leaveRes.data || null)
        if (payslipsRes.success) setPayslipsCount((payslipsRes.data || []).length)
        if (meetingsRes.success) {
          const upcoming = ((meetingsRes.data as any[]) || []).filter((meeting) => {
            const startsAt = meeting.scheduled_date || meeting.startTime || meeting.date
            return startsAt ? new Date(startsAt).getTime() >= Date.now() : false
          })
          setMeetingsCount(upcoming.length)
        }
      } catch (error) {
        console.error("Failed to load employee dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const derived = useMemo(() => {
    const totalTasks = tasks.length
    const completedTasks = tasks.filter((task) => task.status === "completed").length
    const inProgressTasks = tasks.filter((task) => task.status === "in_progress").length
    const pendingTasks = tasks.filter((task) => task.status === "pending").length
    const cancelledTasks = tasks.filter((task) => task.status === "cancelled").length

    const packagingTasks = tasks.filter(
      (task) =>
        task.is_packaging_duty ||
        task.related_entity_type === "invoice" ||
        String(task.source_label || "").toLowerCase().includes("packaging") ||
        String(task.title || "").toLowerCase().includes("packaging"),
    )
    const packagingCompleted = packagingTasks.filter((task) => task.status === "completed").length
    const overdueTasks = tasks.filter((task) => {
      if (!task.due_date || task.status === "completed") return false
      return new Date(task.due_date).getTime() < Date.now()
    }).length

    const dutyCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    const packagingCompletionRate = packagingTasks.length > 0
      ? Math.round((packagingCompleted / packagingTasks.length) * 100)
      : dutyCompletionRate

    const performanceScore = Number(performance?.overall_score || 0)
    const attendanceScore = Number(performance?.attendance_score || 0)
    const feedbackScore = Number(performance?.feedback_score || 0)

    const uniqueKpi = Math.min(
      100,
      Math.max(
        0,
        Math.round(
          performanceScore * 0.5 +
            dutyCompletionRate * 0.3 +
            packagingCompletionRate * 0.2,
        ),
      ),
    )

    const taskStatusData = [
      { name: "Completed", value: completedTasks },
      { name: "In Progress", value: inProgressTasks },
      { name: "Pending", value: pendingTasks },
      { name: "Cancelled", value: cancelledTasks },
    ]

    const priorityData = ["urgent", "high", "medium", "low"].map((priority) => ({
      name: priority.charAt(0).toUpperCase() + priority.slice(1),
      value: tasks.filter((task) => task.priority === priority).length,
    }))

    const recentTasks = [...tasks]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6)

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      pendingTasks,
      cancelledTasks,
      packagingTasks,
      packagingCompleted,
      overdueTasks,
      dutyCompletionRate,
      packagingCompletionRate,
      performanceScore,
      attendanceScore,
      feedbackScore,
      uniqueKpi,
      taskStatusData,
      priorityData,
      recentTasks,
    }
  }, [tasks, performance])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2" style={{ borderColor: primaryColor }} />
      </div>
    )
  }

  // Quick links data for compact mobile display
  const quickLinks = [
    { href: "/employee/tasks", icon: ListChecks, label: "Tasks", color: "text-blue-500" },
    { href: "/employee/dispatch", icon: Truck, label: "Dispatch", color: "text-amber-500" },
    { href: "/employee/reports", icon: FileText, label: "Reports", color: "text-emerald-500" },
    { href: "/employee/messages", icon: MessageSquare, label: "Messages", color: "text-purple-500" },
  ]

  return (
    <div className="space-y-5 pb-6">
      {/* Header Section */}
      <div className="rounded-2xl border px-4 py-3 shadow-sm" style={{ borderColor: primaryBorderColor, background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})` }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium tracking-wide" style={{ color: primaryColor }}>Dashboard</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Welcome, {user?.first_name || user?.firstName || "Employee"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Your dashboard is driven by your actual duties, packaging work, and live performance.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="self-start shrink-0">
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards - Mobile optimized with 2-column grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Unique KPI</p>
                <p className="text-lg sm:text-3xl font-bold mt-0.5">{derived.uniqueKpi}/100</p>
              </div>
              <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg shrink-0 flex items-center justify-center ml-1.5" style={{ backgroundColor: hexToRgba(primaryColor, 0.1) }}>
                <Target className="w-3.5 h-3.5 sm:w-6 sm:h-6" style={{ color: primaryColor }} />
              </div>
            </div>
            <p className="text-[8px] sm:text-xs text-muted-foreground mt-1 hidden sm:block">
              Based on duties completed, packaging output, and performance score.
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Duties</p>
                <p className="text-lg sm:text-3xl font-bold mt-0.5">{derived.totalTasks}</p>
              </div>
              <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg shrink-0 flex items-center justify-center ml-1.5" style={{ backgroundColor: hexToRgba("#2563eb", 0.1) }}>
                <CheckSquare className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-blue-500" />
              </div>
            </div>
            <p className="text-[8px] sm:text-xs text-blue-500 mt-0.5">
              {derived.completedTasks} done, {derived.pendingTasks} pending
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Packaging</p>
                <p className="text-lg sm:text-3xl font-bold mt-0.5">{derived.packagingTasks.length}</p>
              </div>
              <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg shrink-0 flex items-center justify-center ml-1.5" style={{ backgroundColor: hexToRgba("#f59e0b", 0.1) }}>
                <Package className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-amber-500" />
              </div>
            </div>
            <p className="text-[8px] sm:text-xs text-amber-500 mt-0.5">
              {derived.packagingCompletionRate}% done
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-3 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Messages</p>
                <p className="text-lg sm:text-3xl font-bold mt-0.5">{messagesUnread}</p>
              </div>
              <div className="w-7 h-7 sm:w-12 sm:h-12 rounded-lg shrink-0 flex items-center justify-center ml-1.5" style={{ backgroundColor: hexToRgba("#f59e0b", 0.1) }}>
                <Mail className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-orange-500" />
              </div>
            </div>
            <p className="text-[8px] sm:text-xs text-orange-500 mt-0.5">Unread</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Row - Compact mobile */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
        <Card className="shadow-sm p-2.5 sm:p-5">
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs text-muted-foreground truncate">Leave</p>
              <p className="text-base sm:text-2xl font-semibold">
                {leaveBalance?.remainingDays ?? leaveBalance?.annual?.remaining ?? leaveBalance?.balance ?? "—"}
              </p>
            </div>
            <div className="rounded-lg shrink-0 p-1 sm:p-2" style={{ backgroundColor: hexToRgba("#059669", 0.1) }}>
              <CalendarDays className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-emerald-600" />
            </div>
          </div>
          <Link href="/employee/leave" className="text-[9px] sm:text-xs font-medium inline-flex items-center mt-0.5" style={{ color: primaryColor }}>
            View <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
          </Link>
        </Card>

        <Card className="shadow-sm p-2.5 sm:p-5">
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs text-muted-foreground truncate">Payslips</p>
              <p className="text-base sm:text-2xl font-semibold">{payslipsCount}</p>
            </div>
            <div className="rounded-lg shrink-0 p-1 sm:p-2" style={{ backgroundColor: hexToRgba("#0ea5e9", 0.1) }}>
              <Wallet className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-sky-600" />
            </div>
          </div>
          <Link href="/employee/payslip" className="text-[9px] sm:text-xs font-medium inline-flex items-center mt-0.5" style={{ color: primaryColor }}>
            Open <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
          </Link>
        </Card>

        <Card className="shadow-sm p-2.5 sm:p-5">
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs text-muted-foreground truncate">Meetings</p>
              <p className="text-base sm:text-2xl font-semibold">{meetingsCount}</p>
            </div>
            <div className="rounded-lg shrink-0 p-1 sm:p-2" style={{ backgroundColor: hexToRgba("#8b5cf6", 0.1) }}>
              <Clock className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-violet-600" />
            </div>
          </div>
          <Link href="/employee/meetings" className="text-[9px] sm:text-xs font-medium inline-flex items-center mt-0.5" style={{ color: primaryColor }}>
            View <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
          </Link>
        </Card>

        <Card className="shadow-sm p-2.5 sm:p-5">
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-xs text-muted-foreground truncate">Alerts</p>
              <p className="text-base sm:text-2xl font-semibold">{alertsCount}</p>
            </div>
            <div className="rounded-lg shrink-0 p-1 sm:p-2" style={{ backgroundColor: hexToRgba("#ef4444", 0.1) }}>
              <Bell className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-rose-600" />
            </div>
          </div>
          <Link href="/employee/notifications" className="text-[9px] sm:text-xs font-medium inline-flex items-center mt-0.5" style={{ color: primaryColor }}>
            View <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
          </Link>
        </Card>
      </div>

      {/* Charts - Stack vertically on mobile */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <div>
                <CardTitle className="text-sm sm:text-base">Task Completion</CardTitle>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Your duties in real time.</p>
              </div>
              <Badge variant="outline" className="text-[10px] self-start sm:self-center">{derived.dutyCompletionRate}% done</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={derived.taskStatusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${percent > 0 ? (percent * 100).toFixed(0) : 0}%`}>
                    {derived.taskStatusData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <div>
                <CardTitle className="text-sm sm:text-base">Priority Load</CardTitle>
                <p className="text-[10px] sm:text-xs text-muted-foreground">By urgency level.</p>
              </div>
              <Badge variant="outline" className="text-[10px] self-start sm:self-center">{derived.overdueTasks} overdue</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={derived.priorityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
                  <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: `1px solid var(--border)`,
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                  />
                  <Bar dataKey="value" fill={primaryColor} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks and Performance */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2 sm:pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <div>
                <CardTitle className="text-sm sm:text-base">Recent Duties</CardTitle>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Latest assigned tasks.</p>
              </div>
              <Link href="/employee/tasks">
                <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs h-7 sm:h-9">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {derived.recentTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">No duties assigned yet.</p>
              ) : (
                derived.recentTasks.slice(0, 4).map((task) => {
                  const isPackaging =
                    task.is_packaging_duty ||
                    task.related_entity_type === "invoice" ||
                    String(task.source_label || "").toLowerCase().includes("packaging") ||
                    String(task.title || "").toLowerCase().includes("packaging")

                  return (
                    <div key={task._id} className="rounded-lg border p-2.5 sm:p-4">
                      <div className="flex flex-wrap items-start justify-between gap-1.5">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="font-semibold text-xs sm:text-sm truncate">{task.title}</h3>
                            {isPackaging && <Badge variant="secondary" className="text-[8px] sm:text-[10px]">📦</Badge>}
                            <Badge variant="outline" className="capitalize text-[8px] sm:text-[10px]">
                              {task.status.replace("_", " ")}
                            </Badge>
                          </div>
                          <p className="text-[10px] sm:text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                          <div className="flex flex-wrap gap-1.5 text-[8px] sm:text-xs text-muted-foreground mt-0.5">
                            {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <Badge className="capitalize text-[8px] sm:text-[10px] shrink-0">{task.priority}</Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="rounded-lg border p-2 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-sm text-muted-foreground">Overall</span>
                  <span className="font-semibold text-sm sm:text-base">{derived.performanceScore}/100</span>
                </div>
              </div>
              <div className="rounded-lg border p-2 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-sm text-muted-foreground">Attendance</span>
                  <span className="font-semibold text-sm sm:text-base">{derived.attendanceScore}/100</span>
                </div>
              </div>
              <div className="rounded-lg border p-2 sm:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-sm text-muted-foreground">Feedback</span>
                  <span className="font-semibold text-sm sm:text-base">{derived.feedbackScore}/100</span>
                </div>
              </div>
              <div className="rounded-lg border p-2 sm:p-4" style={{ backgroundColor: hexToRgba(primaryColor, 0.05) }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-sm text-muted-foreground">Period</span>
                  <span className="font-semibold text-xs sm:text-sm">{performance?.period || getCurrentPeriod()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links - Compact icon grid for mobile */}
      <Card className="shadow-sm">
        <CardHeader className="pb-1.5 sm:pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base">Quick Links</CardTitle>
            <LayoutDashboard className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Button 
                  variant="outline" 
                  className="w-full flex flex-col items-center gap-0.5 h-auto py-2 sm:py-3 px-1 sm:px-3"
                >
                  <link.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${link.color}`} />
                  <span className="text-[8px] sm:text-xs font-medium truncate">{link.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}