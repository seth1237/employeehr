"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { API_URL } from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { AlertCircle, CheckCircle2, Clock, AlertTriangle, Plus, MessageSquare } from "lucide-react"

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
  const { toast } = useToast()

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  })

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
        return "bg-blue-100 text-blue-800"
      case "under_review":
        return "bg-purple-100 text-purple-800"
      case "assigned":
        return "bg-indigo-100 text-indigo-800"
      case "in_progress":
        return "bg-yellow-100 text-yellow-800"
      case "pending_client_feedback":
        return "bg-orange-100 text-orange-800"
      case "escalated":
        return "bg-red-100 text-red-800"
      case "resolved":
        return "bg-green-100 text-green-800"
      case "closed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading && complaints.length === 0) return <PageLoadingSkeleton title="Loading complaints" rows={8} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Complaints</h1>
          <p className="text-sm text-muted-foreground">
            Manage and track all client complaints, assignments, and resolutions
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
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Complaints</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{stats.open}</div>
              <p className="text-sm text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
              <p className="text-sm text-muted-foreground">Pending Feedback</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{stats.resolved}</div>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{stats.escalated}</div>
              <p className="text-sm text-muted-foreground">Escalated</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Complaints List</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search by ID, title, client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger>
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

            <Select
              value={priorityFilter}
              onValueChange={(value) => setPriorityFilter(value === "all" ? "" : value)}
            >
              <SelectTrigger>
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

            <div className="max-h-[600px] overflow-auto space-y-2">
              {filteredComplaints.length === 0 ? (
                <p className="text-sm text-muted-foreground">No complaints found.</p>
              ) : (
                filteredComplaints.map((complaint) => (
                  <button
                    key={complaint._id}
                    onClick={() => setSelectedComplaint(complaint)}
                    className={`w-full rounded border p-3 text-left transition hover:bg-muted/50 ${
                      selectedComplaint?._id === complaint._id
                        ? "border-primary bg-muted/40"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{complaint.complaintId}</div>
                        <div className="text-xs text-muted-foreground truncate">{complaint.title}</div>
                        <div className="text-xs mt-1">{complaint.clientName}</div>
                      </div>
                      {getPriorityIcon(complaint.priority)}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {complaint.status}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(complaint.status)}`}>
                        {complaint.status}
                      </Badge>
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Complaint Details</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedComplaint ? (
              <p className="text-sm text-muted-foreground">Select a complaint to view details.</p>
            ) : (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="rounded border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Complaint ID</p>
                      <p className="font-semibold">{selectedComplaint.complaintId}</p>
                    </div>
                    <Badge className={getStatusColor(selectedComplaint.status)}>
                      {selectedComplaint.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Priority</p>
                      <div className="flex items-center gap-2 mt-1">
                        {getPriorityIcon(selectedComplaint.priority)}
                        <span className="font-medium capitalize">{selectedComplaint.priority}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Category</p>
                      <p className="font-medium capitalize">{selectedComplaint.complaintCategory.replace(/_/g, " ")}</p>
                    </div>
                  </div>
                </div>

                {/* Client Info */}
                <div>
                  <h3 className="font-semibold mb-3">Client Information</h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="text-muted-foreground">Name:</span> {selectedComplaint.clientName}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Number:</span> {selectedComplaint.clientNumber}
                    </p>
                  </div>
                </div>

                {/* Complaint Details */}
                <div>
                  <h3 className="font-semibold mb-3">Complaint Details</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="font-medium">{selectedComplaint.title}</p>
                      <p className="text-muted-foreground mt-1">{selectedComplaint.description}</p>
                    </div>
                  </div>
                </div>

                {/* Assignment */}
                {selectedComplaint.assignedToName && (
                  <div>
                    <h3 className="font-semibold mb-3">Assigned To</h3>
                    <p className="text-sm">{selectedComplaint.assignedToName}</p>
                  </div>
                )}

                {/* Resolution */}
                {selectedComplaint.resolution?.resolvedByName && (
                  <div>
                    <h3 className="font-semibold mb-3">Resolution</h3>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="text-muted-foreground">Resolved By:</span> {selectedComplaint.resolution.resolvedByName}
                      </p>
                      {selectedComplaint.resolution.satisfactionRating && (
                        <p>
                          <span className="text-muted-foreground">Satisfaction Rating:</span> {selectedComplaint.resolution.satisfactionRating}/5 ⭐
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* SMS Composer */}
                <div className="rounded border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">Send SMS to client</h3>
                      <p className="text-xs text-muted-foreground">Use the existing bulk SMS route inline.</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleToggleSms}>
                      {smsOpen ? "Hide" : "Show"}
                    </Button>
                  </div>

                  {smsOpen && (
                    <div className="mt-4 space-y-3">
                      <Textarea
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                        rows={4}
                        placeholder={`Hi ${selectedComplaint.clientName}, `}
                      />
                      {smsResult && (
                        <p className={`text-sm ${smsResult.includes("success") ? "text-green-600" : "text-red-600"}`}>
                          {smsResult}
                        </p>
                      )}
                      <Button onClick={handleSendSms} disabled={smsSending} className="w-full">
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
                >
                  View Full Details
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
