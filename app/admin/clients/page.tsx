"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import API_URL from "@/lib/apiBase"
import { getToken, getUser } from "@/lib/auth"
import { stockApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { type TenantBranding } from "@/lib/stock-document-pdf"
import {
  Users,
  MessageSquare,
  Mail,
  Zap,
  Activity,
  RefreshCw,
  UserPlus,
  Phone,
  PhoneCall,
  MapPin,
  Wrench,
  AlertCircle,
  AlertTriangle,
  Quote,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react"

/* -------------------------------------------------------------------------- */
/*  Types (unchanged data contract — no backend/API changes)                  */
/* -------------------------------------------------------------------------- */

type ClientInsights = {
  clientsSaved: number
  addedThisMonth: number
  addedLastMonth: number
  addedLast30Days: number
  addedLast7Days: number
  monthDelta: number
  withContacts: number
  withoutContacts: number
  withEmail: number
  inGroups: number
  totalContacts: number
  groups: number
  uniqueCounties: number
  topCounties: Array<{ name: string; count: number }>
  machines: {
    total: number
    active: number
    maintenance: number
    pending: number
    clientsWithMachines: number
  }
  complaints: {
    total: number
    open: number
  }
  callsThisMonth: number
  callsLastMonth: number
  callDelta: number
  recentClients: Array<{
    name: string
    county: string
    createdAt?: string
    contacts: number
  }>
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatCount(value: number) {
  return Number(value || 0).toLocaleString()
}

function safePercent(part: number, whole: number) {
  if (!whole) return 0
  return Math.max(0, Math.min(100, Math.round((part / whole) * 100)))
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

// Same branding-derivation approach used on the Invoices dashboard.
function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/* -------------------------------------------------------------------------- */
/*  Small local building blocks                                               */
/* -------------------------------------------------------------------------- */

function DeltaTag({ value, suffix = "vs last month" }: { value: number; suffix?: string }) {
  if (!value) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> flat {suffix}
      </span>
    )
  }
  const positive = value > 0
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        positive ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : "−"}
      {formatCount(Math.abs(value))} {suffix}
    </span>
  )
}

function KpiTileSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  )
}

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="h-3 w-40 animate-pulse rounded bg-muted" />
      <div className="h-3 w-10 animate-pulse rounded bg-muted" />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ClientsHubPage() {
  const [insights, setInsights] = useState<ClientInsights | null>(null)
  const [branding, setBranding] = useState<TenantBranding>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  const loadInsights = async (opts?: { silent?: boolean }) => {
    const silent = Boolean(opts?.silent)
    if (silent) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await stockApi.getClientInsights()
      if (!res.success) {
        throw new Error(res.message || "Failed to load client insights")
      }
      setInsights(res.data as ClientInsights)

      // Tenant branding — same source the Invoices dashboard reads from.
      // Best-effort only: never blocks the dashboard, never breaks tenant isolation.
      try {
        const brandingRes = await fetch(`${API_URL}/api/company/branding`, { headers })
        if (brandingRes.ok) {
          const brandingJson = await brandingRes.json()
          setBranding(brandingJson.data || {})
        }
      } catch {
        // Keep existing/default branding on failure.
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load client insights")
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    void loadInsights()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentUser = getUser()
  const firstName =
    (currentUser as any)?.first_name || (currentUser as any)?.firstName || ""

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  // Derived, action-oriented data — computed only from fields the API already returns.
  const missingEmail = insights ? Math.max(0, insights.clientsSaved - insights.withEmail) : 0

  const priorities = insights
    ? [
        {
          label: "Clients missing contact details",
          count: insights.withoutContacts,
          href: "/admin/clients/clients-list",
          icon: Phone,
          tone: insights.withoutContacts > 0 ? "warning" : "clear",
        },
        {
          label: "Clients missing an email address",
          count: missingEmail,
          href: "/admin/clients/clients-list",
          icon: Mail,
          tone: missingEmail > 0 ? "warning" : "clear",
        },
        {
          label: "Open client complaints",
          count: insights.complaints.open,
          href: "/admin/clients/complaints",
          icon: AlertTriangle,
          tone: insights.complaints.open > 0 ? "high" : "clear",
        },
        {
          label: "Machines pending installation",
          count: insights.machines.pending,
          href: "/admin/clients/installed-machines",
          icon: Wrench,
          tone: insights.machines.pending > 0 ? "warning" : "clear",
        },
        {
          label: "Machines under maintenance",
          count: insights.machines.maintenance,
          href: "/admin/clients/installed-machines",
          icon: Wrench,
          tone: insights.machines.maintenance > 0 ? "warning" : "clear",
        },
      ].sort((a, b) => b.count - a.count)
    : []

  const toneStyles: Record<string, string> = {
    high: "border-rose-200 bg-rose-50 text-rose-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    clear: "border-emerald-200 bg-emerald-50 text-emerald-700",
  }

  const quickActions = [
    { label: "Add client", href: "/admin/clients/clients-list", icon: UserPlus },
    { label: "Log a call", href: "/admin/clients/clients-list", icon: PhoneCall },
    { label: "Create quote", href: "/admin/clients/telesales-activity", icon: Quote },
    { label: "Bulk SMS", href: "/admin/clients/bulk-sms", icon: Mail },
  ]

  const workspace = [
    {
      title: "Client CRM",
      description: "Directory, contacts, groups, calls, quotes, and statements",
      href: "/admin/clients/clients-list",
      icon: Users,
    },
    {
      title: "Telesales Activity",
      description: "Performance, quotes, conversions, and the installations planner",
      href: "/admin/clients/telesales-activity",
      icon: Activity,
    },
    {
      title: "Installed Machines",
      description: "Track machines, services, and open tickets",
      href: "/admin/clients/installed-machines",
      icon: Zap,
    },
    {
      title: "Bulk SMS",
      description: "Send campaigns to selected client groups",
      href: "/admin/clients/bulk-sms",
      icon: Mail,
    },
    {
      title: "Client Complaints",
      description: "Log and track complaints through resolution",
      href: "/admin/clients/complaints",
      icon: MessageSquare,
    },
  ]

  const kpis = insights
    ? [
        {
          label: "Total clients",
          value: formatCount(insights.clientsSaved),
          icon: Users,
          detail: <DeltaTag value={insights.monthDelta} />,
        },
        {
          label: "New this month",
          value: formatCount(insights.addedThisMonth),
          icon: UserPlus,
          detail: (
            <span className="text-xs text-muted-foreground">
              {formatCount(insights.addedLast7Days)} in the last 7 days
            </span>
          ),
        },
        {
          label: "Calls this month",
          value: formatCount(insights.callsThisMonth),
          icon: PhoneCall,
          detail: <DeltaTag value={insights.callDelta} />,
        },
        {
          label: "Open complaints",
          value: formatCount(insights.complaints.open),
          icon: AlertCircle,
          detail: (
            <span className="text-xs text-muted-foreground">
              {formatCount(insights.complaints.total)} logged in total
            </span>
          ),
        },
      ]
    : []

  const maxCounty = insights?.topCounties?.[0]?.count || 1

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------------- */}
      {/* Command header                                                   */}
      {/* ---------------------------------------------------------------- */}
      <div
        className="rounded-2xl border px-4 py-4 shadow-sm"
        style={{
          borderColor: primaryBorderColor,
          background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})`,
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium tracking-wide" style={{ color: primaryColor }}>
              Telesales
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {getGreeting()}
              {firstName ? `, ${firstName}` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">
              Here's your client pipeline, sales activity, and follow-up priorities for today.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Button key={action.label} asChild variant="outline" size="sm">
                  <Link href={action.href}>
                    <Icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </Link>
                </Button>
              )
            })}
            <Button
              size="sm"
              onClick={() => void loadInsights({ silent: true })}
              disabled={loading || refreshing}
              aria-label="Refresh dashboard"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading || refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Error state                                                      */}
      {/* ---------------------------------------------------------------- */}
      {error && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-medium text-rose-800">Couldn't load your dashboard</p>
                <p className="text-sm text-rose-700">{error}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => void loadInsights()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Primary KPIs                                                     */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading && !insights
          ? Array.from({ length: 4 }).map((_, i) => <KpiTileSkeleton key={i} />)
          : kpis.map((kpi) => {
              const Icon = kpi.icon
              return (
                <Card key={kpi.label} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {kpi.label}
                      </p>
                      <Icon className="h-4 w-4" style={{ color: primaryColor }} />
                    </div>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{kpi.value}</p>
                    <div className="mt-1">{kpi.detail}</div>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Priorities + Performance snapshot                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today's priorities</CardTitle>
            <p className="text-sm text-muted-foreground">
              What needs attention across your client base right now
            </p>
          </CardHeader>
          <CardContent className="divide-y">
            {loading && !insights ? (
              Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
            ) : priorities.every((p) => p.count === 0) ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Nothing urgent — your client base is in good shape.
              </div>
            ) : (
              priorities.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:bg-muted/40"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${toneStyles[item.tone]}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate text-foreground">{item.label}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0 font-semibold text-foreground">
                      {formatCount(item.count)}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </Link>
                )
              })
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Client growth</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!insights ? (
                <>
                  <RowSkeleton />
                  <RowSkeleton />
                  <RowSkeleton />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last 7 days</span>
                    <span className="font-semibold text-foreground">
                      {formatCount(insights!.addedLast7Days)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last 30 days</span>
                    <span className="font-semibold text-foreground">
                      {formatCount(insights!.addedLast30Days)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">This month vs last</span>
                    <DeltaTag value={insights!.monthDelta} suffix="" />
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-muted-foreground">Clients with contacts on file</span>
                    <span className="font-semibold text-foreground">
                      {safePercent(insights!.withContacts, insights!.clientsSaved)}%
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Machine health</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!insights ? (
                <>
                  <RowSkeleton />
                  <RowSkeleton />
                </>
              ) : (
                <>
                  <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${safePercent(insights!.machines.active, insights!.machines.total)}%` }}
                    />
                    <div
                      className="h-full bg-amber-500"
                      style={{
                        width: `${safePercent(insights!.machines.maintenance, insights!.machines.total)}%`,
                      }}
                    />
                    <div
                      className="h-full bg-slate-400"
                      style={{ width: `${safePercent(insights!.machines.pending, insights!.machines.total)}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Active{" "}
                      {formatCount(insights!.machines.active)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" /> Maintenance{" "}
                      {formatCount(insights!.machines.maintenance)}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-400" /> Pending{" "}
                      {formatCount(insights!.machines.pending)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-muted-foreground">Clients with machines installed</span>
                    <span className="font-semibold text-foreground">
                      {formatCount(insights!.machines.clientsWithMachines)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Coverage + Recent activity                                       */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Client coverage</CardTitle>
            <p className="text-sm text-muted-foreground">
              {insights ? `${formatCount(insights.uniqueCounties)} counties covered` : "By county"}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && !insights ? (
              Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
            ) : !insights?.topCounties?.length ? (
              <p className="text-sm text-muted-foreground">No county data yet.</p>
            ) : (
              insights.topCounties.map((county) => (
                <div key={county.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      {county.name}
                    </span>
                    <span className="font-medium text-foreground">{formatCount(county.count)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${safePercent(county.count, maxCounty)}%`,
                        backgroundColor: primaryColor,
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent client activity</CardTitle>
            <p className="text-sm text-muted-foreground">Newest clients added to the CRM</p>
          </CardHeader>
          <CardContent className="divide-y">
            {loading && !insights ? (
              Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
            ) : !insights?.recentClients?.length ? (
              <p className="py-2 text-sm text-muted-foreground">No saved clients yet.</p>
            ) : (
              insights.recentClients.map((client, index) => (
                <div
                  key={`${client.name}-${index}`}
                  className="flex items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {client.name || "Unnamed client"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {client.county || "No county"} · {formatCount(client.contacts)} contacts
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : ""}
                    </span>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {formatCount(client.contacts)} contact{client.contacts === 1 ? "" : "s"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* CRM / Sales workspace                                            */}
      {/* ---------------------------------------------------------------- */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sales workspace</CardTitle>
          <p className="text-sm text-muted-foreground">Jump to any part of the client CRM</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {workspace.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: primarySoftColor, color: primaryColor }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}