"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { salesApi, stockApi } from "@/lib/api"
import {
  clientInvoicePdfUrl,
  downloadSalesInvoicePdf,
  downloadSalesQuotePdf,
} from "@/lib/sales-quote-pdf"
import { SalesClientPicker } from "@/components/sales/client-picker"
import { SalesEmpty, SalesHeader, SalesPage, SalesStatusBadge } from "@/components/sales/sales-ui"
import { useSalesBranding } from "@/hooks/use-sales-branding"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  FileText,
  Package,
  Trash2,
  Download,
  ArrowRightLeft,
  Copy,
  Pencil,
  ExternalLink,
  Filter,
  Clock,
} from "lucide-react"

type DraftItem = {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxable: boolean
  availableQtySnapshot: number
}

type StockQuote = {
  _id: string
  quotationNumber: string
  status: "draft" | "pending_approval" | "converted" | "cancelled"
  approvedAt?: string
  convertedInvoiceId?: string
  client?: { name?: string; number?: string; location?: string; contactPerson?: string }
  items?: Array<{
    productId?: string
    productName: string
    quantity: number
    unitPrice: number
    taxRate?: number
    taxAmount?: number
    lineTotal?: number
  }>
  subTotal?: number
  taxTotal?: number
  grandTotal?: number
  createdAt?: string
}

type StockInvoice = {
  _id: string
  invoiceNumber: string
  deliveryNoteNumber?: string
  quotationId?: string
  quotationNumber?: string
  status: "pending_approval" | "issued" | "paid" | "cancelled"
  client?: { name?: string; number?: string; location?: string }
  items?: Array<{
    productName: string
    quantity: number
    unitPrice: number
    taxRate?: number
    taxAmount?: number
    lineTotal?: number
  }>
  subTotal?: number
  taxTotal?: number
  grandTotal?: number
  createdAt?: string
}

function quoteIsApproved(quote: StockQuote) {
  return Boolean(quote.approvedAt) && quote.status !== "pending_approval" && quote.status !== "cancelled"
}

function quoteStatusLabel(quote: StockQuote, invoice?: StockInvoice) {
  if (invoice?.status === "pending_approval") return "Invoice pending approval"
  if (invoice?.status === "issued" || invoice?.status === "paid") return "Invoice approved"
  if (quote.status === "pending_approval") return "Awaiting quote approval"
  if (quote.status === "cancelled") return "Rejected"
  if (quote.status === "converted") return "Converted"
  if (quoteIsApproved(quote)) return "Approved"
  return quote.status.replaceAll("_", " ")
}

export default function SalesQuotesPage() {
  const { toast } = useToast()
  const branding = useSalesBranding()
  const [quotes, setQuotes] = useState<StockQuote[]>([])
  const [invoices, setInvoices] = useState<StockInvoice[]>([])
  const [productQuery, setProductQuery] = useState("")
  const [products, setProducts] = useState<any[]>([])
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientLocation, setClientLocation] = useState("")
  const [clientContactPerson, setClientContactPerson] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [items, setItems] = useState<DraftItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState("all")
  const [filtersOpen, setFiltersOpen] = useState(false)

  const primaryColor = branding.primaryColor

  const invoiceByQuoteId = useMemo(() => {
    const map = new Map<string, StockInvoice>()
    for (const invoice of invoices) {
      if (invoice.quotationId) map.set(String(invoice.quotationId), invoice)
    }
    return map
  }, [invoices])

  const load = useCallback(async () => {
    try {
      const [quoteRes, invoiceRes] = await Promise.all([
        stockApi.getQuotations(),
        stockApi.getInvoices().catch(() => ({ data: [] as StockInvoice[] })),
      ])
      setQuotes(quoteRes.data || [])
      setInvoices(invoiceRes.data || [])
    } catch (error: any) {
      toast({ title: "Could not load quotes", description: error?.message, variant: "destructive" })
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const name = params.get("client")
    const phone = params.get("phone")
    const id = params.get("id")
    const location = params.get("location")
    if (name) setClientName(name)
    if (phone) setClientPhone(phone)
    if (id) setCustomerId(id)
    if (location) setClientLocation(location)
  }, [])

  useEffect(() => {
    if (productQuery.trim().length < 2) {
      setProducts([])
      return
    }
    const handle = setTimeout(() => {
      void salesApi.searchStock(productQuery.trim(), true).then((res) => setProducts(res.data || []))
    }, 250)
    return () => clearTimeout(handle)
  }, [productQuery])

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const base = item.quantity * item.unitPrice
        const tax = item.taxable === false ? 0 : (base * (item.taxRate || 16)) / 100
        acc.subTotal += base
        acc.tax += tax
        acc.grand += base + tax
        return acc
      },
      { subTotal: 0, tax: 0, grand: 0 },
    )
  }, [items])

  const addProduct = (product: any) => {
    setItems((current) => {
      const existing = current.find((item) => item.productId === product._id)
      if (existing) {
        return current.map((item) =>
          item.productId === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }
      return [
        ...current,
        {
          productId: product._id,
          productName: product.name,
          quantity: 1,
          unitPrice: Number(product.sellingPrice || 0),
          taxRate: Number(product.taxRate || 16),
          taxable: Boolean(product.taxable),
          availableQtySnapshot: Number(product.currentQuantity || 0),
        },
      ]
    })
    setProductQuery("")
  }

  const resetDraft = () => {
    setItems([])
    setClientName("")
    setClientPhone("")
    setClientLocation("")
    setClientContactPerson("")
    setCustomerId("")
    setEditingId(null)
  }

  const saveQuote = async () => {
    if (!clientName.trim() || !clientPhone.trim() || items.length === 0) {
      toast({ title: "Add a client, phone number, and at least one product", variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const payload = {
        clientName: clientName.trim(),
        clientNumber: clientPhone.trim(),
        clientLocation: clientLocation.trim() || "N/A",
        clientContactPerson: clientContactPerson.trim(),
        items: items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxable: item.taxable,
          taxRate: item.taxRate,
        })),
      }
      if (editingId) {
        await stockApi.updateQuotation(editingId, payload)
        toast({ title: "Quote request updated" })
      } else {
        await stockApi.createQuotation(payload)
        toast({ title: "Quote sent for admin approval" })
      }
      resetDraft()
      void load()
    } catch (error: any) {
      toast({ title: "Could not save quote", description: error?.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const downloadApproved = async (quote: StockQuote) => {
    try {
      await downloadSalesQuotePdf(quote)
      toast({ title: "Quote PDF downloaded" })
    } catch (error: any) {
      toast({ title: "Download failed", description: error?.message, variant: "destructive" })
    }
  }

  const convertToInvoice = async (quote: StockQuote) => {
    setConvertingId(quote._id)
    try {
      await stockApi.convertQuotation(quote._id)
      toast({ title: "Invoice sent for admin approval" })
      void load()
    } catch (error: any) {
      toast({ title: "Convert failed", description: error?.message, variant: "destructive" })
    } finally {
      setConvertingId(null)
    }
  }

  const copyClientLink = async (invoice: StockInvoice) => {
    try {
      await navigator.clipboard.writeText(clientInvoicePdfUrl(invoice._id))
      toast({ title: "Client invoice link copied" })
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" })
    }
  }

  const downloadIssuedInvoice = async (invoice: StockInvoice) => {
    try {
      await downloadSalesInvoicePdf(invoice)
      toast({ title: "Invoice PDF downloaded" })
    } catch (error: any) {
      toast({ title: "Download failed", description: error?.message, variant: "destructive" })
    }
  }

  const loadForRework = (quote: StockQuote) => {
    setEditingId(quote.status === "cancelled" ? null : quote._id)
    setClientName(quote.client?.name || "")
    setClientPhone(quote.client?.number || "")
    setClientLocation(quote.client?.location || "")
    setClientContactPerson(quote.client?.contactPerson || "")
    setItems(
      (quote.items || []).map((item) => ({
        productId: String(item.productId || item.productName),
        productName: item.productName,
        quantity: Number(item.quantity || 1),
        unitPrice: Number(item.unitPrice || 0),
        taxRate: Number(item.taxRate || 16),
        taxable: Number(item.taxAmount || 0) > 0 || Number(item.taxRate || 0) > 0,
        availableQtySnapshot: 0,
      })),
    )
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const filteredQuotes = useMemo(() => {
    if (statusFilter === "all") return quotes
    return quotes.filter((quote) => {
      const invoice = invoiceByQuoteId.get(quote._id)
      if (statusFilter === "pending") return quote.status === "pending_approval"
      if (statusFilter === "approved") return quoteIsApproved(quote) && quote.status !== "converted"
      if (statusFilter === "rejected") return quote.status === "cancelled"
      if (statusFilter === "converted") return quote.status === "converted" || Boolean(invoice)
      return true
    })
  }, [quotes, statusFilter, invoiceByQuoteId])

  const filterCount = statusFilter === "all" ? 0 : 1

  const statusButtons = (
    <div className="flex flex-wrap gap-2">
      {[
        ["all", "All"],
        ["pending", "Pending"],
        ["approved", "Approved"],
        ["converted", "Invoiced"],
        ["rejected", "Rejected"],
      ].map(([value, label]) => (
        <Button
          key={value}
          size="sm"
          variant={statusFilter === value ? "secondary" : "outline"}
          className="min-h-10"
          onClick={() => {
            setStatusFilter(value)
            setFiltersOpen(false)
          }}
        >
          {label}
        </Button>
      ))}
    </div>
  )

  return (
    <SalesPage>
      <SalesHeader
        title="Quotes"
        description="Request a quote from live stock. Admin approves it before you can download or convert to an invoice."
        color={primaryColor}
      />

      {/* Quote Form */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" style={{ color: primaryColor }} />
            {editingId ? "Update quote request" : "New quote request"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SalesClientPicker
              value={clientName}
              clientId={customerId}
              required
              onChange={(next) => {
                setClientName(next.name)
                setCustomerId(next.clientId || "")
                if (next.phone) setClientPhone(next.phone)
                if (next.location) setClientLocation(next.location)
                if (next.contactPerson) setClientContactPerson(next.contactPerson)
              }}
            />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phone</Label>
              <Input 
                className="h-11" 
                value={clientPhone} 
                onChange={(e) => setClientPhone(e.target.value)} 
                placeholder="Client phone number"
              />
            </div>
          </div>

          <div className="space-y-1.5 relative">
            <Label className="text-xs font-medium">Search stock</Label>
            <div className="relative">
              <Package className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-11 pl-8"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                placeholder="Type a product name to add to quote"
              />
            </div>
            {products.length > 0 && productQuery.trim().length >= 2 && (
              <div className="absolute z-20 w-full top-[100%] mt-1 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto animate-in fade-in-0 zoom-in-95 duration-100">
                {products.map((product) => (
                  <button
                    key={product._id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors border-b last:border-0"
                    onClick={() => addProduct(product)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-medium block truncate">{product.name}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        In stock: {product.currentQuantity}
                        {product.taxable ? ` · Tax ${product.taxRate || 16}%` : " · No tax"}
                      </span>
                    </span>
                    <span className="font-semibold flex-shrink-0 ml-2">KES {Number(product.sellingPrice || 0).toLocaleString("en-KE")}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <>
              <div className="hidden overflow-x-auto rounded-md border md:block">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Product</th>
                      <th className="px-3 py-2.5 font-medium w-24">Qty</th>
                      <th className="px-3 py-2.5 font-medium">Price</th>
                      <th className="px-3 py-2.5 font-medium">Tax</th>
                      <th className="px-3 py-2.5 font-medium text-right">Total</th>
                      <th className="px-3 py-2.5 font-medium w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{item.productName}</td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={1}
                            className="h-8 w-16 text-xs"
                            value={item.quantity}
                            onChange={(e) =>
                              setItems((current) =>
                                current.map((row) =>
                                  row.productId === item.productId
                                    ? { ...row, quantity: Number(e.target.value || 1) }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-3 py-2">{item.unitPrice.toLocaleString("en-KE")}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.taxable ? `${item.taxRate}%` : "0%"}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {(item.quantity * item.unitPrice).toLocaleString("en-KE")}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => setItems((current) => current.filter((row) => row.productId !== item.productId))}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-2 md:hidden">
                {items.map((item) => (
                  <div key={item.productId} className="rounded-md border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">{item.productName}</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setItems((current) => current.filter((row) => row.productId !== item.productId))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          className="h-11"
                          value={item.quantity}
                          onChange={(e) =>
                            setItems((current) =>
                              current.map((row) =>
                                row.productId === item.productId
                                  ? { ...row, quantity: Number(e.target.value || 1) }
                                  : row,
                              ),
                            )
                          }
                        />
                      </div>
                      <p className="self-end text-sm font-semibold">
                        KES {(item.quantity * item.unitPrice).toLocaleString("en-KE")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Subtotal: <span className="font-medium text-foreground">{totals.subTotal.toLocaleString("en-KE")}</span></span>
              <span className="text-muted-foreground">Tax: <span className="font-medium text-foreground">{totals.tax.toLocaleString("en-KE")}</span></span>
              <span className="text-base font-semibold" style={{ color: primaryColor }}>Total: KES {totals.grand.toLocaleString("en-KE")}</span>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {editingId && (
                <Button variant="outline" onClick={resetDraft} className="flex-1 sm:flex-none">
                  Cancel
                </Button>
              )}
              <Button 
                onClick={() => void saveQuote()} 
                disabled={saving} 
                className="flex-1 sm:flex-none text-white hover:opacity-90" 
                style={{ backgroundColor: primaryColor }}
              >
                {saving ? "Saving..." : editingId ? "Update request" : "Submit for approval"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes List */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" style={{ color: primaryColor }} />
            My quotes
          </CardTitle>
          <div className="hidden md:block">{statusButtons}</div>
          <Button variant="outline" className="min-h-10 md:hidden" onClick={() => setFiltersOpen(true)}>
            <Filter className="mr-1.5 h-4 w-4" />
            Filters{filterCount ? ` (${filterCount})` : ""}
          </Button>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {filteredQuotes.length === 0 ? (
            <SalesEmpty
              title={quotes.length === 0 ? "No quotes yet" : "No quotes match these filters"}
              description="Create a quote from live stock, then wait for admin approval."
            />
          ) : (
            filteredQuotes.map((quote) => {
              const invoice = invoiceByQuoteId.get(quote._id) ||
                (quote.convertedInvoiceId
                  ? invoices.find((item) => item._id === quote.convertedInvoiceId)
                  : undefined)
              const canDownloadQuote = quoteIsApproved(quote) || quote.status === "converted"
              const canConvert =
                quoteIsApproved(quote) &&
                (!invoice || invoice.status === "cancelled") &&
                quote.status !== "converted"
              const invoiceReady = invoice?.status === "issued" || invoice?.status === "paid"
              
              return (
                <div key={quote._id} className="p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{quote.quotationNumber}</p>
                        <SalesStatusBadge status={quoteStatusLabel(quote, invoice)} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {quote.client?.name} · KES {Number(quote.grandTotal || 0).toLocaleString("en-KE")} · {quote.items?.length || 0} items
                        {invoice ? ` · ${invoice.invoiceNumber}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      {(quote.status === "pending_approval" || quote.status === "cancelled") && (
                        <Button size="sm" variant="outline" className="min-h-10" onClick={() => loadForRework(quote)}>
                          <Pencil className="mr-1.5 h-3 w-3" />
                          {quote.status === "cancelled" ? "Rework" : "Edit"}
                        </Button>
                      )}
                      {canDownloadQuote && (
                        <Button size="sm" variant="outline" className="min-h-10" onClick={() => void downloadApproved(quote)}>
                          <Download className="mr-1.5 h-3 w-3" />
                          Download quote
                        </Button>
                      )}
                      {canConvert && (
                        <Button
                          size="sm"
                          className="min-h-10 text-white hover:opacity-90"
                          style={{ backgroundColor: primaryColor }}
                          onClick={() => void convertToInvoice(quote)}
                          disabled={convertingId === quote._id}
                        >
                          {convertingId === quote._id ? (
                            <>
                              <Clock className="mr-1.5 h-3 w-3 animate-spin" />
                              Converting…
                            </>
                          ) : (
                            <>
                              <ArrowRightLeft className="mr-1.5 h-3 w-3" />
                              Convert to invoice
                            </>
                          )}
                        </Button>
                      )}
                      {invoice?.status === "pending_approval" && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Waiting for invoice approval
                        </span>
                      )}
                      {invoiceReady && invoice && (
                        <>
                          <Button size="sm" variant="outline" className="min-h-10" onClick={() => void downloadIssuedInvoice(invoice)}>
                            <Download className="mr-1.5 h-3 w-3" />
                            Download invoice
                          </Button>
                          <Button size="sm" variant="outline" className="min-h-10" asChild>
                            <a href={clientInvoicePdfUrl(invoice._id)} target="_blank" rel="noreferrer">
                              <ExternalLink className="mr-1.5 h-3 w-3" />
                              Client download
                            </a>
                          </Button>
                          <Button size="sm" variant="ghost" className="min-h-10 text-slate-600" onClick={() => void copyClientLink(invoice)}>
                            <Copy className="mr-1.5 h-3 w-3" />
                            Copy link
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="bottom" className="pb-8">
          <SheetHeader>
            <SheetTitle>Filter quotes</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-4">{statusButtons}</div>
        </SheetContent>
      </Sheet>
    </SalesPage>
  )
}