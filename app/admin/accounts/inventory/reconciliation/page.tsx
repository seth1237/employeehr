"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function InventoryReconPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    glApi.getInventoryReconciliation().then((res) => setData(res.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="Inventory Reconciliation" />

  return (
    <FinanceDocumentShell
      eyebrow="Inventory Accounting"
      title="Inventory Reconciliation"
      description="Compare stock quantity at cost with the inventory control account"
      kpis={[
        { label: "Stock value", value: data?.stockValue || 0, prefix: "KES" },
        { label: "Ledger 1300", value: data?.ledgerValue || 0, prefix: "KES" },
        { label: "Difference", value: data?.difference || 0, prefix: "KES" },
      ]}
    >
      <FinanceTableCard title="Result">
        <div className="p-4 text-sm">Products counted: {data?.products || 0}</div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
