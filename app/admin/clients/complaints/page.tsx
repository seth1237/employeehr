"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { AlertCircle, CheckCircle2, Clock, AlertTriangle, Plus, MessageSquare } from "lucide-react"

interface TenantBranding {
  primaryColor?: string
  secondaryColor?: string
  email?: string
}

interface Complaint {
  _id: string
  complaintId: string
  clientName: string
  clientNumber: string
  clientLocation?: string
  title: string
  description: string
  status: string
  priority: string
  complaintCategory: string
  assignedToName?: string
  resolution?: {
    resolvedByName?: string
    satisfactionRating?: number
  }
  createdAt: string
  dueDate?: string
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const initialLoadDone = useRef(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [priorityFilter, setPriorityFilter] = useState("")
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [smsOpen, setSmsOpen] = useState(false)
  const [smsMessage, setSmsMessage] = useState("")
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState<string | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    pending: 0,
    resolved: 0,
    escalated: 0,
  })
  const [branding, setBranding] = useState<TenantBranding>({})
  const { toast } = useToast()

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  })

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const res = await fetch(`${API_URL}/api/company/branding`, { headers: getAuthHeaders() })
        if (res.ok) {
          const data = await res.json()
          setBranding(data.data || {})
        }
      } catch (e) {
        console.error("Failed to load branding", e)
      }
    }
    fetchBranding()
  }, [])

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  const loadComplaints = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append("status", statusFilter)
      if (priorityFilter) params.append("priority", priorityFilter)

      const response = await fetch(`${API_URL}/api/complaints?${params.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) throw new Error("Failed to fetch complaints")
      const result = await response.json()
      setComplaints(result.data || [])
      if (!selectedComplaint && result.data?.[0]) {
        setSelectedComplaint(result.data[0])
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load complaints",
        variant: "destructive",
      })
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/complaints/stats`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const result = await response.json()
        setStats(result.data || stats)
      }
    } catch (error) {
      console.error("Failed to load stats:", error)
    }
  }

  useEffect(() => {
    loadComplaints({ silent: initialLoadDone.current })
    loadStats()
    initialLoadDone.current = true
  }, [statusFilter, priorityFilter])

  const filteredComplaints = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return complaints

    return complaints.filter((complaint) =>
      [complaint.complaintId, complaint.title, complaint.clientName, complaint.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [complaints, search])

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "high":
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case "medium":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
    }
  }

  const buildBulkSmsKey = (phone: string, name: string, location?: string) => {
    const normalize = (value: string) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ")
    return [normalize(phone), normalize(name), normalize(location || "")].join("|")
  }

  const handleToggleSms = () => {
    setSmsOpen((open) => !open)
    setSmsResult(null)
  }

  const handleSendSms = async () => {
    if (!selectedComplaint) return
    if (!smsMessage.trim()) {
      setSmsResult("Message is required")
      return
    }

    try {
      setSmsSending(true)
      setSmsResult(null)
      const response = await fetch(`${API_URL}/api/stock/bulk-sms/campaigns`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: selectedComplaint.complaintId,
          message: smsMessage.trim(),
          filters: {},
          selectedRecipientKeys: [
            buildBulkSmsKey(selectedComplaint.clientNumber, selectedComplaint.clientName, selectedComplaint.clientLocation || ""),
          ],
        }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to send SMS")

      setSmsResult(`SMS sent successfully to ${selectedComplaint.clientNumber}`)
      setSmsMessage("")
    } catch (error: any) {
      setSmsResult(error?.message || "Failed to send SMS")
    } finally {
      setSmsSending(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "under_review":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "assigned":
        return "bg-indigo-100 text-indigo-800 border-indigo-200"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "pending_client_feedback":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "escalated":
        return "bg-red-100 text-red-800 border-red-200"
      case "resolved":
        return "bg-green-100 text-green-800 border-green-200"
      case "closed":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  if (loading && complaints.length === 0) return <PageLoadingSkeleton title="Loading complaints" rows={8} />

  return (
    <div className="space-y-5">
      {/* Header Banner with Gradient Branding */}
      <div
        className="rounded-2xl border px-4 py-3 shadow-sm"
        style={{
          borderColor: primaryBorderColor,
          background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})`,
        }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p
              className="text-sm font-medium tracking-wide"
              style={{ color: primaryColor }}
            >
              Support
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Client Complaints
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage and track all client complaints, assignments, and resolutions.
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/accounts/complaints/new">
              <Plus className="h-4 w-4 mr-2" />
              New Complaint
            </Link>
          </Button>
        </div>

        {/* Stats Dashboard */}
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
              <div className="mt-1 text-xl font-semibold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Open</div>
              <div className="mt-1 text-xl font-semibold" style={{ color: secondaryColor }}>
                {stats.open}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Pending</div>
              <div className="mt-1 text-xl font-semibold">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Resolved</div>
              <div className="mt-1 text-xl font-semibold text-green-600">{stats.resolved}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Escalated</div>
              <div className="mt-1 text-xl font-semibold text-red-600">{stats.escalated}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filters */}
        <div className="mt-3 rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_200px_150px] lg:items-end">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search by ID, title, client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending_client_feedback">Pending Feedback</SelectItem>
                  <SelectItem value="escalated">Escalated</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={priorityFilter}
                onValueChange={(value) => setPriorityFilter(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button className="w-full" onClick={() => loadComplaints({ silent: true })}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 shadow-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base">Complaints List</CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing {filteredComplaints.length} of {complaints.length}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-auto divide-y">
              {filteredComplaints.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No complaints found.</div>
              ) : (
                filteredComplaints.map((complaint) => (
                  <button
                    key={complaint._id}
                    onClick={() => setSelectedComplaint(complaint)}
                    className={`w-full p-3 text-left transition hover:bg-muted/40 border-l-4 ${
                      selectedComplaint?._id === complaint._id
                        ? "bg-muted/60 border-l-primary"
                        : "border-l-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{complaint.complaintId}</div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{complaint.title}</div>
                        <div className="text-xs text-foreground mt-1 font-medium">{complaint.clientName}</div>
                      </div>
                      <div className="flex-shrink-0 mt-0.5">
                        {getPriorityIcon(complaint.priority)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border ${getStatusColor(complaint.status)}`}>
                        {complaint.status.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(complaint.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <CardTitle className="text-base">Complaint Details</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {!selectedComplaint ? (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                Select a complaint to view details.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Complaint ID</p>
                      <p className="font-semibold text-lg">{selectedComplaint.complaintId}</p>
                    </div>
                    <Badge className={`${getStatusColor(selectedComplaint.status)} capitalize border`}>
                      {selectedComplaint.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Priority</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getPriorityIcon(selectedComplaint.priority)}
                        <span className="font-medium capitalize">{selectedComplaint.priority}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Category</p>
                      <p className="font-medium capitalize mt-1">{selectedComplaint.complaintCategory.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                </div>

                {/* Client Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Client Information</h3>
                  <div className="rounded-lg border p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">{selectedComplaint.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Number:</span>
                      <span className="font-medium">{selectedComplaint.clientNumber}</span>
                    </div>
                    {selectedComplaint.clientLocation && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{selectedComplaint.clientLocation}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Complaint Details */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Complaint Details</h3>
                  <div className="rounded-lg border p-3 space-y-2 text-sm">
                    <p className="font-semibold text-base">{selectedComplaint.title}</p>
                    <p className="text-muted-foreground leading-relaxed">{selectedComplaint.description}</p>
                  </div>
                </div>

                {/* Assignment & Resolution Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedComplaint.assignedToName && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Assigned To</h3>
                      <div className="rounded-lg border p-3 text-sm flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {selectedComplaint.assignedToName.charAt(0)}
                        </div>
                        <span className="font-medium">{selectedComplaint.assignedToName}</span>
                      </div>
                    </div>
                  )}

                  {selectedComplaint.resolution?.resolvedByName && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Resolution</h3>
                      <div className="rounded-lg border p-3 text-sm space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Resolved By:</span>
                          <span className="font-medium">{selectedComplaint.resolution.resolvedByName}</span>
                        </div>
                        {selectedComplaint.resolution.satisfactionRating && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rating:</span>
                            <span className="font-medium">{selectedComplaint.resolution.satisfactionRating}/5 ⭐</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* SMS Composer */}
                <div className="rounded-xl border p-4 bg-muted/10">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Send SMS to client
                      </h3>
                      <p className="text-xs text-muted-foreground">Use the existing bulk SMS route inline.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleToggleSms}>
                      {smsOpen ? "Hide" : "Compose"}
                    </Button>
                  </div>

                  {smsOpen && (
                    <div className="mt-2 space-y-3 border-t pt-3">
                      <Textarea
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                        rows={4}
                        placeholder={`Hi ${selectedComplaint.clientName}, `}
                        className="resize-none"
                      />
                      {smsResult && (
                        <p className={`text-sm font-medium ${smsResult.includes("success") ? "text-green-600" : "text-red-600"}`}>
                          {smsResult}
                        </p>
                      )}
                      <Button onClick={handleSendSms} disabled={smsSending} className="w-full" style={{ backgroundColor: primaryColor }}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        {smsSending ? "Sending SMS..." : "Send SMS"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  onClick={() =>
                    (window.location.href = `/admin/accounts/complaints/${selectedComplaint._id}`)
                  }
                  className="w-full"
                  size="lg"
                >
                  View Full Details & Manage Workflow
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}