"use client"

import { useEffect, useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function FinanceAuditLogsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    glApi.getAuditLogs().then((res) => setRows(res.data || [])).finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoadingSkeleton title="Audit Logs" />

  return (
    <FinanceDocumentShell eyebrow="Accounting Settings" title="Audit Logs" description="Recent security and finance actions for this company">
      <FinanceTableCard title="Latest 100">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-2">Time</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Resource</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._id} className="border-b">
                <td className="px-4 py-2">{row.timestamp ? new Date(row.timestamp).toLocaleString() : ""}</td>
                <td className="px-4 py-2">{row.action}</td>
                <td className="px-4 py-2">{row.resource}</td>
                <td className="px-4 py-2">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
