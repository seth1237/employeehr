"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { API_URL } from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { 
  FileText, 
  Receipt, 
  TrendingUp, 
  Truck, 
  Package, 
  Users, 
  Briefcase,
  PieChart,
  BarChart3,
  ArrowRight
} from "lucide-react"

interface DashboardStats {
  users: any[]
  stockInvoices: any[]
  stockQuotations: any[]
  reports: any[]
  meetings: any[]
  [key: string]: any[]
}

export default function AdminReportsHubPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = getToken()
        const res = await fetch(`${API_URL}/api/dashboard/stats`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        })
        const data = await res.json()
        if (data.success) {
          setStats(data.data)
        }
      } catch (error) {
        console.error("Failed to load dashboard stats", error)
        toast({
          title: "Failed to load stats",
          description: "Could not retrieve high-level report statistics.",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [toast])

  const reportCategories = [
    {
      title: "Finance & Accounting",
      icon: <Receipt className="h-6 w-6 text-blue-600" />,
      description: "Invoices, quotations, and financial breakdowns.",
      links: [
        { label: "Monthly Invoice Summary", href: "/admin/reports/monthly-invoice-summary" },
        { label: "Financial Breakdown", href: "/admin/accounts/financial-breakdown" },
        { label: "Remuneration Reports", href: "/admin/accounts/remuneration-reports" },
      ],
      metric: stats?.stockInvoices ? `${stats.stockInvoices.length} Total Invoices` : "...",
    },
    {
      title: "Fleet & Operations",
      icon: <Truck className="h-6 w-6 text-emerald-600" />,
      description: "Vehicle tracking, trips, and operational alerts.",
      links: [
        { label: "Fleet Dashboard", href: "/admin/fleet" },
      ],
      metric: "Live GPS Tracking",
    },
    {
      title: "Inventory & Stock",
      icon: <Package className="h-6 w-6 text-purple-600" />,
      description: "Stock levels, analytics, and check reports.",
      links: [
        { label: "Stock Analytics", href: "/admin/stock/analytics" },
        { label: "Stock History", href: "/admin/stock/history" },
        { label: "Stock Checks", href: "/admin/stock/stockcheck" },
      ],
      metric: stats?.stockQuotations ? `${stats.stockQuotations.length} Quotations` : "...",
    },
    {
      title: "HR & Employees",
      icon: <Users className="h-6 w-6 text-amber-600" />,
      description: "Employee daily reports, attendance, and feedback.",
      links: [
        { label: "Attendance Overview", href: "/admin/attendance" },
        { label: "Leave Reports", href: "/admin/leave" },
        { label: "Feedback 360", href: "/admin/feedback-360" },
      ],
      metric: stats?.users ? `${stats.users.length} Active Users` : "...",
    },
    {
      title: "Jobs & Recruitment",
      icon: <Briefcase className="h-6 w-6 text-indigo-600" />,
      description: "Job analytics, applications, and conversion rates.",
      links: [
        { label: "Job Analytics", href: "/admin/analytics" },
        { label: "Job Postings", href: "/admin/jobs" },
      ],
      metric: "Hiring Pipeline",
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <PieChart className="h-8 w-8 text-blue-600" />
          Reports Hub
        </h1>
        <p className="text-gray-600 mt-2">
          Centralized access to analytics, summaries, and operational reports from all modules.
        </p>
      </div>

      {/* Quick Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Personnel</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats?.users?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Registered in the system</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Invoices Generated</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats?.stockInvoices?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Historical records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Submitted Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats?.reports?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Employee tasks & logs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled Meetings</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "-" : stats?.meetings?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Across all departments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportCategories.map((cat, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader className="flex-1 pb-4">
              <div className="mb-2 w-fit rounded-lg bg-gray-100 p-2">
                {cat.icon}
              </div>
              <CardTitle className="text-xl">{cat.title}</CardTitle>
              <CardDescription className="h-10 mt-1">{cat.description}</CardDescription>
              <div className="mt-2 text-sm font-medium text-blue-600">
                {cat.metric}
              </div>
            </CardHeader>
            <CardContent className="border-t pt-4 flex-none bg-gray-50/50">
              <ul className="space-y-3">
                {cat.links.map((link, j) => (
                  <li key={j}>
                    <Link 
                      href={link.href} 
                      className="group flex items-center justify-between text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      {link.label}
                      <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
