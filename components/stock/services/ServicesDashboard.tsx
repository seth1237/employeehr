'use client'

import React, { useState, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { fetchJson } from '@/lib/fetchUtils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react'

interface Summary {
  totalJobs: number
  pending: number
  inProgress: number
  completed: number
  cancelled: number
  overdue: number
}


export default function ServicesDashboard() {
  const { toast } = useToast()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const summaryResult = await fetchJson<{ success: boolean; data: { summary: Summary }; message?: string }>('/api/stock/services/analytics/summary')
 
      if (summaryResult.response.ok && summaryResult.data?.success) {
        setSummary(summaryResult.data.data.summary)
      } else {
        throw new Error(summaryResult.errorMessage || 'Failed to fetch job summary')
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
      const message = error instanceof Error ? error.message : 'Failed to load analytics'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (loading || !summary) {
    return <div className="text-center py-8">Loading...</div>
  }

  const completionRate = summary.totalJobs > 0 ? ((summary.completed / summary.totalJobs) * 100).toFixed(1) : 0

  const statusData = [
    { name: 'Pending', value: summary.pending, fill: '#fbbf24' },
    { name: 'In Progress', value: summary.inProgress, fill: '#60a5fa' },
    { name: 'Completed', value: summary.completed, fill: '#34d399' },
  ]


  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalJobs}</div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting start</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.inProgress}</div>
            <p className="text-xs text-gray-500 mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
            <p className="text-xs text-gray-500 mt-1">Finished jobs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary.overdue}</div>
            <p className="text-xs text-gray-500 mt-1">Past due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Job Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Job Status Distribution</CardTitle>
                <CardDescription>Current status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={80} fill="#8884d8" dataKey="value">
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Completion Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Completion Rate</CardTitle>
                <CardDescription>Jobs completed vs total</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold text-green-600">{completionRate}%</div>
                  <p className="text-gray-500 mt-2">{summary.completed} of {summary.totalJobs} jobs completed</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
}
