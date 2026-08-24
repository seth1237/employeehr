"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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

export type CashAccountType = "cash" | "bank" | "mpesa"

const TYPE_COPY: Record<
  CashAccountType,
  { title: string; description: string; namePlaceholder: string }
> = {
  cash: {
    title: "Cash Accounts",
    description: "Petty cash and cash-on-hand balances across branches.",
    namePlaceholder: "e.g. Petty Cash — HQ",
  },
  bank: {
    title: "Bank Accounts",
    description: "Track every bank account balance and statement-ready history.",
    namePlaceholder: "e.g. KCB Current Account",
  },
  mpesa: {
    title: "M-Pesa Accounts",
    description: "Till, paybill, and phone wallets with live running balances.",
    namePlaceholder: "e.g. Business Till",
  },
}

function money(n: number) {
  return Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function CashAccountTypePage({ type }: { type: CashAccountType }) {
  const copy = TYPE_COPY[type]
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: "",
    accountNumber: "",
    bankName: "",
    branchName: "",
    mpesaIdentifier: "",
    mpesaMode: "till",
    openingBalance: "0",
    isDefault: false,
    notes: "",
  })

  const load = async (silent = false) => {
    if (silent) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await api.cashBanking.listAccounts({ type, status: "all" })
      setAccounts(res.data || [])
    } catch (error: any) {
      window.alert(error?.message || "Failed to load accounts")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
  }, [type])

  const total = useMemo(
    () =>
      accounts
        .filter((a) => a.status === "active")
        .reduce((s, a) => s + Number(a.currentBalance || 0), 0),
    [accounts],
  )

  const submit = async () => {
    if (!form.name.trim()) {
      window.alert("Account name is required")
      return
    }
    setSubmitting(true)
    try {
      await api.cashBanking.createAccount({
        type,
        name: form.name.trim(),
        accountNumber: form.accountNumber || undefined,
        bankName: form.bankName || undefined,
        branchName: form.branchName || undefined,
        mpesaIdentifier: form.mpesaIdentifier || undefined,
        mpesaMode: type === "mpesa" ? form.mpesaMode : undefined,
        openingBalance: Number(form.openingBalance || 0),
        isDefault: form.isDefault,
        notes: form.notes || undefined,
      })
      setShowForm(false)
      setForm({
        name: "",
        accountNumber: "",
        bankName: "",
        branchName: "",
        mpesaIdentifier: "",
        mpesaMode: "till",
        openingBalance: "0",
        isDefault: false,
        notes: "",
      })
      await load(true)
    } catch (error: any) {
      window.alert(error?.message || "Failed to create account")
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (account: any) => {
    try {
      await api.cashBanking.updateAccount(account._id, {
        status: account.status === "active" ? "inactive" : "active",
      })
      await load(true)
    } catch (error: any) {
      window.alert(error?.message || "Failed to update account")
    }
  }

  if (loading) return <PageLoadingSkeleton title={`Loading ${copy.title}`} rows={6} />

  return (
    <FinanceDocumentShell
      eyebrow="Accounts · Cash & Banking"
      title={copy.title}
      description={copy.description}
      moduleNavGroupId="cash-banking"
      onRefresh={() => void load(true)}
      refreshing={refreshing}
      kpis={[
        { label: "Accounts", value: accounts.length },
        {
          label: "Active balance",
          value: total,
          prefix: "KES",
          accent: "success",
        },
      ]}
      actions={
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" />
          Add account
        </Button>
      }
    >
      {showForm ? (
        <FinanceTableCard title="New account">
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Name</Label>
              <Input
                placeholder={copy.namePlaceholder}
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            {type === "bank" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Bank name</Label>
                  <Input
                    value={form.bankName}
                    onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Account number</Label>
                  <Input
                    value={form.accountNumber}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, accountNumber: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  <Input
                    value={form.branchName}
                    onChange={(e) => setForm((p) => ({ ...p, branchName: e.target.value }))}
                  />
                </div>
              </>
            ) : null}
            {type === "mpesa" ? (
              <>
                <div className="space-y-1.5">
                  <Label>Mode</Label>
                  <Select
                    value={form.mpesaMode}
                    onValueChange={(v) => setForm((p) => ({ ...p, mpesaMode: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="till">Till</SelectItem>
                      <SelectItem value="paybill">Paybill</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Till / Paybill / Phone</Label>
                  <Input
                    value={form.mpesaIdentifier}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, mpesaIdentifier: e.target.value }))
                    }
                  />
                </div>
              </>
            ) : null}
            {type === "cash" ? (
              <div className="space-y-1.5">
                <Label>Location / label</Label>
                <Input
                  value={form.branchName}
                  onChange={(e) => setForm((p) => ({ ...p, branchName: e.target.value }))}
                  placeholder="Branch or till location"
                />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>Opening balance (KES)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.openingBalance}
                onChange={(e) =>
                  setForm((p) => ({ ...p, openingBalance: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                checked={form.isDefault}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, isDefault: Boolean(v) }))
                }
              />
              <Label>Default for {type} inflows/outflows</Label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <Button onClick={() => void submit()} disabled={submitting}>
                {submitting ? "Saving…" : "Save account"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </FinanceTableCard>
      ) : null}

      <FinanceTableCard
        title={`${copy.title} register`}
        headerRight={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/accounts/cash-banking/cashbook">View cashbook</Link>
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="py-2 px-3">Name</th>
                <th className="py-2 px-3">Details</th>
                <th className="py-2 px-3 text-right">Balance</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No accounts yet. Add one to start tracking balances.
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account._id} className="border-b">
                    <td className="py-2 px-3 font-medium">
                      {account.name}
                      {account.isDefault ? (
                        <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                          default
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {type === "bank"
                        ? [account.bankName, account.accountNumber, account.branchName]
                            .filter(Boolean)
                            .join(" · ") || "—"
                        : type === "mpesa"
                          ? [account.mpesaMode, account.mpesaIdentifier]
                              .filter(Boolean)
                              .join(" · ") || "—"
                          : account.branchName || "—"}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-medium">
                      {money(account.currentBalance)}
                    </td>
                    <td className="py-2 px-3 capitalize">{account.status}</td>
                    <td className="py-2 px-3 space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/admin/accounts/cash-banking/cashbook?accountId=${account._id}`}
                        >
                          Ledger
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void toggleStatus(account)}
                      >
                        {account.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
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
