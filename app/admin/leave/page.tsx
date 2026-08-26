"use client"

import { useEffect, useState } from "react"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TableSkeleton } from "@/components/admin/ui/page-states"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Check, Filter, Pencil, RefreshCw, X } from "lucide-react"

function displayName(user: any) {
  if (!user) return "Unknown"
  const first = user.firstName || user.first_name || ""
  const last = user.lastName || user.last_name || ""
  return `${first} ${last}`.trim() || user.email || "Unknown"
}

export default function AdminLeavePage() {
  const { toast } = useToast()
  const year = new Date().getFullYear()

  const [tab, setTab] = useState("requests")
  const [requests, setRequests] = useState<any[]>([])
  const [balances, setBalances] = useState<any[]>([])
  const [calendar, setCalendar] = useState<any[]>([])
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processing, setProcessing] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [syncing, setSyncing] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editUserId, setEditUserId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editForm, setEditForm] = useState({
    annual_total: "",
    sick_total: "",
  })
  const [savingBalance, setSavingBalance] = useState(false)

  const fetchRequests = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const res = await api.leave.getAllRequests()
      if (res.success) setRequests(res.data || [])
    } catch (error) {
      console.error("Failed to fetch requests", error)
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  const fetchBalances = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const res = await api.leave.getAllBalances(year)
      if (res.success) setBalances(res.data || [])
    } catch (error) {
      console.error("Failed to fetch balances", error)
      toast({ variant: "destructive", description: "Failed to load leave balances" })
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  const fetchCalendar = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const from = `${year}-01-01`
      const to = `${year}-12-31`
      const res = await api.leave.getCalendar(from, to)
      if (res.success) setCalendar(res.data || [])
    } catch (error) {
      console.error("Failed to fetch calendar", error)
      toast({ variant: "destructive", description: "Failed to load leave calendar" })
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  const fetchHolidays = async (opts?: SilentLoadOptions) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const res = await api.holidays.getAll(year)
      if (res.success) setHolidays(res.data || [])
    } catch (error) {
      console.error("Failed to fetch holidays", error)
      toast({ variant: "destructive", description: "Failed to load holidays" })
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  useEffect(() => {
    if (tab === "requests") fetchRequests()
    else if (tab === "balances") fetchBalances()
    else if (tab === "calendar") fetchCalendar()
    else if (tab === "holidays") fetchHolidays()
  }, [tab])

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    setProcessing(id)
    try {
      await api.leave.updateStatus(id, { status })
      toast({ description: `Request ${status} successfully` })
      fetchRequests({ silent: true })
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Failed to update status",
      })
    } finally {
      setProcessing(null)
    }
  }

  const openEditBalance = (row: any) => {
    const bal = row.balance || {}
    setEditUserId(String(row.user?._id || bal.user_id))
    setEditName(displayName(row.user))
    setEditForm({
      annual_total: String(bal.annual_total ?? 21),
      sick_total: String(bal.sick_total ?? 10),
    })
    setEditOpen(true)
  }

  const saveBalance = async () => {
    if (!editUserId) return
    setSavingBalance(true)
    try {
      const res = await api.leave.updateBalance(editUserId, {
        year,
        annual_total: Number(editForm.annual_total),
        sick_total: Number(editForm.sick_total),
      })
      if (!res.success) throw new Error(res.message || "Update failed")
      toast({ description: "Leave balance updated" })
      setEditOpen(false)
      fetchBalances({ silent: true })
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Failed to update balance",
      })
    } finally {
      setSavingBalance(false)
    }
  }

  const syncHolidays = async () => {
    setSyncing(true)
    try {
      const res = await api.holidays.sync({ year })
      if (!res.success) throw new Error(res.message || "Sync failed")
      toast({ description: `Holidays synced for ${year}` })
      fetchHolidays({ silent: true })
    } catch (error: any) {
      toast({
        variant: "destructive",
        description: error.message || "Failed to sync holidays",
      })
    } finally {
      setSyncing(false)
    }
  }

  const filteredRequests = requests.filter((req) => {
    if (statusFilter === "all") return true
    return req.status === statusFilter
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Leave Management</h1>
        <p className="text-muted-foreground">
          Requests, balances, calendar, and public holidays.
          {refreshing ? " Refreshing…" : ""}
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="balances">Balances</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <div className="flex justify-end items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading && requests.length === 0 ? (
                <TableSkeleton rows={8} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4">Leave Type</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4">Reason</th>
                        <th className="px-6 py-4">Applied On</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-8 text-muted-foreground">
                            No requests found matching filters.
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map((req) => (
                          <tr key={req._id} className="hover:bg-muted/30">
                            <td className="px-6 py-4 font-medium">
                              {req.user ? (
                                <div>
                                  <p>{displayName(req.user)}</p>
                                  <p className="text-xs text-muted-foreground">{req.user.email}</p>
                                </div>
                              ) : (
                                "Unknown User"
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <Badge variant="outline">{req.type}</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col text-xs">
                                <span>{format(new Date(req.startDate), "MMM d, yyyy")}</span>
                                <span className="text-center text-muted-foreground">to</span>
                                <span>{format(new Date(req.endDate), "MMM d, yyyy")}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 max-w-xs truncate" title={req.reason}>
                              {req.reason}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {format(new Date(req.createdAt), "MMM d")}
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant={
                                  req.status === "approved"
                                    ? "default"
                                    : req.status === "rejected"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {String(req.status || "").toUpperCase()}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              {req.status === "pending" && (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                    onClick={() => handleAction(req._id, "rejected")}
                                    disabled={processing === req._id}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
                                    onClick={() => handleAction(req._id, "approved")}
                                    disabled={processing === req._id}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave balances ({year})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading && balances.length === 0 ? (
                <TableSkeleton rows={6} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3">Employee</th>
                        <th className="px-6 py-3">Annual remaining</th>
                        <th className="px-6 py-3">Sick remaining</th>
                        <th className="px-6 py-3 text-right">Edit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {balances.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-8 text-muted-foreground">
                            No balances found.
                          </td>
                        </tr>
                      ) : (
                        balances.map((row) => {
                          const bal = row.balance || {}
                          const annualRem = (bal.annual_total ?? 0) - (bal.annual_used ?? 0)
                          const sickRem = (bal.sick_total ?? 0) - (bal.sick_used ?? 0)
                          return (
                            <tr key={row.user?._id || bal._id} className="hover:bg-muted/30">
                              <td className="px-6 py-3">
                                <p className="font-medium">{displayName(row.user)}</p>
                                <p className="text-xs text-muted-foreground">{row.user?.department}</p>
                              </td>
                              <td className="px-6 py-3">
                                {annualRem} / {bal.annual_total ?? 0}
                              </td>
                              <td className="px-6 py-3">
                                {sickRem} / {bal.sick_total ?? 0}
                              </td>
                              <td className="px-6 py-3 text-right">
                                <Button size="sm" variant="ghost" onClick={() => openEditBalance(row)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leave calendar ({year})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading && calendar.length === 0 ? (
                <TableSkeleton rows={6} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3">Employee</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">From</th>
                        <th className="px-6 py-3">To</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {calendar.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-muted-foreground">
                            No pending or approved leave in this period.
                          </td>
                        </tr>
                      ) : (
                        calendar.map((item) => (
                          <tr key={item._id} className="hover:bg-muted/30">
                            <td className="px-6 py-3 font-medium">
                              {item.userName || displayName(item.user)}
                              {item.department ? (
                                <p className="text-xs text-muted-foreground">{item.department}</p>
                              ) : null}
                            </td>
                            <td className="px-6 py-3">
                              <Badge variant="outline">{item.type}</Badge>
                            </td>
                            <td className="px-6 py-3">
                              {format(new Date(item.startDate), "MMM d, yyyy")}
                            </td>
                            <td className="px-6 py-3">
                              {format(new Date(item.endDate), "MMM d, yyyy")}
                            </td>
                            <td className="px-6 py-3">
                              <Badge variant={item.status === "approved" ? "default" : "secondary"}>
                                {item.status}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={syncHolidays} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : `Sync ${year} holidays`}
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {loading && holidays.length === 0 ? (
                <TableSkeleton rows={6} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Name</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {holidays.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="text-center py-8 text-muted-foreground">
                            No holidays for {year}. Sync from public holiday API.
                          </td>
                        </tr>
                      ) : (
                        holidays.map((h) => (
                          <tr key={h._id || `${h.date}-${h.name}`} className="hover:bg-muted/30">
                            <td className="px-6 py-3">
                              {format(new Date(h.date), "EEE, MMM d, yyyy")}
                            </td>
                            <td className="px-6 py-3 font-medium">{h.name}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit leave totals — {editName}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label>Annual total</Label>
              <Input
                type="number"
                min={0}
                value={editForm.annual_total}
                onChange={(e) => setEditForm((f) => ({ ...f, annual_total: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Sick total</Label>
              <Input
                type="number"
                min={0}
                value={editForm.sick_total}
                onChange={(e) => setEditForm((f) => ({ ...f, sick_total: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveBalance} disabled={savingBalance}>
              {savingBalance ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
