"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, RefreshCw } from "lucide-react"
import {
  DesktopTableShell,
  MobileCard,
  MobileCardList,
  StatusBadge,
  TechnicalServiceHeader,
  TechnicalServicePage,
  downloadCsv,
  monthStart,
  todayIso,
  whenLabel,
} from "@/components/admin/technical-service-ui"

export default function TechnicalServiceActivityPage() {
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(todayIso)
  const [engineerId, setEngineerId] = useState("")
  const [data, setData] = useState<any>(null)

  const load = () => {
    setLoading(true)
    engineeringApi
      .getReport({ from, to, engineerId: engineerId || undefined, limit: 200 })
      .then((res) => setData(res.data || res))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const exportData = async () => {
    setExporting(true)
    try {
      const res = await engineeringApi.exportReport({
        from,
        to,
        engineerId: engineerId || undefined,
      })
      const payload = res.data || res
      const engineerName = String(payload.engineerName || "all-engineers").replace(/\s+/g, "-").toLowerCase()
      downloadCsv(
        `technical-service-activity-${engineerName}-${from}_to_${to}.csv`,
        ["WO", "Type", "Job", "Status", "Engineer", "Machine", "Client", "Started", "Completed", "Job cost"],
        (payload.jobs || []).map((row: any) => [
          row.woNumber,
          row.type,
          row.serviceType,
          row.status,
          row.engineer,
          row.machine,
          row.client,
          whenLabel(row.startedAt),
          whenLabel(row.completedDate),
          row.cost,
        ]),
      )
    } catch (error) {
      console.error(error)
      window.alert("Could not export this period.")
    } finally {
      setExporting(false)
    }
  }

  if (loading && !data) return <PageLoadingSkeleton title="Recent activity" />

  const engineers = data?.engineers || []
  const rows = data?.activity || []

  return (
    <TechnicalServicePage>
      <TechnicalServiceHeader
        title="Recent activity"
        description="Work started and completed in the selected period. Open a machine to see the asset."
      />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label>From</Label>
          <Input type="date" className="mt-1 w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label>To</Label>
          <Input type="date" className="mt-1 w-40" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <Label>Engineer</Label>
          <select
            className="mt-1 h-9 rounded-md border px-3 text-sm"
            value={engineerId}
            onChange={(e) => setEngineerId(e.target.value)}
          >
            <option value="">All engineers</option>
            {engineers.map((engineer: any) => (
              <option key={engineer._id} value={engineer._id}>
                {engineer.name}
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={() => load()} disabled={loading}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Apply
        </Button>
        <Button size="sm" variant="outline" onClick={() => void exportData()} disabled={exporting}>
          <Download className="mr-1.5 h-4 w-4" />
          Export period
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <DesktopTableShell>
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Engineer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Started</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    No work orders in this period.
                  </td>
                </tr>
              ) : (
                rows.map((row: any) => (
                  <tr key={row._id} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.woNumber || row.serviceType || "Work order"}</p>
                      <p className="text-xs capitalize text-muted-foreground">{row.type}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.machine?._id ? (
                        <Link
                          href={`/admin/clients/installed-machines?machineId=${row.machine._id}`}
                          className="hover:underline"
                        >
                          {row.machine.productName || "Machine"}
                        </Link>
                      ) : (
                        "—"
                      )}
                      <p className="text-xs text-muted-foreground">{row.machine?.client?.name || ""}</p>
                    </td>
                    <td className="px-4 py-3">{row.technician || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-3">{whenLabel(row.startedAt)}</td>
                    <td className="px-4 py-3">{whenLabel(row.completedDate)}</td>
                    <td className="px-4 py-3">{Number(row.cost || 0).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DesktopTableShell>
        <MobileCardList label="Recent activity">
          {rows.map((row: any) => (
            <MobileCard key={row._id}>
              <p className="font-medium">{row.woNumber || row.serviceType || "Work order"}</p>
              {row.machine?._id ? (
                <Link
                  href={`/admin/clients/installed-machines?machineId=${row.machine._id}`}
                  className="text-sm hover:underline"
                >
                  {row.machine.productName || "Machine"}
                </Link>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {row.technician || "Unassigned"} · {String(row.status || "open").replace("_", " ")}
                {row.startedAt ? ` · started ${whenLabel(row.startedAt)}` : ""}
              </p>
            </MobileCard>
          ))}
        </MobileCardList>
      </div>
    </TechnicalServicePage>
  )
}
