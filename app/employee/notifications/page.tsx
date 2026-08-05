"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, CheckCheck, Trash2, Clock, AlertCircle, Info, CheckCircle } from "lucide-react"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"

interface Notification {
  _id: string
  type: "info" | "success" | "warning" | "error"
  title: string
  message: string
  is_read: boolean
  created_at: string
  action_url?: string
}

interface AlertApiRow {
  _id: string
  severity: "low" | "medium" | "high" | "critical"
  title: string
  message: string
  is_read: boolean
  created_at: string
  action_url?: string
}

const severityToType = (severity: string): Notification["type"] => {
  if (severity === "critical") return "error"
  if (severity === "high") return "warning"
  if (severity === "medium") return "info"
  return "success"
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const token = getToken()
      if (!token) {
        setNotifications([])
        return
      }

      const response = await fetch(`${API_URL}/api/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to fetch notifications")
      }

      const mapped: Notification[] = (data?.data?.alerts || []).map((alert: AlertApiRow) => ({
        _id: alert._id,
        type: severityToType(alert.severity),
        title: String(alert.title || "Notification"),
        message: String(alert.message || ""),
        is_read: Boolean(alert.is_read),
        created_at: String(alert.created_at || new Date().toISOString()),
        action_url: alert.action_url,
      }))

      setNotifications(mapped)
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(`${API_URL}/api/alerts/${notificationId}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to mark as read")
      }

      setNotifications(
        notifications.map((notif) => (notif._id === notificationId ? { ...notif, is_read: true } : notif))
      )
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter((notif) => !notif.is_read)
    await Promise.all(unread.map((notif) => markAsRead(notif._id)))
  }

  const deleteNotification = async (notificationId: string) => {
    try {
      const token = getToken()
      if (!token) return

      const response = await fetch(`${API_URL}/api/alerts/${notificationId}/dismiss`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to dismiss notification")
      }

      setNotifications(notifications.filter((notif) => notif._id !== notificationId))
    } catch (error) {
      console.error("Failed to dismiss notification:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return "Just now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  const filteredNotifications =
    filter === "unread" ? notifications.filter((n) => !n.is_read) : notifications

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with your latest notifications
            {unreadCount > 0 && ` (${unreadCount} unread)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setFilter(filter === "all" ? "unread" : "all")}>
            {filter === "all" ? "Show Unread" : "Show All"}
          </Button>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
            <p className="text-xs text-muted-foreground">All notifications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read</CardTitle>
            <CheckCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length - unreadCount}</div>
            <p className="text-xs text-muted-foreground">Acknowledged</p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Notifications</CardTitle>
          <CardDescription>Click on a notification to view details</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Bell className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Notifications</h3>
              <p className="text-center text-muted-foreground">
                {filter === "unread" ? "All caught up! No unread notifications." : "You don't have any notifications yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 ${
                    !notification.is_read ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-1">{getNotificationIcon(notification.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold leading-none">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                      {!notification.is_read && <Badge variant="default">New</Badge>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{getTimeAgo(notification.created_at)}</span>
                      </div>
                      <Badge className={getTypeColor(notification.type)} variant="outline">
                        {notification.type}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification._id)}
                        title="Mark as read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification(notification._id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
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
