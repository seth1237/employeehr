"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function WithholdingPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ payee: "", pin: "", grossAmount: 0, rate: 5, reference: "" })

  const load = async () => {
    const res = await glApi.getWithholding()
    setRows(res.data || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])
  if (loading) return <PageLoadingSkeleton title="Withholding Tax" />

  return (
    <FinanceDocumentShell
      eyebrow="Tax"
      title="Withholding Tax"
      description="Track WHT certificates and amounts withheld from suppliers"
      kpis={[{ label: "Records", value: rows.length }, { label: "Tax", value: rows.reduce((s, r) => s + Number(r.taxAmount || 0), 0), prefix: "KES" }]}
    >
      <FinanceTableCard title="Register">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Payee</th>
              <th className="px-4 py-2 text-right">Gross</th>
              <th className="px-4 py-2 text-right">Rate</th>
              <th className="px-4 py-2 text-right">Tax</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{new Date(row.date).toLocaleDateString()}</td>
                <td className="px-4 py-2">{row.payee}</td>
                <td className="px-4 py-2 text-right">{row.grossAmount}</td>
                <td className="px-4 py-2 text-right">{row.rate}%</td>
                <td className="px-4 py-2 text-right">{row.taxAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
      <div className="mt-6">
        <FinanceTableCard title="Add certificate">
          <div className="grid gap-3 p-4 md:grid-cols-5">
            <div><Label>Payee</Label><Input value={form.payee} onChange={(e) => setForm({ ...form, payee: e.target.value })} /></div>
            <div><Label>PIN</Label><Input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></div>
            <div><Label>Gross</Label><Input type="number" value={form.grossAmount} onChange={(e) => setForm({ ...form, grossAmount: Number(e.target.value) })} /></div>
            <div><Label>Rate %</Label><Input type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })} /></div>
            <div className="flex items-end"><Button onClick={async () => { await glApi.saveWithholding(form); await load() }}>Save</Button></div>
          </div>
        </FinanceTableCard>
      </div>
    </FinanceDocumentShell>
  )
}
