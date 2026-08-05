"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getToken } from "@/lib/auth"
import { API_URL } from "@/lib/apiBase"
import { ArrowLeft } from "lucide-react"

interface UserOption {
  _id: string
  firstName?: string
  lastName?: string
  email?: string
  role?: string
}

export default function NewVehiclePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState<UserOption[]>([])
  const [form, setForm] = useState({
    registrationNumber: "",
    make: "",
    model: "",
    year: "",
    color: "",
    vin: "",
    trackerImei: "",
    trackerSimNumber: "",
    trackerProvider: "",
    assignedDriverId: "",
    odometerKm: "",
    insuranceExpiry: "",
    nextServiceDue: "",
    notes: "",
  })

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${getToken()}`,
      "Content-Type": "application/json",
    }),
    [],
  )

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users`, { headers })
        const json = await res.json()
        setUsers(json.data || [])
      } catch (error) {
        console.error(error)
      }
    }
    loadUsers()
  }, [headers])

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.registrationNumber.trim()) {
      toast({ description: "Registration number is required", variant: "destructive" })
      return
    }

    try {
      setSaving(true)
      const payload = {
        registrationNumber: form.registrationNumber.trim(),
        make: form.make || undefined,
        vehicleModel: form.model || undefined,
        year: form.year ? Number(form.year) : undefined,
        color: form.color || undefined,
        vin: form.vin || undefined,
        trackerImei: form.trackerImei || undefined,
        trackerSimNumber: form.trackerSimNumber || undefined,
        trackerProvider: form.trackerProvider || undefined,
        assignedDriverId: form.assignedDriverId || undefined,
        odometerKm: form.odometerKm ? Number(form.odometerKm) : undefined,
        insuranceExpiry: form.insuranceExpiry || undefined,
        nextServiceDue: form.nextServiceDue || undefined,
        notes: form.notes || undefined,
      }

      const res = await fetch(`${API_URL}/api/vehicles`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Failed to create vehicle")

      toast({ description: "Vehicle registered successfully" })
      router.push(`/admin/fleet/vehicles/${json.data._id}`)
    } catch (error) {
      toast({
        description: error instanceof Error ? error.message : "Failed to create vehicle",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Button variant="ghost" asChild className="px-0">
        <Link href="/admin/fleet">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to fleet
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-semibold">Register vehicle</h1>
        <p className="text-sm text-muted-foreground">
          Store registration, GPS tracker IMEI, SIM number, and assigned driver.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="registrationNumber">Registration number *</Label>
              <Input
                id="registrationNumber"
                placeholder="KDM 123A"
                value={form.registrationNumber}
                onChange={(e) => update("registrationNumber", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="make">Make</Label>
              <Input id="make" value={form.make} onChange={(e) => update("make", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={form.model} onChange={(e) => update("model", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={form.year}
                onChange={(e) => update("year", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" value={form.color} onChange={(e) => update("color", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="vin">VIN</Label>
              <Input id="vin" value={form.vin} onChange={(e) => update("vin", e.target.value)} />
            </div>

            <div className="space-y-2 sm:col-span-2 border-t pt-4">
              <h3 className="font-medium">GPS tracker</h3>
              <p className="text-xs text-muted-foreground">
                Dedicated tracker with SIM — not a bare phone number without GPS hardware.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trackerImei">Tracker IMEI</Label>
              <Input
                id="trackerImei"
                placeholder="Device IMEI"
                value={form.trackerImei}
                onChange={(e) => update("trackerImei", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trackerSimNumber">Tracker SIM number</Label>
              <Input
                id="trackerSimNumber"
                placeholder="+2547..."
                value={form.trackerSimNumber}
                onChange={(e) => update("trackerSimNumber", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="trackerProvider">Provider</Label>
              <Input
                id="trackerProvider"
                placeholder="Teltonika, Concox, Queclink, SinoTrack..."
                value={form.trackerProvider}
                onChange={(e) => update("trackerProvider", e.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="assignedDriverId">Assigned driver</Label>
              <select
                id="assignedDriverId"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={form.assignedDriverId}
                onChange={(e) => update("assignedDriverId", e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {`${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email} (
                    {user.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="odometerKm">Odometer (km)</Label>
              <Input
                id="odometerKm"
                type="number"
                value={form.odometerKm}
                onChange={(e) => update("odometerKm", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="insuranceExpiry">Insurance expiry</Label>
              <Input
                id="insuranceExpiry"
                type="date"
                value={form.insuranceExpiry}
                onChange={(e) => update("insuranceExpiry", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nextServiceDue">Next service due</Label>
              <Input
                id="nextServiceDue"
                type="date"
                value={form.nextServiceDue}
                onChange={(e) => update("nextServiceDue", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/fleet">Cancel</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Register vehicle"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
