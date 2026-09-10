"use client"
import { useState, useEffect } from "react"
import { stockApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent } from "@/components/ui/card"
import { DesktopTableShell } from "@/components/admin/ui/mobile-list"
import { getUser } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"

export default function DutiesPage() {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<any[]>([])
  const user = getUser()

  useEffect(() => {
    stockApi.getMachineServices()
      .then(res => { if (res.data) setServices(res.data) })
      .finally(() => setLoading(false))
  }, [])

  const myDuties = services.filter(s => s.technicianId === user?._id)

  if (loading) return <PageLoadingSkeleton title="Assigned Duties" />

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Assigned Duties</h1>
        <p className="text-muted-foreground text-sm">View all your duties (installations, services).</p>
      </div>
      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <DesktopTableShell>
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider text-[11px] font-medium">
                <tr>
                  <th className="px-6 py-3">Machine ID</th>
                  <th className="px-6 py-3">Service Type</th>
                  <th className="px-6 py-3">Scheduled Date</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {myDuties.length === 0 && (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No active duties currently assigned.</td></tr>
                )}
                {myDuties.map((s) => (
                  <tr key={s._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-foreground">
                      {s.machine?.productName || s.machineId}
                      {s.machine?.serialNumber && <span className="block text-xs text-muted-foreground">{s.machine.serialNumber}</span>}
                    </td>
                    <td className="px-6 py-3">{s.serviceType || "General Maintenance"}</td>
                    <td className="px-6 py-3">{s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-3">
                      {s.completedDate ? (
                        <Badge variant="secondary">Completed</Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DesktopTableShell>
        </CardContent>
      </Card>
    </div>
  )
}
