"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { stockApi } from "@/lib/api"
import { runDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import {
  CheckCircle2,
  Download,
  FolderPlus,
  Plus,
  Receipt,
  Truck,
} from "lucide-react"

type ExpensesSummary = {
  totalSpend: number
  transportTotal: number
  expenseCount: number
  completedCount: number
  pendingApproval: number
  byCategory: Array<{ category: string; amount: number; count: number }>
  transportExpenses: any[]
  recentExpenses: any[]
}

export default function AccountsExpensesPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<ExpensesSummary | null>(null)
  const [search, setSearch] = useState("")

  const loadAll = async (opts?: SilentLoadOptions) => {
    await runDataLoad(
      setLoading,
      async () => {
        const summaryRes = await stockApi.getExpensesSummary()
        setSummary(summaryRes.data || null)
      },
      opts,
      setRefreshing,
    )
  }

  useEffect(() => {
    loadAll()
  }, [])

  const filteredRecent = useMemo(() => {
    const rows = summary?.recentExpenses || []
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      [row.expenseNumber, row.purpose, row.payeePhone, row.category, row.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    )
  }, [summary, search])

  const approveExpense = async (expenseId: string) => {
    try {
      await stockApi.updateExpenseWorkflow(expenseId, "approved")
      await loadAll({ silent: true })
    } catch (error: any) {
      window.alert(error?.message || "Failed to approve expense")
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading expenses" rows={8} />

  const transportRows = summary?.transportExpenses || []
  const byCategory = summary?.byCategory || []

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Expenses"
      title="Company Expenses Summary"
      description="Overview of company spend by category. Transport from converted quotations is tracked under Transport."
      backHref="/admin/accounts"
      onRefresh={() => loadAll({ silent: true })}
      refreshing={refreshing}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/accounts/expenses/export">
              <Download className="h-4 w-4 mr-1" />
              Export expenses
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/accounts/expenses/new">
              <Plus className="h-4 w-4 mr-1" />
              Add expense
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/accounts/expenses/categories">
              <FolderPlus className="h-4 w-4 mr-1" />
              Categories
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/accounts/expenses/claims">
              <Receipt className="h-4 w-4 mr-1" />
              Claims
            </Link>
          </Button>
        </div>
      }
      kpis={[
        { label: "Total Spend", value: summary?.totalSpend || 0, prefix: "KES", accent: "primary" },
        { label: "Transport", value: summary?.transportTotal || 0, prefix: "KES", accent: "secondary" },
        { label: "Expenses Recorded", value: summary?.expenseCount || 0 },
        { label: "Awaiting Approval", value: summary?.pendingApproval || 0, accent: "danger" },
      ]}
      toolbar={
        <Input
          placeholder="Search expenses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 max-w-md"
        />
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <FinanceTableCard title="Spend by Category">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/80">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Count</th>
                  <th className="py-2 px-3 text-right">Amount (KES)</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-muted-foreground">
                      No completed expenses yet.
                    </td>
                  </tr>
                ) : (
                  byCategory.map((row, idx) => (
                    <tr
                      key={row.category}
                      className={`border-b ${idx % 2 ? "bg-muted/20" : "bg-white"} ${
                        row.category === "Transport" ? "font-medium" : ""
                      }`}
                    >
                      <td className="py-2 px-3">
                        <span className="inline-flex items-center gap-1.5">
                          {row.category === "Transport" ? (
                            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : null}
                          {row.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{row.count}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {row.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </FinanceTableCard>

        <FinanceTableCard title="Transport (from invoices & other)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/80">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Purpose</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {transportRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No transport expenses yet. Enter transport when converting a quotation to an invoice.
                    </td>
                  </tr>
                ) : (
                  transportRows.map((expense, idx) => (
                    <tr key={expense._id} className={`border-b ${idx % 2 ? "bg-muted/20" : "bg-white"}`}>
                      <td className="py-2 px-3 whitespace-nowrap">
                        {new Date(expense.expenseDate || expense.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">
                        <p className="line-clamp-2">{expense.purpose}</p>
                        {expense.description ? (
                          <p className="text-xs text-muted-foreground line-clamp-1">{expense.description}</p>
                        ) : null}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {Number(expense.amount).toFixed(2)}
                      </td>
                      <td className="py-2 px-3">
                        {expense.invoiceId ? (
                          <Link
                            href={`/admin/stock/invoices/${expense.invoiceId}`}
                            className="text-primary hover:underline text-xs"
                          >
                            View
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </FinanceTableCard>
      </div>

      <div className="mt-4">
        <FinanceTableCard title="Recent Company Expenses">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 backdrop-blur sticky top-0">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3">No.</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Payee</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Workflow</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecent.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      No expenses found.
                    </td>
                  </tr>
                ) : (
                  filteredRecent.map((expense, idx) => (
                    <tr key={expense._id} className={`border-b ${idx % 2 ? "bg-muted/20" : "bg-white"}`}>
                      <td className="py-2 px-3 font-medium">{expense.expenseNumber || "—"}</td>
                      <td className="py-2 px-3">
                        {new Date(expense.expenseDate || expense.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">{expense.payeePhone}</td>
                      <td className="py-2 px-3">{expense.category || "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{Number(expense.amount).toFixed(2)}</td>
                      <td className="py-2 px-3 capitalize">{String(expense.status || "").replace("_", " ")}</td>
                      <td className="py-2 px-3">
                        <Badge variant="outline">{expense.workflowStatus || "submitted"}</Badge>
                      </td>
                      <td className="py-2 px-3">
                        {expense.workflowStatus === "submitted" ? (
                          <Button size="sm" variant="outline" onClick={() => approveExpense(expense._id)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </FinanceTableCard>
      </div>
    </FinanceDocumentShell>
  )
}
