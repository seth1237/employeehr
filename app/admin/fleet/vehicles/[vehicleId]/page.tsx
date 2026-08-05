"use client"

import { useEffect, useMemo, useState } from "react"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { getToken } from "@/lib/auth"
import { API_URL } from "@/lib/apiBase"
import { ArrowLeft, MapPin } from "lucide-react"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import dynamic from "next/dynamic"

const VehicleMap = dynamic(() => import("@/components/fleet/vehicle-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[300px] w-full items-center justify-center rounded-md border bg-muted animate-pulse">
      <span className="text-muted-foreground">Loading map...</span>
    </div>
  ),
})

export default function VehicleDetailPage() {
  const params = useParams() as { vehicleId: string }
  const vehicleId = String(params.vehicleId || "")
  const { toast } = useToast()
  const [vehicle, setVehicle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)
  const [telemetry, setTelemetry] = useState({
    latitude: "",
    longitude: "",
    speedKmh: "",
    ignition: "unknown",
    address: "",
  })

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    }),
    [],
  )

  const loadVehicle = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const res = await fetch(`${API_URL}/api/vehicles/${vehicleId}`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Failed to load vehicle")
      setVehicle(json.data)
      if (json.data?.currentLocation) {
        setTelemetry((prev) => ({
          ...prev,
          latitude: String(json.data.currentLocation.latitude),
          longitude: String(json.data.currentLocation.longitude),
          speedKmh: String(json.data.currentLocation.speedKmh ?? ""),
          address: json.data.currentLocation.address || "",
          ignition: json.data.ignition || "unknown",
        }))
      }
    } catch (error) {
      toast({
        description: error instanceof Error ? error.message : "Failed to load vehicle",
        variant: "destructive",
      })
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  useEffect(() => {
    if (vehicleId) loadVehicle()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId])

  const pushTelemetry = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSavingLocation(true)
      const res = await fetch(`${API_URL}/api/vehicles/${vehicleId}/location`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          latitude: Number(telemetry.latitude),
          longitude: Number(telemetry.longitude),
          speedKmh: telemetry.speedKmh ? Number(telemetry.speedKmh) : 0,
          ignition: telemetry.ignition,
          address: telemetry.address || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Failed to update location")
      toast({ description: "Location updated" })
      await loadVehicle({ silent: true })
    } catch (error) {
      toast({
        description: error instanceof Error ? error.message : "Failed to update location",
        variant: "destructive",
      })
    } finally {
      setSavingLocation(false)
    }
  }

  const acknowledge = async (alertId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/vehicles/alerts/${alertId}/acknowledge`, {
        method: "POST",
        headers,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Failed to acknowledge")
      await loadVehicle({ silent: true })
    } catch (error) {
      toast({
        description: error instanceof Error ? error.message : "Failed to acknowledge alert",
        variant: "destructive",
      })
    }
  }

  if (loading && !vehicle) {
    return <PageLoadingSkeleton title="Loading vehicle" rows={4} />
  }

  if (!vehicle) {
    return <div className="p-6 text-muted-foreground">Vehicle not found</div>
  }

  return (
    <div className="space-y-6 p-6">
      <Button variant="ghost" asChild className="px-0">
        <Link href="/admin/fleet">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to fleet
        </Link>
      </Button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{vehicle.registrationNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {[vehicle.make, vehicle.vehicleModel || vehicle.model, vehicle.year].filter(Boolean).join(" ") || "Vehicle"}
          </p>
        </div>
        <Badge>{vehicle.status}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Live status
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs text-muted-foreground">Location</div>
              <div className="font-medium">
                {vehicle.currentLocation?.address ||
                  (vehicle.currentLocation
                    ? `${vehicle.currentLocation.latitude}, ${vehicle.currentLocation.longitude}`
                    : "No location yet")}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Speed</div>
              <div className="font-medium">
                {Number(vehicle.currentLocation?.speedKmh || 0).toFixed(0)} km/h
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Ignition</div>
              <div className="font-medium capitalize">{vehicle.ignition}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Last seen</div>
              <div className="font-medium">
                {vehicle.lastSeenAt ? new Date(vehicle.lastSeenAt).toLocaleString() : "Never"}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Driver</div>
              <div className="font-medium">{vehicle.assignedDriverName || "Unassigned"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Odometer</div>
              <div className="font-medium">{Number(vehicle.odometerKm || 0).toLocaleString()} km</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tracker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">IMEI: </span>
              {vehicle.trackerImei || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">SIM: </span>
              {vehicle.trackerSimNumber || "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Provider: </span>
              {vehicle.trackerProvider || "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {vehicle.currentLocation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Map View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VehicleMap
              latitude={vehicle.currentLocation.latitude}
              longitude={vehicle.currentLocation.longitude}
              registrationNumber={vehicle.registrationNumber}
              status={vehicle.status}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Manual telemetry (test / ops)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={pushTelemetry} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1">
              <Label>Latitude</Label>
              <Input
                value={telemetry.latitude}
                onChange={(e) => setTelemetry({ ...telemetry, latitude: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Longitude</Label>
              <Input
                value={telemetry.longitude}
                onChange={(e) => setTelemetry({ ...telemetry, longitude: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Speed (km/h)</Label>
              <Input
                value={telemetry.speedKmh}
                onChange={(e) => setTelemetry({ ...telemetry, speedKmh: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Ignition</Label>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={telemetry.ignition}
                onChange={(e) => setTelemetry({ ...telemetry, ignition: e.target.value })}
              >
                <option value="unknown">Unknown</option>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-5">
              <Label>Address</Label>
              <Input
                value={telemetry.address}
                onChange={(e) => setTelemetry({ ...telemetry, address: e.target.value })}
                placeholder="Thika Road, Nairobi"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-5">
              <Button type="submit" disabled={savingLocation}>
                {savingLocation ? "Updating..." : "Push location update"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent trips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(vehicle.trips || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No trips yet.</p>
            ) : (
              vehicle.trips.map((trip: any) => (
                <div key={trip._id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium capitalize">{trip.status.replace("_", " ")}</span>
                    <span className="text-xs text-muted-foreground">
                      max {Number(trip.maxSpeedKmh || 0).toFixed(0)} km/h
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(trip.startedAt).toLocaleString()}
                    {trip.endedAt ? ` → ${new Date(trip.endedAt).toLocaleString()}` : " (open)"}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(vehicle.alerts || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts.</p>
            ) : (
              vehicle.alerts.map((alert: any) => (
                <div key={alert._id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium">{alert.title}</div>
                      <div className="text-muted-foreground">{alert.message}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button size="sm" variant="outline" onClick={() => acknowledge(alert._id)}>
                        Ack
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
