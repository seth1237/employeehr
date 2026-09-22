"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { DesktopTableShell, MobileCardList, MobileCard } from "@/components/admin/ui/mobile-list"
import {
  EngineerHeader,
  EngineerPage,
  EngineerStatusBadge,
} from "@/components/engineer/engineer-ui"
import { useEngineerBranding } from "@/components/engineer/branding"
import { ChevronRight } from "lucide-react"

export default function EngineerRequestsPage() {
  const router = useRouter()
  const branding = useEngineerBranding()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [converting, setConverting] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    engineeringApi
      .getRequests("mine")
      .then((res) => setRows(res.data || []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const convert = async (id: string, machineId?: string) => {
    setConverting(id)
    try {
      const res = await engineeringApi.convertRequestToWorkOrder(id, { machineId })
      const woId = res.data?._id
      if (woId) router.push(`/engineer/work-orders/${woId}`)
      else load()
    } catch (error: any) {
      window.alert(error?.message || "Could not convert this request")
    } finally {
      setConverting(null)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Requests" />

  return (
    <EngineerPage>
      <EngineerHeader
        title="Service requests"
        description="Incoming faults and tickets. Open one and turn it into a work order."
      />

      <div className="overflow-hidden rounded-xl border bg-white">
        <DesktopTableShell>
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Asset / client</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    No open requests.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="border-t align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.title}</p>
                      <p className="text-xs text-muted-foreground">{row.description}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{row.machine?.productName || row.callerName || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.machine?.client?.name || row.callerPhone || ""}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <EngineerStatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        className="h-8 text-xs text-white"
                        style={{ backgroundColor: branding.primaryColor }}
                        disabled={converting === row._id}
                        onClick={() => void convert(row._id, row.machine?._id || row.machine_id)}
                      >
                        {row.serviceId ? "Open job" : "Create work order"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DesktopTableShell>

        <MobileCardList label="Service requests">
          {rows.length === 0 ? (
            <MobileCard>
              <p className="py-6 text-center text-sm text-muted-foreground">No open requests.</p>
            </MobileCard>
          ) : (
            rows.map((row) => (
              <MobileCard key={row._id} className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{row.title || "Service request"}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {row.machine?.productName || row.callerName || "No machine"}
                      {row.machine?.client?.name ? ` · ${row.machine.client.name}` : ""}
                    </p>
                  </div>
                  <EngineerStatusBadge status={row.status} />
                </div>
                {row.description ? (
                  <p className="line-clamp-2 text-xs text-slate-600">{row.description}</p>
                ) : null}
                <Button
                  size="sm"
                  className="h-8 w-full text-xs text-white"
                  style={{ backgroundColor: branding.primaryColor }}
                  disabled={converting === row._id}
                  onClick={() => void convert(row._id, row.machine?._id || row.machine_id)}
                >
                  {row.serviceId ? "Open job" : "Create work order"}
                  <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </MobileCard>
            ))
          )}
        </MobileCardList>
      </div>
    </EngineerPage>
  )
}
