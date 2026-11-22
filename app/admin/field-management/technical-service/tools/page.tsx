"use client"

import { useEffect, useState } from "react"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DesktopTableShell,
  MobileCard,
  MobileCardList,
  StatusBadge,
  TechnicalServiceHeader,
  TechnicalServicePage,
} from "@/components/admin/technical-service-ui"

type ToolRequest = {
  _id: string
  requesterName: string
  itemName: string
  category: string
  quantity: number
  reason: string
  neededBy?: string
  status: string
  adminComment?: string
  createdAt: string
}

export default function AdminToolRequestsPage() {
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<ToolRequest[]>([])
  const [comments, setComments] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState("")

  const load = () => {
    setLoading(true)
    engineeringApi
      .getToolRequests()
      .then((res) => setRows(res.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const review = async (id: string, status: string) => {
    setSavingId(id)
    try {
      await engineeringApi.reviewToolRequest(id, {
        status,
        adminComment: comments[id] || undefined,
      })
      load()
    } catch (error: any) {
      window.alert(error?.message || "Could not update request")
    } finally {
      setSavingId("")
    }
  }

  if (loading && rows.length === 0) return <PageLoadingSkeleton title="Tool requests" />

  return (
    <TechnicalServicePage>
      <TechnicalServiceHeader
        title="Tool requests"
        description="Approve equipment, tools, PPE, and parts requested by engineers."
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            Refresh
          </Button>
        }
      />

      <DesktopTableShell>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Request</th>
              <th className="px-4 py-3">Engineer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  No tool requests yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="border-t align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {row.itemName} · {row.quantity}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">{row.category}</p>
                    <p className="mt-1 text-xs text-slate-600">{row.reason}</p>
                    {row.neededBy ? (
                      <p className="text-xs text-muted-foreground">
                        Needed {new Date(row.neededBy).toLocaleDateString()}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p>{row.requesterName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "pending" ? (
                      <div className="space-y-2">
                        <Input
                          placeholder="Note (optional)"
                          value={comments[row._id] || ""}
                          onChange={(e) => setComments((prev) => ({ ...prev, [row._id]: e.target.value }))}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" disabled={savingId === row._id} onClick={() => void review(row._id, "approved")}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={savingId === row._id}
                            onClick={() => void review(row._id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ) : row.status === "approved" ? (
                      <Button size="sm" variant="outline" disabled={savingId === row._id} onClick={() => void review(row._id, "issued")}>
                        Mark issued
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">{row.adminComment || "—"}</p>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DesktopTableShell>

      <MobileCardList label="Tool requests">
        {rows.length === 0 ? (
          <MobileCard>
            <p className="py-6 text-center text-sm text-muted-foreground">No tool requests yet.</p>
          </MobileCard>
        ) : (
          rows.map((row) => (
            <MobileCard key={row._id}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{row.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.requesterName} · {row.quantity} · {row.category}
                  </p>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-2 text-sm text-slate-600">{row.reason}</p>
              {row.status === "pending" ? (
                <div className="mt-3 space-y-2">
                  <Input
                    placeholder="Note (optional)"
                    value={comments[row._id] || ""}
                    onChange={(e) => setComments((prev) => ({ ...prev, [row._id]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => void review(row._id, "approved")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => void review(row._id, "rejected")}>
                      Reject
                    </Button>
                  </div>
                </div>
              ) : null}
            </MobileCard>
          ))
        )}
      </MobileCardList>
    </TechnicalServicePage>
  )
}
