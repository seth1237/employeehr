"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { companyApi, stockApi } from "@/lib/api"
import { Download } from "lucide-react"

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
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState("")
  const [bucketFilter, setBucketFilter] = useState<string>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [report, setReport] = useState<AgingReport | null>(null)
  const [branding, setBranding] = useState<any>({})

  const loadData = async (silent = false) => {
    try {
      if (silent) setRefreshing(true)
      else setLoading(true)
      const [response, brandingRes] = await Promise.all([
        stockApi.getAgingDebtReport(),
        companyApi.getBranding().catch(() => ({ data: {} })),
      ])
      setReport(response.data || null)
      setBranding(brandingRes?.data || {})
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

  const filteredRows = useMemo(() => {
    if (!report) return []
    const q = search.trim().toLowerCase()
    return report.rows.filter((row) => {
      if (bucketFilter !== "all" && row.bucket !== bucketFilter) return false
      const ts = new Date(row.invoiceDate).getTime()
      if (startDate) {
        const start = new Date(startDate).getTime()
        if (ts < start) return false
      }
      if (endDate) {
        const end = new Date(endDate).getTime() + 86400000
        if (ts >= end) return false
      }
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
  }, [report, search, bucketFilter, startDate, endDate])

  const periodOutstanding = useMemo(
    () => filteredRows.reduce((sum, row) => sum + Number(row.balanceRemaining || 0), 0),
    [filteredRows],
  )

  const periodStr = useMemo(() => {
    if (startDate && endDate) return `${startDate} to ${endDate}`
    if (startDate) return `From ${startDate}`
    if (endDate) return `Until ${endDate}`
    return "All outstanding"
  }, [startDate, endDate])

  const exportReport = async () => {
    if (filteredRows.length === 0) {
      window.alert("No aging rows for the selected period/filters.")
      return
    }
    try {
      setExporting(true)
      const { generateAgingReceivablesPdf } = await import("@/lib/stock-document-pdf")
      generateAgingReceivablesPdf({
        rows: filteredRows.map((row) => ({
          invoiceNumber: row.invoiceNumber,
          invoiceDate: row.invoiceDate,
          clientName: row.client?.name || "—",
          ageDays: row.ageDays,
          bucket: row.bucket,
          subTotal: Number(row.subTotal || 0),
          paidAmount: Number(row.paidAmount || 0),
          balanceRemaining: Number(row.balanceRemaining || 0),
        })),
        branding: {
          name: branding.name,
          logo: branding.logo,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
        },
        periodStr: `${periodStr}${bucketFilter !== "all" ? ` · ${bucketFilter}` : ""}`,
        autoSave: true,
      })
    } catch (error: any) {
      window.alert(error?.message || "Failed to export aging report")
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading receivables aging" rows={8} />

  return (
    <FinanceDocumentShell
      eyebrow="Sales & Receivables"
      title="Aging Report"
      description="Outstanding customer invoices by age bucket. Filter a period and export a branded PDF summary."

      onRefresh={() => loadData(true)}
      refreshing={refreshing}
      kpis={[
        { label: "Period Outstanding", value: periodOutstanding, prefix: "KES", accent: "danger" },
        { label: "Invoices in View", value: filteredRows.length },
        { label: "All Outstanding", value: report?.totalOutstanding || 0, prefix: "KES" },
        { label: "Period", value: periodStr },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => void exportReport()} disabled={exporting}>
            <Download className="h-4 w-4 mr-1" />
            {exporting ? "Exporting…" : "Export report"}
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/accounts/payments">Record Payment</Link>
          </Button>
        </div>
      }
      toolbar={
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="aging-start" className="text-xs">Start date</Label>
              <Input
                id="aging-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 w-[160px]"
              />
            </div>
            <div>
              <Label htmlFor="aging-end" className="text-xs">End date</Label>
              <Input
                id="aging-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 w-[160px]"
              />
            </div>
            <Input
              placeholder="Search invoice or customer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full sm:w-64"
            />
          </div>
          <div className="flex flex-wrap gap-2">
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
                    No invoices match this period/filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.invoiceId} className="border-b hover:bg-muted/20">
                    <td className="py-2 pr-3">
                      <Link
                        href={`/admin/stock/invoices/${row.invoiceId}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.invoiceNumber}
                      </Link>
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
