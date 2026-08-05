"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, CheckCircle2, Clock, Plus, RefreshCw, User, Briefcase, Filter } from "lucide-react"

interface ServiceJob {
  _id: string
  serviceId: string
  serviceName: string
  clientId?: string
  clientName?: string
  scheduledDate: string
  completedDate?: string
  status: "pending" | "done" | "overdue" | "cancelled"
  notes?: string
  isRecurring: boolean
  intervalDays: number
}

interface ServicesManagerProps {
  jobs: ServiceJob[]
  products: any[]
  clients: any[]
  onStatusUpdate: (jobId: string, status: string, notes: string) => Promise<void>
  onCreateJob: (data: any) => Promise<void>
  primaryColor: string
}

export function ServicesManager({ jobs, products, clients, onStatusUpdate, onCreateJob, primaryColor }: ServicesManagerProps) {
  const [activeTab, setActiveTab] = useState("pending")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newJobForm, setNewJobForm] = useState({
    serviceId: "",
    clientId: "",
    scheduledDate: "",
    notes: ""
  })
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [updateNotes, setUpdateNotes] = useState("")

  const services = products.filter(p => p.productType === "service")

  const filteredJobs = jobs.filter(job => {
    if (activeTab === "pending") return job.status === "pending"
    if (activeTab === "done") return job.status === "done"
    if (activeTab === "overdue") return job.status === "overdue"
    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Pending</Badge>
      case "done": return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Completed</Badge>
      case "overdue": return <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200">Overdue</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Services Header & Stats */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Professional Services</h2>
          <p className="text-muted-foreground">Manage installations, maintenance, and service delivery schedules.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} style={{ backgroundColor: primaryColor }}>
          <Plus className="mr-2 h-4 w-4" /> Schedule New Service
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm border-l-4 border-amber-400">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Clock className="h-4 w-4" /> Pending Jobs
            </div>
            <div className="mt-2 text-3xl font-bold">{jobs.filter(j => j.status === "pending").length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-rose-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Clock className="h-4 w-4" /> Overdue
            </div>
            <div className="mt-2 text-3xl font-bold">{jobs.filter(j => j.status === "overdue").length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <CheckCircle2 className="h-4 w-4" /> Completed
            </div>
            <div className="mt-2 text-3xl font-bold">{jobs.filter(j => j.status === "done").length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <RefreshCw className="h-4 w-4" /> Recurring
            </div>
            <div className="mt-2 text-3xl font-bold">{jobs.filter(j => j.isRecurring).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="pending" className="w-full" onValueChange={setActiveTab}>
        <div className="flex items-center justify-between border-b pb-1">
          <TabsList className="bg-transparent h-auto p-0">
            <TabsTrigger value="pending" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2 bg-transparent shadow-none">Pending</TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2 bg-transparent shadow-none">Overdue</TabsTrigger>
            <TabsTrigger value="done" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2 bg-transparent shadow-none">Completed</TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2 bg-transparent shadow-none text-muted-foreground">All Logs</TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
             <Button variant="ghost" size="sm" className="h-8 text-xs"><Filter className="h-3.5 w-3.5 mr-1" /> Filter</Button>
          </div>
        </div>

        <TabsContent value={activeTab} className="pt-4 mt-0">
          {filteredJobs.length === 0 ? (
            <Card className="border-dashed py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
                <Briefcase className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">No {activeTab} service jobs found</h3>
              <p className="text-muted-foreground max-w-[300px]">There are currently no services scheduled in this category.</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredJobs.map(job => (
                <Card key={job._id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-semibold">{job.serviceName}</h4>
                          {getStatusBadge(job.status)}
                          {job.isRecurring && <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-blue-100 flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Every {job.intervalDays}d</Badge>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Client: <span className="text-foreground font-medium">{job.clientName || "Walk-in / General"}</span></span>
                          <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Scheduled: <span className="text-foreground font-medium">{new Date(job.scheduledDate).toLocaleDateString()}</span></span>
                        </div>
                      </div>

                      {job.status !== "done" && (
                        <div className="flex gap-2 shrink-0">
                          {updatingId === job._id ? (
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <Input 
                                placeholder="Completion notes..." 
                                size={20} 
                                className="h-9 min-w-[200px]"
                                value={updateNotes}
                                onChange={(e) => setUpdateNotes(e.target.value)}
                              />
                              <Button size="sm" onClick={async () => {
                                await onStatusUpdate(job._id, "done", updateNotes)
                                setUpdatingId(null)
                                setUpdateNotes("")
                              }}>Submit</Button>
                              <Button variant="ghost" size="sm" onClick={() => setUpdatingId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <>
                              <Button variant="outline" size="sm" className="h-9 border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => onStatusUpdate(job._id, "cancelled", "Cancelled by admin")}>Cancel Job</Button>
                              <Button size="sm" className="h-9" onClick={() => setUpdatingId(job._id)}>Mark as Done</Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {job.notes && (
                      <div className="mt-3 text-sm p-3 bg-muted/50 rounded-md border text-muted-foreground">
                        <span className="font-semibold text-foreground mr-2">Notes:</span> {job.notes}
                      </div>
                    )}
                    {job.completedDate && (
                      <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Completed on {new Date(job.completedDate).toLocaleString()}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Basic Create Job Modal Mockup */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b">
              <CardTitle>Schedule Service Job</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Select Service</Label>
                <Select value={newJobForm.serviceId} onValueChange={(val) => setNewJobForm(p => ({ ...p, serviceId: val }))}>
                  <SelectTrigger><SelectValue placeholder="Select from service catalog" /></SelectTrigger>
                  <SelectContent>
                    {services.map(s => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={newJobForm.clientId} onValueChange={(val) => setNewJobForm(p => ({ ...p, clientId: val }))}>
                  <SelectTrigger><SelectValue placeholder="Select client (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Client / General</SelectItem>
                    {clients.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Service Date</Label>
                <Input type="date" value={newJobForm.scheduledDate} onChange={(e) => setNewJobForm(p => ({ ...p, scheduledDate: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <Label>Operational Notes</Label>
                <Input placeholder="Extra details (machine serial #, etc.)" value={newJobForm.notes} onChange={(e) => setNewJobForm(p => ({ ...p, notes: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button className="flex-1" onClick={async () => {
                  await onCreateJob(newJobForm)
                  setShowCreateModal(false)
                  setNewJobForm({ serviceId: "", clientId: "", scheduledDate: "", notes: "" })
                }} disabled={!newJobForm.serviceId || !newJobForm.scheduledDate}>Schedule Job</Button>
                <Button variant="ghost" className="flex-1" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
