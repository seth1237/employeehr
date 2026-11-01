"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function CogsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    glApi.getCogs().then((res) => setData(res.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="COGS" />

  return (
    <FinanceDocumentShell
      eyebrow="Inventory Accounting"
      title="Cost of Goods Sold"
      description="Sales at buying cost, ready to post to the COGS ledger account"
      kpis={[{ label: "Total COGS", value: data?.totalCogs || 0, prefix: "KES" }]}
    >
      <FinanceTableCard title="Recent sales">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Unit cost</th>
              <th className="px-4 py-2 text-right">COGS</th>
            </tr>
          </thead>
          <tbody>
            {(data?.rows || []).slice(0, 50).map((row: any) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.productName || row.productId}</td>
                <td className="px-4 py-2 text-right">{row.quantitySold}</td>
                <td className="px-4 py-2 text-right">{row.unitCost}</td>
                <td className="px-4 py-2 text-right">{row.cogs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
