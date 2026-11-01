"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function CurrenciesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ code: "", name: "", symbol: "", rateToFunctional: 1, isFunctional: false })

  const load = async () => {
    const res = await glApi.getCurrencies()
    setRows(res.data || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  if (loading) return <PageLoadingSkeleton title="Currencies" />

  return (
    <FinanceDocumentShell
      eyebrow="Accounting Settings"
      title="Currencies"
      description="Functional currency and rates used on journals, bills, and invoices"
      kpis={[{ label: "Currencies", value: rows.length }]}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
        <FinanceTableCard title="Rate table">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2 text-right">Rate to functional</th>
                <th className="px-4 py-2">Base</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row._id} className="border-b">
                  <td className="px-4 py-2 font-medium">{row.code}</td>
                  <td className="px-4 py-2">{row.name}</td>
                  <td className="px-4 py-2 text-right">{row.rateToFunctional}</td>
                  <td className="px-4 py-2">{row.isFunctional ? "Functional" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </FinanceTableCard>
        </div>
        <FinanceTableCard title="Add / update">
          <div className="p-4 space-y-3">
            <div><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Symbol</Label><Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} /></div>
            <div><Label>Rate to KES</Label><Input type="number" value={form.rateToFunctional} onChange={(e) => setForm({ ...form, rateToFunctional: Number(e.target.value) })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFunctional} onChange={(e) => setForm({ ...form, isFunctional: e.target.checked })} /> Functional currency</label>
            <Button onClick={async () => {
              try {
                await glApi.saveCurrency(form)
                await load()
              } catch (error: any) {
                window.alert(error.message)
              }
            }}>Save currency</Button>
          </div>
        </FinanceTableCard>
      </div>
    </FinanceDocumentShell>
  )
}
