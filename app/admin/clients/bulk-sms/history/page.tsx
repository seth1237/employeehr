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
  History,
  RefreshCw,
  Search,
} from "lucide-react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

interface BulkSmsRecipient {
  key: string
  name: string
  phone: string
  normalizedPhone?: string
  location?: string
  status: "sent" | "delivered" | "failed" | "skipped"
  skipReason?: "duplicate" | "invalid_phone" | "other"
  duplicateOfName?: string
  errorMessage?: string
  sentAt?: string
  deliveredAt?: string
}

interface BulkSmsCampaign {
  _id: string
  name: string
  message: string
  audienceCount: number
  sentCount: number
  deliveredCount?: number
  failedCount: number
  skippedCount: number
  duplicateCount?: number
  status: "completed" | "completed_with_errors" | "failed"
  recipients?: BulkSmsRecipient[]
  createdAt: string
}

type CampaignReportTab = "failed" | "sent" | "delivered" | "skipped" | "duplicates" | "all"

function isDuplicateRecipient(recipient: BulkSmsRecipient) {
  return (
    recipient.skipReason === "duplicate" ||
    String(recipient.errorMessage || "")
      .toLowerCase()
      .includes("duplicate number")
  )
}

function recipientDisplayName(recipient: BulkSmsRecipient) {
  return recipient.name || "—"
}

export default function BulkSmsCampaignHistoryPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [campaigns, setCampaigns] = useState<BulkSmsCampaign[]>([])
  const [search, setSearch] = useState("")
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
  const [campaignReportTab, setCampaignReportTab] = useState<CampaignReportTab>("delivered")
  const [branding, setBranding] = useState<{ primaryColor?: string; secondaryColor?: string }>({})

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = `${primaryColor}14`
  const primaryBorderColor = `${primaryColor}2e`

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
        const response = await fetch(`${API_URL}/api/stock/bulk-sms/campaigns`, { headers })
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
      [item.name, item.message, item.status]
        .join(" ")
        .toLowerCase()
        .includes(q),
    )
  }, [campaigns, search])

  const totals = useMemo(() => {
    return filteredCampaigns.reduce(
      (acc, item) => {
        const recipients = item.recipients || []
        acc.campaigns += 1
        acc.audience += item.audienceCount || 0
        acc.sent += item.sentCount || 0
        acc.delivered +=
          typeof item.deliveredCount === "number"
            ? item.deliveredCount
            : recipients.filter((r) => r.status === "delivered").length
        acc.failed += item.failedCount || 0
        return acc
      },
      { campaigns: 0, audience: 0, sent: 0, delivered: 0, failed: 0 },
    )
  }, [filteredCampaigns])

  if (loading) {
    return <PageLoadingSkeleton title="Loading campaign history" rows={8} />
  }

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border px-4 py-4 shadow-sm"
        style={{
          borderColor: primaryBorderColor,
          background: `linear-gradient(to right, ${primarySoftColor}, ${secondaryColor}14)`,
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 w-fit px-2">
              <Link href="/admin/clients/bulk-sms">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to Bulk SMS
              </Link>
            </Button>
            <div className="space-y-0.5">
              <p className="text-sm font-medium tracking-wide" style={{ color: primaryColor }}>
                Clients
              </p>
              <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-foreground">
                <History className="h-5 w-5" />
                Campaign history
              </h1>
              <p className="text-sm text-muted-foreground">
                Full delivery report for every bulk SMS campaign. Sent means the provider accepted the
                message; Delivered means the handset confirmed via DLR.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => void loadCampaigns({ silent: true })}
              disabled={refreshing}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
            <Button asChild style={{ backgroundColor: primaryColor }}>
              <Link href="/admin/clients/bulk-sms">Compose campaign</Link>
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Campaigns</div>
              <div className="mt-1 text-xl font-semibold">{totals.campaigns}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Audience rows</div>
              <div className="mt-1 text-xl font-semibold">{totals.audience}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Delivered</div>
              <div className="mt-1 text-xl font-semibold text-emerald-700">{totals.delivered}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Sent (pending DLR)</div>
              <div className="mt-1 text-xl font-semibold text-green-700">{totals.sent}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Failed</div>
              <div className="mt-1 text-xl font-semibold text-red-600">{totals.failed}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search campaigns by name, message, or status…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {filteredCampaigns.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center text-muted-foreground">
            {campaigns.length === 0
              ? "No campaigns found yet. Send a bulk SMS to see history here."
              : "No campaigns match that search."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map((item) => {
            const recipients = Array.isArray(item.recipients) ? item.recipients : []
            const duplicateCount =
              typeof item.duplicateCount === "number"
                ? item.duplicateCount
                : recipients.filter(isDuplicateRecipient).length
            const deliveredCount =
              typeof item.deliveredCount === "number"
                ? item.deliveredCount
                : recipients.filter((recipient) => recipient.status === "delivered").length
            const isExpanded = expandedCampaignId === item._id
            const defaultTab: CampaignReportTab =
              item.failedCount > 0
                ? "failed"
                : deliveredCount > 0
                  ? "delivered"
                  : duplicateCount > 0
                    ? "duplicates"
                    : item.sentCount > 0
                      ? "sent"
                      : "all"
            const activeTab = isExpanded ? campaignReportTab : defaultTab
            const filteredRecipients =
              activeTab === "all"
                ? recipients
                : activeTab === "duplicates"
                  ? recipients.filter(isDuplicateRecipient)
                  : recipients.filter((recipient) => recipient.status === activeTab)

            return (
              <Card key={item._id} className="shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-foreground">{item.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      className={
                        item.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : item.status === "completed_with_errors"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                      }
                    >
                      {item.status.replace(/_/g, " ")}
                    </Badge>
                  </div>

                  <div className="rounded-lg border bg-muted/30 p-3 text-sm italic text-muted-foreground">
                    &ldquo;{item.message}&rdquo;
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="space-y-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total</p>
                      <p className="text-xl font-bold">{item.audienceCount}</p>
                    </div>
                    <div className="space-y-1 text-emerald-700">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Delivered</p>
                      <p className="text-xl font-bold">{deliveredCount}</p>
                    </div>
                    <div className="space-y-1 text-green-600">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sent</p>
                      <p className="text-xl font-bold">{item.sentCount}</p>
                    </div>
                    <div className="space-y-1 text-red-600">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Failed</p>
                      <p className="text-xl font-bold">{item.failedCount}</p>
                    </div>
                    <div className="space-y-1 text-amber-700">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Duplicates</p>
                      <p className="text-xl font-bold">{duplicateCount}</p>
                    </div>
                    <div className="space-y-1 text-muted-foreground">
                      <p className="text-xs font-medium uppercase tracking-wide">Skipped</p>
                      <p className="text-xl font-bold">{item.skippedCount}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {recipients.length > 0
                        ? "Open the report for recipient-level delivery details."
                        : "No recipient-level details stored for this campaign."}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
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
                      {isExpanded ? (
                        <>
                          <ChevronUp className="mr-1.5 h-4 w-4" />
                          Hide report
                        </>
                      ) : (
                        <>
                          <ChevronDown className="mr-1.5 h-4 w-4" />
                          View report
                        </>
                      )}
                    </Button>
                  </div>

                  {isExpanded && recipients.length > 0 ? (
                    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                      <div className="flex flex-wrap gap-2">
                        {(
                          [
                            { key: "delivered", label: `Delivered (${deliveredCount})` },
                            { key: "sent", label: `Sent (${item.sentCount})` },
                            { key: "failed", label: `Failed (${item.failedCount})` },
                            { key: "duplicates", label: `Duplicates (${duplicateCount})` },
                            { key: "skipped", label: `Skipped (${item.skippedCount})` },
                            { key: "all", label: `All (${recipients.length})` },
                          ] as Array<{ key: CampaignReportTab; label: string }>
                        ).map((tab) => (
                          <Button
                            key={tab.key}
                            type="button"
                            size="sm"
                            variant={activeTab === tab.key ? "default" : "outline"}
                            onClick={() => setCampaignReportTab(tab.key)}
                          >
                            {tab.label}
                          </Button>
                        ))}
                      </div>

                      {filteredRecipients.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          No {activeTab === "all" ? "" : `${activeTab} `}recipients in this campaign.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-md border bg-background">
                          <table className="w-full min-w-[720px] text-sm">
                            <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2.5 font-medium">Name</th>
                                <th className="px-3 py-2.5 font-medium">Phone</th>
                                <th className="px-3 py-2.5 font-medium">Location</th>
                                <th className="px-3 py-2.5 font-medium">Status</th>
                                <th className="px-3 py-2.5 font-medium">Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredRecipients.map((recipient) => (
                                <tr
                                  key={`${item._id}-${recipient.key}-${recipient.phone}`}
                                  className="border-b last:border-0"
                                >
                                  <td className="px-3 py-2.5 align-top font-medium">
                                    {recipientDisplayName(recipient)}
                                  </td>
                                  <td className="px-3 py-2.5 align-top font-mono text-xs">
                                    {recipient.normalizedPhone || recipient.phone || "—"}
                                  </td>
                                  <td className="px-3 py-2.5 align-top text-muted-foreground">
                                    {recipient.location || "—"}
                                  </td>
                                  <td className="px-3 py-2.5 align-top">
                                    <Badge
                                      className={
                                        recipient.status === "delivered"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : recipient.status === "sent"
                                            ? "bg-green-100 text-green-700"
                                            : recipient.status === "failed"
                                              ? "bg-red-100 text-red-700"
                                              : isDuplicateRecipient(recipient)
                                                ? "bg-amber-100 text-amber-800"
                                                : "bg-slate-100 text-slate-700"
                                      }
                                    >
                                      {isDuplicateRecipient(recipient)
                                        ? "Duplicate"
                                        : recipient.status}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2.5 align-top text-xs text-muted-foreground">
                                    {recipient.errorMessage ||
                                      (recipient.duplicateOfName
                                        ? `Same number as ${recipient.duplicateOfName}`
                                        : recipient.status === "delivered"
                                          ? recipient.deliveredAt
                                            ? `Delivered ${new Date(recipient.deliveredAt).toLocaleString()}`
                                            : "Delivered to handset"
                                          : recipient.status === "sent"
                                            ? recipient.sentAt
                                              ? `Sent ${new Date(recipient.sentAt).toLocaleString()} · awaiting delivery`
                                              : "Accepted by provider · awaiting delivery"
                                            : recipient.status === "failed"
                                              ? "Send/delivery failed"
                                              : "Skipped")}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
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
