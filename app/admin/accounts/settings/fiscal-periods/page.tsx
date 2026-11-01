"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"

export default function FiscalPeriodsPage() {
  const year = new Date().getFullYear()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const res = await glApi.getPeriods(year)
    setRows(res.data || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  if (loading) return <PageLoadingSkeleton title="Fiscal Periods" />

  return (
    <FinanceDocumentShell
      eyebrow="Accounting Settings"
      title="Fiscal Periods"
      description="Open or close monthly periods. Closed periods reject new journals."
      kpis={[{ label: "Open", value: rows.filter((r) => r.status === "open").length }, { label: "Closed", value: rows.filter((r) => r.status === "closed").length }]}
    >
      <FinanceTableCard title={`${year} periods`}>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Month</th>
              <th className="px-4 py-2">Start</th>
              <th className="px-4 py-2">End</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.year}-{String(row.month).padStart(2, "0")}</td>
                <td className="px-4 py-2">{new Date(row.startDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">{new Date(row.endDate).toLocaleDateString()}</td>
                <td className="px-4 py-2 capitalize">{row.status}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="outline" onClick={async () => {
                    await glApi.setPeriodStatus({ year: row.year, month: row.month, status: row.status === "open" ? "closed" : "open" })
                    await load()
                  }}>{row.status === "open" ? "Close" : "Reopen"}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
