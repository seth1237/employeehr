"use client"

import { useEffect, useState } from "react"
import { stockApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Wrench, Briefcase, Plus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function EngineerDashboard() {
  const [loading, setLoading] = useState(true)
  const [machines, setMachines] = useState([])
  const [services, setServices] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [macRes, srvRes] = await Promise.all([
        stockApi.getInstalledMachines(),
        stockApi.getMachineServices()
      ])
      if (macRes.data) setMachines(macRes.data)
      if (srvRes.data) setServices(srvRes.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Engineer Dashboard" />

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Engineer Dashboard</h1>
        <p className="text-muted-foreground text-sm">Welcome to your technical service portal.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Installed Machines</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{machines.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Services</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.filter((s:any) => !s.completedDate).length}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
