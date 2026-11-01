"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function TaxReportsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    glApi.getTaxReports().then((res) => setData(res.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="Tax Reports" />

  const items = [
    ["PAYE", data?.paye],
    ["SHIF", data?.shif],
    ["NSSF", data?.nssf],
    ["Housing Levy", data?.housing],
    ["Withholding tax", data?.withholding],
  ]

  return (
    <FinanceDocumentShell eyebrow="Tax" title="Tax Reports" description={`Statutory liabilities for ${data?.month || ""}`}>
      <FinanceTableCard title="Liabilities">
        <table className="w-full text-sm">
          <tbody>
            {items.map(([name, value]) => (
              <tr key={String(name)} className="border-b">
                <td className="px-4 py-3">{name}</td>
                <td className="px-4 py-3 text-right font-medium">KES {Number(value || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
