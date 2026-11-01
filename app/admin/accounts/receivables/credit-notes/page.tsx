"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Download, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { api } from "@/lib/api"

const DEFAULT_REASONS: Record<string, string> = {
  returned: "Goods are returned",
  overcharged: "Services were overcharged",
  incorrect_items: "Incorrect items were billed",
  discounts_applied: "Discounts are applied after invoicing",
  partial_cancel: "An order is partially canceled",
  other: "Other",
}

export default function AccountsCreditNotesPage() {
  const searchParams = useSearchParams()
  const preselectedInvoiceId = searchParams.get("invoiceId") || ""
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState<"list" | "create">(preselectedInvoiceId ? "create" : "list")
  const [notes, setNotes] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [reasons, setReasons] = useState<Record<string, string>>(DEFAULT_REASONS)
  const [statusFilter, setStatusFilter] = useState("all")
  const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId)
  const [reason, setReason] = useState("returned")
  const [reasonDetails, setReasonDetails] = useState("")
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const loadAll = async (silent = false) => {
    try {
      if (silent) setRefreshing(true)
      else setLoading(true)
      const [notesRes, invoicesRes, reasonsRes] = await Promise.all([
        api.creditNotes.getAll({
          ...(statusFilter === "all" ? {} : { status: statusFilter }),
          limit: 100,
        }),
        api.creditNotes.getInvoicesForCreditNote(),
        api.creditNotes.getReasons().catch(() => ({ data: DEFAULT_REASONS })),
      ])
      setNotes(notesRes.data || [])
      setInvoices(invoicesRes.data || [])
      setReasons(reasonsRes.data || DEFAULT_REASONS)
    } catch (error: any) {
      window.alert(error?.message || "Failed to load credit notes")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadAll()
  }, [statusFilter])

  const selectedInvoice = useMemo(
    () => invoices.find((inv) => String(inv._id) === String(invoiceId)) || null,
    [invoices, invoiceId],
  )

  const draftTotal = useMemo(() => {
    if (!selectedInvoice) return 0
    return (selectedInvoice.items || []).reduce((sum: number, item: any) => {
      const qty = Number(quantities[item.productId] || 0)
      return sum + qty * Number(item.unitPrice || 0)
    }, 0)
  }, [selectedInvoice, quantities])

  const stats = useMemo(() => {
    const issued = notes.filter((n) => n.status === "issued" || n.status === "applied")
    return {
      total: notes.length,
      issued: issued.length,
      issuedAmount: issued.reduce((sum, note) => sum + Number(note.subTotal || 0), 0),
      drafts: notes.filter((n) => n.status === "draft").length,
    }
  }, [notes])

  const createNote = async () => {
    if (!invoiceId || !selectedInvoice) {
      window.alert("Select a stock invoice")
      return
    }
    const items = (selectedInvoice.items || [])
      .map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: Number(quantities[item.productId] || 0),
        unitPrice: Number(item.unitPrice || 0),
      }))
      .filter((item: any) => item.quantity > 0)
    if (!items.length) {
      window.alert("Enter a quantity to credit on at least one line")
      return
    }
    if (reason === "other" && !reasonDetails.trim()) {
      window.alert("Enter reason details")
      return
    }
    try {
      setSubmitting(true)
      await api.creditNotes.create({
        invoiceId,
        items,
        reason,
        reasonDetails: reason === "other" ? reasonDetails.trim() : undefined,
      })
      setView("list")
      setQuantities({})
      setReasonDetails("")
      await loadAll(true)
    } catch (error: any) {
      window.alert(error?.message || "Failed to create credit note")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading credit notes" rows={8} />

  return (
    <FinanceDocumentShell
      eyebrow="Sales & Receivables"
      title="Credit Notes"
      description="Issue credit notes against stock invoices. Issued notes reduce the customer balance on debtors and statements."
      moduleNavGroupId="receivables"
      onRefresh={() => void loadAll(true)}
      refreshing={refreshing}
      kpis={[
        { label: "Credit notes", value: stats.total },
        { label: "Issued", value: stats.issued, accent: "primary" },
        { label: "Issued value", value: stats.issuedAmount, prefix: "KES", accent: "danger" },
        { label: "Drafts", value: stats.drafts, accent: "secondary" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/accounts/receivables">Receivables</Link>
          </Button>
          {view === "list" ? (
            <Button size="sm" onClick={() => setView("create")}>
              <Plus className="mr-1 h-4 w-4" />
              New credit note
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setView("list")}>
              Back to list
            </Button>
          )}
        </div>
      }
      toolbar={
        view === "list" ? (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="applied">Applied</SelectItem>
            </SelectContent>
          </Select>
        ) : null
      }
    >
      {view === "create" ? (
        <FinanceTableCard title="Create credit note">
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Stock invoice</Label>
              <Select value={invoiceId} onValueChange={(value) => { setInvoiceId(value); setQuantities({}) }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map((inv) => (
                    <SelectItem key={inv._id} value={inv._id}>
                      {inv.invoiceNumber} · {inv.client?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(reasons).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reason === "other" ? (
              <div>
                <Label>Details</Label>
                <Textarea value={reasonDetails} onChange={(e) => setReasonDetails(e.target.value)} />
              </div>
            ) : null}
            <div className="md:col-span-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Invoiced</th>
                    <th className="px-3 py-2 text-right">Credit qty</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice?.items || []).map((item: any) => (
                    <tr key={item.productId} className="border-b">
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={item.quantity}
                          className="h-8 w-24 ml-auto"
                          value={quantities[item.productId] || ""}
                          onChange={(e) => setQuantities((prev) => ({ ...prev, [item.productId]: Number(e.target.value) }))}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {((quantities[item.productId] || 0) * Number(item.unitPrice || 0)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm font-medium">Credit total: KES {draftTotal.toLocaleString()}</p>
              <Button className="mt-3" onClick={() => void createNote()} disabled={submitting}>
                {submitting ? "Saving…" : "Save credit note"}
              </Button>
            </div>
          </div>
        </FinanceTableCard>
      ) : (
        <FinanceTableCard title="Credit notes">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Number</th>
                <th className="px-4 py-2">Invoice</th>
                <th className="px-4 py-2">Customer</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {notes.map((note) => (
                <tr key={note._id} className="border-b">
                  <td className="px-4 py-2">{note.creditNoteNumber}</td>
                  <td className="px-4 py-2">{note.invoiceNumber}</td>
                  <td className="px-4 py-2">{note.client?.name}</td>
                  <td className="px-4 py-2"><Badge variant="outline">{note.status}</Badge></td>
                  <td className="px-4 py-2 text-right">{Number(note.subTotal || 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      {note.status === "draft" ? (
                        <Button size="sm" variant="outline" onClick={async () => {
                          await api.creditNotes.issue(note._id)
                          await loadAll(true)
                        }}>Issue</Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => void api.creditNotes.downloadPdf(note._id)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </FinanceTableCard>
      )}
    </FinanceDocumentShell>
  )
}
