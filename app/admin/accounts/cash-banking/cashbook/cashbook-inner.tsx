"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { api } from "@/lib/api"
import { Plus } from "lucide-react"

function money(n: number) {
  return Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function CashbookPageInner() {
  const searchParams = useSearchParams()
  const initialAccountId = searchParams.get("accountId") || "all"

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [totals, setTotals] = useState({ inflow: 0, outflow: 0, net: 0, count: 0 })
  const [accountId, setAccountId] = useState(initialAccountId)
  const [direction, setDirection] = useState("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    accountId: "",
    direction: "in",
    amount: "",
    occurredAt: new Date().toISOString().slice(0, 10),
    description: "",
    reference: "",
    counterparty: "",
  })

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const [accRes, txnRes] = await Promise.all([
        api.cashBanking.listAccounts({ status: "active" }),
        api.cashBanking.listTransactions({
          accountId: accountId !== "all" ? accountId : undefined,
          direction: direction !== "all" ? direction : undefined,
          from: from || undefined,
          to: to || undefined,
          limit: "300",
        }),
      ])
      setAccounts(accRes.data || [])
      setRows(txnRes.data?.rows || [])
      setTotals(txnRes.data?.totals || { inflow: 0, outflow: 0, net: 0, count: 0 })
      if (!form.accountId && (accRes.data || []).length) {
        setForm((p) => ({ ...p, accountId: accRes.data[0]._id }))
      }
    } catch (error: any) {
      window.alert(error?.message || "Failed to load cashbook")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, direction, from, to])

  const selectedAccountLabel = useMemo(() => {
    if (accountId === "all") return "All accounts"
    return accounts.find((a) => a._id === accountId)?.name || "Account"
  }, [accountId, accounts])

  const submit = async () => {
    if (!form.accountId || !form.amount || !form.description.trim()) {
      window.alert("Account, amount, and description are required")
      return
    }
    setSubmitting(true)
    try {
      await api.cashBanking.createTransaction({
        accountId: form.accountId,
        direction: form.direction,
        amount: Number(form.amount),
        occurredAt: form.occurredAt,
        description: form.description.trim(),
        reference: form.reference || undefined,
        counterparty: form.counterparty || undefined,
      })
      setShowForm(false)
      setForm((p) => ({
        ...p,
        amount: "",
        description: "",
        reference: "",
        counterparty: "",
      }))
      await load(true)
    } catch (error: any) {
      window.alert(error?.message || "Failed to save entry")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading cashbook" rows={8} />

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Cash & Banking"
      title="Cashbook"
      description={`Every cash movement · ${selectedAccountLabel}`}
      moduleNavGroupId="cash-banking"
      onRefresh={() => void load(true)}
      refreshing={refreshing}
      kpis={[
        { label: "Inflows", value: totals.inflow, prefix: "KES", accent: "success" },
        { label: "Outflows", value: totals.outflow, prefix: "KES", accent: "danger" },
        { label: "Net", value: totals.net, prefix: "KES" },
        { label: "Lines", value: totals.count },
      ]}
      actions={
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" />
          Manual entry
        </Button>
      }
      toolbar={
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a._id} value={a._id}>
                  {a.name} ({a.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={direction} onValueChange={setDirection}>
            <SelectTrigger>
              <SelectValue placeholder="Direction" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">In & out</SelectItem>
              <SelectItem value="in">Inflows only</SelectItem>
              <SelectItem value="out">Outflows only</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      }
    >
      {showForm ? (
        <FinanceTableCard title="Manual cashbook entry">
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Account</Label>
              <Select
                value={form.accountId}
                onValueChange={(v) => setForm((p) => ({ ...p, accountId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name} · {money(a.currentBalance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select
                value={form.direction}
                onValueChange={(v) => setForm((p) => ({ ...p, direction: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Inflow (cash in)</SelectItem>
                  <SelectItem value="out">Outflow (cash out)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.occurredAt}
                onChange={(e) => setForm((p) => ({ ...p, occurredAt: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input
                value={form.reference}
                onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Counterparty</Label>
              <Input
                value={form.counterparty}
                onChange={(e) => setForm((p) => ({ ...p, counterparty: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <Button onClick={() => void submit()} disabled={submitting}>
                {submitting ? "Saving…" : "Post entry"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </FinanceTableCard>
      ) : null}

      <FinanceTableCard title="Cashflow ledger">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Account</th>
                <th className="py-2 px-3">Kind</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-3 text-right">In</th>
                <th className="py-2 px-3 text-right">Out</th>
                <th className="py-2 px-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    No cashflows for this filter. Add a manual entry or sync operations.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="border-b">
                    <td className="py-2 px-3 whitespace-nowrap">
                      {new Date(row.occurredAt).toLocaleDateString("en-KE")}
                    </td>
                    <td className="py-2 px-3">
                      {row.accountName}
                      <span className="ml-1 text-[10px] uppercase text-muted-foreground">
                        {row.accountType}
                      </span>
                    </td>
                    <td className="py-2 px-3 capitalize">{row.kind}</td>
                    <td className="py-2 px-3">
                      {row.description}
                      {row.reference ? (
                        <span className="block text-xs text-muted-foreground">
                          Ref: {row.reference}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-emerald-600">
                      {row.direction === "in" ? money(row.amount) : "—"}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-rose-600">
                      {row.direction === "out" ? money(row.amount) : "—"}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium">
                      {money(row.balanceAfter)}
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
