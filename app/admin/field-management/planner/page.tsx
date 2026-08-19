"use client"

import { useEffect, useState, useCallback } from "react"
import { Calendar, User, Search, CheckCircle, XCircle, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { MonthWeekDayNav } from "@/components/sales-month-week-day"
import { dateLabel } from "@/lib/sales-calendar"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"

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

interface TenantBranding {
  primaryColor?: string
  secondaryColor?: string
}

export default function AdminPlannerPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [planners, setPlanners] = useState<any[]>([])
  const [users, setUsers] = useState<Record<string, string>>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState("")
  const [branding, setBranding] = useState<TenantBranding>({})

  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean
    planner: any | null
    action: "approve" | "reject" | null
    note: string
  }>({ open: false, planner: null, action: null, note: "" })

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [resPlanners, resUsers] = await Promise.all([
        api.sales.adminGetPlanners(),
        api.users.getAll()
      ])
      
      if (resPlanners.success) {
        setPlanners(resPlanners.data || [])
      }
      if (resUsers) { 
        const usersList: any[] = resUsers.data ? resUsers.data : (Array.isArray(resUsers) ? resUsers : [])
        const userMap: Record<string, string> = {}
        usersList.forEach(u => {
          userMap[String(u._id || u.userId)] = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown'
        })
        setUsers(userMap)
      }
    } catch (error: any) {
      toast({ title: "Failed to load planners", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
    
    const fetchBranding = async () => {
      try {
        const token = getToken()
        const res = await fetch(`${API_URL}/api/company/branding`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const json = await res.json()
          setBranding(json.data || {})
        }
      } catch (e) {
        console.error("Failed to load branding", e)
      }
    }
    fetchBranding()
  }, [loadData])

  const handleReviewSubmit = async () => {
    const { planner, action, note } = reviewDialog
    if (!planner || !action) return
    if (action === "reject" && !note.trim()) {
      return toast({ title: "Required", description: "Please provide a reason for rejection", variant: "destructive" })
    }
    
    try {
      await api.sales.adminReviewPlanner(planner._id, { action, note })
      toast({ title: `Planner ${action}d successfully` })
      setReviewDialog({ open: false, planner: null, action: null, note: "" })
      loadData()
    } catch (error: any) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" })
    }
  }

  const filteredPlanners = planners.filter(p => {
    const userName = (users[p.userId] || "").toLowerCase()
    const matchesSearch = userName.includes(searchTerm.toLowerCase()) || String(p.date).includes(searchTerm)
    const matchesDate = selectedDate ? p.date === selectedDate : true
    return matchesSearch && matchesDate
  })

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-amber-50 text-amber-800 border-amber-200'
    }
  }

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
              Field Sales
            </p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Sales Planners
            </h1>
            <p className="text-sm text-muted-foreground">
              Review, approve, and manage field visit plans submitted by your sales team.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Search Area */}
        <div className="mt-3 rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="space-y-2">
              <Label>Search planners</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by rep name or date..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Choose the planned visit date</p>
          <MonthWeekDayNav
            dates={planners.map((p) => p.date).filter(Boolean)}
            selectedMonth={selectedMonth}
            selectedWeek={selectedWeek}
            selectedDate={selectedDate}
            onSelectMonth={(month) => {
              setSelectedMonth(month)
              setSelectedWeek(null)
              setSelectedDate("")
            }}
            onSelectWeek={(week) => {
              setSelectedWeek(week)
              setSelectedDate("")
            }}
            onSelectDate={setSelectedDate}
          />
        </CardContent>
      </Card>

      {/* Planners Grid */}
      <div className="min-h-[300px]">
        {loading ? (
          <Card className="shadow-sm">
            <CardContent className="p-6 flex items-center justify-center text-sm text-muted-foreground">
              Loading planners...
            </CardContent>
          </Card>
        ) : !selectedDate ? (
          <Card className="shadow-sm">
            <CardContent className="p-6 flex items-center justify-center text-sm text-muted-foreground">
              Select a month, week, and the date the visits were planned for.
            </CardContent>
          </Card>
        ) : filteredPlanners.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-6 flex items-center justify-center text-sm text-muted-foreground">
              No planners found for {dateLabel(selectedDate)}.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                {dateLabel(selectedDate)}
              </p>
              <Badge variant="secondary" className="text-xs">
                {filteredPlanners.length} plan{filteredPlanners.length === 1 ? "" : "s"}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredPlanners.map(p => (
                <Card key={p._id} className="flex flex-col shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium text-sm min-w-0">
                      <div className="h-7 w-7 rounded-full bg-background border flex items-center justify-center flex-shrink-0">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="truncate">{users[p.userId] || 'Unknown Rep'}</span>
                    </div>
                    <Badge variant="outline" className={`text-[11px] capitalize flex-shrink-0 ${getStatusBadgeClass(p.status)}`}>
                      {p.status}
                    </Badge>
                  </div>
                  
                  <CardContent className="flex-1 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Planned for {dateLabel(p.date)}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Scheduled Visits
                        </span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                          {p.visits?.length || 0}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                        {p.visits?.length > 0 ? p.visits.map((v: any, i: number) => (
                          <div key={i} className="text-sm border rounded-md p-2 bg-muted/20">
                            <div className="font-medium text-foreground truncate">{v.clientName}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {v.reason === 'Other' ? v.customReason : v.reason}
                              {Number(v.expenses?.transport) > 0 ? ` · Transport KES ${Number(v.expenses.transport).toLocaleString()}` : ""}
                              {v.expenses?.nightOut || v.nightOut ? " · Night out" : ""}
                            </div>
                          </div>
                        )) : (
                          <p className="text-xs text-muted-foreground italic">No visits scheduled.</p>
                        )}
                      </div>
                    </div>
                    
                    {p.projectedExpenses > 0 && (
                      <div className="pt-3 border-t text-sm flex items-center justify-between">
                        <span className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Projected Expenses</span> 
                        <span className="font-semibold text-foreground">KES {p.projectedExpenses.toLocaleString()}</span>
                      </div>
                    )}
                  </CardContent>
                  
                  {p.status === 'pending' && (
                    <div className="p-3 bg-muted/20 border-t flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        onClick={() => setReviewDialog({ open: true, planner: p, action: "approve", note: "" })}
                      >
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                        onClick={() => setReviewDialog({ open: true, planner: p, action: "reject", note: "" })}
                      >
                        <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
                      </Button>
                    </div>
                  )}
                  {p.adminNotes && p.status !== 'pending' && (
                    <div className="p-3 border-t bg-amber-50/60 text-xs text-amber-900 flex items-start gap-2">
                      <span className="font-semibold flex-shrink-0">Admin note:</span> 
                      <span className="leading-relaxed">{p.adminNotes}</span>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={reviewDialog.open} onOpenChange={(open) => !open && setReviewDialog({ ...reviewDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "approve" ? "Approve Plan" : "Reject Plan"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === "approve" 
                ? "Add an optional note to this approval. The sales rep will be notified." 
                : "You must provide a reason for rejecting this plan so the rep can adjust it."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Note / Reason</Label>
              <Textarea 
                placeholder={reviewDialog.action === "approve" ? "e.g., Good luck with the route!" : "e.g., Please rethink your route to avoid backtracking..."}
                value={reviewDialog.note}
                onChange={e => setReviewDialog({ ...reviewDialog, note: e.target.value })}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog({ ...reviewDialog, open: false })}>Cancel</Button>
            <Button 
              variant={reviewDialog.action === "approve" ? "default" : "destructive"} 
              onClick={handleReviewSubmit}
              style={reviewDialog.action === "approve" ? { backgroundColor: primaryColor } : undefined}
            >
              Confirm {reviewDialog.action === "approve" ? "Approval" : "Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}