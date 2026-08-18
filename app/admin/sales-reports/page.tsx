"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { salesApi } from "@/lib/api"
import { downloadSalesQuotePdf } from "@/lib/sales-quote-pdf"

export default function AdminSalesReportsPage() {
  const { toast } = useToast()
  const [pendingOnly, setPendingOnly] = useState(true)
  const [reports, setReports] = useState<any[]>([])
  const [quotes, setQuotes] = useState<any[]>([])
  const [editing, setEditing] = useState<any>(null)
  const [editingQuote, setEditingQuote] = useState<any>(null)
  const [rejectNote, setRejectNote] = useState("")

  const load = useCallback(async () => {
    try {
      const res = await salesApi.adminList(pendingOnly ? "pending" : undefined)
      setReports(res.data?.reports || [])
      setQuotes(res.data?.quotes || [])
    } catch (error: any) {
      toast({ title: "Could not load sales reports", description: error?.message, variant: "destructive" })
    }
  }, [pendingOnly, toast])

  useEffect(() => {
    void load()
  }, [load])

  const reviewReport = async (id: string, action: "approve" | "revision") => {
    try {
      await salesApi.adminReviewReport(id, { action })
      toast({ title: action === "approve" ? "Report approved" : "Revision requested" })
      void load()
    } catch (error: any) {
      toast({ title: "Update failed", description: error?.message, variant: "destructive" })
    }
  }

  const reviewQuote = async (id: string, action: "approve" | "reject", note?: string) => {
    try {
      await salesApi.adminReviewQuote(id, { action, note })
      toast({ title: action === "approve" ? "Quote approved" : "Quote sent back" })
      setRejectNote("")
      void load()
    } catch (error: any) {
      toast({ title: "Update failed", description: error?.message, variant: "destructive" })
    }
  }

  const saveEdit = async () => {
    if (!editing?._id) return
    try {
      await salesApi.adminUpdateReport(editing._id, {
        plannedVisits: Number(editing.plannedVisits || 0),
        newLeads: Number(editing.newLeads || 0),
        ordersCount: Number(editing.ordersCount || 0),
        ordersValue: Number(editing.ordersValue || 0),
        expenses: Number(editing.expenses || 0),
        mileage: Number(editing.mileage || 0),
        blockers: editing.blockers,
        notes: editing.notes,
      })
      toast({ title: "Report updated" })
      setEditing(null)
      void load()
    } catch (error: any) {
      toast({ title: "Save failed", description: error?.message, variant: "destructive" })
    }
  }

  const saveQuoteEdit = async () => {
    if (!editingQuote?._id) return
    try {
      await salesApi.adminUpdateQuote(editingQuote._id, {
        clientName: editingQuote.clientName,
        clientPhone: editingQuote.clientPhone,
        notes: editingQuote.notes,
        items: editingQuote.items,
      })
      toast({ title: "Quote updated" })
      setEditingQuote(null)
      void load()
    } catch (error: any) {
      toast({ title: "Save failed", description: error?.message, variant: "destructive" })
    }
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sales reports</h1>
          <p className="text-sm text-muted-foreground">
            Approve daily reports and quotes from sales representatives. Reps do not see this screen.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(e) => setPendingOnly(e.target.checked)}
          />
          Pending only
        </label>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Daily reports ({reports.length})</TabsTrigger>
          <TabsTrigger value="quotes">Quotes ({quotes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="reports" className="space-y-3">
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports in this filter.</p>
          ) : (
            reports.map((report) => (
              <Card key={report._id}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>
                      {report.repName} · {report.date}
                    </span>
                    <Badge variant="outline">{report.status.replace("_", " ")}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>
                    Planned {report.plannedVisits || 0} · Leads {report.newLeads || 0} · Orders{" "}
                    {report.ordersCount || 0} · Expenses {report.expenses || 0}
                  </p>
                  {report.blockers ? <p className="text-amber-800">Blockers: {report.blockers}</p> : null}
                  {report.notes ? <p className="text-muted-foreground">Notes: {report.notes}</p> : null}

                  {(report.visits || []).length > 0 ? (
                    <div className="rounded-md border bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                        Visits ({report.visits.length})
                      </p>
                      <div className="space-y-2">
                        {report.visits.map((visit: any) => (
                          <div key={visit._id} className="text-xs">
                            <span className="font-medium">{visit.clientName}</span>
                            {" · "}
                            {visit.visitType}
                            {visit.outcome ? ` · ${visit.outcome}` : ""}
                            {visit.gps?.lat ? " · GPS captured" : ""}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No visits logged on this report.</p>
                  )}

                  {editing?._id === report._id ? (
                    <div className="grid gap-2 md:grid-cols-3">
                      {["plannedVisits", "newLeads", "ordersCount", "ordersValue", "expenses", "mileage"].map((key) => (
                        <div key={key} className="space-y-1">
                          <Label className="text-xs">{key}</Label>
                          <Input
                            type="number"
                            value={editing[key] ?? 0}
                            onChange={(e) => setEditing((c: any) => ({ ...c, [key]: e.target.value }))}
                          />
                        </div>
                      ))}
                      <div className="space-y-1 md:col-span-3">
                        <Label className="text-xs">Blockers</Label>
                        <Textarea
                          value={editing.blockers || ""}
                          onChange={(e) => setEditing((c: any) => ({ ...c, blockers: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1 md:col-span-3">
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          value={editing.notes || ""}
                          onChange={(e) => setEditing((c: any) => ({ ...c, notes: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2 md:col-span-3">
                        <Button size="sm" onClick={() => void saveEdit()}>Save edits</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditing(report)}>
                        Edit summary
                      </Button>
                      {report.status === "submitted" || report.status === "revision_requested" ? (
                        <>
                          <Button size="sm" onClick={() => void reviewReport(report._id, "approve")}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void reviewReport(report._id, "revision")}
                          >
                            Request revision
                          </Button>
                        </>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
        <TabsContent value="quotes" className="space-y-3">
          {quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotes in this filter.</p>
          ) : (
            quotes.map((quote) => (
              <Card key={quote._id}>
                <CardContent className="space-y-2 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {quote.quoteNumber} · {quote.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {quote.repName} · KES {Number(quote.grandTotal || 0).toLocaleString("en-KE")}
                      </p>
                    </div>
                    <Badge variant="outline">{quote.status}</Badge>
                  </div>
                  {editingQuote?._id === quote._id ? (
                    <div className="space-y-2">
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Client</Label>
                          <Input
                            value={editingQuote.clientName || ""}
                            onChange={(e) => setEditingQuote((c: any) => ({ ...c, clientName: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Phone</Label>
                          <Input
                            value={editingQuote.clientPhone || ""}
                            onChange={(e) => setEditingQuote((c: any) => ({ ...c, clientPhone: e.target.value }))}
                          />
                        </div>
                      </div>
                      {(editingQuote.items || []).map((item: any, index: number) => (
                        <div key={`${quote._id}-edit-${index}`} className="grid gap-2 md:grid-cols-3">
                          <div className="space-y-1 md:col-span-1">
                            <Label className="text-xs">Product</Label>
                            <Input value={item.productName} disabled />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                setEditingQuote((c: any) => {
                                  const items = [...(c.items || [])]
                                  items[index] = { ...items[index], quantity: Number(e.target.value || 0) }
                                  return { ...c, items }
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Unit price</Label>
                            <Input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) =>
                                setEditingQuote((c: any) => {
                                  const items = [...(c.items || [])]
                                  items[index] = { ...items[index], unitPrice: Number(e.target.value || 0) }
                                  return { ...c, items }
                                })
                              }
                            />
                          </div>
                        </div>
                      ))}
                      <div className="space-y-1">
                        <Label className="text-xs">Notes</Label>
                        <Textarea
                          value={editingQuote.notes || ""}
                          onChange={(e) => setEditingQuote((c: any) => ({ ...c, notes: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => void saveQuoteEdit()}>Save quote edits</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingQuote(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ul className="text-xs text-muted-foreground">
                        {(quote.items || []).map((item: any, index: number) => (
                          <li key={`${quote._id}-${index}`}>
                            {item.productName} × {item.quantity} @ {item.unitPrice} (tax {item.taxRate}%)
                          </li>
                        ))}
                      </ul>
                      {quote.notes ? <p className="text-xs">Notes: {quote.notes}</p> : null}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setEditingQuote(quote)}>
                          Edit quote
                        </Button>
                        {quote.status === "approved" || quote.status === "downloaded" ? (
                          <Button size="sm" variant="outline" onClick={() => void downloadSalesQuotePdf(quote)}>
                            Download PDF
                          </Button>
                        ) : null}
                        {quote.status === "submitted" || quote.status === "rejected" ? (
                          <>
                            <Button size="sm" onClick={() => void reviewQuote(quote._id, "approve")}>
                              Approve
                            </Button>
                            <Input
                              className="h-9 max-w-xs"
                              placeholder="Send-back reason"
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                void reviewQuote(
                                  quote._id,
                                  "reject",
                                  rejectNote || "Please revise quantities or pricing",
                                )
                              }
                            >
                              Send back
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
