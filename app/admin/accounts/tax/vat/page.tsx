"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function VatPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    glApi.getVat().then((res) => setData(res.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="VAT" />

  return (
    <FinanceDocumentShell
      eyebrow="Tax"
      title="VAT"
      description="Output VAT from issued invoices for the current period"
      kpis={[
        { label: "Output VAT", value: data?.outputVat || 0, prefix: "KES" },
        { label: "Input VAT", value: data?.inputVat || 0, prefix: "KES" },
        { label: "Net VAT", value: data?.netVat || 0, prefix: "KES" },
      ]}
    >
      <FinanceTableCard title="Invoices">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Invoice</th>
              <th className="px-4 py-2">Client</th>
              <th className="px-4 py-2 text-right">VAT</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {(data?.invoices || []).map((row: any) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.invoiceNumber}</td>
                <td className="px-4 py-2">{row.client?.name}</td>
                <td className="px-4 py-2 text-right">{row.taxTotal || 0}</td>
                <td className="px-4 py-2 text-right">{row.grandTotal || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
