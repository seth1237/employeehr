"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { BarChart3, Users, Award, TrendingUp } from "lucide-react"
import RecentActivity from "@/components/dashboard/recent-activity"
import QuickActions from "@/components/dashboard/quick-actions"
import { api } from "@/lib/api"

interface DashboardStats {
  totalEmployees: number
  employeesChange: string
  activePDPs: number
  pdpCompletion: string
  monthlyAwards: number
  awardsInfo: string
  avgPerformance: string
  performanceChange: string
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all required data in parallel
        const [usersRes, pdpsRes, awardsRes, performanceRes] = await Promise.all([
          api.users.getAll(),
          api.pdps.getAll(),
          api.awards.getAll(),
          api.performance.getAll(),
        ])

        // Calculate stats from real data
        const totalEmployees = usersRes.data?.length || 0
        const activePDPs = pdpsRes.data?.filter((pdp: any) => pdp.status === 'approved' || pdp.status === 'submitted').length || 0
        const totalPDPs = pdpsRes.data?.length || 0
        const pdpCompletionRate = totalPDPs > 0 ? Math.round((activePDPs / totalPDPs) * 100) : 0

        // Get current month's awards
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const monthlyAwards = awardsRes.data?.filter((award: any) => {
          const awardDate = new Date(award.created_at || award.createdAt)
          return awardDate.getMonth() === currentMonth && awardDate.getFullYear() === currentYear
        }).length || 0

        // Calculate average performance
        const performances = performanceRes.data || []
        const avgScore = performances.length > 0
          ? performances.reduce((sum: number, p: any) => sum + (p.overall_score || 0), 0) / performances.length
          : 0

        setStats({
          totalEmployees,
          employeesChange: "+12% this month", // TODO: Calculate from historical data
          activePDPs,
          pdpCompletion: `${pdpCompletionRate}% completion`,
          monthlyAwards,
          awardsInfo: monthlyAwards > 0 ? "Top performer awarded" : "No awards this month",
          avgPerformance: avgScore > 0 ? `${avgScore.toFixed(1)}/10` : "N/A",
          performanceChange: "+0.3 from last month", // TODO: Calculate from historical data
        })
      } catch (err: any) {
        console.error('Failed to fetch dashboard stats:', err)
        setError(err.message || 'Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardStats()
  }, [])

  const statsConfig = stats ? [
    { label: "Total Employees", value: stats.totalEmployees.toString(), icon: Users, change: stats.employeesChange },
    { label: "Active PDPs", value: stats.activePDPs.toString(), icon: TrendingUp, change: stats.pdpCompletion },
    { label: "This Month Awards", value: stats.monthlyAwards.toString(), icon: Award, change: stats.awardsInfo },
    { label: "Avg Performance", value: stats.avgPerformance, icon: BarChart3, change: stats.performanceChange },
  ] : []

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Loading your organization overview...</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 border-border animate-pulse">
              <div className="h-12 w-12 bg-secondary rounded-lg mb-4"></div>
              <div className="h-4 bg-secondary rounded w-24 mb-2"></div>
              <div className="h-8 bg-secondary rounded w-16"></div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your organization overview.</p>
        </div>
        <Card className="p-6 border-destructive/50 bg-destructive/10">
          <p className="text-destructive font-medium">Error loading dashboard data</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your organization overview.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsConfig.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="p-6 border-border hover:border-primary/50 transition">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h3 className="text-sm text-muted-foreground">{stat.label}</h3>
              <p className="text-2xl font-bold mt-1">{stat.value}</p>
              <p className="text-xs text-accent mt-2">{stat.change}</p>
            </Card>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <QuickActions />
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>
      </div>
    </div>
  )
}
