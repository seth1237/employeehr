"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  MousePointerClick,
  RefreshCw,
  Search,
  Send,
  Users,
} from "lucide-react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

interface BulkEmailRecipient {
  key: string
  name: string
  email: string
  location?: string
  status: "sent" | "delivered" | "failed" | "skipped" | "opened" | "clicked" | "bounced"
  skipReason?: "duplicate" | "invalid_email" | "other"
  duplicateOfName?: string
  errorMessage?: string
  sentAt?: string
  deliveredAt?: string
  clickCount?: number
  clickedUrls?: string[]
}

interface BulkEmailCampaign {
  _id: string
  name: string
  subject: string
  htmlBody: string
  audienceCount: number
  sentCount: number
  deliveredCount?: number
  openedCount?: number
  clickedCount?: number
  uniqueClickedCount?: number
  linkClicks?: Array<{ url: string; clicks: number }>
  failedCount: number
  skippedCount: number
  duplicateCount?: number
  status: "draft" | "scheduled" | "sending" | "completed" | "completed_with_errors" | "failed"
  recipients?: BulkEmailRecipient[]
  createdAt: string
}

type CampaignReportTab = "failed" | "sent" | "delivered" | "opened" | "clicked" | "skipped" | "duplicates" | "all"

function isDuplicateRecipient(recipient: BulkEmailRecipient) {
  return (
    recipient.skipReason === "duplicate" ||
    String(recipient.errorMessage || "")
      .toLowerCase()
      .includes("duplicate email")
  )
}

function percent(part: number, whole: number) {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

function statusBadge(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (status === "sending" || status === "scheduled") return "bg-sky-50 text-sky-700 border-sky-200"
  if (status === "completed_with_errors") return "bg-amber-50 text-amber-800 border-amber-200"
  if (status === "draft") return "bg-slate-50 text-slate-600 border-slate-200"
  return "bg-red-50 text-red-700 border-red-200"
}

function recipientBadge(status: string, duplicate: boolean) {
  if (duplicate) return "bg-amber-50 text-amber-800 border-amber-200"
  if (status === "clicked") return "bg-indigo-50 text-indigo-700 border-indigo-200"
  if (status === "opened") return "bg-sky-50 text-sky-700 border-sky-200"
  if (status === "delivered") return "bg-emerald-50 text-emerald-700 border-emerald-200"
  if (status === "sent") return "bg-green-50 text-green-700 border-green-200"
  if (status === "failed") return "bg-red-50 text-red-700 border-red-200"
  return "bg-slate-50 text-slate-600 border-slate-200"
}

function recipientDetail(recipient: BulkEmailRecipient) {
  if (recipient.errorMessage) return recipient.errorMessage
  if (recipient.duplicateOfName) return `Same email as ${recipient.duplicateOfName}`
  if (recipient.status === "clicked") {
    const count = recipient.clickCount || 1
    const urls = recipient.clickedUrls?.length ? ` · ${recipient.clickedUrls.join(", ")}` : ""
    return `${count} click${count === 1 ? "" : "s"}${urls}`
  }
  if (recipient.status === "opened") return "Opened"
  if (recipient.status === "delivered") {
    return recipient.deliveredAt
      ? `Delivered ${new Date(recipient.deliveredAt).toLocaleString()}`
      : "Delivered"
  }
  if (recipient.status === "sent") {
    return recipient.sentAt ? `Sent ${new Date(recipient.sentAt).toLocaleString()}` : "Sent"
  }
  if (recipient.status === "failed") return "Send failed"
  return "Skipped"
}

function RateBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, backgroundColor: color }} />
    </div>
  )
}

export default function BulkEmailCampaignHistoryPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [campaigns, setCampaigns] = useState<BulkEmailCampaign[]>([])
  const [search, setSearch] = useState("")
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
  const [campaignReportTab, setCampaignReportTab] = useState<CampaignReportTab>("all")
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [branding, setBranding] = useState<{ primaryColor?: string }>({})

  const primaryColor = branding.primaryColor || "#0f766e"

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  const loadCampaigns = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (opts?.silent) setRefreshing(true)
      else setLoading(true)
      try {
        setError("")
        const response = await fetch(`${API_URL}/api/stock/bulk-email/campaigns`, { headers })
        const json = await response.json()
        if (!response.ok) throw new Error(json.message || "Failed to load campaigns")
        setCampaigns(json.data || [])
      } catch (loadError: any) {
        setError(loadError.message || "Failed to load campaigns")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [headers],
  )

  useEffect(() => {
    void loadCampaigns()
    fetch(`${API_URL}/api/company/branding`, { headers })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (json?.data) setBranding(json.data)
      })
      .catch(() => undefined)
  }, [headers, loadCampaigns])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadCampaigns({ silent: true })
    }, 15000)
    return () => window.clearInterval(timer)
  }, [loadCampaigns])

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return campaigns
    return campaigns.filter((item) =>
      [item.name, item.subject, item.status].join(" ").toLowerCase().includes(q),
    )
  }, [campaigns, search])

  const totals = useMemo(() => {
    return filteredCampaigns.reduce(
      (acc, item) => {
        acc.campaigns += 1
        acc.sent += item.sentCount || 0
        acc.opened += item.openedCount || 0
        acc.clicks += item.clickedCount || 0
        acc.failed += item.failedCount || 0
        return acc
      },
      { campaigns: 0, sent: 0, opened: 0, clicks: 0, failed: 0 },
    )
  }, [filteredCampaigns])

  const openRate = percent(totals.opened, totals.sent)
  const clickRate = percent(totals.clicks, totals.sent)

  if (loading) {
    return <PageLoadingSkeleton title="Loading campaign history" rows={8} />
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 w-fit px-2 text-muted-foreground">
            <Link href="/admin/clients/email-marketing">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to composer
            </Link>
          </Button>
          <div>
            <p className="text-sm font-medium" style={{ color: primaryColor }}>Email marketing</p>
            <h1 className="text-2xl font-semibold tracking-tight">Campaign results</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Opens, clicks, and delivery for every campaign sent from this account.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadCampaigns({ silent: true })} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing" : "Refresh"}
          </Button>
          <Button asChild style={{ backgroundColor: primaryColor }}>
            <Link href="/admin/clients/email-marketing">
              <Send className="mr-2 h-4 w-4" />
              New campaign
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card className="border-slate-200 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              Campaigns <Mail className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{totals.campaigns}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              Sent <Users className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{totals.sent}</div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-none">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Open rate</div>
            <div className="mt-2 text-2xl font-semibold text-sky-700">{openRate}%</div>
            <p className="text-xs text-muted-foreground">{totals.opened} opens</p>
            <RateBar value={openRate} color="#0284c7" />
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
              Click rate <MousePointerClick className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-semibold text-indigo-700">{clickRate}%</div>
            <p className="text-xs text-muted-foreground">{totals.clicks} clicks</p>
            <RateBar value={clickRate} color="#4f46e5" />
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-none">
          <CardContent className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Failed</div>
            <div className="mt-2 text-2xl font-semibold text-red-600">{totals.failed}</div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="h-11 max-w-xl pl-9"
          placeholder="Search by campaign name, subject, or status"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {filteredCampaigns.length === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="py-16 text-center">
            <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">
              {campaigns.length === 0 ? "No campaigns yet" : "No campaigns match that search"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Send a campaign from the composer to see opens and clicks here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCampaigns.map((item) => {
            const recipients = Array.isArray(item.recipients) ? item.recipients : []
            const duplicateCount =
              typeof item.duplicateCount === "number"
                ? item.duplicateCount
                : recipients.filter(isDuplicateRecipient).length
            const sent = item.sentCount || 0
            const opened = item.openedCount || 0
            const clicks = item.clickedCount || 0
            const uniqueClicks = item.uniqueClickedCount || 0
            const isExpanded = expandedCampaignId === item._id
            const showPreview = previewId === item._id
            const defaultTab: CampaignReportTab =
              item.failedCount > 0
                ? "failed"
                : uniqueClicks > 0
                  ? "clicked"
                  : opened > 0
                    ? "opened"
                    : sent > 0
                      ? "sent"
                      : "all"
            const activeTab = isExpanded ? campaignReportTab : defaultTab
            const filteredRecipients =
              activeTab === "all"
                ? recipients
                : activeTab === "duplicates"
                  ? recipients.filter(isDuplicateRecipient)
                  : recipients.filter((recipient) => recipient.status === activeTab)
            const linkClicks = (item.linkClicks || []).slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0))

            return (
              <Card key={item._id} className="overflow-hidden border-slate-200 shadow-none">
                <CardContent className="p-0">
                  <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-lg font-semibold">{item.name}</h2>
                        <Badge variant="outline" className={statusBadge(item.status)}>
                          {item.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-foreground/80">{item.subject || "No subject"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()} · {item.audienceCount} recipients
                      </p>
                    </div>
                    <div className="grid min-w-[280px] grid-cols-4 gap-3 text-center">
                      <div>
                        <p className="text-lg font-semibold">{sent}</p>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Sent</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-sky-700">{opened}</p>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{percent(opened, sent)}% open</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-indigo-700">{clicks}</p>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{percent(clicks, sent)}% click</p>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-red-600">{item.failedCount}</p>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Failed</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3">
                    <Button
                      type="button"
                      size="sm"
                      variant={showPreview ? "default" : "outline"}
                      onClick={() => setPreviewId(showPreview ? null : item._id)}
                      disabled={!item.htmlBody}
                    >
                      {showPreview ? "Hide preview" : "Preview email"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={isExpanded ? "default" : "outline"}
                      disabled={recipients.length === 0}
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedCampaignId(null)
                          return
                        }
                        setExpandedCampaignId(item._id)
                        setCampaignReportTab(defaultTab)
                      }}
                    >
                      {isExpanded ? <ChevronUp className="mr-1.5 h-4 w-4" /> : <ChevronDown className="mr-1.5 h-4 w-4" />}
                      Recipients
                    </Button>
                    {uniqueClicks > 0 ? (
                      <span className="text-xs text-muted-foreground">{uniqueClicks} people clicked a link</span>
                    ) : null}
                  </div>

                  {showPreview && item.htmlBody ? (
                    <div className="border-t bg-[#f8fafc] p-4">
                      <iframe
                        title={`${item.name} preview`}
                        className="mx-auto h-[520px] w-full max-w-[640px] rounded-xl border bg-white shadow-sm"
                        srcDoc={item.htmlBody}
                      />
                    </div>
                  ) : null}

                  {isExpanded ? (
                    <div className="space-y-4 border-t bg-slate-50/70 p-5">
                      {linkClicks.length > 0 ? (
                        <div className="rounded-xl border bg-white p-4">
                          <p className="mb-3 text-sm font-medium">Link performance</p>
                          <div className="space-y-2">
                            {linkClicks.map((link) => (
                              <div key={link.url} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex min-w-0 items-center gap-2 text-sm text-indigo-700 hover:underline"
                                >
                                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">{link.url}</span>
                                </a>
                                <span className="shrink-0 text-sm font-semibold">{link.clicks} clicks</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No tracked link clicks yet for this campaign.</p>
                      )}

                      <div className="rounded-xl border bg-white p-4">
                        <div className="mb-3 flex flex-wrap gap-2">
                          {(
                            [
                              { key: "all", label: `All (${recipients.length})` },
                              { key: "clicked", label: `Clicked (${uniqueClicks})` },
                              { key: "opened", label: `Opened (${opened})` },
                              { key: "sent", label: `Sent (${sent})` },
                              { key: "failed", label: `Failed (${item.failedCount})` },
                              { key: "duplicates", label: `Duplicates (${duplicateCount})` },
                              { key: "skipped", label: `Skipped (${item.skippedCount})` },
                            ] as Array<{ key: CampaignReportTab; label: string }>
                          ).map((tab) => (
                            <Button
                              key={tab.key}
                              type="button"
                              size="sm"
                              variant={activeTab === tab.key ? "default" : "outline"}
                              style={activeTab === tab.key ? { backgroundColor: primaryColor } : undefined}
                              onClick={() => setCampaignReportTab(tab.key)}
                            >
                              {tab.label}
                            </Button>
                          ))}
                        </div>

                        {filteredRecipients.length === 0 ? (
                          <p className="py-10 text-center text-sm text-muted-foreground">
                            No recipients in this view.
                          </p>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border">
                            <table className="w-full min-w-[720px] text-sm">
                              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                                <tr>
                                  <th className="px-3 py-2.5 font-medium">Name</th>
                                  <th className="px-3 py-2.5 font-medium">Email</th>
                                  <th className="px-3 py-2.5 font-medium">Location</th>
                                  <th className="px-3 py-2.5 font-medium">Status</th>
                                  <th className="px-3 py-2.5 font-medium">Details</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredRecipients.map((recipient) => (
                                  <tr key={`${item._id}-${recipient.key}-${recipient.email}`} className="border-t">
                                    <td className="px-3 py-2.5 font-medium">{recipient.name || "—"}</td>
                                    <td className="px-3 py-2.5 font-mono text-xs">{recipient.email || "—"}</td>
                                    <td className="px-3 py-2.5 text-muted-foreground">{recipient.location || "—"}</td>
                                    <td className="px-3 py-2.5">
                                      <Badge variant="outline" className={recipientBadge(recipient.status, isDuplicateRecipient(recipient))}>
                                        {isDuplicateRecipient(recipient) ? "Duplicate" : recipient.status}
                                      </Badge>
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                      {recipientDetail(recipient)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
