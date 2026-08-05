"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Eye, Trash2, Filter, FileText } from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Report {
  _id: string
  type: "daily" | "weekly" | "monthly" | "quarterly" | "annual"
  title: string
  content: string
  status: "draft" | "submitted" | "approved" | "rejected"
  submitted_at?: string
  approved_at?: string
  rejection_reason?: string
  tags?: string[]
  created_at: string
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
}

export default function ReportsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [reports, setReports] = useState<Report[]>([])
  const [filteredReports, setFilteredReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadReports()
  }, [])

  useEffect(() => {
    filterReports()
  }, [reports, selectedType, selectedStatus, searchQuery])

  const loadReports = async () => {
    try {
      setLoading(true)
      const response = await api.reports.getMyReports()
      if (response.success) {
        setReports(response.data)
      } else {
        toast({ description: "Failed to load reports", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ description: error.message || "Error loading reports", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const filterReports = () => {
    let filtered = reports

    if (selectedType !== "all") {
      filtered = filtered.filter((r) => r.type === selectedType)
    }

    if (selectedStatus !== "all") {
      filtered = filtered.filter((r) => r.status === selectedStatus)
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (r) => r.title.toLowerCase().includes(searchQuery.toLowerCase()) || r.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredReports(filtered)
  }

  const deleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this draft?")) return

    try {
      const response = await api.reports.deleteReport(reportId)
      if (response.success) {
        setReports(reports.filter((r) => r._id !== reportId))
        toast({ description: "Report deleted" })
      }
    } catch (error: any) {
      toast({ description: error.message || "Failed to delete", variant: "destructive" })
    }
  }

  const viewReport = (report: Report) => {
    router.push(`/employee/reports/${report._id}`)
  }

  const stats = {
    total: reports.length,
    drafts: reports.filter((r) => r.status === "draft").length,
    submitted: reports.filter((r) => r.status === "submitted").length,
    approved: reports.filter((r) => r.status === "approved").length,
    rejected: reports.filter((r) => r.status === "rejected").length,
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Reports</h1>
            <p className="text-muted-foreground">Track and manage your reports</p>
          </div>
        </div>
        <Button onClick={() => router.push("/employee/reports/write")} size="lg" className="bg-primary gap-2">
          <Plus className="w-4 h-4" />
          Write New Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Total Reports</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-gray-200">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-gray-600">{stats.drafts}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Drafts</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-blue-200">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.submitted}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Pending</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-green-200">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Approved</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-red-200">
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-red-600">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground mt-2 font-medium">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Reports</label>
              <Input placeholder="Search by title or content..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Report Type</label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <div className="space-y-3">
        {loading ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Loading reports...</p>
            </CardContent>
          </Card>
        ) : filteredReports.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">No reports found</p>
              <Button className="mt-4" onClick={() => router.push("/employee/reports/write")}>
                Write Your First Report
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <Card key={report._id} className="hover:shadow-md transition">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{report.title}</h3>
                      <Badge className={statusColors[report.status]}>{report.status}</Badge>
                      <Badge variant="outline">{report.type}</Badge>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{report.content}</p>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {report.tags?.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Created: {new Date(report.created_at).toLocaleDateString()}</span>
                      {report.submitted_at && <span>Submitted: {new Date(report.submitted_at).toLocaleDateString()}</span>}
                      {report.approved_at && <span>Approved: {new Date(report.approved_at).toLocaleDateString()}</span>}
                      {report.rejection_reason && <span className="text-red-600">Reason: {report.rejection_reason}</span>}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => viewReport(report)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {report.status === "draft" && (
                      <Button size="sm" variant="destructive" onClick={() => deleteReport(report._id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
