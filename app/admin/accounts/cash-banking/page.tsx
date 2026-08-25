"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Banknote, Building2, Smartphone, BookOpen, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { api } from "@/lib/api"

function money(n: number) {
  return Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const LINKS = [
  {
    label: "Cash",
    href: "/admin/accounts/cash-banking/cash",
    description: "Petty cash and cash on hand",
    icon: Banknote,
  },
  {
    label: "Banks",
    href: "/admin/accounts/cash-banking/bank",
    description: "Bank balances and account register",
    icon: Building2,
  },
  {
    label: "M-Pesa",
    href: "/admin/accounts/cash-banking/mpesa",
    description: "Till, paybill, and phone wallets",
    icon: Smartphone,
  },
  {
    label: "Cashbook",
    href: "/admin/accounts/cash-banking/cashbook",
    description: "Full inflow / outflow history",
    icon: BookOpen,
  },
  {
    label: "Transfers",
    href: "/admin/accounts/cash-banking/transfers",
    description: "Move money between accounts",
    icon: ArrowLeftRight,
  },
  {
    label: "Reconcile",
    href: "/admin/accounts/cash-banking/reconciliation",
    description: "Tick off statement lines",
    icon: BookOpen,
  },
]

export default function CashBankingHubPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [data, setData] = useState<any>(null)

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await api.cashBanking.getOverview()
      setData(res.data || null)
    } catch (error: any) {
      window.alert(error?.message || "Failed to load cash overview")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const syncOps = async () => {
    setSyncing(true)
    try {
      const res = await api.cashBanking.syncFromOperations()
      window.alert(
        res.message ||
          `Synced · payments ${res.data?.importedPayments || 0}, expenses ${res.data?.importedExpenses || 0}, salaries ${res.data?.importedPayrolls || 0}`,
      )
      await load(true)
    } catch (error: any) {
      window.alert(error?.message || "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading cash & banking" rows={8} />

  const totals = data?.totals || {}
  const cashflow = data?.cashflow || {}
  const recent = data?.recent || []

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Cash & Banking"
      title="Cashflow & Banking"
      description="Money in and out across cash, bank, and M-Pesa. Invoice payments, expenses, and paid salaries post here automatically — reconcile against statements when ready."
      moduleNavGroupId="cash-banking"
      onRefresh={() => void load(true)}
      refreshing={refreshing}
      kpis={[
        { label: "Cash on hand", value: totals.cash || 0, prefix: "KES" },
        { label: "In banks", value: totals.bank || 0, prefix: "KES", accent: "secondary" },
        { label: "M-Pesa", value: totals.mpesa || 0, prefix: "KES" },
        {
          label: "Total liquidity",
          value: totals.totalOnHand || 0,
          prefix: "KES",
          accent: "success",
        },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void syncOps()} disabled={syncing}>
            {syncing ? "Syncing…" : "Sync invoices, expenses & salaries"}
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/accounts/cash-banking/transfers">New transfer</Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] uppercase text-muted-foreground">Period inflow</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-600">
            {money(cashflow.inflow || 0)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] uppercase text-muted-foreground">Period outflow</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-rose-600">
            {money(cashflow.outflow || 0)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] uppercase text-muted-foreground">Net cashflow</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {money(cashflow.net || 0)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-[10px] uppercase text-muted-foreground">Transfers (period)</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {money(cashflow.transfers || 0)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {LINKS.map((mod) => {
          const Icon = mod.icon
          return (
            <Link
              key={mod.href}
              href={mod.href}
              className="group rounded-xl border bg-card p-4 hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  <p className="font-semibold text-sm">{mod.label}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{mod.description}</p>
              <Badge variant="outline" className="mt-3 text-[10px]">
                Live
              </Badge>
            </Link>
          )
        })}
      </div>

      <FinanceTableCard title="Recent cashflows">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Account</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-3">Direction</th>
                <th className="py-2 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No movements yet. Record entries, transfers, or sync payments & expenses.
                  </td>
                </tr>
              ) : (
                recent.map((row: any) => (
                  <tr key={row._id} className="border-b">
                    <td className="py-2 px-3 whitespace-nowrap">
                      {new Date(row.occurredAt).toLocaleDateString("en-KE")}
                    </td>
                    <td className="py-2 px-3">
                      {row.accountName}
                      <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                        {row.accountType}
                      </span>
                    </td>
                    <td className="py-2 px-3">{row.description}</td>
                    <td className="py-2 px-3 capitalize">{row.direction}</td>
                    <td
                      className={`py-2 px-3 text-right tabular-nums font-medium ${
                        row.direction === "in" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {row.direction === "in" ? "+" : "−"}
                      {money(row.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
