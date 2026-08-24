"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { stockApi } from "@/lib/api"

type AgingBucket = {
  label: string
  count: number
  amount: number
}

type AgingRow = {
  invoiceId: string
  invoiceNumber: string
  client: { name: string; number?: string; location?: string }
  invoiceDate: string
  ageDays: number
  bucket: string
  subTotal: number
  paidAmount: number
  balanceRemaining: number
  nextPaymentDate?: string
}

type AgingReport = {
  totalOutstanding: number
  buckets: {
    current: AgingBucket
    days31To60: AgingBucket
    days61To90: AgingBucket
    over90: AgingBucket
  }
  rows: AgingRow[]
}

const BUCKET_ORDER = ["0-30 days", "31-60 days", "61-90 days", "90+ days"]

export default function ReceivablesAgingPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [bucketFilter, setBucketFilter] = useState<string>("all")
  const [report, setReport] = useState<AgingReport | null>(null)

  const loadData = async (silent = false) => {
    try {
      if (silent) setRefreshing(true)
      else setLoading(true)
      const response = await stockApi.getAgingDebtReport()
      setReport(response.data || null)
    } catch (error: any) {
      window.alert(error?.message || "Failed to load aging report")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const bucketCards = useMemo(() => {
    if (!report) return []
    return [
      report.buckets.current,
      report.buckets.days31To60,
      report.buckets.days61To90,
      report.buckets.over90,
    ]
  }, [report])

  const filteredRows = useMemo(() => {
    if (!report) return []
    const q = search.trim().toLowerCase()
    return report.rows.filter((row) => {
      if (bucketFilter !== "all" && row.bucket !== bucketFilter) return false
      if (!q) return true
      return [
        row.invoiceNumber,
        row.client?.name,
        row.client?.number,
        row.client?.location,
        row.bucket,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    })
  }, [report, search, bucketFilter])

  if (loading) return <PageLoadingSkeleton title="Loading receivables aging" rows={8} />

  return (
    <FinanceDocumentShell
      eyebrow="Sales & Receivables"
      title="Aging Report"
      description="Outstanding customer invoices grouped by 0–30, 31–60, 61–90, and 90+ day buckets."
      backHref="/admin/accounts/receivables"
      onRefresh={() => loadData(true)}
      refreshing={refreshing}
      kpis={[
        { label: "Total Outstanding", value: report?.totalOutstanding || 0, prefix: "KES", accent: "danger" },
        ...bucketCards.map((bucket) => ({
          label: bucket.label,
          value: bucket.amount,
          prefix: "KES" as const,
        })),
      ].slice(0, 4)}
      actions={
        <Button size="sm" asChild>
          <Link href="/admin/accounts/payments">Record Payment</Link>
        </Button>
      }
      toolbar={
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search invoice or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full sm:w-64"
          />
          <Button size="sm" variant={bucketFilter === "all" ? "default" : "outline"} onClick={() => setBucketFilter("all")}>
            All
          </Button>
          {BUCKET_ORDER.map((label) => (
            <Button
              key={label}
              size="sm"
              variant={bucketFilter === label ? "default" : "outline"}
              onClick={() => setBucketFilter(label)}
            >
              {label}
            </Button>
          ))}
        </div>
      }
    >
      <FinanceTableCard title="Aging Detail">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Invoice</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Age</th>
                  <th className="py-2 pr-3">Bucket</th>
                  <th className="py-2 pr-3 text-right">Total</th>
                  <th className="py-2 pr-3 text-right">Paid</th>
                  <th className="py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No invoices match this filter.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row.invoiceId} className="border-b hover:bg-muted/20">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{row.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(row.invoiceDate).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <div>{row.client?.name}</div>
                        <div className="text-xs text-muted-foreground">{row.client?.number}</div>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{row.ageDays}d</td>
                      <td className="py-2 pr-3">
                        <Badge
                          variant="outline"
                          className={
                            row.bucket === "90+ days" || row.bucket === "61-90 days"
                              ? "border-rose-200 text-rose-700 bg-rose-50"
                              : undefined
                          }
                        >
                          {row.bucket}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {Number(row.subTotal || 0).toFixed(2)}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {Number(row.paidAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium text-primary">
                        {Number(row.balanceRemaining || 0).toFixed(2)}
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
