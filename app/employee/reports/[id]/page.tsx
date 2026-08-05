"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit2, Loader2 } from "lucide-react"
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
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900",
  approved: "bg-green-100 text-green-800 dark:bg-green-900",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900",
}

export default function ReportDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [params.id])

  const loadReport = async () => {
    try {
      setLoading(true)
      const response = await api.reports.getReport(params.id as string)
      if (response.success) {
        setReport(response.data)
      } else {
        toast({ description: "Report not found", variant: "destructive" })
        router.push("/employee/reports")
      }
    } catch (error: any) {
      toast({ description: error.message, variant: "destructive" })
      router.push("/employee/reports")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!report) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push("/employee/reports")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{report.title}</h1>
          <p className="text-muted-foreground mt-1">{report.type} report</p>
        </div>
        {report.status === "draft" && (
          <Button onClick={() => router.push("/employee/reports/write")} className="bg-primary">
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
        )}
      </div>

      {/* Status and Metadata */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Status</p>
              <Badge className={statusColors[report.status]}>{report.status}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Report Type</p>
              <Badge variant="outline">{report.type}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Created</p>
              <p className="font-medium">{new Date(report.created_at).toLocaleDateString()} at {new Date(report.created_at).toLocaleTimeString()}</p>
            </div>
            {report.submitted_at && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Submitted</p>
                <p className="font-medium">{new Date(report.submitted_at).toLocaleDateString()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      {report.tags && report.tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tags</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {report.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Approval Information */}
      {report.status === "approved" && report.approved_at && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900/50">
          <p className="text-sm font-medium text-green-900 dark:text-green-100">✓ Approved on {new Date(report.approved_at).toLocaleDateString()}</p>
        </div>
      )}

      {report.status === "rejected" && report.rejection_reason && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50">
          <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">✗ Rejected</p>
          <p className="text-sm text-red-800 dark:text-red-200">{report.rejection_reason}</p>
        </div>
      )}

      {report.status === "submitted" && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-900/50">
          <p className="text-sm text-blue-900 dark:text-blue-100">⏳ Awaiting approval from your manager</p>
        </div>
      )}

      {report.status === "draft" && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-900/50">
          <p className="text-sm text-gray-900 dark:text-gray-100">✎ This is a draft. Submit it for approval when ready.</p>
        </div>
      )}

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle>Report Content</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose dark:prose-invert max-w-none bg-muted p-6 rounded-lg whitespace-pre-wrap font-mono text-sm">
            {report.content}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
