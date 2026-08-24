"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Layers,
  Sparkles,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountsPageHeader } from "@/components/accounts/accounts-page-header"
import { hexToRgba, useAccountsBranding } from "@/components/accounts/use-accounts-branding"
import { api, stockApi } from "@/lib/api"
import {
  ACCOUNTS_NAV_GROUPS,
  ACCOUNTS_NAV_PAGES,
  getAccountsNavStats,
  getAccountsPagesByGroup,
  type AccountsNavPage,
} from "@/lib/accounts-nav"

function StatusBadge({ status }: { status: AccountsNavPage["status"] }) {
  if (status === "live") {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">
        Live
      </Badge>
    )
  }
  if (status === "linked") {
    return (
      <Badge variant="secondary" className="text-[10px] gap-1">
        <ExternalLink className="h-2.5 w-2.5" />
        Linked
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px] gap-1">
      <Clock className="h-2.5 w-2.5" />
      Planned
    </Badge>
  )
}

function ModuleLink({ page }: { page: AccountsNavPage }) {
  const href = page.redirectTo || page.href
  const isExternal = page.status === "linked"

  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-3 rounded-lg border bg-background/60 p-3 hover:bg-muted/30 transition"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium">{page.label}</p>
          <StatusBadge status={page.status} />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{page.description}</p>
      </div>
      {isExternal ? (
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
      ) : (
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
      )}
    </Link>
  )
}

export function AccountsDashboard() {
  const branding = useAccountsBranding()
  const stats = getAccountsNavStats()
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState({
    totalOutstanding: 0,
    overdueCount: 0,
    pendingEtims: 0,
    failedEtims: 0,
    monthRevenue: 0,
    monthProfit: 0,
    inventoryValue: 0,
    isEtimsConnected: false,
  })
  const [alerts, setAlerts] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [agingRes, financialRes, etimsRes, debtsRes] = await Promise.all([
          stockApi.getAgingDebtReport().catch(() => null),
          stockApi.getFinancialBreakdown({ period: "this-month" }).catch(() => null),
          api.etims.getStats().catch(() => null),
          stockApi.getDebtManagement().catch(() => null),
        ])

        const aging = agingRes?.data
        const financial = financialRes?.data
        const etims = etimsRes?.data
        const debts = debtsRes?.data || []

        const overdueRows = (aging?.rows || []).filter((row: any) =>
          ["61-90 days", "90+ days"].includes(row.bucket),
        )

        const nextAlerts: string[] = []
        const outstanding = Number(aging?.totalOutstanding || 0)
        if (outstanding > 0) {
          nextAlerts.push(`KES ${outstanding.toLocaleString()} in outstanding customer invoices`)
        }
        if (overdueRows.length > 0) {
          nextAlerts.push(`${overdueRows.length} invoice(s) in 61–90 or 90+ day aging buckets`)
        }
        if (Number(etims?.pending || 0) > 0) {
          nextAlerts.push(`${etims.pending} invoice(s) pending eTIMS submission`)
        }
        if (Number(etims?.failed || 0) > 0) {
          nextAlerts.push(`${etims.failed} eTIMS submission(s) failed — review required`)
        }
        if (debts.length > 5) {
          nextAlerts.push(`${debts.length} unsettled debtor accounts need follow-up`)
        }

        setKpis({
          totalOutstanding: outstanding,
          overdueCount: overdueRows.length,
          pendingEtims: Number(etims?.pending || 0),
          failedEtims: Number(etims?.failed || 0),
          monthRevenue: Number(financial?.summary?.totalRevenue || 0),
          monthProfit: Number(financial?.summary?.totalProfit || 0),
          inventoryValue: Number(financial?.summary?.totalInventoryValue || 0),
          isEtimsConnected: Boolean(etims?.isConnected),
        })
        setAlerts(nextAlerts.slice(0, 5))
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const kpiCards = [
    {
      label: "Accounts Receivable",
      value: kpis.totalOutstanding,
      icon: Wallet,
      href: "/admin/accounts/debts",
    },
    {
      label: "This Month Revenue",
      value: kpis.monthRevenue,
      icon: TrendingUp,
      href: "/admin/accounts/financial-breakdown",
    },
    {
      label: "This Month Profit",
      value: kpis.monthProfit,
      icon: Banknote,
      href: "/admin/accounts/financial-breakdown",
    },
    {
      label: "Inventory Value",
      value: kpis.inventoryValue,
      icon: Layers,
      href: "/admin/accounts/financial-breakdown",
    },
  ]

  return (
    <div className="space-y-6">
      <AccountsPageHeader
        eyebrow="Fiscal Intelligence"
        title="Accounts Dashboard"
        description="Central hub for finance, receivables, tax compliance, payroll reporting, and the phased accounting rollout."
        backHref=""
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.label} href={item.href}>
              <Card className="border-none shadow-sm bg-background/60 backdrop-blur-sm hover:shadow-md transition">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase font-medium tracking-wide text-muted-foreground">
                      {item.label}
                    </p>
                    <Icon className="h-4 w-4 opacity-40" style={{ color: branding.primaryColor }} />
                  </div>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {loading ? "…" : (
                      <>
                        <span className="text-xs font-normal opacity-50 mr-1">KES</span>
                        {item.value.toLocaleString()}
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Compliance & Collections</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/accounts/posts"
              className="rounded-xl border p-4 hover:bg-muted/30 transition"
              style={{ borderColor: hexToRgba(branding.primaryColor, 0.12) }}
            >
              <div className="flex items-center gap-2 mb-2">
                {kpis.isEtimsConnected ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                <span className="text-sm font-medium">eTIMS</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {kpis.isEtimsConnected ? "Connected" : "Disconnected"} · {kpis.pendingEtims} pending ·{" "}
                {kpis.failedEtims} failed
              </p>
            </Link>
            <Link
              href="/admin/accounts/receivables/aging"
              className="rounded-xl border p-4 hover:bg-muted/30 transition"
              style={{ borderColor: hexToRgba(branding.secondaryColor, 0.12) }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4" style={{ color: branding.secondaryColor }} />
                <span className="text-sm font-medium">Receivables Aging</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {kpis.overdueCount} invoice(s) in 61+ day buckets
              </p>
            </Link>
            <Link href="/admin/accounts/payments" className="rounded-xl border p-4 hover:bg-muted/30 transition">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Record Payment</span>
              </div>
              <p className="text-xs text-muted-foreground">Apply customer payments to invoices</p>
            </Link>
            <Link href="/admin/accounts/expenses" className="rounded-xl border p-4 hover:bg-muted/30 transition">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Expenses</span>
              </div>
              <p className="text-xs text-muted-foreground">M-Pesa prompts and recurring bills</p>
            </Link>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading alerts…</p>
            ) : alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No urgent alerts right now.</p>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert}
                  className="rounded-lg border border-amber-200/60 bg-amber-50/50 px-3 py-2 text-xs text-amber-900"
                >
                  {alert}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-muted/10">
        <CardContent className="py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <Sparkles className="h-4 w-4" style={{ color: branding.primaryColor }} />
            <span>
              <strong>{stats.live}</strong> live · <strong>{stats.linked}</strong> linked ·{" "}
              <strong>{stats.planned}</strong> planned modules
            </span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/accounts/general-ledger/chart-of-accounts">
              View Phase 1 Roadmap
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {ACCOUNTS_NAV_GROUPS.filter((group) => group.id !== "overview").map((group) => {
          const pages = getAccountsPagesByGroup(group.id)
          if (pages.length === 0) return null

          return (
            <section key={group.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">{group.label}</h2>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  Phase {group.phase}
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {pages.map((page) => (
                  <ModuleLink key={page.id} page={page} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
