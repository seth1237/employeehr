"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { getToken } from "@/lib/auth"
import { Calendar, Car, MapPin, Clock, CheckCircle, XCircle } from "lucide-react"
import API_URL from "@/lib/apiBase"


type ResourceType = "desk" | "car" | "meeting_room" | "parking" | "equipment"

interface Booking {
  _id: string
  resource_id: string
  resource_name: string
  resource_type: ResourceType
  start_date: string
  end_date: string
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled"
  purpose?: string
}

export default function ResourceBookingPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    resource_type: "desk" as ResourceType,
    resource_name: "",
    start_date: "",
    end_date: "",
    purpose: "",
  })

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setBookings(data.data)
      }
    } catch (error) {
      console.error("Error fetching bookings:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (data.success) {
        setBookings([data.data, ...bookings])
        setDialogOpen(false)
        setFormData({
          resource_type: "desk",
          resource_name: "",
          start_date: "",
          end_date: "",
          purpose: "",
        })
      }
    } catch (error) {
      console.error("Error creating booking:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-gray-100 text-gray-800",
    }
    return variants[status] || "bg-gray-100 text-gray-800"
  }

  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case "car":
        return <Car className="h-5 w-5" />
      case "desk":
        return <MapPin className="h-5 w-5" />
      default:
        return <Calendar className="h-5 w-5" />
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Resource Booking</h1>
          <p className="text-muted-foreground mt-1">
            Book desks, cars, meeting rooms, and other office resources
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>New Booking</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Booking</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Resource Type</Label>
                <Select
                  value={formData.resource_type}
                  onValueChange={(value: ResourceType) =>
                    setFormData({ ...formData, resource_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desk">Desk</SelectItem>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="meeting_room">Meeting Room</SelectItem>
                    <SelectItem value="parking">Parking Spot</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resource Name/ID</Label>
                <Input
                  value={formData.resource_name}
                  onChange={(e) => setFormData({ ...formData, resource_name: e.target.value })}
                  placeholder="e.g., Desk A1, Car #3"
                  required
                />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Purpose</Label>
                <Textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="What will you use this resource for?"
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Creating..." : "Create Booking"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {bookings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No bookings yet. Create your first booking!</p>
          </Card>
        ) : (
          bookings.map((booking) => (
            <Card key={booking._id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    {getResourceIcon(booking.resource_type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg capitalize">
                      {booking.resource_type.replace("_", " ")} - {booking.resource_name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          {new Date(booking.start_date).toLocaleDateString()} -{" "}
                          {new Date(booking.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {booking.purpose && (
                      <p className="mt-2 text-sm text-muted-foreground">{booking.purpose}</p>
                    )}
                  </div>
                </div>
                <Badge className={getStatusBadge(booking.status)}>{booking.status}</Badge>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
