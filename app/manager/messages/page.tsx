"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Mail, Send, Trash2, Archive, Search, Clock, User } from "lucide-react"
import { getUser } from "@/lib/auth"
import { companyApi } from "@/lib/api"

interface Message {
  id: string
  from: string
  fromRole: "employee" | "admin" | "manager"
  subject: string
  preview: string
  timestamp: string
  read: boolean
  type: "inbox" | "sent"
}

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

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      from: "Sarah Johnson",
      fromRole: "employee",
      subject: "Weekly Status Update",
      preview: "Here's my progress on the Q2 project...",
      timestamp: "2 hours ago",
      read: false,
      type: "inbox",
    },
    {
      id: "2",
      from: "Admin Panel",
      fromRole: "admin",
      subject: "Policy Update Announcement",
      preview: "New remote work policy effective next month...",
      timestamp: "1 day ago",
      read: false,
      type: "inbox",
    },
    {
      id: "3",
      from: "You",
      fromRole: "manager",
      subject: "Team Meeting Rescheduled",
      preview: "Moving Monday's standup to Tuesday at the same time",
      timestamp: "3 days ago",
      read: true,
      type: "sent",
    },
  ])

  const [brand, setBrand] = useState<Brand>({ primary: "#3b82f6", secondary: "#8b5cf6", accent: "#ec4899" })
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "inbox" | "sent">("all")
  const [managerName, setManagerName] = useState("Manager")

  useEffect(() => {
    const user = getUser()
    if (user) {
      setManagerName(`${user.first_name || ""} ${user.last_name || ""}`.trim() || "Manager")
    }

    ;(async () => {
      try {
        const brandRes = await companyApi.getBranding?.()
        if (brandRes?.success && brandRes.data) {
          setBrand({
            primary: brandRes.data.primary || "#3b82f6",
            secondary: brandRes.data.secondary || "#8b5cf6",
            accent: brandRes.data.accent || "#ec4899",
          })
        }
      } catch {
        // Keep default brand
      }
    })()
  }, [])

  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      const matchesSearch = msg.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.preview.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.from.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterType === "all" || msg.type === filterType
      return matchesSearch && matchesFilter
    })
  }, [messages, searchTerm, filterType])

  const unreadCount = messages.filter((m) => !m.read).length

  const getRoleBadgeColor = (role: "employee" | "admin" | "manager") => {
    switch (role) {
      case "admin":
        return brand.accent
      case "employee":
        return brand.secondary
      case "manager":
        return brand.primary
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Messages & Communication</h1>
        <p className="mt-2 text-muted-foreground">
          Send and receive messages from your employees and the admin panel.
        </p>
      </div>

      {/* Action Bar */}
      <div
        className="rounded-xl p-6 text-white"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(brand.primary, 0.9)} 0%, ${hexToRgba(brand.secondary, 0.8)} 100%)`,
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Mail size={24} />
            <div>
              <p className="font-semibold text-lg">Inbox</p>
              <p className="text-sm opacity-90">{unreadCount} unread messages</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              asChild
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                borderColor: "rgba(255, 255, 255, 0.4)",
              }}
              className="border text-white hover:bg-white/30"
            >
              <Link href="/manager/messages/send">
                <Send size={16} className="mr-2" />
                Send Message
              </Link>
            </Button>
            <Button
              asChild
              className="bg-white text-gray-900 hover:bg-gray-100"
            >
              <Link href="/manager/messages/team-broadcast">
                <Send size={16} className="mr-2" />
                Broadcast
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            onClick={() => setFilterType("all")}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={filterType === "inbox" ? "default" : "outline"}
            onClick={() => setFilterType("inbox")}
            size="sm"
          >
            Inbox
          </Button>
          <Button
            variant={filterType === "sent" ? "default" : "outline"}
            onClick={() => setFilterType("sent")}
            size="sm"
          >
            Sent
          </Button>
        </div>
      </div>

      {/* Messages List */}
      <div className="space-y-3">
        {filteredMessages.length === 0 ? (
          <Card className="text-center py-12">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-semibold">No messages found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchTerm ? "Try adjusting your search" : "Your inbox is empty"}
            </p>
          </Card>
        ) : (
          filteredMessages.map((message) => (
            <Card
              key={message.id}
              className={`border transition-all hover:shadow-md cursor-pointer ${
                !message.read ? "bg-blue-50 border-blue-200" : ""
              }`}
              style={{
                borderColor: !message.read ? hexToRgba(brand.primary, 0.3) : "var(--border)",
                backgroundColor: !message.read ? hexToRgba(brand.primary, 0.04) : "var(--card)",
              }}
            >
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className={`font-semibold truncate ${!message.read ? "font-bold" : ""}`}>
                        {message.from}
                      </p>
                      <Badge
                        style={{
                          backgroundColor: hexToRgba(getRoleBadgeColor(message.fromRole), 0.1),
                          color: getRoleBadgeColor(message.fromRole),
                          border: `1px solid ${getRoleBadgeColor(message.fromRole)}`,
                        }}
                        className="capitalize"
                      >
                        {message.fromRole}
                      </Badge>
                      {!message.read && (
                        <div
                          className="h-2 w-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: brand.primary }}
                        />
                      )}
                    </div>
                    <h3 className={`truncate ${!message.read ? "font-semibold" : "font-medium"}`}>
                      {message.subject}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate mt-1">{message.preview}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                        <Clock size={14} />
                        {message.timestamp}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        title="Archive"
                      >
                        <Archive size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
