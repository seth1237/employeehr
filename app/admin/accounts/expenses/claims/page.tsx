"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { api, stockApi } from "@/lib/api"
import { runDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { Plus, Wrench } from "lucide-react"

type ClaimItem = {
  description: string
  amount: number
  category?: string
}

function asUserList(payload: any): any[] {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.users)) return payload.users
  if (Array.isArray(payload?.data?.users)) return payload.data.users
  return []
}

function employeeKey(user: any) {
  return String(user?._id || user?.id || "").trim()
}

function employeeLabel(user: any) {
  return (
    `${user?.firstName || user?.first_name || ""} ${user?.lastName || user?.last_name || ""}`.trim() ||
    user?.name ||
    user?.email ||
    "Employee"
  )
}

function ExpenseClaimsInner() {
  const searchParams = useSearchParams()
  const sourceFilter = searchParams.get("source") || ""
  const employeeFilter = searchParams.get("employeeId") || ""
  const engineerView = sourceFilter === "engineer"
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [claims, setClaims] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [claimItems, setClaimItems] = useState<ClaimItem[]>([])
  const [formError, setFormError] = useState("")
  const [form, setForm] = useState({
    employeeId: employeeFilter,
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
          stockApi.getExpenseClaims({
            source: sourceFilter || undefined,
            employeeId: employeeFilter || undefined,
          }),
          stockApi.getExpenseCategories(),
          api.users.getAll().catch(() => ({ data: [] })),
        ])
        setClaims(claimRes.data || [])
        setCategories(catRes.data || [])
        const allUsers = asUserList(usersRes).length ? asUserList(usersRes) : asUserList(usersRes.data)
        const roles = engineerView
          ? ["technical_service_engineer"]
          : ["employee", "sales_rep", "technical_service_engineer"]
        const matched = allUsers.filter((u: any) =>
          roles.includes(String(u.role || "").toLowerCase()),
        )
        const merged = new Map<string, any>()
        for (const user of matched.length ? matched : allUsers) {
          const id = employeeKey(user)
          if (!id) continue
          if (!merged.has(id)) merged.set(id, user)
        }
        const list = Array.from(merged.values())
        setEmployees(list)
        setForm((prev) => {
          if (prev.employeeId && list.some((user) => employeeKey(user) === prev.employeeId)) {
            return prev
          }
          if (employeeFilter && list.some((user) => employeeKey(user) === employeeFilter)) {
            return { ...prev, employeeId: employeeFilter }
          }
          return prev
        })
      },
      opts,
      setRefreshing,
    )
  }

  useEffect(() => {
    loadAll()
  }, [sourceFilter, employeeFilter])

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
    const pendingItem =
      form.itemDescription.trim() && form.itemAmount
        ? {
            description: form.itemDescription.trim(),
            amount: Number(form.itemAmount),
            category: form.itemCategory || undefined,
          }
        : null
    const items = pendingItem ? [...claimItems, pendingItem] : claimItems
    const employee = employees.find((e) => employeeKey(e) === String(form.employeeId).trim())
    if (!form.employeeId.trim() || !form.purpose.trim() || items.length === 0) {
      setFormError(
        engineerView
          ? "Select an engineer, enter the purpose, and add at least one line item."
          : "Select an employee, enter the purpose, and add at least one line item.",
      )
      return
    }
    try {
      setFormError("")
      setSubmitting(true)
      await stockApi.createExpenseClaim({
        employeeId: String(form.employeeId).trim(),
        employeeName: employee ? employeeLabel(employee) : "Engineer",
        items,
        purpose: form.purpose.trim(),
        receiptNote: form.receiptNote.trim() || undefined,
        status: asDraft ? "draft" : "submitted",
        source: engineerView ? "engineer" : "manual",
      })
      setForm({
        employeeId: employeeFilter,
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
      eyebrow={engineerView ? "Accounts · Technical Service" : "Accounts · Expenses"}
      title={engineerView ? "Engineer Expense Claims" : "Expense Claims"}
      description={
        engineerView
          ? "Field claims from service engineers. Approving and settling posts them as company expenses."
          : "Employee expense claims and sales planner budgets. Settling a claim posts it as a company expense."
      }
      onRefresh={() => loadAll({ silent: true })}
      refreshing={refreshing}
      actions={
        engineerView ? (
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/clients/technical-service/expenses">
              <Wrench className="h-4 w-4 mr-1" />
              Technical Service
            </Link>
          </Button>
        ) : null
      }
      kpis={[
        { label: "Total Claims", value: claims.length },
        { label: "Open Claims", value: openClaims, accent: "danger" },
        { label: "Claimed Amount", value: totalClaimed, prefix: "KES", accent: "primary" },
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <FinanceTableCard title="New claim">
          <form
            className="space-y-3 p-4"
            onSubmit={(event) => {
              event.preventDefault()
              void submitClaim(false)
            }}
          >
            <div>
              <Label htmlFor="claim-employee">{engineerView ? "Engineer" : "Employee"}</Label>
              <select
                id="claim-employee"
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={form.employeeId}
                onChange={(e) => {
                  setFormError("")
                  setForm((p) => ({ ...p, employeeId: e.target.value }))
                }}
              >
                <option value="">{engineerView ? "Select engineer" : "Select employee"}</option>
                {employees.map((emp) => (
                  <option key={employeeKey(emp)} value={employeeKey(emp)}>
                    {employeeLabel(emp)}
                  </option>
                ))}
              </select>
              {employees.length === 0 ? (
                <p className="mt-1 text-xs text-amber-800">
                  No {engineerView ? "engineers" : "employees"} loaded. Add people under Users, then refresh.
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="claim-purpose">Purpose</Label>
              <Input
                id="claim-purpose"
                value={form.purpose}
                onChange={(e) => {
                  setFormError("")
                  setForm((p) => ({ ...p, purpose: e.target.value }))
                }}
                placeholder={engineerView ? "Site visit, spare parts, fuel…" : "Purpose"}
              />
            </div>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <Input
                placeholder="Item description"
                value={form.itemDescription}
                onChange={(e) => {
                  setFormError("")
                  setForm((p) => ({ ...p, itemDescription: e.target.value }))
                }}
              />
              <Input
                type="number"
                placeholder="Amount"
                value={form.itemAmount}
                onChange={(e) => {
                  setFormError("")
                  setForm((p) => ({ ...p, itemAmount: e.target.value }))
                }}
              />
            </div>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={form.itemCategory}
              onChange={(e) => setForm((p) => ({ ...p, itemCategory: e.target.value }))}
            >
              <option value="">Item category (optional)</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" size="sm" onClick={addClaimItem}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add line item
            </Button>
            {claimItems.length > 0 || (form.itemDescription.trim() && form.itemAmount) ? (
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
                {form.itemDescription.trim() && form.itemAmount ? (
                  <div className="flex justify-between px-3 py-2 text-muted-foreground">
                    <span>{form.itemDescription.trim()}</span>
                    <span className="tabular-nums">{Number(form.itemAmount).toFixed(2)}</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            <Textarea
              placeholder="Receipt notes"
              value={form.receiptNote}
              onChange={(e) => setForm((p) => ({ ...p, receiptNote: e.target.value }))}
              rows={2}
            />
            {formError ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {formError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Fill engineer, purpose, and a line item, then submit. You do not need to click Add line item first.
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" className="flex-1" disabled={submitting}>
                Submit claim
              </Button>
              <Button type="button" variant="outline" onClick={() => void submitClaim(true)} disabled={submitting}>
                Save draft
              </Button>
            </div>
          </form>
        </FinanceTableCard>

        <FinanceTableCard title="Claims register">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/80">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3">Claim</th>
                  <th className="py-2 px-3">{engineerView ? "Engineer" : "Sales rep / employee"}</th>
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
                      {engineerView
                        ? "No engineer claims yet."
                        : "No claims yet. Approving a sales planner with a day budget creates a claim here."}
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
                        {claim.source === "engineer" ? (
                          <Badge variant="secondary" className="mt-1 text-[10px]">
                            Engineer
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

export default function ExpenseClaimsPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Loading claims" rows={6} />}>
      <ExpenseClaimsInner />
    </Suspense>
  )
}
