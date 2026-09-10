"use client"

import { useState, useEffect } from "react"
import { stockApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DesktopTableShell } from "@/components/admin/ui/mobile-list"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUser } from "@/lib/auth"

export default function PendingServicesPage() {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<any[]>([])
  const user = getUser()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    stockApi.getMachineServices()
      .then(res => { if (res.data) setServices(res.data) })
      .finally(() => setLoading(false))
  }

  const handleComplete = async (id: string) => {
    if (!confirm("Mark this service as completed?")) return
    try {
      await stockApi.updateMachineService(id, { completedDate: new Date() })
      loadData()
    } catch (e) {
      alert("Failed to complete service")
    }
  }

  const pending = services.filter(s => !s.completedDate && (s.technicianId === user?._id || !s.technicianId))

  if (loading) return <PageLoadingSkeleton title="Pending Services" />

  return (
    <div className="space-y-4 p-4 md:p-8 animate-in fade-in duration-500 pb-24 md:pb-8">
      <div className="mb-2 md:mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          Pending Services
          <Badge variant="destructive" className="ml-2 font-mono text-xs">{pending.length}</Badge>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Machine services requiring your attention.</p>
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
                  <th className="px-6 py-3">Technician</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {pending.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No pending services.</td></tr>
                )}
                {pending.map((s) => (
                  <tr key={s._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-foreground">
                      {s.machine?.productName || s.machineId}
                      {s.machine?.serialNumber && <span className="block text-xs text-muted-foreground">{s.machine.serialNumber}</span>}
                    </td>
                    <td className="px-6 py-3">{s.serviceType || "General Maintenance"}</td>
                    <td className="px-6 py-3">{s.scheduledDate ? new Date(s.scheduledDate).toLocaleDateString() : "—"}</td>
                    <td className="px-6 py-3">{s.technician || "—"}</td>
                    <td className="px-6 py-3">
                      <Button size="sm" variant="outline" className="h-8 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50" onClick={() => handleComplete(s._id)}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Mark Complete
                      </Button>
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
