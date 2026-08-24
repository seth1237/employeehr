"use client"

import { useEffect, useState } from "react"
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

function money(n: number) {
  return Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function CashTransfersPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [transfers, setTransfers] = useState<any[]>([])
  const [form, setForm] = useState({
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    occurredAt: new Date().toISOString().slice(0, 10),
    note: "",
    reference: "",
  })

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const [accRes, xferRes] = await Promise.all([
        api.cashBanking.listAccounts({ status: "active" }),
        api.cashBanking.listTransfers(),
      ])
      const list = accRes.data || []
      setAccounts(list)
      setTransfers(xferRes.data || [])
      setForm((p) => ({
        ...p,
        fromAccountId: p.fromAccountId || list[0]?._id || "",
        toAccountId: p.toAccountId || list[1]?._id || list[0]?._id || "",
      }))
    } catch (error: any) {
      window.alert(error?.message || "Failed to load transfers")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const submit = async () => {
    if (!form.fromAccountId || !form.toAccountId || !form.amount) {
      window.alert("From, to, and amount are required")
      return
    }
    setSubmitting(true)
    try {
      await api.cashBanking.createTransfer({
        fromAccountId: form.fromAccountId,
        toAccountId: form.toAccountId,
        amount: Number(form.amount),
        occurredAt: form.occurredAt,
        note: form.note || undefined,
        reference: form.reference || undefined,
      })
      setForm((p) => ({ ...p, amount: "", note: "", reference: "" }))
      await load(true)
    } catch (error: any) {
      window.alert(error?.message || "Transfer failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading transfers" rows={6} />

  const totalMoved = transfers.reduce((s, t) => s + Number(t.amount || 0), 0)

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Cash & Banking"
      title="Transfers"
      description="Move money between cash, bank, and M-Pesa accounts. Each transfer posts both legs to the cashbook."
      moduleNavGroupId="cash-banking"
      onRefresh={() => void load(true)}
      refreshing={refreshing}
      kpis={[
        { label: "Transfers", value: transfers.length },
        { label: "Total moved", value: totalMoved, prefix: "KES" },
        { label: "Active accounts", value: accounts.length },
      ]}
    >
      <FinanceTableCard title="New transfer">
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>From</Label>
            <Select
              value={form.fromAccountId}
              onValueChange={(v) => setForm((p) => ({ ...p, fromAccountId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Source account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name} ({a.type}) · {money(a.currentBalance)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>To</Label>
            <Select
              value={form.toAccountId}
              onValueChange={(v) => setForm((p) => ({ ...p, toAccountId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Destination account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name} ({a.type}) · {money(a.currentBalance)}
                  </SelectItem>
                ))}
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
          <div className="space-y-1.5">
            <Label>Reference</Label>
            <Input
              value={form.reference}
              onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Input
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Button onClick={() => void submit()} disabled={submitting}>
              {submitting ? "Transferring…" : "Transfer funds"}
            </Button>
          </div>
        </div>
      </FinanceTableCard>

      <FinanceTableCard title="Transfer history">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">From</th>
                <th className="py-2 px-3">To</th>
                <th className="py-2 px-3">Note</th>
                <th className="py-2 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No transfers yet.
                  </td>
                </tr>
              ) : (
                transfers.map((row) => (
                  <tr key={row._id} className="border-b">
                    <td className="py-2 px-3 whitespace-nowrap">
                      {new Date(row.occurredAt).toLocaleDateString("en-KE")}
                    </td>
                    <td className="py-2 px-3">{row.accountName}</td>
                    <td className="py-2 px-3">{row.relatedAccountName || "—"}</td>
                    <td className="py-2 px-3">{row.description}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium">
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
