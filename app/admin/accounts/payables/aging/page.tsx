"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function PayablesAgingPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    glApi.getPayablesAging().then((res) => setData(res.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="Payables Aging" />

  return (
    <FinanceDocumentShell
      eyebrow="Purchases & Payables"
      title="Aging Report"
      description="Open vendor bills by 0–30, 31–60, 61–90, and older due-date buckets"
      kpis={[
        { label: "0–30", value: data?.buckets?.current || 0, prefix: "KES" },
        { label: "31–60", value: data?.buckets?.d30 || 0, prefix: "KES" },
        { label: "61–90", value: data?.buckets?.d60 || 0, prefix: "KES" },
        { label: "90+", value: (data?.buckets?.d90 || 0) + (data?.buckets?.older || 0), prefix: "KES" },
      ]}
    >
      <FinanceTableCard title="Open bills">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Bill</th>
              <th className="px-4 py-2">Vendor</th>
              <th className="px-4 py-2 text-right">Days</th>
              <th className="px-4 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows || []).map((row: any) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.invoiceNumber}</td>
                <td className="px-4 py-2">{row.supplierId}</td>
                <td className="px-4 py-2 text-right">{row.days}</td>
                <td className="px-4 py-2 text-right">{Number(row.balanceRemaining || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
