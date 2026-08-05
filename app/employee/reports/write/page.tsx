"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, Send, ArrowLeft, Clock, Wand2 } from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface ReportDraft {
  _id: string
  type: "daily" | "weekly" | "monthly" | "quarterly" | "annual"
  title: string
  content: string
  tags?: string[]
  created_at: string
}

export default function ReportWritePage() {
  const router = useRouter()
  const { toast } = useToast()

  const [reportType, setReportType] = useState<"daily" | "weekly" | "monthly" | "quarterly" | "annual">("daily")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentDraft, setCurrentDraft] = useState<ReportDraft | null>(null)
  const [showDrafts, setShowDrafts] = useState(false)
  const [drafts, setDrafts] = useState<ReportDraft[]>([])
  const [loadingDrafts, setLoadingDrafts] = useState(false)

  // Summary dialog states
  const [showSummaryDialog, setShowSummaryDialog] = useState(false)
  const [summaryData, setSummaryData] = useState<{
    summary: string
    title: string
    basedOnReportIds: string[]
  } | null>(null)
  const [showSummaryReports, setShowSummaryReports] = useState(false)

  // Load drafts on mount
  useEffect(() => {
    loadDrafts()
  }, [])

  // Load drafts for the selected type
  useEffect(() => {
    loadDrafts()
  }, [reportType])

  const loadDrafts = async () => {
    try {
      setLoadingDrafts(true)
      const response = await api.reports.getMyReports(reportType, "draft")
      if (response.success) {
        setDrafts(response.data)
      }
    } catch (error: any) {
      console.error("Failed to load drafts", error)
    } finally {
      setLoadingDrafts(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const saveAsDraft = async () => {
    if (!title.trim() || !content.trim()) {
      toast({ description: "Title and content are required", variant: "destructive" })
      return
    }

    setIsSaving(true)
    try {
      const response = await api.reports.save({
        report_id: currentDraft?._id,
        type: reportType,
        title,
        content,
        tags,
      })

      if (response.success) {
        setCurrentDraft(response.data)
        toast({ description: "Report saved as draft" })
      } else {
        toast({ description: response.message || "Failed to save", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ description: error.message || "Error saving report", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const submitReport = async () => {
    if (!currentDraft?._id) {
      toast({ description: "Please save the report first", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await api.reports.submit({
        report_id: currentDraft._id,
      })

      if (response.success) {
        toast({ description: "Report submitted for approval" })
        setTimeout(() => router.push("/employee/reports"), 1500)
      } else {
        toast({ description: response.message || "Failed to submit", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ description: error.message || "Error submitting report", variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const loadDraft = (draft: ReportDraft) => {
    setCurrentDraft(draft)
    setReportType(draft.type)
    setTitle(draft.title)
    setContent(draft.content)
    setTags(draft.tags || [])
    setShowDrafts(false)
  }

  const generateSummary = async () => {
    // Determine the source report type based on selected type
    const sourceType = getSourceTypeForSummary(reportType)
    
    if (!sourceType) {
      toast({ description: "Cannot generate summary for this report type", variant: "destructive" })
      return
    }

    setIsGenerating(true)
    try {
      const response = await api.reports.generateSummary({
        fromType: sourceType,
        toType: reportType,
      })

      if (response.success && response.data) {
        setSummaryData({
          summary: response.data.summary,
          title: response.data.title,
          basedOnReportIds: response.data.basedOnReportIds,
        })
        setShowSummaryDialog(true)
        toast({ description: `Summary generated from ${response.data.sourceReportsCount || 1} ${sourceType} reports` })
      } else {
        toast({ description: response.message || "Failed to generate summary", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ description: error.message || "Error generating summary", variant: "destructive" })
    } finally {
      setIsGenerating(false)
    }
  }

  const applySummary = () => {
    if (summaryData) {
      setTitle(summaryData.title)
      setContent(summaryData.summary)
      setShowSummaryDialog(false)
      toast({ description: "Summary applied! Review and save as draft." })
    }
  }

  function getSourceTypeForSummary(targetType: string): string | null {
    switch (targetType) {
      case "weekly":
        return "daily"
      case "monthly":
        return "weekly"
      case "quarterly":
        return "monthly"
      case "annual":
        return "quarterly"
      default:
        return null
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Write Report</h1>
              <p className="text-muted-foreground">Create and submit your {reportType} report</p>
            </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push("/employee/reports")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {/* Draft Selector */}
      {drafts.length > 0 && (
        <Card className="border-2 border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              Continue from Draft ({drafts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {showDrafts ? (
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <div 
                    key={draft._id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent hover:border-primary cursor-pointer transition-all group"
                    onClick={() => loadDraft(draft)}
                  >
                    <div className="flex-1">
                      <p className="font-semibold group-hover:text-primary transition-colors">{draft.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs capitalize">{draft.type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(draft.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <ArrowLeft className="w-4 h-4 rotate-180 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                ))}
              </div>
            ) : (
              <Button 
                variant="ghost" 
                onClick={() => setShowDrafts(true)} 
                className="w-full border-2 border-dashed hover:border-primary hover:bg-primary/5"
              >
                <Clock className="w-4 h-4 mr-2" />
                View Drafts
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Report Form */}
      <Card className="border-2">
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-xl">Report Details</CardTitle>
          <CardDescription>Fill in your report information below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type and AI Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold">Report Type</label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">📅 Daily Report</SelectItem>
                  <SelectItem value="weekly">📊 Weekly Report</SelectItem>
                  <SelectItem value="monthly">📈 Monthly Report</SelectItem>
                  <SelectItem value="quarterly">📉 Quarterly Report</SelectItem>
                  <SelectItem value="annual">🎯 Annual Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* AI Generate Summary Button */}
            {["weekly", "monthly", "quarterly", "annual"].includes(reportType) && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-transparent select-none">.</label>
                <Button
                  onClick={generateSummary}
                  disabled={isGenerating}
                  variant="outline"
                  className="w-full h-11 border-2 border-dashed hover:border-primary hover:bg-primary/5"
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4 mr-2" />
                  )}
                  Auto-Generate from {getSourceTypeForSummary(reportType)?.charAt(0).toUpperCase() + getSourceTypeForSummary(reportType)?.slice(1)}
                </Button>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Report Title</label>
            <Input
              placeholder="e.g., Weekly Progress Update - Dec 2025"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving || isSubmitting}
              className="h-11"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold">Report Content</label>
            <Textarea
              placeholder="Write your report here...&#10;&#10;Include:&#10;• Key accomplishments&#10;• Challenges faced&#10;• Next steps&#10;• Metrics and results"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              disabled={isSaving || isSubmitting}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">{content.length} characters</p>
          </div>

          {/* Tags */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold">Tags (Optional)</label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag (e.g., Q4, Projects, Development)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                disabled={isSaving || isSubmitting}
                className="h-10"
              />
              <Button onClick={addTag} variant="secondary" disabled={isSaving || isSubmitting} className="px-6">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="px-3 py-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors" 
                    onClick={() => removeTag(tag)}
                  >
                    {tag} <span className="ml-1 font-bold">×</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          {currentDraft && (
            <div className="flex items-center gap-2 p-4 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-900">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium">
                Editing draft from {new Date(currentDraft.created_at).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-6 border-t">
            <Button
              variant="outline"
              onClick={saveAsDraft}
              disabled={isSaving || isSubmitting || !title.trim() || !content.trim()}
              size="lg"
              className="min-w-[140px]"
            >
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {!isSaving && <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </Button>
            <Button
              onClick={submitReport}
              disabled={isSubmitting || isSaving || !currentDraft}
              className="bg-primary hover:bg-primary/90 min-w-[160px]"
              size="lg"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {!isSubmitting && <Send className="w-4 h-4 mr-2" />}
              Submit for Review
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wand2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl">AI-Generated Summary</DialogTitle>
                <DialogDescription className="mt-1">
                  Intelligently compiled from your previous reports
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {summaryData && (
            <div className="space-y-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Suggested Title
                </label>
                <Input 
                  value={summaryData.title} 
                  readOnly 
                  className="bg-accent/50 font-medium" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Summary Content</label>
                <div className="p-5 bg-accent/30 rounded-lg border-2 border-dashed max-h-[400px] overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap font-mono text-xs leading-relaxed">
                    {summaryData.summary}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on {summaryData.basedOnReportIds?.length || 0} previous report(s)
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowSummaryDialog(false)} className="min-w-[100px]">
              Cancel
            </Button>
            <Button onClick={applySummary} className="bg-primary hover:bg-primary/90 min-w-[140px]" size="lg">
              <Wand2 className="w-4 h-4 mr-2" />
              Apply Summary
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
