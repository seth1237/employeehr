"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function PurchaseCreditNotesPage() {
  const [rows, setRows] = useState<any[]>([])
  const [bills, setBills] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ supplierName: "", amount: 0, reason: "", billId: "", reference: "" })

  const load = async () => {
    const [notes, invoices] = await Promise.all([glApi.getPayablesCreditNotes(), glApi.getPayablesBills()])
    setRows(notes.data || [])
    setBills(invoices.data || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])
  if (loading) return <PageLoadingSkeleton title="Purchase Credit Notes" />

  return (
    <FinanceDocumentShell
      eyebrow="Purchases & Payables"
      title="Purchase Credit Notes"
      description="Vendor refunds, returns, and price adjustments that reduce accounts payable"
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <FinanceTableCard title="Credit notes">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Vendor</th>
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-b">
                    <td className="px-4 py-2">{row.supplierName}</td>
                    <td className="px-4 py-2">{row.reason}</td>
                    <td className="px-4 py-2 text-right">{Number(row.amount || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FinanceTableCard>
        </div>
        <FinanceTableCard title="New credit note">
          <div className="space-y-3 p-4">
            <div><Label>Vendor</Label><Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></div>
            <div>
              <Label>Linked bill</Label>
              <select className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm" value={form.billId} onChange={(e) => setForm({ ...form, billId: e.target.value })}>
                <option value="">None</option>
                {bills.map((bill) => <option key={bill._id} value={bill._id}>{bill.invoiceNumber} · {bill.supplierId}</option>)}
              </select>
            </div>
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div><Label>Reason</Label><Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
            <div><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
            <Button onClick={async () => {
              try {
                await glApi.savePayablesCreditNote(form)
                await load()
              } catch (error: any) {
                window.alert(error.message || "Failed to save credit note")
              }
            }}>Post credit note</Button>
          </div>
        </FinanceTableCard>
      </div>
    </FinanceDocumentShell>
  )
}
