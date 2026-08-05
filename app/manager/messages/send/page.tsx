"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Send, User, Users, Shield } from "lucide-react"
import { api } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { companyApi } from "@/lib/api"

interface Recipient {
  id: string
  name: string
  role: "employee" | "admin"
  email?: string
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

export default function SendMessagePage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [brand, setBrand] = useState<Brand>({ primary: "#3b82f6", secondary: "#8b5cf6", accent: "#ec4899" })
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [messageType, setMessageType] = useState<"individual" | "admin">("individual")

  useEffect(() => {
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
          const employees = usersRes.data
            .filter((u: any) => u.role === "employee")
            .map((u: any) => ({
              id: u._id,
              name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
              role: "employee" as const,
              email: u.email,
            }))

          const adminUsers = usersRes.data
            .filter((u: any) => u.role === "company_admin" || u.role === "hr")
            .map((u: any) => ({
              id: u._id,
              name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email,
              role: "admin" as const,
              email: u.email,
            }))

          setRecipients([...employees, ...adminUsers])
        }

        setLoading(false)
      } catch (error) {
        console.error("Failed to load data:", error)
        setLoading(false)
      }
    })()
  }, [])

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim() || selectedRecipients.length === 0) {
      alert("Please fill in all fields and select at least one recipient")
      return
    }

    setSending(true)
    try {
      // In a real app, this would call an API endpoint to send the messages
      console.log("Sending message:", { subject, message, recipients: selectedRecipients })
      // await api.messages.send({ subject, message, recipientIds: selectedRecipients })
      alert("Message sent successfully!")
      setSubject("")
      setMessage("")
      setSelectedRecipients([])
    } catch (error) {
      console.error("Failed to send message:", error)
      alert("Failed to send message")
    } finally {
      setSending(false)
    }
  }

  const filteredRecipients = useMemo(() => {
    if (messageType === "admin") {
      return recipients.filter((r) => r.role === "admin")
    }
    return recipients.filter((r) => r.role === "employee")
  }, [recipients, messageType])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: brand.primary }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Link href="/manager/messages" className="inline-flex items-center gap-2 text-primary hover:underline">
        <ArrowLeft size={16} />
        Back to Messages
      </Link>

      <div>
        <h1 className="text-3xl font-bold">Send Message</h1>
        <p className="mt-2 text-muted-foreground">
          Send a direct message to team members or administrators.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Message Type Selector */}
          <Card style={{ borderColor: hexToRgba(brand.primary, 0.2) }}>
            <CardHeader>
              <CardTitle className="text-lg">Message Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  variant={messageType === "individual" ? "default" : "outline"}
                  onClick={() => setMessageType("individual")}
                  className="flex-1"
                  style={
                    messageType === "individual"
                      ? { backgroundColor: brand.primary }
                      : { borderColor: brand.primary, color: brand.primary }
                  }
                >
                  <User size={16} className="mr-2" />
                  To Employees
                </Button>
                <Button
                  variant={messageType === "admin" ? "default" : "outline"}
                  onClick={() => setMessageType("admin")}
                  className="flex-1"
                  style={
                    messageType === "admin"
                      ? { backgroundColor: brand.accent }
                      : { borderColor: brand.accent, color: brand.accent }
                  }
                >
                  <Shield size={16} className="mr-2" />
                  To Admin
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recipients */}
          <Card style={{ borderColor: hexToRgba(brand.secondary, 0.2) }}>
            <CardHeader>
              <CardTitle className="text-lg">Select Recipients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-64 overflow-y-auto">
              {filteredRecipients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recipients available</p>
              ) : (
                filteredRecipients.map((recipient) => (
                  <label
                    key={recipient.id}
                    className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition hover:bg-accent/50"
                    style={{
                      borderColor: selectedRecipients.includes(recipient.id)
                        ? brand.primary
                        : "var(--border)",
                      backgroundColor: selectedRecipients.includes(recipient.id)
                        ? hexToRgba(brand.primary, 0.05)
                        : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipients.includes(recipient.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRecipients([...selectedRecipients, recipient.id])
                        } else {
                          setSelectedRecipients(selectedRecipients.filter((id) => id !== recipient.id))
                        }
                      }}
                      className="rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{recipient.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{recipient.email}</p>
                    </div>
                    <Badge
                      style={{
                        backgroundColor: hexToRgba(messageType === "admin" ? brand.accent : brand.secondary, 0.1),
                        color: messageType === "admin" ? brand.accent : brand.secondary,
                      }}
                      className="capitalize text-xs"
                    >
                      {recipient.role}
                    </Badge>
                  </label>
                ))
              )}
            </CardContent>
          </Card>

          {/* Message Content */}
          <Card style={{ borderColor: hexToRgba(brand.primary, 0.2) }}>
            <CardHeader>
              <CardTitle className="text-lg">Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Subject</label>
                <Input
                  placeholder="Enter message subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-2 min-h-64 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">{message.length} characters</p>
              </div>
            </CardContent>
          </Card>

          {/* Send Button */}
          <div className="flex gap-3">
            <Button
              asChild
              variant="outline"
            >
              <Link href="/manager/messages">Cancel</Link>
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={sending || selectedRecipients.length === 0}
              className="flex-1 text-white"
              style={{ backgroundColor: brand.primary }}
            >
              <Send size={16} className="mr-2" />
              {sending ? "Sending..." : "Send Message"}
            </Button>
          </div>
        </div>

        {/* Summary Sidebar */}
        <Card style={{ borderColor: hexToRgba(brand.accent, 0.2), backgroundColor: hexToRgba(brand.accent, 0.02) }}>
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recipients Selected</p>
              <p className="text-3xl font-bold mt-2" style={{ color: brand.primary }}>
                {selectedRecipients.length}
              </p>
              {selectedRecipients.length > 0 && (
                <div className="mt-3 space-y-2">
                  {selectedRecipients.map((id) => {
                    const recipient = recipients.find((r) => r.id === id)
                    return (
                      <div
                        key={id}
                        className="text-xs p-2 rounded flex items-center justify-between"
                        style={{
                          backgroundColor: hexToRgba(brand.primary, 0.1),
                          color: brand.primary,
                        }}
                      >
                        <span className="truncate">{recipient?.name}</span>
                        <button
                          onClick={() =>
                            setSelectedRecipients(selectedRecipients.filter((r) => r !== id))
                          }
                          className="ml-2 hover:opacity-70"
                        >
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="border-t pt-4" style={{ borderColor: hexToRgba(brand.accent, 0.2) }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message Preview</p>
              <div className="mt-3 p-3 rounded bg-muted text-sm max-h-32 overflow-y-auto">
                {subject && <p className="font-semibold">{subject}</p>}
                {message && <p className="text-xs mt-2 whitespace-pre-wrap">{message.substring(0, 150)}...</p>}
                {!subject && !message && <p className="text-muted-foreground text-xs">Your message will appear here</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
