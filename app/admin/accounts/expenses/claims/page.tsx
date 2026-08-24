"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { api, stockApi } from "@/lib/api"
import { runDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { Plus } from "lucide-react"

type ClaimItem = {
  description: string
  amount: number
  category?: string
}

export default function ExpenseClaimsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [claims, setClaims] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [claimItems, setClaimItems] = useState<ClaimItem[]>([])
  const [form, setForm] = useState({
    employeeId: "",
    purpose: "",
    receiptNote: "",
    itemDescription: "",
    itemAmount: "",
    itemCategory: "",
  })

  const loadAll = async (opts?: SilentLoadOptions) => {
    await runDataLoad(
      setLoading,
      async () => {
        const [claimRes, catRes, usersRes] = await Promise.all([
          stockApi.getExpenseClaims(),
          stockApi.getExpenseCategories(),
          api.users.getAll(),
        ])
        setClaims(claimRes.data || [])
        setCategories(catRes.data || [])
        if (usersRes.success) {
          setEmployees(
            (usersRes.data || []).filter((u: any) =>
              ["employee", "sales_rep"].includes(String(u.role || "")),
            ),
          )
        }
      },
      opts,
      setRefreshing,
    )
  }

  useEffect(() => {
    loadAll()
  }, [])

  const addClaimItem = () => {
    if (!form.itemDescription.trim() || !form.itemAmount) return
    setClaimItems((prev) => [
      ...prev,
      {
        description: form.itemDescription.trim(),
        amount: Number(form.itemAmount),
        category: form.itemCategory || undefined,
      },
    ])
    setForm((prev) => ({
      ...prev,
      itemDescription: "",
      itemAmount: "",
      itemCategory: "",
    }))
  }

  const submitClaim = async (asDraft = false) => {
    const employee = employees.find((e) => e._id === form.employeeId)
    if (!employee || !form.purpose.trim() || claimItems.length === 0) {
      window.alert("Select employee, add line items, and enter purpose")
      return
    }
    try {
      setSubmitting(true)
      await stockApi.createExpenseClaim({
        employeeId: employee._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        items: claimItems,
        purpose: form.purpose.trim(),
        receiptNote: form.receiptNote.trim() || undefined,
        status: asDraft ? "draft" : "submitted",
      })
      setForm({
        employeeId: "",
        purpose: "",
        receiptNote: "",
        itemDescription: "",
        itemAmount: "",
        itemCategory: "",
      })
      setClaimItems([])
      await loadAll({ silent: true })
    } catch (error: any) {
      window.alert(error?.message || "Failed to submit claim")
    } finally {
      setSubmitting(false)
    }
  }

  const updateClaimStatus = async (claimId: string, status: string) => {
    try {
      await stockApi.updateExpenseClaimStatus(claimId, { status })
      await loadAll({ silent: true })
    } catch (error: any) {
      window.alert(error?.message || "Failed to update claim")
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading claims" rows={6} />

  const openClaims = claims.filter((c) => ["draft", "submitted"].includes(c.status)).length
  const totalClaimed = claims.reduce((sum, c) => sum + Number(c.totalAmount || 0), 0)

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Expenses"
      title="Expense Claims"
      description="Employee expense claims and sales planner budgets. Settling a claim posts it as a company expense."
      backHref="/admin/accounts/expenses"
      onRefresh={() => loadAll({ silent: true })}
      refreshing={refreshing}
      kpis={[
        { label: "Total Claims", value: claims.length },
        { label: "Open Claims", value: openClaims, accent: "danger" },
        { label: "Claimed Amount", value: totalClaimed, prefix: "KES", accent: "primary" },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <FinanceTableCard title="New claim">
          <div className="space-y-3 p-4">
            <div>
              <Label>Employee</Label>
              <Select
                value={form.employeeId}
                onValueChange={(v) => setForm((p) => ({ ...p, employeeId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="claim-purpose">Purpose</Label>
              <Input
                id="claim-purpose"
                value={form.purpose}
                onChange={(e) => setForm((p) => ({ ...p, purpose: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <Input
                placeholder="Item description"
                value={form.itemDescription}
                onChange={(e) => setForm((p) => ({ ...p, itemDescription: e.target.value }))}
              />
              <Input
                type="number"
                placeholder="Amount"
                value={form.itemAmount}
                onChange={(e) => setForm((p) => ({ ...p, itemAmount: e.target.value }))}
              />
            </div>
            <Select
              value={form.itemCategory}
              onValueChange={(v) => setForm((p) => ({ ...p, itemCategory: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Item category (optional)" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat._id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={addClaimItem}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add line item
            </Button>
            {claimItems.length > 0 ? (
              <div className="rounded border divide-y text-sm">
                {claimItems.map((item, idx) => (
                  <div key={idx} className="flex justify-between px-3 py-2">
                    <span>
                      {item.description}
                      {item.category ? (
                        <span className="text-xs text-muted-foreground"> · {item.category}</span>
                      ) : null}
                    </span>
                    <span className="tabular-nums">{item.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : null}
            <Textarea
              placeholder="Receipt notes"
              value={form.receiptNote}
              onChange={(e) => setForm((p) => ({ ...p, receiptNote: e.target.value }))}
              rows={2}
            />
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => void submitClaim(false)} disabled={submitting}>
                Submit claim
              </Button>
              <Button variant="outline" onClick={() => void submitClaim(true)} disabled={submitting}>
                Save draft
              </Button>
            </div>
          </div>
        </FinanceTableCard>

        <FinanceTableCard title="Claims register">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/80">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3">Claim</th>
                  <th className="py-2 px-3">Sales rep / employee</th>
                  <th className="py-2 px-3">Purpose</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No claims yet. Approving a sales planner with a day budget creates a claim here.
                    </td>
                  </tr>
                ) : (
                  claims.map((claim, idx) => (
                    <tr key={claim._id} className={`border-b ${idx % 2 ? "bg-muted/20" : "bg-white"}`}>
                      <td className="py-2 px-3">
                        <p className="font-medium">{claim.claimNumber}</p>
                        {claim.source === "sales_planner" ? (
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            Planner {claim.plannerDate || ""}
                          </Badge>
                        ) : null}
                      </td>
                      <td className="py-2 px-3">{claim.employeeName}</td>
                      <td className="py-2 px-3">
                        <p>{claim.purpose}</p>
                        {Array.isArray(claim.items) && claim.items.length > 0 ? (
                          <p className="text-xs text-muted-foreground">
                            {claim.items
                              .map((item: any) => `${item.category || "Item"} ${Number(item.amount || 0).toFixed(0)}`)
                              .join(" · ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {Number(claim.totalAmount).toFixed(2)}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline">{claim.status}</Badge>
                      </td>
                      <td className="py-2 px-3 space-x-1">
                        {claim.status === "submitted" ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void updateClaimStatus(claim._id, "approved")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void updateClaimStatus(claim._id, "rejected")}
                            >
                              Reject
                            </Button>
                          </>
                        ) : null}
                        {claim.status === "approved" ? (
                          <Button
                            size="sm"
                            onClick={() => void updateClaimStatus(claim._id, "reimbursed")}
                          >
                            Settle
                          </Button>
                        ) : null}
                        {claim.status === "reimbursed" ? (
                          <span className="text-xs text-muted-foreground">Posted as expense</span>
                        ) : null}
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
