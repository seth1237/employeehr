"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BookUser,
  ChevronLeft,
  MapPin,
  PhoneCall,
  Plus,
  Search,
  StickyNote,
  X,
  Quote,
  Footprints,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { salesApi } from "@/lib/api"
import { useSalesBranding } from "@/hooks/use-sales-branding"
import { SalesEmpty, SalesHeader } from "@/components/sales/sales-ui"
import { telHref } from "@/components/sales/sales-ui"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const DEFAULT_ROLES = [
  "Doctor",
  "Director",
  "Lab Technician",
  "Nurse",
  "Procurement",
  "Facility Manager",
  "Accountant",
  "Reception",
  "Other",
]

const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo-Marakwet", "Embu", "Garissa",
  "Homa Bay", "Isiolo", "Kajiado", "Kakamega", "Kericho", "Kiambu", "Kilifi",
  "Kirinyaga", "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", "Lamu",
  "Machakos", "Makueni", "Mandera", "Marsabit", "Meru", "Migori", "Mombasa",
  "Murang'a", "Nairobi", "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua",
  "Nyeri", "Samburu", "Siaya", "Taita-Taveta", "Tana River", "Tharaka-Nithi",
  "Trans Nzoia", "Turkana", "Uasin Gishu", "Vihiga", "Wajir", "West Pokot",
]

function formatWhen(value?: string | Date) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleString("en-GB", { 
    day: "2-digit", month: "short", year: "numeric", 
    hour: "2-digit", minute: "2-digit" 
  })
}

export default function SalesClientsPage() {
  const { toast } = useToast()
  const branding = useSalesBranding()
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<"created" | "engaged">("created")
  const [created, setCreated] = useState<any[]>([])
  const [engaged, setEngaged] = useState<any[]>([])
  const [directory, setDirectory] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [book, setBook] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  
  const [form, setForm] = useState({
    name: "",
    number: "",
    location: "",
    contactPerson: "",
    contactPersonRole: "Doctor",
    contactPersonCustomRole: "",
  })
  const [contactRoles, setContactRoles] = useState<string[]>(DEFAULT_ROLES)
  const [countyOptions, setCountyOptions] = useState<string[]>(KENYA_COUNTIES)
  const [callForm, setCallForm] = useState({
    type: "call",
    outcome: "answered",
    purpose: "",
    notes: "",
    followUpDate: "",
  })

  const primaryColor = branding.primaryColor

  const loadBook = useCallback(
    async (search?: string) => {
      try {
        const res = await salesApi.listMyClients(search)
        setCreated(res.data?.created || [])
        setEngaged(res.data?.engaged || [])
      } catch (error: any) {
        toast({ title: "Could not load clients", description: error?.message, variant: "destructive" })
      }
    },
    [toast],
  )

  useEffect(() => {
    void loadBook()
  }, [loadBook])

  useEffect(() => {
    void salesApi
      .getClientOptions()
      .then((res) => {
        const roles = [...(res.data?.roles?.length ? res.data.roles : DEFAULT_ROLES)]
        if (!roles.includes("Other")) roles.push("Other")
        setContactRoles(roles)
        const counties = Array.from(
          new Set([...(res.data?.counties || []), ...KENYA_COUNTIES]),
        ).sort((a, b) => a.localeCompare(b))
        setCountyOptions(counties)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    const handle = setTimeout(() => {
      void loadBook(query.trim() || undefined)
    }, 250)
    return () => clearTimeout(handle)
  }, [query, loadBook])

  useEffect(() => {
    if (query.trim().length < 2) {
      setDirectory([])
      return
    }
    const handle = setTimeout(() => {
      void salesApi.searchClients(query).then((res) => setDirectory(res.data || []))
    }, 250)
    return () => clearTimeout(handle)
  }, [query])

  const openClient = useCallback(
    async (id: string) => {
      setSelectedId(id)
      try {
        const res = await salesApi.getClientBook(id)
        setBook(res.data)
      } catch (error: any) {
        toast({ title: "Could not open client", description: error?.message, variant: "destructive" })
      }
    },
    [toast],
  )

  const list = tab === "created" ? created : engaged
  const selected = book?.client

  const createClient = async () => {
    const name = form.name.trim()
    const number = form.number.trim()
    const location = form.location.trim()
    const contactPerson = form.contactPerson.trim()
    const contactPersonRole =
      form.contactPersonRole === "Other"
        ? form.contactPersonCustomRole.trim()
        : form.contactPersonRole.trim()
    if (!name || !number || !location) {
      toast({ title: "Client name, phone number, and county are required", variant: "destructive" })
      return
    }
    if (contactPerson && !contactPersonRole) {
      toast({
        title: "Select a role for the contact person, or leave the name blank",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const res = await salesApi.createClient({
        sourceName: name,
        sourceNumber: number,
        sourceLocation: location,
        name,
        phone: number,
        location,
        legalName: name,
        contactPerson: contactPerson || undefined,
        contactPersonRole: contactPersonRole || undefined,
        contactPersonCustomRole: form.contactPersonCustomRole,
      })
      toast({ title: res.message || "Client saved" })
      setShowCreate(false)
      setForm({
        name: "",
        number: "",
        location: "",
        contactPerson: "",
        contactPersonRole: "Doctor",
        contactPersonCustomRole: "",
      })
      await loadBook()
      if (res.data?._id) void openClient(res.data._id)
    } catch (error: any) {
      toast({ title: "Could not create client", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const logActivity = async () => {
    if (!selected?._id) return
    setSaving(true)
    try {
      await salesApi.logClientActivity(selected._id, {
        type: callForm.type,
        outcome: callForm.type === "note" ? undefined : callForm.outcome,
        purpose: callForm.purpose,
        notes: callForm.notes,
        followUpDate: callForm.followUpDate || undefined,
        clientName: selected.name,
        clientPhone: selected.phone,
        customer_id: selected._id,
      })
      toast({ title: callForm.type === "call" ? "Call logged" : "Activity saved" })
      setCallForm((c) => ({ ...c, notes: "", purpose: "" }))
      await openClient(selected._id)
      void loadBook()
    } catch (error: any) {
      toast({ title: "Could not log activity", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const knownIds = useMemo(() => new Set([...created, ...engaged].map((c) => c._id)), [created, engaged])
  const directoryExtras = directory.filter((c) => !knownIds.has(c._id))

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col gap-3 overflow-hidden p-3 pb-24 lg:p-4 lg:pb-4">
      <SalesHeader
        title="Clients"
        description="Search the book, log a call, or add a facility."
        color={primaryColor}
        actions={
          <Button
            onClick={() => setShowCreate(true)}
            className="min-h-10 text-white"
            style={{ backgroundColor: primaryColor }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New client
          </Button>
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden md:grid-cols-[300px_1fr] lg:grid-cols-[340px_1fr]">
        
        <Card className={cn("min-h-0 flex-col overflow-hidden border-slate-200", selectedId ? "hidden md:flex" : "flex")}>
          <div className="space-y-2 border-b border-slate-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-11 pl-9"
                placeholder="Search clients"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search clients"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-slate-500"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-1 rounded-md bg-slate-100 p-0.5">
              <Button 
                size="sm" 
                variant={tab === "created" ? "secondary" : "ghost"} 
                className="min-h-10 text-xs" 
                onClick={() => setTab("created")}
              >
                Created ({created.length})
              </Button>
              <Button 
                size="sm" 
                variant={tab === "engaged" ? "secondary" : "ghost"} 
                className="min-h-10 text-xs" 
                onClick={() => setTab("engaged")}
              >
                Contacted ({engaged.length})
              </Button>
            </div>
          </div>
          
          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {list.length === 0 ? (
              <SalesEmpty
                title={tab === "created" ? "No clients created yet" : "No other clients contacted yet"}
                action={
                  tab === "created" ? (
                    <Button size="sm" onClick={() => setShowCreate(true)}>Add a client</Button>
                  ) : undefined
                }
              />
            ) : (
              list.map((client) => (
                <button
                  key={client._id}
                  type="button"
                  onClick={() => void openClient(client._id)}
                  className={`w-full min-h-12 rounded-md p-3 text-left ${
                    selectedId === client._id
                      ? "bg-teal-50 ring-1 ring-teal-200"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <p className="truncate text-sm font-medium text-slate-900">{client.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {client.phone} {client.location ? `· ${client.location}` : ""}
                  </p>
                </button>
              ))
            )}
            
            {directoryExtras.length > 0 && (
              <div className="mt-2 border-t border-dashed border-slate-200 pt-2">
                <p className="px-2 mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Company directory</p>
                {directoryExtras.map((client) => (
                  <button
                    key={client._id}
                    type="button"
                    onClick={() => void openClient(client._id)}
                    className={`w-full min-h-12 rounded-md p-3 text-left ${
                      selectedId === client._id
                        ? "bg-teal-50 ring-1 ring-teal-200"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <p className="truncate text-sm font-medium">{client.name}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{client.phone}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className={cn("min-h-0 flex-col space-y-3 overflow-y-auto", selected ? "flex" : "hidden md:flex")}>
          {!selected ? (
            <Card className="flex-1 flex flex-col items-center justify-center shadow-sm border border-dashed">
              <BookUser className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Select a client</p>
              <p className="text-xs text-muted-foreground/80 mt-1">View activity, log calls, and manage details.</p>
            </Card>
          ) : (
            <>
              <Card className="shrink-0 border-slate-200">
                <CardContent className="flex items-start justify-between gap-4 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 md:hidden">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-10 -ml-2"
                        onClick={() => {
                          setSelectedId(null)
                          setBook(null)
                        }}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Back to list
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold">{selected.name}</h2>
                      {selected.mine ? (
                        <Badge variant="outline" className="border-teal-200 bg-teal-50 text-teal-800">Created by you</Badge>
                      ) : (
                        <Badge variant="secondary">Directory</Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                      {selected.phone ? (
                        <span className="flex items-center gap-1">
                          <PhoneCall className="h-4 w-4" /> {selected.phone}
                        </span>
                      ) : null}
                      {selected.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" /> {selected.location}
                        </span>
                      ) : null}
                      {selected.contactPerson ? (
                        <span className="truncate">Contact: {selected.contactPerson}</span>
                      ) : null}
                    </div>
                  </div>
                  {telHref(selected.phone) ? (
                    <Button asChild className="min-h-10 shrink-0 text-white" style={{ backgroundColor: primaryColor }}>
                      <a href={telHref(selected.phone)}>
                        <PhoneCall className="mr-1.5 h-4 w-4" />
                        Call
                      </a>
                    </Button>
                  ) : null}
                </CardContent>
                <div className="flex flex-wrap gap-2 px-3 pb-3">
                  <Button asChild variant="outline" className="min-h-10">
                    <Link href={`/sales/quotes?client=${encodeURIComponent(selected.name)}&phone=${encodeURIComponent(selected.phone || "")}&id=${selected._id}`}>
                      <Quote className="mr-1.5 h-4 w-4" /> New quote
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="min-h-10">
                    <Link href="/sales/report">
                      <Footprints className="mr-1.5 h-4 w-4" /> Log a visit
                    </Link>
                  </Button>
                </div>
              </Card>

              <Card className="shrink-0 border-slate-200">
                <CardHeader className="border-b border-slate-100 p-3">
                  <CardTitle className="text-sm">Log activity</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={callForm.type} onValueChange={(v) => setCallForm((c) => ({ ...c, type: v }))}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="call">Call</SelectItem>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="follow_up">Follow-up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {callForm.type !== "note" ? (
                    <div className="space-y-1">
                      <Label>Outcome</Label>
                      <Select value={callForm.outcome} onValueChange={(v) => setCallForm((c) => ({ ...c, outcome: v }))}>
                        <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="answered">Answered</SelectItem>
                          <SelectItem value="no_answer">No answer</SelectItem>
                          <SelectItem value="busy">Busy</SelectItem>
                          <SelectItem value="voicemail">Voicemail</SelectItem>
                          <SelectItem value="quote requested">Quote requested</SelectItem>
                          <SelectItem value="follow-up needed">Follow-up needed</SelectItem>
                          <SelectItem value="no interest">No interest</SelectItem>
                          <SelectItem value="information only">Information only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  <div className="space-y-1">
                    <Label>Purpose</Label>
                    <Input
                      className="h-11"
                      value={callForm.purpose}
                      onChange={(e) => setCallForm((c) => ({ ...c, purpose: e.target.value }))}
                      placeholder="Reason for contact"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Next follow-up</Label>
                    <Input
                      type="date"
                      className="h-11"
                      value={callForm.followUpDate}
                      onChange={(e) => setCallForm((c) => ({ ...c, followUpDate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                    <Label>Notes</Label>
                    <Textarea
                      className="min-h-[72px] resize-none"
                      value={callForm.notes}
                      onChange={(e) => setCallForm((c) => ({ ...c, notes: e.target.value }))}
                      placeholder="Add details"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button 
                      onClick={() => void logActivity()} 
                      disabled={saving} 
                      className="min-h-11 w-full text-white" 
                      style={{ backgroundColor: primaryColor }}
                    >
                      <StickyNote className="mr-1.5 h-4 w-4" />
                      Save activity
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="flex min-h-[200px] flex-1 flex-col overflow-hidden border-slate-200">
                <CardHeader className="shrink-0 border-b border-slate-100 p-3">
                  <CardTitle className="text-sm">Activity timeline</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 space-y-1 overflow-y-auto p-2">
                  {(book?.timeline || []).length === 0 ? (
                    <SalesEmpty title="No activity yet" description="Call them or log a visit to start tracking." />
                  ) : (
                    book.timeline.map((item: any) => (
                      <div key={`${item.kind}-${item._id}`} className="flex gap-3 rounded-md p-2">
                        <div className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: primaryColor }} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{item.title}</span>
                            <Badge variant="outline" className="shrink-0 capitalize">
                              {item.kind.replace("_", " ")}
                            </Badge>
                          </div>
                          {item.detail ? <p className="mt-0.5 truncate text-xs text-slate-500">{item.detail}</p> : null}
                          {item.notes ? <p className="mt-0.5 line-clamp-2 text-sm text-slate-700">{item.notes}</p> : null}
                          <p className="mt-1 text-xs text-slate-400">{formatWhen(item.at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Create Client Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">Create New Client</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Client name <span className="text-red-600">*</span></Label>
              <Input
                className="h-11"
                value={form.name}
                onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Phone <span className="text-red-600">*</span></Label>
              <Input
                className="h-11"
                value={form.number}
                onChange={(e) => setForm((c) => ({ ...c, number: e.target.value }))}
                placeholder="Phone"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>County <span className="text-red-600">*</span></Label>
              <Input
                list="sales-county-options"
                className="h-11"
                value={form.location}
                onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))}
                placeholder="e.g. Kakamega"
              />
              <datalist id="sales-county-options">
                {countyOptions.map((county) => (
                  <option key={county} value={county} />
                ))}
              </datalist>
              <p className="text-xs text-slate-500">
                County becomes the client group name automatically.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Contact person (optional)</Label>
              <Input
                className="h-11"
                value={form.contactPerson}
                onChange={(e) => setForm((c) => ({ ...c, contactPerson: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Contact person role</Label>
              <Select value={form.contactPersonRole} onValueChange={(v) => setForm((c) => ({ ...c, contactPersonRole: v }))}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {contactRoles.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.contactPersonRole === "Other" && (
              <div className="space-y-1 sm:col-span-2">
                <Label>Custom role</Label>
                <Input
                  className="h-11"
                  value={form.contactPersonCustomRole}
                  onChange={(e) => setForm((c) => ({ ...c, contactPersonCustomRole: e.target.value }))}
                  placeholder="e.g. Biomedical Engineer"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" className="min-h-10" onClick={() => setShowCreate(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="min-h-10 text-white" onClick={() => void createClient()} disabled={saving} style={{ backgroundColor: primaryColor }}>
              {saving ? "Saving…" : "Save client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}