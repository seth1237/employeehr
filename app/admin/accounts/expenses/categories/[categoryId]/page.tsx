"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { companyApi, stockApi } from "@/lib/api"
import API_URL from "@/lib/apiBase"
import { runDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { Download, Trash2 } from "lucide-react"

export default function ExpenseCategoryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const categoryId = String(params.categoryId || "")

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [branding, setBranding] = useState<any>({})
  const [category, setCategory] = useState<any>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [summary, setSummary] = useState({
    expenseCount: 0,
    completedCount: 0,
    totalAmount: 0,
    totalVat: 0,
  })

  const loadAll = async (opts?: SilentLoadOptions) => {
    if (!categoryId) return
    await runDataLoad(
      setLoading,
      async () => {
        const [res, brandingRes] = await Promise.all([
          stockApi.getExpenseCategoryDetail(categoryId),
          companyApi.getBranding().catch(() => ({ data: {} })),
        ])
        setCategory(res.data?.category || null)
        setExpenses(res.data?.expenses || [])
        setSummary(
          res.data?.summary || {
            expenseCount: 0,
            completedCount: 0,
            totalAmount: 0,
            totalVat: 0,
          },
        )
        setBranding(brandingRes?.data || {})
      },
      opts,
      setRefreshing,
    )
  }

  useEffect(() => {
    loadAll()
  }, [categoryId])

  const deleteCategory = async () => {
    if (!category) return
    const confirmed = window.confirm(
      `Delete category "${category.name}"? You will return to the categories list.`,
    )
    if (!confirmed) return
    try {
      setDeleting(true)
      await stockApi.deleteExpenseCategory(categoryId)
      router.push("/admin/accounts/expenses/categories")
    } catch (error: any) {
      window.alert(error?.message || "Failed to delete category")
      setDeleting(false)
    }
  }

  const exportSummary = async () => {
    if (!category) return
    if (expenses.length === 0) {
      window.alert("No expenses in this category to export.")
      return
    }
    try {
      setExporting(true)
      const { generateExpenseStyleSummaryPdf } = await import("@/lib/stock-document-pdf")
      generateExpenseStyleSummaryPdf({
        expenses: expenses.map((e) => ({
          expenseNumber: e.expenseNumber,
          expenseDate: e.expenseDate,
          createdAt: e.createdAt,
          payeePhone: e.payeePhone,
          category: e.category || category.name,
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
        periodStr: `${category.name} · All expenses`,
        autoSave: true,
      })
    } catch (error: any) {
      window.alert(error?.message || "Failed to export PDF")
    } finally {
      setExporting(false)
    }
  }

  const proofHref = (expense: any) => {
    if (!expense.proofUrl) return null
    if (String(expense.proofUrl).startsWith("http")) return expense.proofUrl
    return `${API_URL}${expense.proofUrl}`
  }

  if (loading) return <PageLoadingSkeleton title="Loading category" rows={8} />

  if (!category) {
    return (
      <FinanceDocumentShell
        eyebrow="Accounts · Expenses"
        title="Category not found"
        description="This expense category does not exist or was removed."
        backHref="/admin/accounts/expenses/categories"
      >
        <FinanceTableCard title="Missing category">
          <div className="p-6 text-sm text-muted-foreground">
            <Link href="/admin/accounts/expenses/categories" className="text-primary underline">
              Back to categories
            </Link>
          </div>
        </FinanceTableCard>
      </FinanceDocumentShell>
    )
  }

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Expenses · Categories"
      title={category.name}
      description={
        category.description ||
        "Expense breakdown and transaction list for this category."
      }
      backHref="/admin/accounts/expenses/categories"
      onRefresh={() => loadAll({ silent: true })}
      refreshing={refreshing}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportSummary()}
            disabled={exporting || expenses.length === 0}
          >
            <Download className="h-4 w-4 mr-1" />
            {exporting ? "Exporting…" : "Export summary"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => void deleteCategory()}
            disabled={deleting || !category.isActive}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {deleting ? "Deleting…" : "Delete category"}
          </Button>
        </div>
      }
      kpis={[
        { label: "Expenses", value: summary.expenseCount },
        { label: "Completed", value: summary.completedCount },
        {
          label: "Total Spend",
          value: summary.totalAmount,
          prefix: "KES",
          accent: "primary",
        },
        {
          label: "VAT",
          value: summary.totalVat,
          prefix: "KES",
          accent: "secondary",
        },
      ]}
    >
      <FinanceTableCard
        title={`${category.name} expenses`}
        headerRight={
          category.isActive === false ? (
            <Badge variant="outline">Inactive</Badge>
          ) : (
            <Badge variant="outline">Active</Badge>
          )
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/80">
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">No.</th>
                <th className="py-2 px-3">Payee</th>
                <th className="py-2 px-3">Purpose</th>
                <th className="py-2 px-3">Department</th>
                <th className="py-2 px-3">Payment</th>
                <th className="py-2 px-3 text-right">Amount</th>
                <th className="py-2 px-3">Proof</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    No expenses recorded in this category yet.
                  </td>
                </tr>
              ) : (
                expenses.map((expense, idx) => (
                  <tr
                    key={expense._id}
                    className={`border-b ${idx % 2 ? "bg-muted/20" : "bg-white"}`}
                  >
                    <td className="py-2 px-3 whitespace-nowrap">
                      {new Date(expense.expenseDate || expense.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 px-3 font-medium">{expense.expenseNumber || "—"}</td>
                    <td className="py-2 px-3">{expense.payeePhone}</td>
                    <td className="py-2 px-3 max-w-[240px]">
                      <p className="line-clamp-2">{expense.purpose}</p>
                      {expense.receiptNote ? (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {expense.receiptNote}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-2 px-3">{expense.department || "—"}</td>
                    <td className="py-2 px-3 capitalize">{expense.paymentMethod || "—"}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {Number(expense.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-2 px-3">
                      {proofHref(expense) ? (
                        <a
                          href={proofHref(expense)!}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary text-xs underline"
                        >
                          {expense.proofOriginalName || "View"}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="outline">{expense.status}</Badge>
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
