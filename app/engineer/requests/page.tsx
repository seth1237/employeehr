"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { engineeringApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { isTechnicalServiceLead } from "@/lib/engineer-roles"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { DesktopTableShell, MobileCardList, MobileCard } from "@/components/admin/ui/mobile-list"
import {
  EngineerHeader,
  EngineerPage,
  EngineerStatusBadge,
} from "@/components/engineer/engineer-ui"
import { ChevronRight } from "lucide-react"

export default function EngineerRequestsPage() {
  const router = useRouter()
  const lead = isTechnicalServiceLead(getUser()?.role)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<any[]>([])
  const [engineers, setEngineers] = useState<any[]>([])
  const [converting, setConverting] = useState<string | null>(null)
  const [pick, setPick] = useState<Record<string, string>>({})

  const load = () => {
    setLoading(true)
    Promise.all([
      engineeringApi.getRequests(lead ? "all" : "mine"),
      lead ? engineeringApi.listEngineers().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
    ])
      .then(([reqRes, engRes]) => {
        setRows(reqRes.data || [])
        setEngineers(engRes.data || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [lead])

  const openJob = (row: any) => {
    if (row.serviceId) router.push(`/engineer/work-orders/${row.serviceId}`)
  }

  const assign = async (row: any) => {
    const technicianId = pick[row._id]
    if (!technicianId) {
      window.alert("Choose an engineer first")
      return
    }
    setConverting(row._id)
    try {
      const res = await engineeringApi.assignRequest(row._id, {
        technicianId,
        machineId: row.machine?._id || row.machine_id,
      })
      const woId = res.data?._id
      if (woId) router.push(`/engineer/work-orders/${woId}`)
      else load()
    } catch (error: any) {
      window.alert(error?.message || "Could not assign this request")
    } finally {
      setConverting(null)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Requests" />

  const assignedName = (row: any) =>
    engineers.find((person) => person._id === String(row.assignedTechnician_id || ""))?.name ||
    (row.assignedTechnician_id ? "Assigned" : "Unassigned")

  return (
    <EngineerPage>
      <EngineerHeader
        title="Service requests"
        description={
          lead
            ? "Tickets raised by engineers. Assign who should take the job."
            : "Tickets you raised. The technical service lead assigns who goes out."
        }
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
                      <p className="mt-1 text-[11px] text-muted-foreground">{assignedName(row)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {lead && !row.serviceId ? (
                        <div className="flex flex-col gap-2">
                          <select
                            className="h-8 rounded-md border bg-white px-2 text-xs"
                            value={pick[row._id] || ""}
                            onChange={(event) =>
                              setPick((prev) => ({ ...prev, [row._id]: event.target.value }))
                            }
                          >
                            <option value="">Assign engineer</option>
                            {engineers.map((person) => (
                              <option key={person._id} value={person._id}>
                                {person.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            disabled={converting === row._id}
                            onClick={() => void assign(row)}
                          >
                            Assign job
                          </Button>
                        </div>
                      ) : row.serviceId ? (
                        <Button size="sm" className="h-8 text-xs" onClick={() => openJob(row)}>
                          Open job
                        </Button>
                      ) : (
                        <p className="text-xs text-muted-foreground">Waiting for lead to assign</p>
                      )}
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
                <p className="text-[11px] text-muted-foreground">{assignedName(row)}</p>
                {lead && !row.serviceId ? (
                  <div className="space-y-2">
                    <select
                      className="h-9 w-full rounded-md border bg-white px-2 text-sm"
                      value={pick[row._id] || ""}
                      onChange={(event) =>
                        setPick((prev) => ({ ...prev, [row._id]: event.target.value }))
                      }
                    >
                      <option value="">Assign engineer</option>
                      {engineers.map((person) => (
                        <option key={person._id} value={person._id}>
                          {person.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      className="h-8 w-full text-xs"
                      disabled={converting === row._id}
                      onClick={() => void assign(row)}
                    >
                      Assign job
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : row.serviceId ? (
                  <Button size="sm" className="h-8 w-full text-xs" onClick={() => openJob(row)}>
                    Open job
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">Waiting for the lead to assign this job.</p>
                )}
              </MobileCard>
            ))
          )}
        </MobileCardList>
      </div>
    </EngineerPage>
  )
}
