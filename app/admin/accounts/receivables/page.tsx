"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, FileText, Wallet, Clock, Receipt } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { FinanceDocumentShell } from "@/components/accounts/finance-document-shell"
import { getAccountsModuleNavPages } from "@/lib/accounts-nav"
import { stockApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

const MODULE_ICONS: Record<string, typeof FileText> = {
  "customer-payments": Wallet,
  debtors: Receipt,
  "aging-report": Clock,
  "customer-statements": FileText,
  "credit-notes": Receipt,
  "debit-notes": Receipt,
}

export default function SalesReceivablesHubPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const modules = getAccountsModuleNavPages("receivables").filter(
    (page) => page.id !== "receivables-hub" && page.status !== "planned",
  )

  useEffect(() => {
    stockApi
      .getReceivablesSummary()
      .then((res) => setSummary(res.data || null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <PageLoadingSkeleton title="Loading sales & receivables" rows={6} />
  }

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Sales & Receivables"
      title="Sales & Receivables"
      description="Customer receivables cycle — payments, debtors, aging, statements, credit notes, and debit notes."
      backHref={null}
      moduleNavGroupId="receivables"
      kpis={[
        {
          label: "Total Invoiced",
          value: summary?.totalInvoiced || 0,
          prefix: "KES",
        },
        {
          label: "Collected",
          value: summary?.totalCollected || 0,
          prefix: "KES",
          accent: "success",
        },
        {
          label: "Outstanding",
          value: summary?.totalOutstanding || 0,
          prefix: "KES",
          accent: "danger",
        },
        { label: "Debtor Accounts", value: summary?.debtorCount || 0 },
      ]}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {modules.map((mod) => {
          const Icon = MODULE_ICONS[mod.id] || FileText
          const href = mod.redirectTo || mod.href
          return (
            <Link
              key={mod.id}
              href={href}
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
                {mod.status === "linked" ? "Linked" : "Live"}
              </Badge>
            </Link>
          )
        })}
      </div>
    </FinanceDocumentShell>
  )
}
