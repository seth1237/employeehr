"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function SupplierStatementsPage() {
  const [creditors, setCreditors] = useState<any[]>([])
  const [supplierId, setSupplierId] = useState("")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    glApi.getPayablesCreditors().then((res) => {
      const rows = res.data || []
      setCreditors(rows)
      if (rows[0]) setSupplierId(rows[0].supplierId)
    }).finally(() => setLoading(false))
  }, [])

  const load = async (id = supplierId) => {
    if (!id) return
    const res = await glApi.getPayablesStatement(id)
    setData(res.data)
  }

  useEffect(() => { if (supplierId) void load(supplierId) }, [supplierId])

  if (loading) return <PageLoadingSkeleton title="Supplier Statements" />

  return (
    <FinanceDocumentShell
      eyebrow="Purchases & Payables"
      title="Supplier Statements"
      description="Bills, payments, and credit notes for one vendor account"
      kpis={[
        { label: "Billed", value: data?.billed || 0, prefix: "KES" },
        { label: "Paid", value: data?.paid || 0, prefix: "KES" },
        { label: "Credits", value: data?.credits || 0, prefix: "KES" },
        { label: "Balance", value: data?.balance || 0, prefix: "KES" },
      ]}
      toolbar={
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs">Vendor</Label>
            <select className="mt-1 h-9 w-72 rounded-md border bg-background px-3 text-sm" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {creditors.map((row) => <option key={row.supplierId} value={row.supplierId}>{row.supplierId}</option>)}
            </select>
          </div>
          <Button size="sm" onClick={() => void load()}>Refresh</Button>
        </div>
      }
    >
      <FinanceTableCard title="Bills">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Bill</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {(data?.bills || []).map((row: any) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.invoiceNumber}</td>
                <td className="px-4 py-2">{row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString() : ""}</td>
                <td className="px-4 py-2 text-right">{Number(row.grandTotal || 0).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">{Number(row.balanceRemaining || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
