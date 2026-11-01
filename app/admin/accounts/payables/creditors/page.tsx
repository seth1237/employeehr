"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function CreditorsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    glApi.getPayablesCreditors().then((res) => setRows(res.data || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="Creditors" />

  return (
    <FinanceDocumentShell
      eyebrow="Purchases & Payables"
      title="Creditors"
      description="Vendor control-account balances from bills, payments, and credit notes"
      kpis={[{ label: "Outstanding", value: rows.reduce((sum, row) => sum + Number(row.balance || 0), 0), prefix: "KES" }]}
    >
      <FinanceTableCard title="Vendor balances">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Vendor</th>
              <th className="px-4 py-2 text-right">Billed</th>
              <th className="px-4 py-2 text-right">Paid</th>
              <th className="px-4 py-2 text-right">Credits</th>
              <th className="px-4 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.supplierId} className="border-b">
                <td className="px-4 py-2">{row.supplierId}</td>
                <td className="px-4 py-2 text-right">{Number(row.billed || 0).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">{Number(row.paid || 0).toLocaleString()}</td>
                <td className="px-4 py-2 text-right">{Number(row.credits || 0).toLocaleString()}</td>
                <td className="px-4 py-2 text-right font-medium">{Number(row.balance || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
