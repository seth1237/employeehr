"use client"

import { useState, useEffect } from "react"
import { stockApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { DesktopTableShell } from "@/components/admin/ui/mobile-list"

export default function MachineDatabasePage() {
  const [loading, setLoading] = useState(true)
  const [machines, setMachines] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    stockApi.getInstalledMachines()
      .then(res => { if (res.data) setMachines(res.data) })
      .finally(() => setLoading(false))
  }, [])

  const filtered = machines.filter(m => 
    m.productName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <PageLoadingSkeleton title="Machine Database" />

  return (
    <div className="space-y-4 p-4 md:p-8 animate-in fade-in duration-500 pb-24 md:pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2 md:mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Machine Database
            <Badge variant="secondary" className="ml-2 font-mono text-xs">{filtered.length}</Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">View all installed client machines.</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search machines..."
            className="pl-9 h-9 w-full bg-background"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <DesktopTableShell>
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground uppercase tracking-wider text-[11px] font-medium">
                <tr>
                  <th className="px-6 py-3">Machine</th>
                  <th className="px-6 py-3">Serial No</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {filtered.map((m) => (
                  <tr key={m._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-foreground">{m.productName}</td>
                    <td className="px-6 py-3 font-mono">{m.serialNumber || "—"}</td>
                    <td className="px-6 py-3">{m.client?.name || "—"}</td>
                    <td className="px-6 py-3">{m.installationLocation || m.client?.location || "—"}</td>
                    <td className="px-6 py-3">
                      <Badge variant={m.status === 'active' ? 'default' : 'secondary'}>{m.status}</Badge>
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
