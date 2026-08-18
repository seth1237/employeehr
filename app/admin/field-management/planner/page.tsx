"use client"

import { useEffect, useState, useCallback } from "react"
import { Calendar, User, Search, CheckCircle, XCircle } from "lucide-react"
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

export default function AdminPlannerPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [planners, setPlanners] = useState<any[]>([])
  const [users, setUsers] = useState<Record<string, string>>({})
  const [searchTerm, setSearchTerm] = useState("")

  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean
    planner: any | null
    action: "approve" | "reject" | null
    note: string
  }>({ open: false, planner: null, action: null, note: "" })

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
      if (resUsers) { // Usually user data returned directly or wrapped in success
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
    return userName.includes(searchTerm.toLowerCase()) || p.date.includes(searchTerm)
  })

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4 lg:gap-6 lg:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Planners</h1>
          <p className="text-sm text-muted-foreground">Review and approve field visit plans.</p>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by rep or date..."
              className="pl-8"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-6 text-sm text-muted-foreground">Loading...</div>
          ) : filteredPlanners.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">No planners found.</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPlanners.map(p => (
                <Card key={p._id} className="flex flex-col">
                  <div className="bg-muted/30 px-4 py-3 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2 font-medium">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {users[p.userId] || 'Unknown Rep'}
                    </div>
                    <Badge variant={p.status === 'approved' ? 'default' : p.status === 'rejected' ? 'destructive' : 'secondary'}>
                      {p.status}
                    </Badge>
                  </div>
                  
                  <CardContent className="flex-1 p-4 space-y-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {p.date}
                    </div>
                    
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visits ({p.visits?.length || 0})</span>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                        {p.visits?.map((v: any, i: number) => (
                          <div key={i} className="text-sm border rounded p-2">
                            <div className="font-medium">{v.clientName}</div>
                            <div className="text-xs text-muted-foreground">{v.reason === 'Other' ? v.customReason : v.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {p.projectedExpenses > 0 && (
                      <div className="pt-2 border-t text-sm">
                        <span className="text-muted-foreground">Projected Expenses:</span> 
                        <span className="font-semibold ml-2">KES {p.projectedExpenses.toLocaleString()}</span>
                      </div>
                    )}
                  </CardContent>
                  
                  {p.status === 'pending' && (
                    <div className="p-4 bg-muted/20 border-t flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => setReviewDialog({ open: true, planner: p, action: "approve", note: "" })}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => setReviewDialog({ open: true, planner: p, action: "reject", note: "" })}
                      >
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  )}
                  {p.adminNotes && p.status !== 'pending' && (
                    <div className="p-3 border-t bg-amber-50/50 text-xs text-amber-900">
                      <span className="font-medium mr-1">Admin note:</span> {p.adminNotes}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Dialog open={reviewDialog.open} onOpenChange={(open) => !open && setReviewDialog({ ...reviewDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDialog.action === "approve" ? "Approve Plan" : "Reject Plan"}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === "approve" 
                ? "Add an optional note to this approval." 
                : "You must provide a reason for rejecting this plan."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Note / Reason</Label>
              <Textarea 
                placeholder={reviewDialog.action === "approve" ? "Good luck!" : "Please rethink your route..."}
                value={reviewDialog.note}
                onChange={e => setReviewDialog({ ...reviewDialog, note: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog({ ...reviewDialog, open: false })}>Cancel</Button>
            <Button 
              variant={reviewDialog.action === "approve" ? "default" : "destructive"} 
              onClick={handleReviewSubmit}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
