"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { getToken } from "@/lib/auth"
import { API_URL } from "@/lib/apiBase"
import {
  Car,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  Gauge,
} from "lucide-react"
import { TableSkeleton } from "@/components/admin/ui/page-states"

interface FleetStats {
  total: number
  moving: number
  idle: number
  offline: number
  maintenance: number
  unacknowledgedAlerts: number
}

interface Vehicle {
  _id: string
  registrationNumber: string
  make?: string
  model?: string
  vehicleModel?: string
  year?: number
  color?: string
  vin?: string
  trackerImei?: string
  trackerSimNumber?: string
  assignedDriverName?: string
  status: string
  ignition: string
  currentLocation?: {
    latitude: number
    longitude: number
    address?: string
    speedKmh?: number
    recordedAt: string
  }
  lastSeenAt?: string
  isActive: boolean
}

const statusColor: Record<string, string> = {
  moving: "bg-emerald-100 text-emerald-800",
  idle: "bg-amber-100 text-amber-800",
  parked: "bg-sky-100 text-sky-800",
  offline: "bg-slate-100 text-slate-700",
  maintenance: "bg-rose-100 text-rose-800",
}

export default function FleetVehiclesPage() {
  const { toast } = useToast()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [stats, setStats] = useState<FleetStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const initialLoadDone = useRef(false)

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    }),
    [],
  )

  const loadData = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (statusFilter) params.set("status", statusFilter)
      params.set("active", "true")

      const [vehiclesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/vehicles?${params.toString()}`, { headers }),
        fetch(`${API_URL}/api/vehicles/stats`, { headers }),
      ])

      const vehiclesJson = await vehiclesRes.json()
      const statsJson = await statsRes.json()

      if (!vehiclesRes.ok) throw new Error(vehiclesJson.message || "Failed to load vehicles")
      if (!statsRes.ok) throw new Error(statsJson.message || "Failed to load stats")

      setVehicles(vehiclesJson.data || [])
      setStats(statsJson.data || null)
    } catch (error) {
      console.error(error)
      toast({
        description: error instanceof Error ? error.message : "Failed to load fleet",
        variant: "destructive",
      })
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  useEffect(() => {
    loadData()
    initialLoadDone.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fleet Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Register vehicles with IMEI and SIM, assign drivers, and monitor live status.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => loadData({ silent: initialLoadDone.current })}
            disabled={loading || refreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button asChild>
            <Link href="/admin/fleet/vehicles/new">
              <Plus className="mr-2 h-4 w-4" />
              Add vehicle
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total", value: stats?.total, icon: Car },
          { label: "Moving", value: stats?.moving, icon: Gauge },
          { label: "Idle", value: stats?.idle, icon: MapPin },
          { label: "Offline", value: stats?.offline, icon: Car },
          { label: "Maintenance", value: stats?.maintenance, icon: Car },
          { label: "Open alerts", value: stats?.unacknowledgedAlerts, icon: AlertTriangle },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
              <item.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{item.value ?? "—"}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search registration, IMEI, SIM, driver..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && loadData({ silent: initialLoadDone.current })
              }
            />
          </div>
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="moving">Moving</option>
            <option value="idle">Idle</option>
            <option value="parked">Parked</option>
            <option value="offline">Offline</option>
            <option value="maintenance">Maintenance</option>
          </select>
          <Button onClick={() => loadData({ silent: initialLoadDone.current })}>Search</Button>
        </CardContent>
      </Card>

      {loading && vehicles.length === 0 ? (
        <TableSkeleton rows={8} />
      ) : (
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Tracker</th>
              <th className="px-4 py-3 font-medium">Driver</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No vehicles yet. Add a vehicle with registration, IMEI, and SIM number.
                </td>
              </tr>
            ) : (
              vehicles.map((vehicle) => (
                <tr key={vehicle._id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/fleet/vehicles/${vehicle._id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {vehicle.registrationNumber}
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {[vehicle.make, vehicle.vehicleModel || vehicle.model].filter(Boolean).join(" ") || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">IMEI: {vehicle.trackerImei || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      SIM: {vehicle.trackerSimNumber || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">{vehicle.assignedDriverName || "Unassigned"}</td>
                  <td className="px-4 py-3">
                    <Badge className={statusColor[vehicle.status] || statusColor.offline}>
                      {vehicle.status}
                    </Badge>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Ignition: {vehicle.ignition}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {vehicle.currentLocation ? (
                      <>
                        <div>
                          {vehicle.currentLocation.address ||
                            `${vehicle.currentLocation.latitude.toFixed(4)}, ${vehicle.currentLocation.longitude.toFixed(4)}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Number(vehicle.currentLocation.speedKmh || 0).toFixed(0)} km/h
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {vehicle.lastSeenAt
                      ? new Date(vehicle.lastSeenAt).toLocaleString()
                      : "Never"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}
