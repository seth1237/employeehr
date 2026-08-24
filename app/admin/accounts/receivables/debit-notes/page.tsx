"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
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
import { Download, Plus, Trash2 } from "lucide-react"

type DraftItem = {
  productId: string
  productName: string
  quantity: string
  unitPrice: string
  description: string
}

const DEFAULT_REASONS: Record<string, string> = {
  undercharged: "Customer was undercharged",
  additional_items: "Additional items or services billed",
  shipping: "Shipping / delivery charges",
  price_correction: "Price correction after invoicing",
  other: "Other",
}

export default function DebitNotesPage() {
  const searchParams = useSearchParams()
  const preselectedInvoiceId = searchParams.get("invoiceId") || ""

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [view, setView] = useState<"list" | "create">("list")
  const [notes, setNotes] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [reasons, setReasons] = useState<Record<string, string>>(DEFAULT_REASONS)
  const [statusFilter, setStatusFilter] = useState("all")
  const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId)
  const [reason, setReason] = useState("undercharged")
  const [reasonDetails, setReasonDetails] = useState("")
  const [items, setItems] = useState<DraftItem[]>([
    { productId: "", productName: "", quantity: "1", unitPrice: "", description: "" },
  ])

  const loadAll = async (silent = false) => {
    try {
      if (silent) setRefreshing(true)
      else setLoading(true)
      const [notesRes, invoicesRes, reasonsRes] = await Promise.all([
        api.debitNotes.getAll(statusFilter === "all" ? undefined : { status: statusFilter }),
        api.debitNotes.getInvoicesForDebitNote(),
        api.debitNotes.getReasons().catch(() => ({ data: DEFAULT_REASONS })),
      ])
      setNotes(notesRes.data || [])
      setInvoices(invoicesRes.data || [])
      setReasons(reasonsRes.data || DEFAULT_REASONS)
    } catch (error: any) {
      window.alert(error?.message || "Failed to load debit notes")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [statusFilter])

  useEffect(() => {
    if (preselectedInvoiceId) {
      setInvoiceId(preselectedInvoiceId)
      setView("create")
    }
  }, [preselectedInvoiceId])

  const selectedInvoice = useMemo(
    () => invoices.find((inv) => String(inv._id) === String(invoiceId)) || null,
    [invoices, invoiceId],
  )

  const draftTotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        const qty = Number(item.quantity || 0)
        const price = Number(item.unitPrice || 0)
        return sum + qty * price
      }, 0),
    [items],
  )

  const stats = useMemo(() => {
    const issued = notes.filter((n) => n.status === "issued")
    return {
      total: notes.length,
      issued: issued.length,
      issuedAmount: issued.reduce((s, n) => s + Number(n.subTotal || 0), 0),
      drafts: notes.filter((n) => n.status === "draft").length,
    }
  }, [notes])

  const fillFromInvoice = () => {
    if (!selectedInvoice?.items?.length) return
    setItems(
      selectedInvoice.items.slice(0, 5).map((item: any) => ({
        productId: String(item.productId || ""),
        productName: item.productName,
        quantity: "1",
        unitPrice: String(item.unitPrice || 0),
        description: "Additional charge",
      })),
    )
  }

  const createNote = async () => {
    if (!invoiceId) {
      window.alert("Select a stock invoice")
      return
    }
    const payloadItems = items
      .filter((item) => item.productName.trim() && Number(item.quantity) > 0)
      .map((item) => ({
        productId: item.productId || item.productName,
        productName: item.productName.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice || 0),
        description: item.description.trim() || undefined,
      }))
    if (payloadItems.length === 0) {
      window.alert("Add at least one charge line")
      return
    }
    if (reason === "other" && !reasonDetails.trim()) {
      window.alert("Enter reason details")
      return
    }
    try {
      setSubmitting(true)
      await api.debitNotes.create({
        invoiceId,
        items: payloadItems,
        reason,
        reasonDetails: reason === "other" ? reasonDetails.trim() : undefined,
      })
      setView("list")
      setItems([{ productId: "", productName: "", quantity: "1", unitPrice: "", description: "" }])
      setReasonDetails("")
      await loadAll(true)
    } catch (error: any) {
      window.alert(error?.message || "Failed to create debit note")
    } finally {
      setSubmitting(false)
    }
  }

  const issueNote = async (id: string) => {
    try {
      await api.debitNotes.issue(id)
      await loadAll(true)
    } catch (error: any) {
      window.alert(error?.message || "Failed to issue debit note")
    }
  }

  const deleteNote = async (id: string) => {
    if (!window.confirm("Delete this draft debit note?")) return
    try {
      await api.debitNotes.delete(id)
      await loadAll(true)
    } catch (error: any) {
      window.alert(error?.message || "Failed to delete debit note")
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading debit notes" rows={8} />

  return (
    <FinanceDocumentShell
      eyebrow="Sales & Receivables"
      title="Debit Notes"
      description="Raise additional charges against stock invoices. Issued debit notes increase customer outstanding balance on Debtors and Aging."

      onRefresh={() => loadAll(true)}
      refreshing={refreshing}
      kpis={[
        { label: "Debit Notes", value: stats.total },
        { label: "Issued", value: stats.issued, accent: "primary" },
        { label: "Issued Value", value: stats.issuedAmount, prefix: "KES", accent: "danger" },
        { label: "Drafts", value: stats.drafts, accent: "secondary" },
      ]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/stock/invoices">Stock invoices</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link href="/admin/accounts/debts">Debtors</Link>
          </Button>
          {view === "list" ? (
            <Button size="sm" onClick={() => setView("create")}>
              <Plus className="h-4 w-4 mr-1" />
              New debit note
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setView("list")}>
              Back to list
            </Button>
          )}
        </div>
      }
    >
      {view === "create" ? (
        <FinanceTableCard title="Create debit note against stock invoice">
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label>Stock invoice</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
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
              {selectedInvoice ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Invoice total KES {Number(selectedInvoice.grandTotal || selectedInvoice.subTotal || 0).toFixed(2)} ·{" "}
                  <button type="button" className="text-primary underline" onClick={fillFromInvoice}>
                    Prefill from invoice lines
                  </button>
                </p>
              ) : null}
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(reasons).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reason === "other" ? (
              <div>
                <Label>Reason details</Label>
                <Input value={reasonDetails} onChange={(e) => setReasonDetails(e.target.value)} />
              </div>
            ) : (
              <div />
            )}

            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Charge lines</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setItems((prev) => [
                      ...prev,
                      { productId: "", productName: "", quantity: "1", unitPrice: "", description: "" },
                    ])
                  }
                >
                  Add line
                </Button>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="grid gap-2 md:grid-cols-[1.4fr_80px_120px_1fr_36px]">
                  <Input
                    placeholder="Item / charge name"
                    value={item.productName}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, productName: e.target.value } : row)),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, quantity: e.target.value } : row)),
                      )
                    }
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="Unit price"
                    value={item.unitPrice}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, unitPrice: e.target.value } : row)),
                      )
                    }
                  />
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, description: e.target.value } : row)),
                      )
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={items.length === 1}
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <p className="text-sm font-medium tabular-nums">
                Draft total: KES {draftTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="md:col-span-2 flex gap-2">
              <Button onClick={() => void createNote()} disabled={submitting}>
                {submitting ? "Saving…" : "Save draft debit note"}
              </Button>
              <Button variant="outline" onClick={() => setView("list")}>
                Cancel
              </Button>
            </div>
          </div>
        </FinanceTableCard>
      ) : (
        <FinanceTableCard
          title="Debit notes register"
          headerRight={
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/80">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3">Debit note</th>
                  <th className="py-2 px-3">Invoice</th>
                  <th className="py-2 px-3">Customer</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {notes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No debit notes yet. Create one against a stock invoice.
                    </td>
                  </tr>
                ) : (
                  notes.map((note, idx) => (
                    <tr key={note._id} className={`border-b ${idx % 2 ? "bg-muted/20" : "bg-white"}`}>
                      <td className="py-2 px-3 font-medium">{note.debitNoteNumber}</td>
                      <td className="py-2 px-3">
                        <Link
                          href={`/admin/stock/invoices/${note.invoiceId}`}
                          className="text-primary hover:underline"
                        >
                          {note.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-2 px-3">{note.client?.name}</td>
                      <td className="py-2 px-3">
                        {reasons[note.reason] || note.reason}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {Number(note.subTotal || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant="outline">{note.status}</Badge>
                      </td>
                      <td className="py-2 px-3 space-x-1">
                        {note.status === "draft" ? (
                          <>
                            <Button size="sm" onClick={() => void issueNote(note._id)}>
                              Issue
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => void deleteNote(note._id)}>
                              Delete
                            </Button>
                          </>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void api.debitNotes.downloadPdf(note._id, note.debitNoteNumber)}
                        >
                          <Download className="h-3.5 w-3.5 mr-1" />
                          PDF
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </FinanceTableCard>
      )}
    </FinanceDocumentShell>
  )
}
