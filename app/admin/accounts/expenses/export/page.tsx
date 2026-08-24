"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { companyApi, stockApi } from "@/lib/api"
import { runDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { Download } from "lucide-react"

export default function ExpensesExportPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expenses, setExpenses] = useState<any[]>([])
  const [branding, setBranding] = useState<any>({})
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [exporting, setExporting] = useState(false)

  const loadAll = async (opts?: SilentLoadOptions) => {
    await runDataLoad(
      setLoading,
      async () => {
        const [expRes, brandingRes] = await Promise.all([
          stockApi.getExpenses(),
          companyApi.getBranding().catch(() => ({ data: {} })),
        ])
        setExpenses(expRes.data || [])
        setBranding(brandingRes?.data || {})
      },
      opts,
      setRefreshing,
    )
  }

  useEffect(() => {
    loadAll()
  }, [])

  const filtered = useMemo(() => {
    let rows = [...expenses]
    if (startDate) {
      const start = new Date(startDate).getTime()
      rows = rows.filter((e) => {
        const d = new Date(e.expenseDate || e.createdAt).getTime()
        return d >= start
      })
    }
    if (endDate) {
      const end = new Date(endDate).getTime() + 86400000
      rows = rows.filter((e) => {
        const d = new Date(e.expenseDate || e.createdAt).getTime()
        return d < end
      })
    }
    return rows.sort(
      (a, b) =>
        new Date(b.expenseDate || b.createdAt).getTime() -
        new Date(a.expenseDate || a.createdAt).getTime(),
    )
  }, [expenses, startDate, endDate])

  const totalAmount = filtered.reduce((sum, e) => sum + Number(e.amount || 0), 0)

  const periodStr = useMemo(() => {
    if (startDate && endDate) return `${startDate} to ${endDate}`
    if (startDate) return `From ${startDate}`
    if (endDate) return `Until ${endDate}`
    return "All Time"
  }, [startDate, endDate])

  const exportPdf = async () => {
    if (filtered.length === 0) {
      window.alert("No expenses found for this period.")
      return
    }
    try {
      setExporting(true)
      const { generateExpenseStyleSummaryPdf } = await import("@/lib/stock-document-pdf")
      generateExpenseStyleSummaryPdf({
        expenses: filtered.map((e) => ({
          expenseNumber: e.expenseNumber,
          expenseDate: e.expenseDate,
          createdAt: e.createdAt,
          payeePhone: e.payeePhone,
          category: e.category,
          purpose: e.purpose,
          description: e.description,
          paymentMethod: e.paymentMethod,
          status: e.status,
          amount: Number(e.amount || 0),
          vat: Number(e.vat || 0),
        })),
        branding: {
          name: branding.name,
          logo: branding.logo,
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
        },
        periodStr,
        autoSave: true,
      })
    } catch (error: any) {
      window.alert(error?.message || "Failed to export PDF")
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading expenses export" rows={6} />

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Expenses"
      title="Export Expenses"
      description="Select a period and download a branded PDF summary similar to the sales invoices export."
      backHref="/admin/accounts/expenses"
      onRefresh={() => loadAll({ silent: true })}
      refreshing={refreshing}
      actions={
        <Button onClick={() => void exportPdf()} disabled={exporting || filtered.length === 0}>
          <Download className="h-4 w-4 mr-1" />
          {exporting ? "Generating…" : "Download PDF"}
        </Button>
      }
      kpis={[
        { label: "In Period", value: filtered.length },
        { label: "Total Amount", value: totalAmount, prefix: "KES", accent: "primary" },
        { label: "Period", value: periodStr },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <FinanceTableCard title="Export Period">
          <div className="space-y-4 p-4">
            <div>
              <Label htmlFor="exp-start">Start date</Label>
              <Input
                id="exp-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="exp-end">End date</Label>
              <Input
                id="exp-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Leave dates blank to export all expenses. The PDF uses your company branding.
            </p>
            <Button className="w-full" onClick={() => void exportPdf()} disabled={exporting || filtered.length === 0}>
              <Download className="h-4 w-4 mr-1" />
              {exporting ? "Generating…" : "Export PDF"}
            </Button>
          </div>
        </FinanceTableCard>

        <FinanceTableCard title={`Preview (${filtered.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/80">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">No.</th>
                  <th className="py-2 px-3">Payee</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Purpose</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No expenses in this period.
                    </td>
                  </tr>
                ) : (
                  filtered.slice(0, 50).map((expense, idx) => (
                    <tr key={expense._id} className={`border-b ${idx % 2 ? "bg-muted/20" : "bg-white"}`}>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {new Date(expense.expenseDate || expense.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3 font-medium">{expense.expenseNumber || "—"}</td>
                      <td className="py-2 px-3">{expense.payeePhone}</td>
                      <td className="py-2 px-3">{expense.category || "—"}</td>
                      <td className="py-2 px-3 max-w-[220px] truncate">{expense.purpose}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{Number(expense.amount).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {filtered.length > 50 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Showing first 50 of {filtered.length}. Full list is included in the PDF.
              </p>
            ) : null}
          </div>
        </FinanceTableCard>
      </div>
    </FinanceDocumentShell>
  )
}
