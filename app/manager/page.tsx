"use client"

import Link from "next/link"
import { useEffect, useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import {
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Send,
  Mail,
  Bell,
  AlertCircle,
} from "lucide-react"
import { companyApi } from "@/lib/api"

interface Brand {
  primary: string
  secondary: string
  accent: string
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export default function ManagerDashboard() {
  const [teamCount, setTeamCount] = useState(0)
  const [departmentName, setDepartmentName] = useState("Your Department")
  const [managerName, setManagerName] = useState("Manager")
  const [brand, setBrand] = useState<Brand>({ primary: "#3b82f6", secondary: "#8b5cf6", accent: "#ec4899" })
  const [pendingApprovals, setPendingApprovals] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(3)

  useEffect(() => {
    const user = getUser()
    if (user) {
      setManagerName(`${user.first_name || ""} ${user.last_name || ""}`.trim() || "Manager")
      if ((user as any).department) setDepartmentName((user as any).department)
    }

    ;(async () => {
      try {
        const [usersRes, brandRes] = await Promise.all([
          api.users.getAll(),
          companyApi.getBranding?.(),
        ])
        if (usersRes?.success) setTeamCount((usersRes.data || []).length)
        if (brandRes?.success && brandRes.data) {
          setBrand({
            primary: brandRes.data.primary || "#3b82f6",
            secondary: brandRes.data.secondary || "#8b5cf6",
            accent: brandRes.data.accent || "#ec4899",
          })
        }
      } catch {
        setTeamCount(0)
      }
    })()
  }, [])

  const departments = useMemo(
    () => [
      { label: "Department Staff", value: String(teamCount), note: departmentName, icon: Users, color: brand.primary },
      { label: "Pending Approvals", value: String(pendingApprovals), note: "Action needed", icon: CheckCircle2, color: brand.accent },
      { label: "Unread Messages", value: String(unreadMessages), note: "Team & Admin", icon: Mail, color: brand.secondary },
      { label: "Open KPIs", value: "—", note: "Department metrics", icon: Target, color: brand.primary },
    ],
    [teamCount, pendingApprovals, unreadMessages, brand]
  )

  const quickActions = [
    { title: "Team Members", desc: "Manage employees in your department", href: "/manager/team", icon: Users, color: brand.primary },
    { title: "Approvals", desc: "Approve leave and request items", href: "/manager/approvals", icon: CheckCircle2, color: brand.accent },
    { title: "Messages", desc: "Communicate with employees and admins", href: "/manager/messages", icon: Send, color: brand.secondary },
    { title: "Performance", desc: "Track KPIs and department performance", href: "/manager/performance", icon: TrendingUp, color: brand.primary },
    { title: "Reports", desc: "Review reports and summaries", href: "/manager/reports", icon: BarChart3, color: brand.secondary },
    { title: "Leave Requests", desc: "Monitor leave for your department", href: "/manager/leave-requests", icon: Clock, color: brand.accent },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Hero Section */}
      <section
        className="rounded-2xl border p-8 text-white shadow-lg transition-all"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(brand.primary, 0.9)} 0%, ${hexToRgba(brand.secondary, 0.8)} 100%)`,
          borderColor: hexToRgba(brand.primary, 0.3),
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-3">
            <Badge style={{ backgroundColor: hexToRgba(brand.primary, 0.3), color: "white" }}>
              Manager Workspace
            </Badge>
            <div>
              <h1 className="text-4xl font-bold tracking-tight">Welcome back, {managerName}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 opacity-90">
                Manage your {departmentName}, communicate with team members and admins, review performance, and oversee all responsibilities.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {unreadMessages > 0 && (
              <div className="rounded-xl border backdrop-blur-sm p-4" style={{ borderColor: hexToRgba(brand.accent, 0.5), backgroundColor: hexToRgba(brand.accent, 0.1) }}>
                <div className="flex items-center gap-2">
                  <Bell size={18} />
                  <div>
                    <p className="text-sm font-semibold">{unreadMessages} new messages</p>
                    <p className="text-xs opacity-75">Check your inbox</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {departments.map((item) => {
          const Icon = item.icon
          return (
            <Card
              key={item.label}
              className="border transition-all hover:shadow-lg"
              style={{
                borderColor: hexToRgba(item.color, 0.2),
                backgroundColor: hexToRgba(item.color, 0.02),
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
                    <p className="mt-3 text-3xl font-bold" style={{ color: item.color }}>
                      {item.value}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">{item.note}</p>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{
                      backgroundColor: hexToRgba(item.color, 0.1),
                      color: item.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.title} href={item.href}>
                <Card className="h-full border transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-base">{item.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <div
                        className="rounded-lg p-3 flex-shrink-0"
                        style={{
                          backgroundColor: hexToRgba(item.color, 0.1),
                          color: item.color,
                        }}
                      >
                        <Icon size={20} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Communication & Alerts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="col-span-full lg:col-span-2" style={{ borderColor: hexToRgba(brand.primary, 0.2) }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare size={20} style={{ color: brand.primary }} />
              Communication Hub
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Communicate directly with your team members and the admin panel. Send updates, receive feedback, and stay connected.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  style={{ backgroundColor: brand.primary }}
                  className="text-white hover:opacity-90"
                >
                  <Link href="/manager/messages">View Messages</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  style={{ borderColor: brand.secondary, color: brand.secondary }}
                >
                  <Link href="/manager/messages/send">Send Message</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  style={{ borderColor: brand.accent, color: brand.accent }}
                >
                  <Link href="/manager/messages/team-broadcast">Broadcast to Team</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ borderColor: hexToRgba(brand.accent, 0.2), backgroundColor: hexToRgba(brand.accent, 0.02) }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle size={20} style={{ color: brand.accent }} />
              Quick Links
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/manager/feedback" className="text-primary hover:underline flex items-center gap-2">
                  <MessageSquare size={16} /> Employee Feedback
                </Link>
              </li>
              <li>
                <Link href="/manager/team" className="text-primary hover:underline flex items-center gap-2">
                  <Users size={16} /> Manage Team
                </Link>
              </li>
              <li>
                <Link href="/manager/approvals" className="text-primary hover:underline flex items-center gap-2">
                  <CheckCircle2 size={16} /> Review Approvals
                </Link>
              </li>
              <li>
                <Link href="/manager/performance" className="text-primary hover:underline flex items-center gap-2">
                  <TrendingUp size={16} /> View Performance
                </Link>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Department Overview */}
      <Card style={{ borderColor: hexToRgba(brand.primary, 0.15) }}>
        <CardHeader>
          <CardTitle>Department Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2 pb-4 border-b md:border-b-0 md:border-r" style={{ borderColor: hexToRgba(brand.primary, 0.2) }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team Roster</p>
              <p className="text-sm">
                View and manage all employees assigned to {departmentName}. Track their assignments, performance, and status.
              </p>
            </div>
            <div className="space-y-2 pb-4 border-b md:border-b-0 md:border-r" style={{ borderColor: hexToRgba(brand.secondary, 0.2) }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Performance Metrics</p>
              <p className="text-sm">
                Monitor KPIs, goals, and performance indicators for your department. Get actionable insights and reports.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Communication</p>
              <p className="text-sm">
                Send announcements, receive updates, and collaborate with your team and the admin panel seamlessly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
