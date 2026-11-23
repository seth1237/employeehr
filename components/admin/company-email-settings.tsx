"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Loader2, Mail, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { api } from "@/lib/api"
import {
  EMAIL_SENDER_MODULES,
  type EmailSenderIdentity,
  type EmailSenderKey,
} from "@/lib/email-senders"
import { toast } from "sonner"

type SmtpForm = {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
}

type EmailConfigForm = {
  enabled: boolean
  verified: boolean
  hasPassword: boolean
  fromName: string
  fromEmail: string
  smtp: SmtpForm
  senders: Record<EmailSenderKey, { fromName: string; fromEmail: string }>
}

const emptySenders = (): EmailConfigForm["senders"] =>
  EMAIL_SENDER_MODULES.reduce(
    (acc, module) => {
      acc[module.key] = { fromName: "", fromEmail: "" }
      return acc
    },
    {} as EmailConfigForm["senders"],
  )

const emptyConfig = (): EmailConfigForm => ({
  enabled: false,
  verified: false,
  hasPassword: false,
  fromName: "",
  fromEmail: "",
  smtp: {
    host: "",
    port: 587,
    secure: false,
    username: "",
    password: "",
  },
  senders: emptySenders(),
})

function applyConfig(data: any): EmailConfigForm {
  const next = emptyConfig()
  if (!data) return next
  next.enabled = Boolean(data.enabled)
  next.verified = Boolean(data.verified)
  next.hasPassword = Boolean(data.hasPassword)
  next.fromName = data.fromName || ""
  next.fromEmail = data.fromEmail || ""
  const port = Number(data.smtp?.port || 587)
  next.smtp = {
    host: data.smtp?.host || "",
    port,
    secure: port === 465,
    username: data.smtp?.username || "",
    password: "",
  }
  for (const sender of (data.senders || []) as EmailSenderIdentity[]) {
    if (!sender?.key || !(sender.key in next.senders)) continue
    next.senders[sender.key as EmailSenderKey] = {
      fromName: sender.fromName || "",
      fromEmail: sender.fromEmail || "",
    }
  }
  return next
}

export function CompanyEmailSettings({
  showBackLink = true,
}: {
  showBackLink?: boolean
}) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [config, setConfig] = useState<EmailConfigForm>(emptyConfig)
  const [testEmail, setTestEmail] = useState("")

  const senderPayload = useMemo(
    () =>
      EMAIL_SENDER_MODULES.map((module) => ({
        key: module.key,
        fromName: config.senders[module.key].fromName.trim(),
        fromEmail: config.senders[module.key].fromEmail.trim(),
      })),
    [config.senders],
  )

  const configuredSenders = senderPayload.filter((sender) => sender.fromEmail).length
  const mailboxReady = config.enabled && Boolean(config.smtp.host && config.smtp.username && (config.hasPassword || config.smtp.password))
  const outboundName = config.fromName || "Company mailbox"
  const outboundEmail = config.fromEmail || config.smtp.username || "Add a from address"

  const fetchEmailConfig = async () => {
    try {
      setLoading(true)
      const response = await api.company.getEmailConfig()
      if (response?.success) {
        setConfig(applyConfig(response.data))
      } else {
        toast.error(response?.message || "Failed to load email configuration")
      }
    } catch (error) {
      console.error("Failed to fetch email config:", error)
      toast.error(error instanceof Error ? error.message : "Failed to load email configuration")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmailConfig()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await api.company.updateEmailConfig({
        enabled: config.enabled,
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        senders: senderPayload,
        smtp: {
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          username: config.smtp.username,
          ...(config.smtp.password ? { password: config.smtp.password } : {}),
        },
      })

      if (response?.success) {
        toast.success(response.message || "Company mailbox saved")
        setConfig(applyConfig(response.data))
      } else {
        toast.error(response?.message || "Failed to save configuration")
      }
    } catch (error) {
      console.error("Save error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save email configuration")
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error("Enter an address to receive the test email")
      return
    }
    if (!config.smtp.host || !config.smtp.username) {
      toast.error("Enter SMTP host and username before testing")
      return
    }
    if (!config.smtp.password && !config.hasPassword) {
      toast.error("Enter the SMTP password to test this mailbox")
      return
    }

    try {
      setTesting(true)
      const response = await api.company.verifyEmailConfig({
        testEmail,
        enabled: config.enabled,
        fromName: config.fromName,
        fromEmail: config.fromEmail,
        smtp: {
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          username: config.smtp.username,
          ...(config.smtp.password ? { password: config.smtp.password } : {}),
        },
      })

      if (response?.success) {
        toast.success("Test accepted. Check the inbox — including spam.")
        setConfig(applyConfig(response.data))
      } else {
        toast.error(response?.message || "SMTP test failed")
      }
    } catch (error) {
      console.error("Test error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send the test email")
    } finally {
      setTesting(false)
    }
  }

  const handleDisable = async () => {
    try {
      const response = await api.company.disableEmailConfig()
      if (response?.success) {
        toast.success("Company mailbox turned off. ElevateHub will send until you reconnect.")
        setConfig(applyConfig(response.data))
      } else {
        toast.error(response?.message || "Failed to disable email")
      }
    } catch (error) {
      console.error("Disable error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to disable email configuration")
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading email settings" rows={4} />

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          {showBackLink ? (
            <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
              <Link href="/admin/settings/system">
                <ArrowLeft className="h-4 w-4 mr-1" />
                System settings
              </Link>
            </Button>
          ) : null}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Company email</h1>
              <p className="text-muted-foreground">
                Send invitations, invoices, leave, and service requests from your organisation mailbox.
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchEmailConfig}>
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save mailbox"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden bg-card">
        <div className="px-5 py-4 border-b bg-muted/40">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Outbound identity
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight">{outboundName}</h2>
          <p className="text-sm text-muted-foreground">{outboundEmail}</p>
        </div>
        <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x">
          <div className="px-5 py-3">
            <p className="text-xs text-muted-foreground">SMTP</p>
            <p className="mt-0.5 text-sm font-medium">
              {config.smtp.host ? `${config.smtp.host}:${config.smtp.port}` : "Not connected"}
            </p>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-muted-foreground">Sending as</p>
            <p className="mt-0.5 text-sm font-medium">
              {mailboxReady ? "Your company mailbox" : "ElevateHub until you connect"}
            </p>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-muted-foreground">Mailbox check</p>
            <p className="mt-0.5 text-sm font-medium inline-flex items-center gap-1.5">
              {config.verified ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Tested
                </>
              ) : mailboxReady ? (
                "Ready — send a test"
              ) : (
                "Not connected"
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Mailbox</CardTitle>
            <CardDescription>
              The SMTP you set during company setup lives here. Once saved, the system sends from this address.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3">
              <div>
                <Label>Use organisation mailbox</Label>
                <p className="text-sm text-muted-foreground">
                  Invoices, leave, invitations, QR requests, and campaigns go out through this SMTP.
                </p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>

            {config.enabled ? (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="from-name">From name</Label>
                    <Input
                      id="from-name"
                      value={config.fromName}
                      onChange={(e) => setConfig({ ...config, fromName: e.target.value })}
                      placeholder="Acme Ltd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="from-email">From email</Label>
                    <Input
                      id="from-email"
                      type="email"
                      value={config.fromEmail}
                      onChange={(e) => setConfig({ ...config, fromEmail: e.target.value })}
                      placeholder="noreply@yourcompany.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">SMTP host</Label>
                    <Input
                      id="smtp-host"
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
                    <Label htmlFor="smtp-port">Port</Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      value={config.smtp.port}
                      onChange={(e) => {
                        const port = Number(e.target.value)
                        setConfig({
                          ...config,
                          smtp: {
                            ...config.smtp,
                            port,
                            secure: port === 465,
                          },
                        })
                      }}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-user">Username</Label>
                    <Input
                      id="smtp-user"
                      value={config.smtp.username}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          smtp: { ...config.smtp, username: e.target.value },
                        })
                      }
                      placeholder="you@yourcompany.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Most hosts need the full mailbox address, not just the part before @.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-pass">Password</Label>
                    <Input
                      id="smtp-pass"
                      type="password"
                      value={config.smtp.password}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          smtp: { ...config.smtp, password: e.target.value },
                        })
                      }
                      placeholder={config.hasPassword ? "Saved — leave blank to keep" : "SMTP or app password"}
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground">
                      {config.hasPassword
                        ? "A password is already stored. Leave this blank unless you need to replace it."
                        : "Gmail needs an App Password, not your normal login password."}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Switch
                    checked={config.smtp.secure || config.smtp.port === 465}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        smtp: {
                          ...config.smtp,
                          secure: checked,
                          port: checked ? 465 : 587,
                        },
                      })
                    }
                  />
                  <div>
                    <Label>SSL on port 465</Label>
                    <p className="text-xs text-muted-foreground">
                      Leave this off for port 587 (STARTTLS). Turning SSL on with 587 causes a TLS version error.
                    </p>
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Send a test</CardTitle>
            <CardDescription>
              Confirms the mailbox can deliver. Mail still sends from this SMTP after save, even before the test.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@yourcompany.com"
            />
            <Button className="w-full" onClick={handleTestEmail} disabled={testing || !config.enabled}>
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send test email
                </>
              )}
            </Button>
            {config.enabled ? (
              <Button variant="outline" className="w-full" onClick={handleDisable}>
                Stop using company mailbox
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {configuredSenders
                ? `${configuredSenders} department address${configuredSenders === 1 ? "" : "es"} override the default from-line.`
                : "Departments inherit the company from-address until you set their own."}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department senders</CardTitle>
          <CardDescription>
            Same SMTP, different from-addresses. Leave a row blank to use the company default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {EMAIL_SENDER_MODULES.map((module) => (
            <div
              key={module.key}
              className="grid gap-3 rounded-xl border px-4 py-3 md:grid-cols-[minmax(0,220px)_1fr_1fr] md:items-center"
            >
              <div>
                <p className="text-sm font-medium">{module.label}</p>
                <p className="text-xs text-muted-foreground">{module.hint}</p>
              </div>
              <Input
                value={config.senders[module.key].fromName}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    senders: {
                      ...config.senders,
                      [module.key]: { ...config.senders[module.key], fromName: e.target.value },
                    },
                  })
                }
                placeholder={module.key === "default" ? config.fromName || "From name" : "Optional from name"}
              />
              <Input
                type="email"
                value={config.senders[module.key].fromEmail}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    senders: {
                      ...config.senders,
                      [module.key]: { ...config.senders[module.key], fromEmail: e.target.value },
                    },
                  })
                }
                placeholder={module.key === "default" ? config.fromEmail || "from@yourcompany.com" : "Optional from email"}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <p>
            <span className="font-medium text-foreground">Gmail.</span> Turn on 2-step verification and use an App Password.
          </p>
          <p>
            <span className="font-medium text-foreground">Microsoft 365.</span> smtp.office365.com on port 587, STARTTLS.
          </p>
          <p>
            <span className="font-medium text-foreground">Aliases.</span> Department addresses must be allowed to send through this mailbox.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
