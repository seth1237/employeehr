"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { stockApi } from "@/lib/api"
import { runDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { ChevronRight, Plus, Trash2 } from "lucide-react"

type CategoryRow = {
  _id: string
  name: string
  description?: string
  expenseCount?: number
  totalAmount?: number
}

export default function ExpenseCategoriesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [form, setForm] = useState({ name: "", description: "" })

  const loadAll = async (opts?: SilentLoadOptions) => {
    await runDataLoad(
      setLoading,
      async () => {
        const res = await stockApi.getExpenseCategories()
        setCategories(res.data || [])
      },
      opts,
      setRefreshing,
    )
  }

  useEffect(() => {
    loadAll()
  }, [])

  const totals = useMemo(() => {
    return {
      spend: categories.reduce((sum, c) => sum + Number(c.totalAmount || 0), 0),
      expenses: categories.reduce((sum, c) => sum + Number(c.expenseCount || 0), 0),
    }
  }, [categories])

  const createCategory = async () => {
    if (!form.name.trim()) {
      window.alert("Category name is required")
      return
    }
    try {
      setSubmitting(true)
      await stockApi.createExpenseCategory({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      })
      setForm({ name: "", description: "" })
      await loadAll({ silent: true })
    } catch (error: any) {
      window.alert(error?.message || "Failed to create category")
    } finally {
      setSubmitting(false)
    }
  }

  const deleteCategory = async (category: CategoryRow, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const confirmed = window.confirm(
      `Delete category "${category.name}"? Existing expenses keep their category label, but this category will no longer appear when recording new expenses.`,
    )
    if (!confirmed) return
    try {
      setDeletingId(category._id)
      await stockApi.deleteExpenseCategory(category._id)
      await loadAll({ silent: true })
    } catch (error: any) {
      window.alert(error?.message || "Failed to delete category")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading categories" rows={6} />

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Expenses"
      title="Expense Categories"
      description="Create categories, review spend breakdown by category, and open a category for full expense detail."
      onRefresh={() => loadAll({ silent: true })}
      refreshing={refreshing}
      kpis={[
        { label: "Active Categories", value: categories.length, accent: "primary" },
        { label: "Categorized Spend", value: totals.spend, prefix: "KES", accent: "secondary" },
        { label: "Expenses Linked", value: totals.expenses },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <FinanceTableCard title="Create category">
          <div className="space-y-3 p-4">
            <div>
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Transport, Utilities"
              />
            </div>
            <div>
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional notes for this category"
              />
            </div>
            <Button onClick={() => void createCategory()} disabled={submitting}>
              <Plus className="h-4 w-4 mr-1" />
              {submitting ? "Saving…" : "Add category"}
            </Button>
          </div>
        </FinanceTableCard>

        <FinanceTableCard title="Breakdown by category">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/80">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3 text-right">Count</th>
                  <th className="py-2 px-3 text-right">Amount (KES)</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No categories yet. Create your first one.
                    </td>
                  </tr>
                ) : (
                  [...categories]
                    .sort((a, b) => Number(b.totalAmount || 0) - Number(a.totalAmount || 0))
                    .map((cat, idx) => (
                      <tr
                        key={cat._id}
                        className={`border-b cursor-pointer hover:bg-muted/40 ${
                          idx % 2 ? "bg-muted/20" : "bg-white"
                        }`}
                        onClick={() => router.push(`/admin/accounts/expenses/categories/${cat._id}`)}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium">{cat.name}</p>
                              {cat.description ? (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {cat.description}
                                </p>
                              ) : null}
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums">
                          {Number(cat.expenseCount || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-medium">
                          {Number(cat.totalAmount || 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Badge variant="outline">Active</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              disabled={deletingId === cat._id}
                              onClick={(e) => void deleteCategory(cat, e)}
                              aria-label={`Delete ${cat.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-2 text-xs text-muted-foreground border-t">
            Click a category to open its expense list and totals.{" "}
            <Link href="/admin/accounts/expenses/new" className="text-primary underline">
              Add expense
            </Link>
          </p>
        </FinanceTableCard>
      </div>
    </FinanceDocumentShell>
  )
}
