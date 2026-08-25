"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Banknote,
  Building2,
  Package,
  Users,
  Wallet,
  FileText,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { hexToRgba, useAccountsBranding } from "@/components/accounts/use-accounts-branding"
import {
  getAccountsSidebarModules,
  type AccountsSidebarModule,
} from "@/lib/accounts-nav"
import { api, stockApi } from "@/lib/api"

const MODULE_ICONS: Record<string, typeof Wallet> = {
  expenses: Wallet,
  receivables: Banknote,
  "cash-banking": Building2,
  payroll: Users,
  "inventory-accounting": Package,
  payables: FileText,
}

function money(n: number) {
  return Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

type LandingStats = {
  expenseSpend: number
  receivablesOutstanding: number
  cashLiquidity: number
  cashIn: number
  cashOut: number
  debtorCount: number
}

export default function AccountsLandingPage() {
  const branding = useAccountsBranding()
  const modules = getAccountsSidebarModules()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<LandingStats>({
    expenseSpend: 0,
    receivablesOutstanding: 0,
    cashLiquidity: 0,
    cashIn: 0,
    cashOut: 0,
    debtorCount: 0,
  })

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const [expRes, recvRes, cashRes] = await Promise.all([
        stockApi.getExpensesSummary().catch(() => null),
        stockApi.getReceivablesSummary().catch(() => null),
        api.cashBanking.getOverview().catch(() => null),
      ])

      setStats({
        expenseSpend: Number(expRes?.data?.totalSpend || 0),
        receivablesOutstanding: Number(recvRes?.data?.totalOutstanding || 0),
        debtorCount: Number(recvRes?.data?.debtorCount || 0),
        cashLiquidity: Number(cashRes?.data?.totals?.totalOnHand || 0),
        cashIn: Number(cashRes?.data?.cashflow?.inflow || 0),
        cashOut: Number(cashRes?.data?.cashflow?.outflow || 0),
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (loading) {
    return <PageLoadingSkeleton title="Loading Accounts" rows={8} />
  }

  const primaryBorder = hexToRgba(branding.primaryColor, 0.18)
  const primarySoft = hexToRgba(branding.primaryColor, 0.08)
  const secondarySoft = hexToRgba(branding.secondaryColor, 0.08)

  const kpis = [
    {
      label: "Company expenses",
      value: stats.expenseSpend,
      href: "/admin/accounts/expenses",
      accent: branding.primaryColor,
    },
    {
      label: "Receivables outstanding",
      value: stats.receivablesOutstanding,
      href: "/admin/accounts/receivables",
      accent: "#dc2626",
    },
    {
      label: "Cash & bank liquidity",
      value: stats.cashLiquidity,
      href: "/admin/accounts/cash-banking",
      accent: "#059669",
    },
    {
      label: "Period cash in / out",
      valueLabel: `${money(stats.cashIn)} / ${money(stats.cashOut)}`,
      href: "/admin/accounts/cash-banking/cashbook",
      accent: branding.secondaryColor,
    },
  ]

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border px-5 py-6 shadow-sm"
        style={{
          borderColor: primaryBorder,
          background: `linear-gradient(135deg, ${primarySoft}, ${secondarySoft})`,
        }}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-2">
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: branding.primaryColor }}
            >
              Accounts
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Finance command center
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Track money that comes in, money that goes out, and what still sits
              unpaid — across expenses, customers, cash & banking, payroll,
              inventory value, and supplier payables.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button size="sm" asChild style={{ backgroundColor: branding.primaryColor }}>
              <Link href="/admin/accounts/cash-banking">
                Open cashflow
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href}>
              <Card className="border-none bg-background/70 shadow-sm backdrop-blur-sm hover:shadow-md transition h-full">
                <CardContent className="p-3">
                  <p className="text-[10px] uppercase font-medium tracking-wide text-muted-foreground">
                    {kpi.label}
                  </p>
                  <p
                    className="mt-1 text-xl font-semibold tabular-nums"
                    style={{ color: kpi.accent }}
                  >
                    {"valueLabel" in kpi && kpi.valueLabel ? (
                      kpi.valueLabel
                    ) : (
                      <>
                        <span className="text-xs font-normal opacity-50 mr-1">
                          KES
                        </span>
                        {money(Number(kpi.value || 0))}
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Modules</h2>
            <p className="text-xs text-muted-foreground">
              Same six areas as the Accounts sidebar — open any module to work
              inside it.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {stats.debtorCount} open debtor
            {stats.debtorCount === 1 ? "" : "s"}
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((mod) => (
            <ModuleCard key={mod.groupId} module={mod} primary={branding.primaryColor} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold mb-1">How money connects</h2>
        <p className="text-xs text-muted-foreground mb-3 max-w-3xl">
          Customer payments and debt collections land in Cashflow & Banking.
          Expenses and paid salaries leave it. Use Reconcile later against bank /
          M-Pesa statements so every balance can be confirmed.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/accounts/payments">Record payment</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/accounts/expenses/new">Add expense</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/accounts/cash-banking/reconciliation">
              Reconcile cashbook
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/payroll">Mark salaries paid</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

function ModuleCard({
  module,
  primary,
}: {
  module: AccountsSidebarModule
  primary: string
}) {
  const Icon = MODULE_ICONS[module.groupId] || FileText
  return (
    <Link
      href={module.href}
      className="group rounded-xl border bg-card p-4 hover:shadow-md transition flex flex-col gap-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className="rounded-lg p-2"
          style={{ backgroundColor: hexToRgba(primary, 0.1) }}
        >
          <Icon className="h-4 w-4" style={{ color: primary }} />
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
      </div>
      <div>
        <p className="font-semibold text-sm">{module.label}</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {module.description}
        </p>
      </div>
      <Badge variant="outline" className="w-fit text-[10px]">
        Open module
      </Badge>
    </Link>
  )
}
