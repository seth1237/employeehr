"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, FileText, Wallet, Clock, Receipt } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { FinanceDocumentShell } from "@/components/accounts/finance-document-shell"
import { stockApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

const modules = [
  {
    label: "Sales Invoices",
    href: "/admin/stock/invoices",
    description: "Create, approve, and dispatch customer invoices",
    icon: FileText,
  },
  {
    label: "Customer Payments",
    href: "/admin/accounts/payments",
    description: "Record partial or full invoice payments",
    icon: Wallet,
  },
  {
    label: "Debtors",
    href: "/admin/accounts/debts",
    description: "Outstanding balances and latest payment activity",
    icon: Receipt,
  },
  {
    label: "Aging Report",
    href: "/admin/accounts/receivables/aging",
    description: "0–30, 31–60, 61–90, 90+ day receivables buckets",
    icon: Clock,
  },
  {
    label: "Customer Statements",
    href: "/admin/accounts/receivables/statements",
    description: "Opening balance, invoices, payments, credit notes",
    icon: FileText,
  },
  {
    label: "Credit Notes",
    href: "/admin/stock/credit-notes",
    description: "Issue credit notes against sales invoices",
    icon: Receipt,
  },
]

export default function ReceivablesHubPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    stockApi
      .getReceivablesSummary()
      .then((res) => setSummary(res.data || null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="Loading receivables" rows={6} />

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Sales & Receivables"
      title="Receivables Hub"
      description="Manage the full customer receivables cycle — invoices, payments, debtors, aging, statements, and credit notes."
      backHref="/admin/accounts"
      kpis={[
        { label: "Total Invoiced", value: summary?.totalInvoiced || 0, prefix: "KES" },
        { label: "Collected", value: summary?.totalCollected || 0, prefix: "KES", accent: "success" },
        { label: "Outstanding", value: summary?.totalOutstanding || 0, prefix: "KES", accent: "danger" },
        { label: "Debtor Accounts", value: summary?.debtorCount || 0 },
      ]}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((mod) => {
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
              <Badge variant="outline" className="mt-3 text-[10px]">Live</Badge>
            </Link>
          )
        })}
      </div>
    </FinanceDocumentShell>
  )
}
