"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Plus, Trash2, Save, Send, Clock, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import Link from "next/link"

const REASONS = [
  "Company introduction",
  "Quotation Discussion",
  "Business Inquiry",
  "Appointment",
  "Installation",
  "Service",
  "Debt Collection",
  "Other"
]

export default function SalesPlannerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [clients, setClients] = useState<any[]>([])
  
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [projectedExpenses, setProjectedExpenses] = useState("")
  const [visits, setVisits] = useState([{ clientName: "", clientId: "", reason: "", customReason: "" }])
  const [planners, setPlanners] = useState<any[]>([])
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setFetching(true)
    try {
      const [plannerRes, clientsRes] = await Promise.all([
        api.sales.getPlanners(),
        api.sales.listMyClients()
      ])
      if (plannerRes.success) setPlanners(plannerRes.data || [])
      if (clientsRes.success) {
        setClients(clientsRes.data?.created || [])
      }
    } catch (error: any) {
      toast({ title: "Failed to load planners", description: error.message, variant: "destructive" })
    } finally {
      setFetching(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const addVisit = () => {
    setVisits([...visits, { clientName: "", clientId: "", reason: "", customReason: "" }])
  }

  const removeVisit = (index: number) => {
    setVisits(visits.filter((_, i) => i !== index))
  }

  const updateVisit = (index: number, field: string, value: string) => {
    const newVisits = [...visits]
    newVisits[index] = { ...newVisits[index], [field]: value }
    setVisits(newVisits)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!date) return toast({ title: "Date is required", variant: "destructive" })
    if (visits.some(v => !v.clientName || !v.reason || (v.reason === "Other" && !v.customReason))) {
      return toast({ title: "Incomplete visit details", description: "Ensure all visits have a client and reason", variant: "destructive" })
    }

    setLoading(true)
    try {
      await api.sales.createPlanner({
        date,
        projectedExpenses: Number(projectedExpenses) || 0,
        visits
      })
      toast({ title: "Plan submitted for approval" })
      setVisits([{ clientName: "", clientId: "", reason: "", customReason: "" }])
      setProjectedExpenses("")
      loadData()
    } catch (error: any) {
      toast({ title: "Failed to submit", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 lg:p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/sales">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Planner</h1>
          <p className="text-sm text-muted-foreground">Plan your visits and request approvals</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create New Plan</CardTitle>
            <CardDescription>Fill in your projected visits and expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Plan Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Visits</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addVisit}>
                    <Plus className="mr-2 h-4 w-4" /> Add Visit
                  </Button>
                </div>
                
                {visits.map((visit, index) => (
                  <div key={index} className="rounded-lg border p-4 space-y-4 bg-muted/20 relative">
                    {visits.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeVisit(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    <div className="space-y-2 relative">
                      <Label>Client Name</Label>
                      <Input
                        placeholder="Search existing client or type new"
                        value={visit.clientName}
                        onChange={(e) => {
                          const newVisits = [...visits]
                          newVisits[index] = { ...newVisits[index], clientName: e.target.value, clientId: "" }
                          setVisits(newVisits)
                          setActiveDropdownIndex(index)
                        }}
                        onFocus={() => setActiveDropdownIndex(index)}
                        onBlur={() => setTimeout(() => setActiveDropdownIndex(null), 250)}
                        required
                        autoComplete="off"
                      />
                      {activeDropdownIndex === index && visit.clientName.length > 0 && (
                        <div className="absolute z-10 w-full top-[100%] mt-1 bg-white border rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {clients.filter(c => c.name.toLowerCase().includes(visit.clientName.toLowerCase())).map(c => (
                            <button
                              key={c._id}
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                              onClick={() => {
                                const newVisits = [...visits]
                                newVisits[index] = { ...newVisits[index], clientName: c.name, clientId: c._id }
                                setVisits(newVisits)
                                setActiveDropdownIndex(null)
                              }}
                            >
                              {c.name}
                            </button>
                          ))}
                          <div className="p-2 border-t text-xs text-muted-foreground bg-slate-50 text-center">
                            Press Enter to use <strong>"{visit.clientName}"</strong> as a new client, or{" "}
                            <Link href="/sales/clients" className="text-teal-700 underline font-medium">
                              create explicitly
                            </Link>.
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Reason for Visit</Label>
                      <Select value={visit.reason} onValueChange={(val) => updateVisit(index, 'reason', val)} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {REASONS.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {visit.reason === "Other" && (
                      <div className="space-y-2">
                        <Label>Specify Reason</Label>
                        <Input
                          placeholder="Enter custom reason"
                          value={visit.customReason}
                          onChange={(e) => updateVisit(index, 'customReason', e.target.value)}
                          required
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Projected Expenses (KES)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={projectedExpenses}
                  onChange={(e) => setProjectedExpenses(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Clock className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Submit Plan
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="font-semibold px-1">Recent Plans</h3>
          {fetching ? (
            <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg">Loading plans...</div>
          ) : planners.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground border rounded-lg bg-muted/20">No plans yet</div>
          ) : (
            <div className="space-y-6">
              {Object.entries(
                planners.reduce((acc, p) => {
                  const d = new Date(p.date)
                  const monthYear = d.toLocaleString('default', { month: 'long', year: 'numeric' })
                  if (!acc[monthYear]) acc[monthYear] = []
                  acc[monthYear].push(p)
                  return acc
                }, {} as Record<string, any[]>)
              ).map(([monthYear, monthPlanners]) => (
                <div key={monthYear} className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">{monthYear}</h4>
                  <div className="grid gap-3">
                    {(monthPlanners as any[]).map((p: any) => (
                <Card key={p._id} className="overflow-hidden">
                  <div className="border-b bg-muted/30 px-4 py-3 flex items-center justify-between">
                    <div className="font-medium text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {p.date}
                    </div>
                    <Badge 
                      variant={p.status === 'rejected' ? 'destructive' : 'secondary'}
                      className={p.status === 'approved' ? 'bg-green-600 hover:bg-green-700 text-white border-transparent' : ''}
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Visits:</span> {p.visits.length} planned
                    </div>
                    {p.projectedExpenses > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Budget:</span> KES {p.projectedExpenses.toLocaleString()}
                      </div>
                    )}
                    {p.adminNotes && (
                      <div className="text-sm bg-muted/50 p-2 rounded border border-amber-200">
                        <span className="font-medium text-amber-700">Admin Note:</span> {p.adminNotes}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              </div>
            </div>
          ))}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
