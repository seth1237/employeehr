"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { stockApi } from "@/lib/api"

interface DebtPayment {
  _id: string
  amount: number
  paymentMethod: string
  reference?: string
  paidAt: string
  createdAt: string
}

interface DebtRow {
  _id: string
  invoiceNumber: string
  createdAt: string
  subTotal: number
  status: "issued" | "paid" | "cancelled"
  client: { name: string; number: string; location: string }
  paidAmount: number
  balanceRemaining: number
  paymentCount: number
  lastPayment: DebtPayment | null
}

export default function AccountsDebtManagementPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<DebtRow[]>([])

  const loadData = async (silent = false) => {
    try {
      if (silent) setRefreshing(true)
      else setLoading(true)
      const response = await stockApi.getDebtManagement()
      setRows(response.data || [])
    } catch (error: any) {
      window.alert(error?.message || "Failed to load debt management")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      [row.invoiceNumber, row.client?.name, row.client?.number, row.client?.location]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [rows, search])

  const stats = useMemo(() => ({
    count: rows.length,
    outstanding: rows.reduce((s, r) => s + Number(r.balanceRemaining || 0), 0),
    invoiced: rows.reduce((s, r) => s + Number(r.subTotal || 0), 0),
  }), [rows])

  if (loading) return <PageLoadingSkeleton title="Loading debt management" rows={8} />

  return (
    <FinanceDocumentShell
      eyebrow="Sales & Receivables"
      title="Debtors"
      description="Unsettled sales invoices with paid amounts, balances, and latest payment details."
      backHref="/admin/accounts/receivables"
      onRefresh={() => loadData(true)}
      refreshing={refreshing}
      kpis={[
        { label: "Debtor Invoices", value: stats.count },
        { label: "Total Outstanding", value: stats.outstanding, prefix: "KES", accent: "danger" },
        { label: "Invoice Value", value: stats.invoiced, prefix: "KES" },
        { label: "Avg Balance", value: stats.count ? Math.round(stats.outstanding / stats.count) : 0, prefix: "KES" },
      ]}
      actions={
        <Button size="sm" asChild>
          <Link href="/admin/accounts/payments">Record Payment</Link>
        </Button>
      }
      toolbar={
        <Input
          placeholder="Search by invoice, client, number..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 max-w-md"
        />
      }
    >
      <FinanceTableCard title="Unsettled Payments">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/80 backdrop-blur sticky top-0">
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-3">Invoice</th>
                <th className="py-2 px-3">Client</th>
                <th className="py-2 px-3 text-right">Total</th>
                <th className="py-2 px-3 text-right">Paid</th>
                <th className="py-2 px-3 text-right">Balance</th>
                <th className="py-2 px-3">Latest Payment</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-muted-foreground" colSpan={7}>
                    No unsettled invoices.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr key={row._id} className={`border-b ${idx % 2 ? "bg-muted/20" : "bg-white"}`}>
                    <td className="py-2 px-3">
                      <div className="font-medium">{row.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(row.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div>{row.client?.name}</div>
                      <div className="text-xs text-muted-foreground">{row.client?.number}</div>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{row.subTotal.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{row.paidAmount.toFixed(2)}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium text-primary">
                      {row.balanceRemaining.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {row.lastPayment
                        ? `${new Date(row.lastPayment.paidAt || row.lastPayment.createdAt).toLocaleString()} · ${Number(row.lastPayment.amount || 0).toFixed(2)}`
                        : "No payments yet"}
                    </td>
                    <td className="py-2 px-3 capitalize">{row.status}</td>
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
