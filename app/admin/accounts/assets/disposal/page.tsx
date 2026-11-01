"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"

export default function AssetDisposalPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const res = await glApi.getAssets()
    setRows(res.data || [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])
  if (loading) return <PageLoadingSkeleton title="Asset Disposal" />

  return (
    <FinanceDocumentShell eyebrow="Fixed Assets" title="Asset Disposal" description="Dispose an asset and record proceeds versus book value">
      <FinanceTableCard title="Assets">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Asset</th>
              <th className="px-4 py-2 text-right">Book value</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.assetCode} {row.name}</td>
                <td className="px-4 py-2 text-right">{Number(row.cost || 0) - Number(row.accumulatedDepreciation || 0)}</td>
                <td className="px-4 py-2 capitalize">{row.status}</td>
                <td className="px-4 py-2 text-right">
                  {row.status === "active" ? (
                    <Button size="sm" variant="outline" onClick={async () => {
                      const proceeds = Number(window.prompt("Disposal proceeds (KES)", "0") || 0)
                      await glApi.disposeAsset(row._id, { proceeds })
                      await load()
                    }}>Dispose</Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
