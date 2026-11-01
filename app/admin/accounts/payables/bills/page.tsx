"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function SupplierBillsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    supplierName: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    amount: 0,
    taxAmount: 0,
    description: "",
  })

  const load = async () => {
    const res = await glApi.getPayablesBills()
    setRows(res.data || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])
  if (loading) return <PageLoadingSkeleton title="Supplier Bills" />

  return (
    <FinanceDocumentShell
      eyebrow="Purchases & Payables"
      title="Supplier Bills"
      description="Record vendor invoices, post purchases journals, and track what is still owed"
      kpis={[
        { label: "Open bills", value: rows.filter((row) => Number(row.balanceRemaining) > 0).length },
        { label: "Outstanding", value: rows.reduce((sum, row) => sum + Number(row.balanceRemaining || 0), 0), prefix: "KES" },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <FinanceTableCard title="Bills register">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Bill</th>
                  <th className="px-4 py-2">Vendor</th>
                  <th className="px-4 py-2">Due</th>
                  <th className="px-4 py-2 text-right">Total</th>
                  <th className="px-4 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id} className="border-b">
                    <td className="px-4 py-2">{row.invoiceNumber}</td>
                    <td className="px-4 py-2">{row.supplierId}</td>
                    <td className="px-4 py-2">{row.dueDate ? new Date(row.dueDate).toLocaleDateString() : ""}</td>
                    <td className="px-4 py-2 text-right">{Number(row.grandTotal || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{Number(row.balanceRemaining || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FinanceTableCard>
        </div>
        <FinanceTableCard title="New bill">
          <div className="space-y-3 p-4">
            <div><Label>Vendor</Label><Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></div>
            <div><Label>Bill number</Label><Input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} /></div>
            <div><Label>Invoice date</Label><Input type="date" value={form.invoiceDate} onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })} /></div>
            <div><Label>Due date</Label><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></div>
            <div><Label>VAT</Label><Input type="number" value={form.taxAmount} onChange={(e) => setForm({ ...form, taxAmount: Number(e.target.value) })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <Button onClick={async () => {
              try {
                await glApi.savePayablesBill(form)
                await load()
              } catch (error: any) {
                window.alert(error.message || "Failed to save bill")
              }
            }}>Post bill</Button>
          </div>
        </FinanceTableCard>
      </div>
    </FinanceDocumentShell>
  )
}
