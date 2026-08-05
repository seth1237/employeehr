"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Mail, CheckCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { toast } from "sonner"

type EmailConfigState = {
  enabled: boolean
  verified: boolean
  fromName: string
  fromEmail: string
  smtp: {
    host: string
    port: number
    secure: boolean
    username: string
    password: string
  }
}

const emptyConfig = (): EmailConfigState => ({
  enabled: false,
  verified: false,
  fromName: "",
  fromEmail: "",
  smtp: {
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
  },
})

export function CompanyEmailSettings({
  showBackLink = true,
}: {
  showBackLink?: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [config, setConfig] = useState<EmailConfigState>(emptyConfig)
  const [testEmail, setTestEmail] = useState("")

  useEffect(() => {
    fetchEmailConfig()
  }, [])

  const authHeaders = (json = false): HeadersInit => {
    const token = getToken()
    return {
      ...(json ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }

  const fetchEmailConfig = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/company/email-config`, {
        headers: authHeaders(),
      })
      const data = await response.json()

      if (data.success && data.data) {
        setConfig({
          enabled: Boolean(data.data.enabled),
          verified: Boolean(data.data.verified),
          fromName: data.data.fromName || "",
          fromEmail: data.data.fromEmail || "",
          smtp: {
            host: data.data.smtp?.host || "",
            port: Number(data.data.smtp?.port || 587),
            secure: Boolean(data.data.smtp?.secure),
            username: data.data.smtp?.username || "",
            password: data.data.smtp?.password || "",
          },
        })
      }
    } catch (error) {
      console.error("Failed to fetch email config:", error)
      toast.error("Failed to load email configuration")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch(`${API_URL}/api/company/email-config`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify(config),
      })
      const data = await response.json()

      if (data.success) {
        toast.success("Email configuration saved. Send a test email to activate it.")
        setConfig((prev) => ({ ...prev, verified: false }))
      } else {
        toast.error(data.message || "Failed to save configuration")
      }
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Failed to save email configuration")
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error("Please enter a test email address")
      return
    }
    if (!config.smtp.host || !config.smtp.username) {
      toast.error("Enter SMTP host and username before testing")
      return
    }
    if (!config.smtp.password) {
      toast.error("Re-enter the SMTP password to test (it is not shown after save)")
      return
    }

    try {
      setTesting(true)
      const response = await fetch(`${API_URL}/api/company/email-config/verify`, {
        method: "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          testEmail,
          enabled: config.enabled,
          fromName: config.fromName,
          fromEmail: config.fromEmail,
          smtp: config.smtp,
        }),
      })
      const data = await response.json()

      if (data.success) {
        toast.success("SMTP verified. Notifications will use your company address.")
        setConfig((prev) => ({
          ...prev,
          verified: true,
          enabled: true,
          smtp: { ...prev.smtp, password: "" },
        }))
      } else {
        toast.error(data.message || "SMTP verification failed")
      }
    } catch (error) {
      console.error("Test error:", error)
      toast.error("Failed to verify SMTP configuration")
    } finally {
      setTesting(false)
    }
  }

  const handleDisable = async () => {
    try {
      const response = await fetch(`${API_URL}/api/company/email-config/disable`, {
        method: "POST",
        headers: authHeaders(),
      })
      const data = await response.json()

      if (data.success) {
        toast.success("Company email disabled. Using system default email.")
        setConfig((prev) => ({ ...prev, enabled: false, verified: false }))
      } else {
        toast.error(data.message || "Failed to disable email")
      }
    } catch (error) {
      console.error("Disable error:", error)
      toast.error("Failed to disable email configuration")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="space-y-2">
        {showBackLink && (
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href="/admin/settings/system">
              <ArrowLeft className="h-4 w-4 mr-1" />
              System settings
            </Link>
          </Button>
        )}
        <h1 className="text-3xl font-bold tracking-tight">Email Settings</h1>
        <p className="text-muted-foreground">
          Send notifications from your company domain. If this is not configured or verified,
          the platform system email is used automatically.
        </p>
      </div>

      {config.enabled && config.verified ? (
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="font-medium">Company email active</p>
              <p className="text-sm text-muted-foreground">
                Notifications are sent from {config.fromEmail || "your company address"}
              </p>
            </div>
          </div>
        </Card>
      ) : config.enabled ? (
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium">Saved but not verified</p>
              <p className="text-sm text-muted-foreground">
                Send a test email below to activate. Until then, the system default email is used.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4 border-l-4 border-l-muted-foreground/40">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Using system default email</p>
              <p className="text-sm text-muted-foreground">
                Enable and verify your SMTP settings to send from your own domain.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Use company email</Label>
              <p className="text-sm text-muted-foreground">
                Send invites, alerts, and other notifications from your domain
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
            />
          </div>

          {config.enabled && (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From name</Label>
                  <Input
                    value={config.fromName}
                    onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                    placeholder="Your Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>From email</Label>
                  <Input
                    type="email"
                    value={config.fromEmail}
                    onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                    placeholder="noreply@yourcompany.com"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">SMTP configuration</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP host</Label>
                    <Input
                      value={config.smtp.host}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          smtp: { ...config.smtp, host: e.target.value },
                        })
                      }
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP port</Label>
                    <Input
                      type="number"
                      value={config.smtp.port}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          smtp: { ...config.smtp, port: Number(e.target.value) },
                        })
                      }
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP username</Label>
                    <Input
                      value={config.smtp.username}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          smtp: { ...config.smtp, username: e.target.value },
                        })
                      }
                      placeholder="your-email@yourcompany.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP password</Label>
                    <Input
                      type="password"
                      value={config.smtp.password}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          smtp: { ...config.smtp, password: e.target.value },
                        })
                      }
                      placeholder="Enter SMTP password to save or test"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground">
                      Password is never shown after save. Re-enter it before sending a test email.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4">
                  <Switch
                    checked={config.smtp.secure}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        smtp: { ...config.smtp, secure: checked },
                      })
                    }
                  />
                  <Label>Use SSL/TLS (port 465)</Label>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Verify configuration</h3>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter email to receive test message"
                    className="flex-1"
                  />
                  <Button onClick={handleTestEmail} disabled={testing}>
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Send test email
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  This tests SMTP login with the mail server (not your Elevate account login).
                  A successful test activates company email for notifications.
                </p>
              </div>
            </>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 border-t pt-6">
            {config.enabled ? (
              <Button variant="outline" onClick={handleDisable}>
                Disable company email
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2 sm:ml-auto">
              <Button variant="outline" onClick={fetchEmailConfig}>
                Reset
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save configuration"
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-muted/50">
        <h3 className="font-semibold mb-2">Need help?</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Gmail:</strong> Enable 2-factor auth and create an App Password
          </p>
          <p>
            <strong>Office 365:</strong> Use smtp.office365.com on port 587
          </p>
          <p>
            <strong>Custom SMTP:</strong> Contact your email provider for SMTP settings
          </p>
        </div>
      </Card>
    </div>
  )
}
