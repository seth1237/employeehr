"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function GlBudgetsPage() {
  const year = new Date().getFullYear()
  const [accounts, setAccounts] = useState<any[]>([])
  const [vs, setVs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: `${year} operating budget`, accountId: "", month: 1, amount: 0 })

  const load = async () => {
    const [acc, report] = await Promise.all([glApi.getAccounts(), glApi.getBudgetVsActual(year)])
    setAccounts(acc.data || [])
    setVs(report.data)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  if (loading) return <PageLoadingSkeleton title="Budgets" />

  return (
    <FinanceDocumentShell
      eyebrow="Accounting Settings"
      title="Budgets and planning"
      description="Annual GL budget lines compared with actual ledger balances"
      kpis={[{ label: "Lines", value: vs?.rows?.length || 0 }]}
    >
      <FinanceTableCard title="Budget versus actual">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Account</th>
              <th className="px-4 py-2">Month</th>
              <th className="px-4 py-2 text-right">Budget</th>
              <th className="px-4 py-2 text-right">Actual</th>
              <th className="px-4 py-2 text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {(vs?.rows || []).map((row: any, idx: number) => (
              <tr key={`${row.accountId}-${row.month}-${idx}`} className="border-b">
                <td className="px-4 py-2">{row.accountCode} {row.accountName}</td>
                <td className="px-4 py-2">{row.month}</td>
                <td className="px-4 py-2 text-right">{row.amount}</td>
                <td className="px-4 py-2 text-right">{row.actual}</td>
                <td className="px-4 py-2 text-right">{row.variance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
      <div className="mt-6">
        <FinanceTableCard title="Add budget line">
          <div className="grid gap-3 p-4 md:grid-cols-5">
            <div className="md:col-span-2"><Label>Account</Label>
              <select className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                <option value="">Select</option>
                {accounts.map((acc) => <option key={acc._id} value={acc._id}>{acc.code} {acc.name}</option>)}
              </select>
            </div>
            <div><Label>Month</Label><Input type="number" min={1} max={12} value={form.month} onChange={(e) => setForm({ ...form, month: Number(e.target.value) })} /></div>
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div className="flex items-end"><Button onClick={async () => {
              const account = accounts.find((row) => row._id === form.accountId)
              const existing = vs?.budget?.lines || []
              await glApi.saveBudget({
                name: form.name,
                year,
                status: "approved",
                lines: [...existing, { accountId: form.accountId, accountCode: account?.code, accountName: account?.name, month: form.month, amount: form.amount }],
              })
              await load()
            }}>Save line</Button></div>
          </div>
        </FinanceTableCard>
      </div>
    </FinanceDocumentShell>
  )
}
