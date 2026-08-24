"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { api } from "@/lib/api"

function money(n: number) {
  return Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function CashReconciliationPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [accountId, setAccountId] = useState("all")
  const [rows, setRows] = useState<any[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const [accRes, txnRes] = await Promise.all([
        api.cashBanking.listAccounts({ status: "active" }),
        api.cashBanking.listTransactions({
          accountId: accountId !== "all" ? accountId : undefined,
          accountType: accountId === "all" ? undefined : undefined,
          reconciled: "false",
          limit: "300",
        }),
      ])
      const list = (accRes.data || []).filter(
        (a: any) => a.type === "bank" || a.type === "mpesa" || a.type === "cash",
      )
      setAccounts(list)
      let nextRows = txnRes.data?.rows || []
      if (accountId !== "all") {
        nextRows = nextRows.filter((r: any) => r.accountId === accountId)
      }
      setRows(nextRows)
      setSelected(new Set())
    } catch (error: any) {
      window.alert(error?.message || "Failed to load reconciliation")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  const selectedTotal = useMemo(() => {
    return rows
      .filter((r) => selected.has(r._id))
      .reduce((s, r) => s + Number(r.amount || 0) * (r.direction === "out" ? -1 : 1), 0)
  }, [rows, selected])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const markReconciled = async () => {
    if (selected.size === 0) {
      window.alert("Select at least one line")
      return
    }
    setSaving(true)
    try {
      await api.cashBanking.reconcile({
        transactionIds: Array.from(selected),
        reconciled: true,
      })
      await load(true)
    } catch (error: any) {
      window.alert(error?.message || "Failed to reconcile")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading reconciliation" rows={8} />

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Cash & Banking"
      title="Reconciliation"
      description="Tick cashbook lines that appear on your bank or M-Pesa statement."
      moduleNavGroupId="cash-banking"
      onRefresh={() => void load(true)}
      refreshing={refreshing}
      kpis={[
        { label: "Unreconciled", value: rows.length },
        { label: "Selected", value: selected.size },
        { label: "Selected net", value: selectedTotal, prefix: "KES" },
      ]}
      actions={
        <Button size="sm" onClick={() => void markReconciled()} disabled={saving}>
          {saving ? "Saving…" : "Mark reconciled"}
        </Button>
      }
      toolbar={
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="max-w-sm">
            <SelectValue placeholder="Filter account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a._id} value={a._id}>
                {a.name} ({a.type}) · bal {money(a.currentBalance)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <FinanceTableCard title="Unreconciled lines">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="py-2 px-3 w-10" />
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Account</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-3">Ref</th>
                <th className="py-2 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nothing left to reconcile for this filter.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="border-b">
                    <td className="py-2 px-3">
                      <Checkbox
                        checked={selected.has(row._id)}
                        onCheckedChange={() => toggle(row._id)}
                      />
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {new Date(row.occurredAt).toLocaleDateString("en-KE")}
                    </td>
                    <td className="py-2 px-3">{row.accountName}</td>
                    <td className="py-2 px-3">{row.description}</td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {row.reference || "—"}
                    </td>
                    <td
                      className={`py-2 px-3 text-right tabular-nums font-medium ${
                        row.direction === "in" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {row.direction === "in" ? "+" : "−"}
                      {money(row.amount)}
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
