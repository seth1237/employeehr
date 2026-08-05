"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  FileWarning,
  Lightbulb,
  X,
  Eye,
  EyeOff,
} from "lucide-react"


interface AlertData {
  _id: string
  alert_type: string
  severity: "low" | "medium" | "high" | "critical"
  title: string
  message: string
  is_read: boolean
  is_dismissed: boolean
  action_url?: string
  action_label?: string
  metadata?: Record<string, any>
  created_at: string
}

interface AlertSummary {
  _id: string
  count: number
  critical: number
  high: number
  medium: number
  low: number
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [summary, setSummary] = useState<AlertSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>("all")

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      const token = getToken()

      const [alertsRes, summaryRes] = await Promise.all([
        fetch(`${API_URL}/api/alerts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/alerts/summary`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const alertsData = await alertsRes.json()
      const summaryData = await summaryRes.json()

      if (alertsData.success) {
        setAlerts(alertsData.data.alerts)
      }
      if (summaryData.success) {
        setSummary(summaryData.data)
      }
    } catch (error) {
      console.error("Error fetching alerts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (alertId: string) => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/alerts/${alertId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setAlerts(alerts.map((a) => (a._id === alertId ? data.data : a)))
      }
    } catch (error) {
      console.error("Error marking as read:", error)
    }
  }

  const handleDismiss = async (alertId: string) => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/alerts/${alertId}/dismiss`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setAlerts(alerts.filter((a) => a._id !== alertId))
      }
    } catch (error) {
      console.error("Error dismissing alert:", error)
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "contract_expiry":
        return <FileWarning className="h-5 w-5" />
      case "incomplete_pdp":
        return <Lightbulb className="h-5 w-5" />
      case "task_overload":
        return <Clock className="h-5 w-5" />
      case "attendance_anomaly":
        return <AlertTriangle className="h-5 w-5" />
      case "performance_low":
        return <AlertTriangle className="h-5 w-5" />
      case "leave_balance_low":
        return <AlertTriangle className="h-5 w-5" />
      case "project_deadline":
        return <Clock className="h-5 w-5" />
      case "feedback_pending":
        return <CheckCircle className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-300"
      default:
        return "bg-gray-100 text-gray-800 border-gray-300"
    }
  }

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800"
      case "high":
        return "bg-orange-100 text-orange-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      contract_expiry: "Contract Expiry",
      incomplete_pdp: "Incomplete PDP",
      task_overload: "Task Overload",
      attendance_anomaly: "Attendance Anomaly",
      performance_low: "Low Performance",
      leave_balance_low: "Low Leave Balance",
      project_deadline: "Project Deadline",
      feedback_pending: "Pending Feedback",
    }
    return labels[type] || type
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  const criticalAlerts = alerts.filter((a) => a.severity === "critical")
  const highAlerts = alerts.filter((a) => a.severity === "high")
  const mediumAlerts = alerts.filter((a) => a.severity === "medium")
  const lowAlerts = alerts.filter((a) => a.severity === "low")

  const filteredAlerts =
    filter === "all"
      ? alerts
      : filter === "critical"
      ? criticalAlerts
      : filter === "high"
      ? highAlerts
      : filter === "medium"
      ? mediumAlerts
      : lowAlerts

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Alerts & Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Stay updated with important notifications and alerts
        </p>
      </div>

      {/* Alert Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card className="p-4 border-l-4 border-l-red-500">
          <p className="text-2xl font-bold text-red-600">{criticalAlerts.length}</p>
          <p className="text-xs text-muted-foreground">Critical</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-orange-500">
          <p className="text-2xl font-bold text-orange-600">{highAlerts.length}</p>
          <p className="text-xs text-muted-foreground">High</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-yellow-500">
          <p className="text-2xl font-bold text-yellow-600">{mediumAlerts.length}</p>
          <p className="text-xs text-muted-foreground">Medium</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-blue-500">
          <p className="text-2xl font-bold text-blue-600">{lowAlerts.length}</p>
          <p className="text-xs text-muted-foreground">Low</p>
        </Card>
        <Card className="p-4 border-l-4 border-l-gray-500">
          <p className="text-2xl font-bold">{alerts.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All ({alerts.length})</TabsTrigger>
          <TabsTrigger value="critical" className="text-red-600">
            Critical ({criticalAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="high" className="text-orange-600">
            High ({highAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="medium" className="text-yellow-600">
            Medium ({mediumAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="low" className="text-blue-600">
            Low ({lowAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          <div className="space-y-3">
            {filteredAlerts.length === 0 ? (
              <Card className="p-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                <p className="text-muted-foreground">No alerts for this severity level</p>
              </Card>
            ) : (
              filteredAlerts.map((alert) => (
                <Card
                  key={alert._id}
                  className={`p-4 border-l-4 ${getSeverityColor(alert.severity)} ${
                    !alert.is_read ? "bg-opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="pt-1">{getAlertIcon(alert.alert_type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{alert.title}</h3>
                          <Badge className={getSeverityBadgeColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getAlertTypeLabel(alert.alert_type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{alert.message}</p>

                        {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                          <div className="text-xs text-muted-foreground mb-3 bg-black/5 p-2 rounded">
                            {Object.entries(alert.metadata).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">{key}:</span> {String(value)}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          {alert.action_url && alert.action_label && (
                            <Button
                              asChild
                              variant="sm"
                              size="sm"
                              className="h-8"
                            >
                              <a href={alert.action_url}>{alert.action_label}</a>
                            </Button>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(alert.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {!alert.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMarkAsRead(alert._id)}
                          title="Mark as read"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismiss(alert._id)}
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
