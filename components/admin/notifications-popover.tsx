"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"

export type InboxItem = {
  id: string
  source: "alert" | "operational"
  title: string
  message: string
  severity: "low" | "medium" | "high" | "critical"
  is_read: boolean
  created_at: string
  action_url?: string
  action_label?: string
}

function severityClass(severity: string) {
  if (severity === "critical") return "bg-red-100 text-red-700"
  if (severity === "high") return "bg-amber-100 text-amber-800"
  if (severity === "medium") return "bg-blue-100 text-blue-700"
  return "bg-slate-100 text-slate-600"
}

export function AdminNotificationsPopover() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<InboxItem[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/alerts/inbox`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data?.success) {
        setItems(data.data?.items || [])
        setUnread(data.data?.unread || 0)
      }
    } catch {
      // keep previous
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 60_000)
    return () => clearInterval(id)
  }, [load])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const markRead = async (item: InboxItem) => {
    if (item.source !== "alert" || item.is_read) return
    const token = getToken()
    if (!token) return
    try {
      await fetch(`${API_URL}/api/alerts/${item.id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      setItems((prev) =>
        prev.map((x) => (x.id === item.id ? { ...x, is_read: true } : x)),
      )
      setUnread((u) => Math.max(0, u - 1))
    } catch {
      // ignore
    }
  }

  const markAllRead = async () => {
    const token = getToken()
    if (!token) return
    const unreadAlerts = items.filter((i) => i.source === "alert" && !i.is_read)
    await Promise.all(
      unreadAlerts.map((i) =>
        fetch(`${API_URL}/api/alerts/${i.id}/read`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
    )
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })))
    setUnread(0)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label="Notifications">
          <Bell size={20} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unread} unread · {loading ? "Refreshing..." : "Live inbox"}
            </p>
          </div>
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={markAllRead}>
            <CheckCheck className="h-3.5 w-3.5" />
            Mark read
          </Button>
        </div>
        <div className="max-h-[360px] overflow-y-auto divide-y">
          {items.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          )}
          {items.slice(0, 12).map((item) => (
            <button
              key={`${item.source}-${item.id}`}
              type="button"
              className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                !item.is_read ? "bg-primary/5" : ""
              }`}
              onClick={() => {
                markRead(item)
                if (item.action_url) {
                  setOpen(false)
                  router.push(item.action_url)
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground line-clamp-1">{item.title}</p>
                <Badge className={`${severityClass(item.severity)} text-[9px] uppercase shrink-0`}>
                  {item.severity}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.message}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">
                  {item.created_at
                    ? new Date(item.created_at).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </span>
                {item.action_url && (
                  <span className="text-[10px] text-primary inline-flex items-center gap-1">
                    {item.action_label || "Open"} <ExternalLink className="h-3 w-3" />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
        <div className="border-t p-2">
          <Button asChild variant="ghost" className="w-full h-9 text-xs font-semibold">
            <Link href="/admin/alerts" onClick={() => setOpen(false)}>
              View all notifications
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
