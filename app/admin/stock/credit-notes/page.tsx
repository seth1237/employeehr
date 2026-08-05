"use client"

import { useEffect, useState } from "react"
import { Plus, ChevronLeft, Download, AlertCircle, CheckCircle, Trash2, Edit2, Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { finishDataLoad, startDataLoad } from "@/lib/silent-load"
import { TableSkeleton } from "@/components/admin/ui/page-states"
import { api } from "@/lib/api"

interface CreditNote {
  _id: string
  creditNoteNumber: string
  invoiceNumber: string
  client: { name: string; number: string; location: string }
  items: Array<any>
  subTotal: number
  reason: string
  reasonDetails?: string
  status: "draft" | "issued" | "applied"
  createdAt: string
}

interface Invoice {
  _id: string
  invoiceNumber: string
  client: { name: string; number: string; location: string }
  items: Array<{ productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }>
  subTotal: number
}

interface Branding {
  primaryColor?: string
  secondaryColor?: string
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return `rgba(15, 118, 110, ${alpha})`
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const REASON_OPTIONS = {
  returned: "Goods are returned",
  overcharged: "Services were overcharged",
  incorrect_items: "Incorrect items were billed",
  discounts_applied: "Discounts are applied after invoicing",
  partial_cancel: "An order is partially canceled",
  other: "Other",
}

export default function CreditNotesPage() {
  const { toast } = useToast()
  const [view, setView] = useState<"list" | "create" | "edit">("list")
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({})
  const [reason, setReason] = useState("returned")
  const [reasonDetails, setReasonDetails] = useState("")
  const [editingCreditNote, setEditingCreditNote] = useState<CreditNote | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("")
  const [branding, setBranding] = useState<Branding>({})

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  // Fetch credit notes
  const fetchCreditNotes = async (opts?: { silent?: boolean }) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const query = statusFilter === "all" ? {} : { status: statusFilter }
      const res = await api.creditNotes.getAll(query)
      if (res.success) {
        setCreditNotes(res.data || [])
      }
    } catch (error: any) {
      toast({ description: error.message || "Failed to fetch credit notes", variant: "destructive" })
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  // Fetch invoices for credit note creation
  const fetchInvoices = async () => {
    try {
      const res = await api.creditNotes.getInvoicesForCreditNote()
      if (res.success) {
        setInvoices(res.data || [])
      }
    } catch (error: any) {
      toast({ description: error.message || "Failed to fetch invoices", variant: "destructive" })
    }
  }

  // Fetch reasons
  const fetchReasons = async () => {
    try {
      const res = await api.creditNotes.getReasons()
      if (res.success) {
        setReasons(res.data || REASON_OPTIONS)
      }
    } catch (error) {
      setReasons(REASON_OPTIONS)
    }
  }

  const fetchBranding = async () => {
    try {
      const res = await api.company.getBranding()
      if (res.success) {
        setBranding(res.data || {})
      }
    } catch {
      setBranding({})
    }
  }

  useEffect(() => {
    fetchCreditNotes()
    fetchReasons()
  }, [statusFilter])

  useEffect(() => {
    fetchBranding()
  }, [])

  useEffect(() => {
    if (view === "create") {
      fetchInvoices()
    }
  }, [view])

  // Reset form
  const resetForm = () => {
    setSelectedInvoice(null)
    setSelectedItems({})
    setReason("returned")
    setReasonDetails("")
    setEditingCreditNote(null)
    setInvoiceSearchQuery("")
  }

  // Filter invoices based on search query
  const filteredInvoices = invoices.filter((invoice) => {
    const query = invoiceSearchQuery.toLowerCase()
    return (
      invoice.invoiceNumber.toLowerCase().includes(query) ||
      invoice.client.name.toLowerCase().includes(query) ||
      invoice.client.location.toLowerCase().includes(query)
    )
  })

  // Handle create credit note
  const handleCreateCreditNote = async () => {
    if (!selectedInvoice) {
      toast({ description: "Please select an invoice", variant: "destructive" })
      return
    }

    const itemsToCreate = Object.entries(selectedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const item = selectedInvoice.items.find((i) => i.productId === productId)
        return {
          productId,
          productName: item?.productName || "",
          quantity,
          unitPrice: item?.unitPrice || 0,
        }
      })

    if (itemsToCreate.length === 0) {
      toast({ description: "Please select at least one item", variant: "destructive" })
      return
    }

    if (reason === "other" && !reasonDetails.trim()) {
      toast({ description: "Please provide details for 'Other' reason", variant: "destructive" })
      return
    }

    try {
      setSaving(true)
      const res = await api.creditNotes.create({
        invoiceId: selectedInvoice._id,
        items: itemsToCreate,
        reason,
        reasonDetails: reason === "other" ? reasonDetails : undefined,
      })

      if (res.success) {
        toast({ description: "Credit note created successfully" })
        resetForm()
        setView("list")
        fetchCreditNotes({ silent: true })
      }
    } catch (error: any) {
      toast({ description: error.message || "Failed to create credit note", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Handle issue credit note
  const handleIssueCreditNote = async (id: string) => {
    try {
      setSaving(true)
      const res = await api.creditNotes.issue(id)
      if (res.success) {
        toast({ description: "Credit note issued successfully" })
        fetchCreditNotes({ silent: true })
      }
    } catch (error: any) {
      toast({ description: error.message || "Failed to issue credit note", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Handle delete credit note
  const handleDeleteCreditNote = async (id: string) => {
    if (!confirm("Are you sure you want to delete this credit note?")) return

    try {
      setSaving(true)
      const res = await api.creditNotes.delete(id)
      if (res.success) {
        toast({ description: "Credit note deleted successfully" })
        fetchCreditNotes({ silent: true })
      }
    } catch (error: any) {
      toast({ description: error.message || "Failed to delete credit note", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  // Handle download credit note PDF
  const handleDownloadCreditNote = async (id: string) => {
    try {
      setDownloadingId(id)
      await api.creditNotes.downloadPdf(id)
      toast({ description: "Credit note PDF downloaded successfully" })
    } catch (error: any) {
      toast({ description: error.message || "Failed to download credit note PDF", variant: "destructive" })
    } finally {
      setDownloadingId(null)
    }
  }

  // Calculate total for selected items
  const calculateTotal = () => {
    if (!selectedInvoice) return 0
    return Object.entries(selectedItems)
      .filter(([_, qty]) => qty > 0)
      .reduce((sum, [productId, quantity]) => {
        const item = selectedInvoice.items.find((i) => i.productId === productId)
        return sum + ((item?.unitPrice || 0) * quantity)
      }, 0)
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      {view === "list" ? (
        <>
          {/* Header */}
          <div
            className="flex flex-col gap-3 rounded-2xl border px-4 py-4 shadow-sm sm:flex-row sm:items-start sm:justify-between"
            style={{
              borderColor: primaryBorderColor,
              background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})`,
            }}
          >
            <div className="space-y-2">
              <p className="text-sm font-medium tracking-wide" style={{ color: primaryColor }}>Credit Management</p>
              <h1 className="text-3xl font-bold">Credit Notes</h1>
              <p className="text-muted-foreground">Manage credit notes for invoices</p>
            </div>
            <Button
              onClick={() => { resetForm(); setView("create") }}
              className="gap-2 text-white hover:opacity-90"
              style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
            >
              <Plus className="h-4 w-4" /> Create Credit Note
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="issued">Issued</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Notes List */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Notes ({creditNotes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && !refreshing ? (
                <TableSkeleton rows={8} />
              ) : creditNotes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No credit notes found
                </div>
              ) : (
                <div className="space-y-3">
                  {creditNotes.map((note) => (
                    <div key={note._id} className="border rounded-lg p-4 hover:bg-muted/50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{note.creditNoteNumber}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              note.status === "draft" ? "bg-yellow-100 text-yellow-800" :
                              note.status === "issued" ? "bg-blue-100 text-blue-800" :
                              "bg-green-100 text-green-800"
                            }`}>
                              {note.status}
                            </span>
                            <span className="text-sm text-muted-foreground">Invoice: {note.invoiceNumber}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {note.client.name} • {note.items.length} item(s)
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span>{reasons[note.reason] || note.reason}</span>
                            {note.reasonDetails && <span className="text-muted-foreground italic">({note.reasonDetails})</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold">KSh {note.subTotal.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        {note.status === "draft" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { handleIssueCreditNote(note._id) }}
                              disabled={saving}
                              className="gap-2"
                            >
                              <CheckCircle className="h-4 w-4" /> Issue
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { handleDeleteCreditNote(note._id) }}
                              disabled={saving}
                              className="gap-2 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="outline" className="gap-2" onClick={() => handleDownloadCreditNote(note._id)} disabled={downloadingId === note._id}>
                          <Download className="h-4 w-4" /> {downloadingId === note._id ? "Downloading..." : "Download"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : view === "create" ? (
        <>
          {/* Create Credit Note */}
          <div className="flex items-center gap-2 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("list")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold" style={{ color: primaryColor }}>Create Credit Note</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Invoice Selection */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Select Invoice</CardTitle>
                <CardDescription>Choose an invoice to create a credit note from</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Invoice */}
                <div className="space-y-3">
                  <Label htmlFor="invoice-search">Search Invoice</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="invoice-search"
                      placeholder="Search by invoice #, client name or location..."
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                    {invoiceSearchQuery && (
                      <button
                        onClick={() => setInvoiceSearchQuery("")}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Invoice List */}
                <div className="space-y-2">
                  {invoiceSearchQuery && filteredInvoices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No invoices found matching "{invoiceSearchQuery}"
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No invoices available
                    </div>
                  ) : (
                    <div className="border rounded-lg max-h-64 overflow-y-auto space-y-1">
                      {(invoiceSearchQuery ? filteredInvoices : invoices).map((invoice) => (
                        <button
                          key={invoice._id}
                          onClick={() => {
                            setSelectedInvoice(invoice)
                            setSelectedItems({})
                            setInvoiceSearchQuery("")
                          }}
                          className={`w-full p-3 text-left hover:bg-accent border-b last:border-b-0 rounded transition-colors ${
                            selectedInvoice?._id === invoice._id ? "bg-accent" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{invoice.invoiceNumber}</p>
                              <p className="text-sm text-muted-foreground">{invoice.client.name}</p>
                              <p className="text-xs text-muted-foreground">{invoice.client.location}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">KSh {invoice.subTotal.toLocaleString()}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {selectedInvoice && (
                  <div className="space-y-4">
                    {/* Invoice Summary */}
                    <div className="bg-muted p-4 rounded-lg space-y-2">
                      <h4 className="font-semibold">Invoice Summary</h4>
                      <p className="text-sm"><strong>Number:</strong> {selectedInvoice.invoiceNumber}</p>
                      <p className="text-sm"><strong>Client:</strong> {selectedInvoice.client.name}</p>
                      <p className="text-sm"><strong>Location:</strong> {selectedInvoice.client.location}</p>
                      <p className="text-sm"><strong>Total:</strong> KSh {selectedInvoice.subTotal.toLocaleString()}</p>
                    </div>

                    {/* Items Selection */}
                    <div>
                      <h4 className="font-semibold mb-3">Select Items to Credit</h4>
                      <div className="space-y-3">
                        {selectedInvoice.items.map((item) => (
                          <div key={item.productId} className="border rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium">{item.productName}</h5>
                                <p className="text-sm text-muted-foreground">
                                  Qty: {item.quantity} × KSh {item.unitPrice.toLocaleString()} = KSh {item.lineTotal.toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.quantity}
                                  value={selectedItems[item.productId] || 0}
                                  onChange={(e) => {
                                    const qty = Math.min(Math.max(0, parseInt(e.target.value) || 0), item.quantity)
                                    setSelectedItems({
                                      ...selectedItems,
                                      [item.productId]: qty,
                                    })
                                  }}
                                  className="w-20"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Credit Note Details */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Credit Note Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Reason */}
                <div className="space-y-2">
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

                {/* Reason Details for "Other" */}
                {reason === "other" && (
                  <div className="space-y-2">
                    <Label>Reason Details</Label>
                    <Textarea
                      placeholder="Describe the reason for this credit note..."
                      value={reasonDetails}
                      onChange={(e) => setReasonDetails(e.target.value)}
                      className="h-24"
                    />
                  </div>
                )}

                {/* Summary */}
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Items Selected:</span>
                    <strong>{Object.values(selectedItems).filter((q) => q > 0).length}</strong>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold">Total Credit:</span>
                    <strong className="text-lg" style={{ color: primaryColor }}>KSh {calculateTotal().toLocaleString()}</strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setView("list")}
                    disabled={saving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCreditNote}
                    disabled={saving || !selectedInvoice}
                    className="flex-1 text-white hover:opacity-90"
                    style={{ backgroundColor: primaryColor, borderColor: primaryColor }}
                  >
                    {saving ? "Creating..." : "Create"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
