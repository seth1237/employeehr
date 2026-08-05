"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, Megaphone, Users, AlertCircle, CheckCircle2 } from "lucide-react"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { companyApi } from "@/lib/api"

interface Brand {
  primary: string
  secondary: string
  accent: string
}

interface AnnouncementType {
  id: string
  label: string
  description: string
  color: string
  icon: typeof AlertCircle
}

function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export default function TeamBroadcastPage() {
  const [teamCount, setTeamCount] = useState(0)
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [priority, setPriority] = useState<"normal" | "urgent">("normal")
  const [brand, setBrand] = useState<Brand>({ primary: "#3b82f6", secondary: "#8b5cf6", accent: "#ec4899" })
  const [sending, setSending] = useState(false)
  const [managerName, setManagerName] = useState("Manager")
  const [departmentName, setDepartmentName] = useState("Department")

  useEffect(() => {
    const user = getUser()
    if (user) {
      setManagerName(`${user.first_name || ""} ${user.last_name || ""}`.trim() || "Manager")
      if ((user as any).department) setDepartmentName((user as any).department)
    }

    ;(async () => {
      try {
        const [brandRes, usersRes] = await Promise.all([
          companyApi.getBranding?.(),
          api.users.getAll(),
        ])

        if (brandRes?.success && brandRes.data) {
          setBrand({
            primary: brandRes.data.primary || "#3b82f6",
            secondary: brandRes.data.secondary || "#8b5cf6",
            accent: brandRes.data.accent || "#ec4899",
          })
        }

        if (usersRes?.success && Array.isArray(usersRes.data)) {
          const employees = usersRes.data.filter((u: any) => u.role === "employee")
          setTeamCount(employees.length)
        }
      } catch (error) {
        console.error("Failed to load data:", error)
      }
    })()
  }, [])

  const handleBroadcast = async () => {
    if (!subject.trim() || !message.trim()) {
      alert("Please fill in both subject and message")
      return
    }

    setSending(true)
    try {
      // In a real app, this would call an API endpoint to broadcast the message
      console.log("Broadcasting message:", { subject, message, priority, recipients: teamCount })
      // await api.messages.broadcast({ subject, message, priority })
      alert(`Message broadcasted to ${teamCount} team members!`)
      setSubject("")
      setMessage("")
      setPriority("normal")
    } catch (error) {
      console.error("Failed to broadcast message:", error)
      alert("Failed to broadcast message")
    } finally {
      setSending(false)
    }
  }

  const announcementTypes: AnnouncementType[] = [
    {
      id: "update",
      label: "General Update",
      description: "Regular team updates and information",
      color: brand.primary,
      icon: AlertCircle,
    },
    {
      id: "urgent",
      label: "Urgent Notice",
      description: "Time-sensitive announcements requiring immediate attention",
      color: brand.accent,
      icon: AlertCircle,
    },
    {
      id: "success",
      label: "Achievement / Celebration",
      description: "Team wins and milestones",
      color: brand.secondary,
      icon: CheckCircle2,
    },
    {
      id: "meeting",
      label: "Meeting / Event",
      description: "Team meetings and scheduled events",
      color: brand.primary,
      icon: Users,
    },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Link href="/manager/messages" className="inline-flex items-center gap-2 text-primary hover:underline">
        <ArrowLeft size={16} />
        Back to Messages
      </Link>

      <div>
        <h1 className="text-3xl font-bold">Team Announcement</h1>
        <p className="mt-2 text-muted-foreground">
          Send an announcement to all members of your {departmentName}.
        </p>
      </div>

      {/* Hero Section */}
      <div
        className="rounded-xl p-8 text-white"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(brand.secondary, 0.9)} 0%, ${hexToRgba(brand.accent, 0.8)} 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
            >
              <Megaphone size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Broadcast to Your Team</h2>
              <p className="mt-1 opacity-90">
                Reach {teamCount} team member{teamCount !== 1 ? "s" : ""} at once
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority Selector */}
          <Card style={{ borderColor: hexToRgba(brand.primary, 0.2) }}>
            <CardHeader>
              <CardTitle className="text-lg">Announcement Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  onClick={() => setPriority("normal")}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    priority === "normal"
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  style={
                    priority === "normal"
                      ? {
                          borderColor: brand.primary,
                          backgroundColor: hexToRgba(brand.primary, 0.05),
                        }
                      : {}
                  }
                >
                  <p className="font-semibold text-sm">Standard Update</p>
                  <p className="text-xs text-muted-foreground mt-1">Regular team communication</p>
                </button>
                <button
                  onClick={() => setPriority("urgent")}
                  className={`p-4 rounded-lg border-2 text-left transition ${
                    priority === "urgent"
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  style={
                    priority === "urgent"
                      ? {
                          borderColor: brand.accent,
                          backgroundColor: hexToRgba(brand.accent, 0.05),
                        }
                      : {}
                  }
                >
                  <p className="font-semibold text-sm" style={{ color: brand.accent }}>
                    Urgent Notice
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Important announcement</p>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Message Content */}
          <Card style={{ borderColor: hexToRgba(brand.primary, 0.2) }}>
            <CardHeader>
              <CardTitle className="text-lg">Message Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject / Headline</label>
                <Input
                  placeholder="What's your announcement about?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Message
                  <span className="text-xs text-muted-foreground ml-2">(supports formatting)</span>
                </label>
                <Textarea
                  placeholder="Share your announcement with the team. Be clear and concise."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-2 min-h-64 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">{message.length} characters</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              asChild
              variant="outline"
            >
              <Link href="/manager/messages">Cancel</Link>
            </Button>
            <Button
              onClick={handleBroadcast}
              disabled={sending || !subject.trim() || !message.trim()}
              className="flex-1 text-white"
              style={{
                backgroundColor: priority === "urgent" ? brand.accent : brand.primary,
              }}
            >
              <Send size={16} className="mr-2" />
              {sending ? "Broadcasting..." : `Broadcast to ${teamCount} Members`}
            </Button>
          </div>
        </div>

        {/* Preview Sidebar */}
        <div className="space-y-4">
          <Card style={{ borderColor: hexToRgba(brand.secondary, 0.2), backgroundColor: hexToRgba(brand.secondary, 0.02) }}>
            <CardHeader>
              <CardTitle className="text-base">Message Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="p-4 rounded-lg text-white"
                style={{
                  background: `linear-gradient(135deg, ${hexToRgba(priority === "urgent" ? brand.accent : brand.primary, 0.9)} 0%, ${hexToRgba(brand.secondary, 0.8)} 100%)`,
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge className="bg-white/20 text-white border-white/30">
                    {priority === "urgent" ? "🔴 URGENT" : "ℹ️ ANNOUNCEMENT"}
                  </Badge>
                </div>
                {subject && <p className="font-semibold text-sm">{subject}</p>}
                {message && (
                  <p className="text-xs mt-3 opacity-90 line-clamp-4">
                    {message}
                  </p>
                )}
                {!subject && !message && (
                  <p className="text-xs opacity-75">Your announcement will appear here</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card style={{ borderColor: hexToRgba(brand.accent, 0.2) }}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users size={16} />
                Recipients
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center py-4">
                <p className="text-3xl font-bold" style={{ color: brand.primary }}>
                  {teamCount}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Team Member{teamCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="pt-3 border-t space-y-2" style={{ borderColor: hexToRgba(brand.accent, 0.2) }}>
                <p className="text-xs text-muted-foreground">
                  📬 All members of <strong>{departmentName}</strong> will receive this announcement
                </p>
                <p className="text-xs text-muted-foreground">
                  ⏰ Sent by {managerName}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
