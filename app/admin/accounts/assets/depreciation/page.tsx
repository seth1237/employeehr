"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"

export default function DepreciationPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const load = async () => {
    const res = await glApi.getAssets()
    setRows((res.data || []).filter((row: any) => row.status === "active"))
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  if (loading) return <PageLoadingSkeleton title="Depreciation" />

  return (
    <FinanceDocumentShell
      eyebrow="Fixed Assets"
      title="Depreciation"
      description="Run the monthly depreciation journal for active assets"
      actions={<Button onClick={async () => {
        setRunning(true)
        try {
          const res = await glApi.runDepreciation()
          window.alert(`Posted ${res.data?.length || 0} depreciation journals`)
          await load()
        } catch (error: any) {
          window.alert(error.message)
        } finally {
          setRunning(false)
        }
      }}>{running ? "Posting..." : "Run this month"}</Button>}
    >
      <FinanceTableCard title="Active assets">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Asset</th>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2 text-right">Cost</th>
              <th className="px-4 py-2 text-right">Accumulated</th>
              <th className="px-4 py-2">Last run</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.assetCode} {row.name}</td>
                <td className="px-4 py-2">{row.method}</td>
                <td className="px-4 py-2 text-right">{row.cost}</td>
                <td className="px-4 py-2 text-right">{row.accumulatedDepreciation}</td>
                <td className="px-4 py-2">{row.lastDepreciatedOn ? new Date(row.lastDepreciatedOn).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
