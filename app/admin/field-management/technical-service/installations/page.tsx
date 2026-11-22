"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RefreshCw } from "lucide-react"
import {
  DesktopTableShell,
  MobileCard,
  MobileCardList,
  TechnicalServiceHeader,
  TechnicalServicePage,
} from "@/components/admin/technical-service-ui"

export default function TechnicalServiceInstallationsPage() {
  const [loading, setLoading] = useState(true)
  const [engineerId, setEngineerId] = useState("")
  const [data, setData] = useState<any>(null)

  const load = () => {
    setLoading(true)
    engineeringApi
      .getReport({ engineerId: engineerId || undefined })
      .then((res) => setData(res.data || res))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (loading && !data) return <PageLoadingSkeleton title="Pending installations" />

  const engineers = data?.engineers || []
  const rows = data?.pendingInstallations || []

  return (
    <TechnicalServicePage>
      <TechnicalServiceHeader
        title="Pending installations"
        description="Machines waiting to be installed. Open a row to see the asset record."
      />
      <div className="flex flex-wrap items-end gap-3">
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
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <DesktopTableShell>
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Assigned</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    No pending installations.
                  </td>
                </tr>
              ) : (
                rows.map((machine: any) => (
                  <tr key={machine._id} className="border-t">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clients/installed-machines?machineId=${machine._id}`}
                        className="font-medium hover:underline"
                      >
                        {machine.productName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{machine.client?.name || "—"}</td>
                    <td className="px-4 py-3">{machine.installedBy || "Unassigned"}</td>
                    <td className="px-4 py-3">
                      {machine.installationDate
                        ? new Date(machine.installationDate).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </DesktopTableShell>
        <MobileCardList label="Pending installations">
          {rows.map((machine: any) => (
            <MobileCard key={machine._id}>
              <Link href={`/admin/clients/installed-machines?machineId=${machine._id}`} className="block">
                <p className="font-medium">{machine.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {machine.client?.name || "No client"} · {machine.installedBy || "Unassigned"}
                </p>
              </Link>
            </MobileCard>
          ))}
        </MobileCardList>
      </div>
    </TechnicalServicePage>
  )
}
