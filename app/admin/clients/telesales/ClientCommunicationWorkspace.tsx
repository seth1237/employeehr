"use client"

import { useEffect, useMemo, useState } from "react"
import { api, stockApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

const roomTemplates = [
  "Telesales",
  "Customer Support",
  "Product Follow-up",
  "Quotations",
  "Technical Support",
  "After Sales",
  "Marketing Campaigns",
  "Complaints & Feedback",
  "VIP Clients",
]

const eventTemplates = [
  "Health Expo",
  "Medical Camp",
  "Product Launch",
  "CME Training",
  "Hospital Visit",
  "Trade Fair",
]

const clientCategories = ["Hospital", "Clinic", "Pharmacy", "NGO", "Government", "Private Practice"]
const quotationStatuses = ["Interested", "Follow-up Needed", "Closed", "Pending", "Converted to Sale"]
const walkInUrgency = ["High", "Medium", "Low"]
const walkInReasons = ["Price", "Budget", "Waiting Approval", "Comparing Options", "No Stock", "Other"]

function fmtDate(value?: string | Date) {
  if (!value) return "—"
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString()
}

function brandColor() {
  return "var(--brand-primary)"
}

export default function ClientCommunicationWorkspace({ docText }: { docText: string }) {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null)
  const [quotations, setQuotations] = useState<any[]>([])
  const [followUps, setFollowUps] = useState<any[]>([])
  const [quotationNote, setQuotationNote] = useState("")

  const [selectedRoom, setSelectedRoom] = useState(roomTemplates[3])
  const [roomNote, setRoomNote] = useState("")
  const [roomAssignedTo, setRoomAssignedTo] = useState("")
  const [roomFollowUpDate, setRoomFollowUpDate] = useState("")
  const [roomStatus, setRoomStatus] = useState("Follow-up Needed")
  const [roomDocName, setRoomDocName] = useState("")

  const [eventForm, setEventForm] = useState({
    eventName: "Health Expo 2026",
    eventType: "Exhibition",
    venue: "Main Hall",
    eventDate: "",
    organizer: "",
    status: "Upcoming",
  })
  const [eventClientForm, setEventClientForm] = useState({
    companyName: "",
    interest: "",
    contactPerson: "",
    phone: "",
    email: "",
    followUpDate: "",
    clientStatus: "Interested",
    notes: "",
  })
  const [eventClients, setEventClients] = useState<any[]>([
    {
      companyName: "Accord Hospital",
      interest: "Diagnostic equipment",
      contactPerson: "Dr. M. Akinyi",
      phone: "+254700000000",
      email: "procurement@accord.example",
      followUpDate: "2026-05-18",
      clientStatus: "Interested",
      notes: "Requested proposal and demo.",
    },
  ])

  const [walkInForm, setWalkInForm] = useState({
    clientName: "",
    companyFacility: "",
    phone: "",
    email: "",
    productInterestedIn: "",
    budgetRange: "",
    urgency: "High",
    intendedPurchaseDate: "",
    reasonForNotBuying: "",
    followUpNeeded: true,
    assignedSalesPerson: "",
    notes: "",
  })
  const [walkIns, setWalkIns] = useState<any[]>([
    {
      clientName: "Sarah Ouma",
      companyFacility: "City Clinic",
      phone: "+254711111111",
      email: "",
      productInterestedIn: "Ultrasound machine",
      budgetRange: "KES 450k - 650k",
      urgency: "High",
      intendedPurchaseDate: "2026-05-20",
      reasonForNotBuying: "Waiting Approval",
      followUpNeeded: true,
      assignedSalesPerson: "Daniel",
      notes: "Needs quote and financing options.",
    },
  ])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [usersRes, quotationsRes] = await Promise.all([
          api.users.getAll(),
          stockApi.getQuotations(),
        ])
        setUsers((usersRes.data || []) as any[])
        const docs = quotationsRes.data || []
        const oneWeek = Date.now() - 7 * 24 * 60 * 60 * 1000
        setQuotations(
          docs.filter((q: any) => {
            const created = new Date(q.createdAt || q._id || Date.now()).getTime()
            return created <= oneWeek && (q.status === "pending_approval" || q.status === "draft")
          }),
        )
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!selectedQuotation && quotations.length > 0) {
      setSelectedQuotation(quotations[0])
    }
  }, [quotations, selectedQuotation])

  useEffect(() => {
    const loadFollowUps = async () => {
      if (!selectedQuotation) return
      try {
        const res = await stockApi.getQuotationFollowUps(selectedQuotation._id)
        setFollowUps(res.data || [])
      } catch (error) {
        console.error(error)
      }
    }
    loadFollowUps()
  }, [selectedQuotation])

  const staffMembers = useMemo(() => {
    return users
      .filter((user) => ["company_admin", "hr", "manager"].includes(user.role))
      .map((user) => ({
        id: user._id,
        name: `${user.first_name || user.firstName || ""} ${user.last_name || user.lastName || ""}`.trim() || user.email,
      }))
  }, [users])

  const analytics = useMemo(() => {
    const walkInsTotal = walkIns.length
    const interestedWalkIns = walkIns.filter((item) => item.followUpNeeded).length
    const conversions = quotations.filter((q) => q.status === "converted").length
    const upcomingFollowUps = [...walkIns.filter((item) => item.followUpNeeded), ...eventClients.filter((item) => item.followUpDate)].length
    return [
      { label: "Total walk-in clients", value: walkInsTotal },
      { label: "Upcoming follow-ups", value: upcomingFollowUps },
      { label: "Converted quotations", value: conversions },
      { label: "Active rooms", value: roomTemplates.length },
      { label: "Event clients", value: eventClients.length },
      { label: "Needs follow-up", value: interestedWalkIns },
    ]
  }, [walkIns, eventClients, quotations.length])

  const saveRoomConversation = async () => {
    if (!roomNote.trim()) return alert("Add a note for this conversation")
    setSaving(true)
    try {
      await api.crm.createConversation({
        roomName: selectedRoom,
        note: roomNote,
        assignedTo: roomAssignedTo || undefined,
        followUpDate: roomFollowUpDate || undefined,
        status: roomStatus,
        documentName: roomDocName || undefined,
        quotation_id: selectedQuotation?._id || undefined
      })
      alert(`Saved conversation in ${selectedRoom} room with status ${roomStatus}`)
      setRoomNote("")
      setRoomDocName("")
      setRoomFollowUpDate("")
    } catch (error) {
      console.error(error)
      alert("Failed to save conversation note")
    } finally {
      setSaving(false)
    }
  }

  const saveEventClient = () => {
    if (!eventClientForm.companyName.trim() || !eventClientForm.phone.trim()) {
      alert("Company name and phone are required")
      return
    }
    setEventClients((prev) => [
      { ...eventClientForm },
      ...prev,
    ])
    setEventClientForm({
      companyName: "",
      interest: "",
      contactPerson: "",
      phone: "",
      email: "",
      followUpDate: "",
      clientStatus: "Interested",
      notes: "",
    })
  }

  const saveWalkIn = () => {
    if (!walkInForm.clientName.trim() || !walkInForm.phone.trim()) {
      alert("Client name and phone are required")
      return
    }
    setWalkIns((prev) => [
      { ...walkInForm },
      ...prev,
    ])
    setWalkInForm({
      clientName: "",
      companyFacility: "",
      phone: "",
      email: "",
      productInterestedIn: "",
      budgetRange: "",
      urgency: "High",
      intendedPurchaseDate: "",
      reasonForNotBuying: "",
      followUpNeeded: true,
      assignedSalesPerson: "",
      notes: "",
    })
  }

  const convertQuotation = async (quotationId: string) => {
    if (!confirm("Convert this quotation to an invoice?")) return
    try {
      await stockApi.convertQuotation(quotationId)
      alert("Quotation converted to invoice")
      setQuotations((prev) => prev.filter((q) => q._id !== quotationId))
      if (selectedQuotation?._id === quotationId) setSelectedQuotation(null)
    } catch (error: any) {
      alert(error?.message || "Failed to convert quotation")
    }
  }

  const saveQuotationOutcome = async () => {
    if (!selectedQuotation || !quotationNote.trim()) return
    try {
      await stockApi.addQuotationFollowUp(selectedQuotation._id, { note: quotationNote, callMade: true, outcome: roomStatus })
      const res = await stockApi.getQuotationFollowUps(selectedQuotation._id)
      setFollowUps(res.data || [])
      setQuotationNote("")
    } catch (error: any) {
      alert(error?.message || "Failed to save follow-up")
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading communication workspace" rows={8} />

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-border/70 bg-card p-6 shadow-sm">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border px-3 py-1 text-xs font-medium" style={{ borderColor: `${brandColor()}33`, color: brandColor() }}>
              Independent Client Communication Section
            </div>
            <h1 className="text-3xl font-semibold tracking-tight" style={{ color: brandColor() }}>
              Client Communication Rooms, Events & Walk-in Management
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Manage client conversations, assign staff, set follow-up dates, upload quotations and documents, monitor events, capture walk-in clients, and convert stale quotations older than a week into invoice follow-ups.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {roomTemplates.slice(0, 5).map((room) => (
                <span key={room} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: `${brandColor()}22`, color: brandColor() }}>
                  {room}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card className="border-border/70 bg-card p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {analytics.map((item) => (
              <div key={item.label} className="rounded border p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</div>
                <div className="mt-1 text-2xl font-semibold" style={{ color: brandColor() }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-border/70 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: brandColor() }}>Client Communication Rooms</h2>
              <p className="text-sm text-muted-foreground">Room-based conversation management by purpose.</p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">Rooms: {roomTemplates.length}</span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roomTemplates.map((room) => (
              <button
                key={room}
                onClick={() => setSelectedRoom(room)}
                className={`rounded-lg border p-4 text-left transition ${selectedRoom === room ? "bg-primary/5" : "bg-background hover:bg-muted/40"}`}
                style={{ borderColor: selectedRoom === room ? `${brandColor()}55` : undefined }}
              >
                <div className="font-medium" style={{ color: brandColor() }}>{room}</div>
                <p className="mt-1 text-xs text-muted-foreground">Notes, staff assignment, follow-up, status, and file uploads.</p>
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Conversation note</Label>
              <Textarea value={roomNote} onChange={(e) => setRoomNote(e.target.value)} placeholder="Add note per conversation" />
            </div>
            <div className="space-y-2">
              <Label>Assign staff member</Label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={roomAssignedTo} onChange={(e) => setRoomAssignedTo(e.target.value)}>
                <option value="">Select staff member</option>
                {staffMembers.map((staff) => (
                  <option key={staff.id} value={staff.id}>{staff.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Follow-up date</Label>
              <Input type="date" value={roomFollowUpDate} onChange={(e) => setRoomFollowUpDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={roomStatus} onChange={(e) => setRoomStatus(e.target.value)}>
                {quotationStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Upload quotations/documents</Label>
              <Input value={roomDocName} onChange={(e) => setRoomDocName(e.target.value)} placeholder="File name or document reference" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={saveRoomConversation} disabled={saving}>Save conversation note</Button>
            <Button variant="outline" onClick={() => setRoomNote("")}>Clear</Button>
          </div>
        </Card>

        <Card className="border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold" style={{ color: brandColor() }}>Smart Features</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              "Automatic reminders for follow-ups",
              "WhatsApp quick contact button",
              "Email integration",
              "Export client lists to Excel/PDF",
              "Search & filter clients",
              "Client history tracking",
              "Tag clients by category",
              "Most active sales agent",
            ].map((feature) => (
              <div key={feature} className="rounded-lg border p-3 text-sm text-muted-foreground">
                {feature}
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: brandColor() }}>Create Event</h2>
              <p className="text-sm text-muted-foreground">Health Expo, Medical Camp, Product Launch, CME Training, Hospital Visit, Trade Fair.</p>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: `${brandColor()}33`, color: brandColor() }}>Upcoming / Ongoing / Completed</span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {[
              { label: "Event Name", value: eventForm.eventName, key: "eventName" },
              { label: "Event Type", value: eventForm.eventType, key: "eventType" },
              { label: "Venue", value: eventForm.venue, key: "venue" },
              { label: "Event Date", value: eventForm.eventDate, key: "eventDate", type: "date" },
              { label: "Organizer", value: eventForm.organizer, key: "organizer" },
            ].map((field: any) => (
              <div key={field.label} className="space-y-2">
                <Label>{field.label}</Label>
                <Input
                  type={field.type || "text"}
                  value={field.value}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label>Status</Label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={eventForm.status} onChange={(e) => setEventForm((prev) => ({ ...prev, status: e.target.value }))}>
                {['Upcoming', 'Ongoing', 'Completed'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 rounded-lg border p-4">
            <h3 className="font-medium" style={{ color: brandColor() }}>Exhibitor / Invited Clients</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2"><Label>Company Name</Label><Input value={eventClientForm.companyName} onChange={(e) => setEventClientForm((prev) => ({ ...prev, companyName: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Product/Service of Interest</Label><Input value={eventClientForm.interest} onChange={(e) => setEventClientForm((prev) => ({ ...prev, interest: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Contact Person</Label><Input value={eventClientForm.contactPerson} onChange={(e) => setEventClientForm((prev) => ({ ...prev, contactPerson: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone Number</Label><Input value={eventClientForm.phone} onChange={(e) => setEventClientForm((prev) => ({ ...prev, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input value={eventClientForm.email} onChange={(e) => setEventClientForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Follow-up Date</Label><Input type="date" value={eventClientForm.followUpDate} onChange={(e) => setEventClientForm((prev) => ({ ...prev, followUpDate: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Client Status</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={eventClientForm.clientStatus} onChange={(e) => setEventClientForm((prev) => ({ ...prev, clientStatus: e.target.value }))}>{['Interested','Pending','Not Interested'].map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
              <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea value={eventClientForm.notes} onChange={(e) => setEventClientForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button onClick={saveEventClient}>Add client</Button>
            </div>
          </div>
        </Card>

        <Card className="border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold" style={{ color: brandColor() }}>Walk-in Clients</h2>
          <p className="text-sm text-muted-foreground">Capture office/showroom/booth visitors and next actions.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Client Name</Label><Input value={walkInForm.clientName} onChange={(e) => setWalkInForm((prev) => ({ ...prev, clientName: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Company/Facility</Label><Input value={walkInForm.companyFacility} onChange={(e) => setWalkInForm((prev) => ({ ...prev, companyFacility: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Phone Number</Label><Input value={walkInForm.phone} onChange={(e) => setWalkInForm((prev) => ({ ...prev, phone: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input value={walkInForm.email} onChange={(e) => setWalkInForm((prev) => ({ ...prev, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Product Interested In</Label><Input value={walkInForm.productInterestedIn} onChange={(e) => setWalkInForm((prev) => ({ ...prev, productInterestedIn: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Budget Range</Label><Input value={walkInForm.budgetRange} onChange={(e) => setWalkInForm((prev) => ({ ...prev, budgetRange: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Urgency of Purchase</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={walkInForm.urgency} onChange={(e) => setWalkInForm((prev) => ({ ...prev, urgency: e.target.value }))}>{walkInUrgency.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div className="space-y-2"><Label>Intended Purchase Date</Label><Input type="date" value={walkInForm.intendedPurchaseDate} onChange={(e) => setWalkInForm((prev) => ({ ...prev, intendedPurchaseDate: e.target.value }))} /></div>
            <div className="space-y-2 md:col-span-2"><Label>Reason for Not Buying</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={walkInForm.reasonForNotBuying} onChange={(e) => setWalkInForm((prev) => ({ ...prev, reasonForNotBuying: e.target.value }))}>{walkInReasons.map((reason) => <option key={reason}>{reason}</option>)}</select></div>
            <div className="space-y-2"><Label>Follow-up Needed</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={String(walkInForm.followUpNeeded)} onChange={(e) => setWalkInForm((prev) => ({ ...prev, followUpNeeded: e.target.value === 'true' }))}><option value="true">Yes</option><option value="false">No</option></select></div>
            <div className="space-y-2"><Label>Assigned Sales Person</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={walkInForm.assignedSalesPerson} onChange={(e) => setWalkInForm((prev) => ({ ...prev, assignedSalesPerson: e.target.value }))}><option value="">Select staff member</option>{staffMembers.map((staff) => <option key={staff.id}>{staff.name}</option>)}</select></div>
            <div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea value={walkInForm.notes} onChange={(e) => setWalkInForm((prev) => ({ ...prev, notes: e.target.value }))} /></div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={saveWalkIn}>Save walk-in client</Button>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: brandColor() }}>Analytics Dashboard</h2>
              <p className="text-sm text-muted-foreground">Track conversions, follow-ups, and client activity.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {[
              { label: "Total walk-in clients", value: walkIns.length },
              { label: "Most requested products", value: "Ultrasound machine" },
              { label: "Conversion rate", value: `${quotations.length ? Math.round((quotations.filter((q) => q.status === 'converted').length / quotations.length) * 100) : 0}%` },
              { label: "Lost sales reasons", value: "Waiting Approval" },
              { label: "Upcoming follow-ups", value: eventClients.filter((item) => item.followUpDate || item.clientStatus === 'Interested').length },
              { label: "Most active sales agent", value: staffMembers[0]?.name || '—' },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</div>
                <div className="mt-1 font-medium" style={{ color: brandColor() }}>{item.value}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold" style={{ color: brandColor() }}>Recommended Database Tables</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {[
              'users', 'communication_rooms', 'client_conversations', 'events', 'event_clients', 'walk_in_clients', 'follow_ups', 'products', 'client_feedback', 'sales_status'
            ].map((table) => (
              <div key={table} className="rounded border px-3 py-2 text-sm">{table}</div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border p-4 bg-muted/20">
            <h3 className="font-medium" style={{ color: brandColor() }}>Documentation summary</h3>
            <p className="mt-2 text-sm text-muted-foreground">{docText.split(/\r?\n/).filter(Boolean).slice(0, 10).join(' ')}</p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Card className="border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold" style={{ color: brandColor() }}>Quotation Follow-ups</h2>
          <p className="text-sm text-muted-foreground">Quotations older than a week with no response are listed here for conversion and call follow-up.</p>
          <div className="mt-4 space-y-2 max-h-[26rem] overflow-auto pr-1">
            {quotations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stale quotations found.</p>
            ) : (
              quotations.map((quotation) => (
                <button
                  key={quotation._id}
                  onClick={() => setSelectedQuotation(quotation)}
                  className={`w-full rounded-lg border p-3 text-left transition ${selectedQuotation?._id === quotation._id ? 'bg-primary/5' : 'bg-background hover:bg-muted/40'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{quotation.quotationNumber}</div>
                    <div className="text-xs text-muted-foreground capitalize">{quotation.status}</div>
                  </div>
                  <div className="text-sm">{quotation.client?.name}</div>
                  <div className="text-xs text-muted-foreground">Created: {fmtDate(quotation.createdAt)}</div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="border-border/70 bg-card p-6 shadow-sm">
          {!selectedQuotation ? (
            <p className="text-sm text-muted-foreground">Select a quotation to convert or record a call note.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold" style={{ color: brandColor() }}>{selectedQuotation.quotationNumber}</div>
                    <div className="text-sm text-muted-foreground">{selectedQuotation.client?.name} • {selectedQuotation.client?.number}</div>
                    <div className="text-sm text-muted-foreground">Follow-up status: {selectedQuotation.status}</div>
                  </div>
                  <Button onClick={() => convertQuotation(selectedQuotation._id)}>Convert to invoice</Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label>Call outcome note</Label>
                  <Textarea value={quotationNote} onChange={(e) => setQuotationNote(e.target.value)} placeholder="Write the outcome of the conversation" />
                  <p className="text-xs text-muted-foreground">Document the call outcome after the follow-up.</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setQuotationNote("")}>Clear note</Button>
                <Button onClick={saveQuotationOutcome}>Save call outcome</Button>
              </div>

              <div>
                <h3 className="text-sm font-semibold" style={{ color: brandColor() }}>Recent follow-up notes</h3>
                <div className="mt-3 space-y-2 max-h-60 overflow-auto">
                  {followUps.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No follow-ups recorded yet.</p>
                  ) : (
                    followUps.map((followUp) => (
                      <div key={followUp._id} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-medium">{followUp.callMade ? 'Call made' : 'Follow-up'}</div>
                          <div className="text-xs text-muted-foreground">{fmtDate(followUp.createdAt)}</div>
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">{followUp.note}</div>
                        {followUp.outcome ? <div className="mt-1 text-xs">Outcome: {followUp.outcome}</div> : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold" style={{ color: brandColor() }}>Event Management Section</h2>
          <p className="text-sm text-muted-foreground">Create events and manage exhibitors/invited clients with next communication dates.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {eventTemplates.map((event) => (
              <div key={event} className="rounded-lg border p-3">
                <div className="font-medium">{event}</div>
                <div className="text-xs text-muted-foreground">Upcoming / Ongoing / Completed</div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="border-border/70 bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold" style={{ color: brandColor() }}>Walk-in Clients Section</h2>
          <p className="text-sm text-muted-foreground">Dedicated form for physical visits and conversion tracking.</p>
          <div className="mt-4 max-h-72 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/30 text-left">
                <tr>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Company/Facility</th>
                  <th className="px-3 py-2">Interest</th>
                  <th className="px-3 py-2">Follow-up</th>
                  <th className="px-3 py-2">Sales Person</th>
                </tr>
              </thead>
              <tbody>
                {walkIns.map((client, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-3 py-2">{client.clientName}</td>
                    <td className="px-3 py-2">{client.companyFacility}</td>
                    <td className="px-3 py-2">{client.productInterestedIn}</td>
                    <td className="px-3 py-2">{client.followUpNeeded ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2">{client.assignedSalesPerson || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  )
}
