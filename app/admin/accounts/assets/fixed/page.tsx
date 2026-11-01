"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function FixedAssetsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: "",
    category: "Equipment",
    purchaseDate: new Date().toISOString().slice(0, 10),
    cost: 0,
    salvageValue: 0,
    usefulLifeMonths: 60,
    method: "straight-line",
  })

  const load = async () => {
    const res = await glApi.getAssets()
    setRows(res.data || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  if (loading) return <PageLoadingSkeleton title="Fixed Assets" />

  return (
    <FinanceDocumentShell
      eyebrow="Fixed Assets"
      title="Fixed Assets"
      description="Register assets from purchase through useful life"
      kpis={[
        { label: "Assets", value: rows.length },
        { label: "Cost", value: rows.reduce((s, r) => s + Number(r.cost || 0), 0), prefix: "KES" },
      ]}
    >
      <FinanceTableCard title="Register">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2 text-right">Cost</th>
              <th className="px-4 py-2 text-right">Accum. dep.</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.assetCode}</td>
                <td className="px-4 py-2">{row.name}</td>
                <td className="px-4 py-2">{row.method}</td>
                <td className="px-4 py-2 text-right">{row.cost}</td>
                <td className="px-4 py-2 text-right">{row.accumulatedDepreciation}</td>
                <td className="px-4 py-2 capitalize">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
      <div className="mt-6">
        <FinanceTableCard title="Add asset">
          <div className="grid gap-3 p-4 md:grid-cols-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Purchase date</Label><Input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} /></div>
            <div><Label>Cost</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} /></div>
            <div><Label>Salvage</Label><Input type="number" value={form.salvageValue} onChange={(e) => setForm({ ...form, salvageValue: Number(e.target.value) })} /></div>
            <div><Label>Life (months)</Label><Input type="number" value={form.usefulLifeMonths} onChange={(e) => setForm({ ...form, usefulLifeMonths: Number(e.target.value) })} /></div>
            <div>
              <Label>Method</Label>
              <select className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="straight-line">Straight-line</option>
                <option value="reducing">Reducing balance</option>
              </select>
            </div>
            <div className="flex items-end"><Button onClick={async () => { await glApi.saveAsset(form); await load() }}>Save asset</Button></div>
          </div>
        </FinanceTableCard>
      </div>
    </FinanceDocumentShell>
  )
}
