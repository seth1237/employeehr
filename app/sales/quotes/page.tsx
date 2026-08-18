"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { salesApi, stockApi } from "@/lib/api"
import {
  clientInvoicePdfUrl,
  downloadSalesInvoicePdf,
  downloadSalesQuotePdf,
} from "@/lib/sales-quote-pdf"

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
  const [quotes, setQuotes] = useState<StockQuote[]>([])
  const [invoices, setInvoices] = useState<StockInvoice[]>([])
  const [productQuery, setProductQuery] = useState("")
  const [products, setProducts] = useState<any[]>([])
  const [clientQuery, setClientQuery] = useState("")
  const [clientOptions, setClientOptions] = useState<any[]>([])
  const [clientName, setClientName] = useState("")
  const [clientPhone, setClientPhone] = useState("")
  const [clientLocation, setClientLocation] = useState("")
  const [clientContactPerson, setClientContactPerson] = useState("")
  const [customerId, setCustomerId] = useState("")
  const [items, setItems] = useState<DraftItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [convertingId, setConvertingId] = useState<string | null>(null)

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

  useEffect(() => {
    if (clientQuery.trim().length < 2) {
      setClientOptions([])
      return
    }
    const handle = setTimeout(() => {
      void salesApi.searchClients(clientQuery).then((res) => setClientOptions(res.data || []))
    }, 250)
    return () => clearTimeout(handle)
  }, [clientQuery])

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
    setClientQuery("")
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

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Quotes from live stock</h1>
        <p className="text-sm text-muted-foreground">
          Requests go to admin stock quotations for approval. After approval you can download the PDF
          and convert it to an invoice for a second admin check. Approved invoices are downloadable by the client.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {editingId ? "Update quote request" : "New quote request"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Client</Label>
              <Input
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value)
                  setCustomerId("")
                  setClientQuery(e.target.value)
                }}
                placeholder="Search existing client or type a name"
              />
              {clientOptions.length > 0 ? (
                <div className="rounded-md border bg-white shadow-sm">
                  {clientOptions.map((client) => (
                    <button
                      key={client._id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setClientName(client.name)
                        setClientPhone(client.phone)
                        setClientLocation(client.location || "")
                        setClientContactPerson(client.contactPerson || "")
                        setCustomerId(client._id)
                        setClientQuery("")
                        setClientOptions([])
                      }}
                    >
                      {client.name}
                      <span className="block text-xs text-muted-foreground">
                        {client.phone} {client.location}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Search stock</Label>
            <Input
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Type a product name"
            />
            {products.length > 0 && productQuery.trim().length >= 2 ? (
              <div className="max-h-56 overflow-y-auto rounded-md border bg-white shadow-sm">
                {products.map((product) => (
                  <button
                    key={product._id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => addProduct(product)}
                  >
                    <span>
                      {product.name}
                      <span className="block text-xs text-muted-foreground">
                        In stock: {product.currentQuantity}
                        {product.taxable ? ` · Tax ${product.taxRate || 16}%` : " · No tax"}
                      </span>
                    </span>
                    <span>KES {Number(product.sellingPrice || 0).toLocaleString("en-KE")}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {items.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Price</th>
                    <th className="px-3 py-2">Tax</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.productId} className="border-t">
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={1}
                          className="h-8 w-20"
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
                      <td className="px-3 py-2">{item.taxable ? `${item.taxRate}%` : "0%"}</td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setItems((current) => current.filter((row) => row.productId !== item.productId))}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              Subtotal {totals.subTotal.toLocaleString("en-KE")} · Tax {totals.tax.toLocaleString("en-KE")} · Total{" "}
              <strong>KES {totals.grand.toLocaleString("en-KE")}</strong>
            </span>
            <div className="flex gap-2">
              {editingId ? (
                <Button variant="outline" onClick={resetDraft}>
                  Cancel
                </Button>
              ) : null}
              <Button onClick={() => void saveQuote()} disabled={saving}>
                {editingId ? "Update request" : "Submit for approval"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My quotes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotes yet.</p>
          ) : (
            quotes.map((quote) => {
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
                <div key={quote._id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {quote.quotationNumber} · {quote.client?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        KES {Number(quote.grandTotal || 0).toLocaleString("en-KE")} · {quote.items?.length || 0} items
                        {invoice ? ` · ${invoice.invoiceNumber}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{quoteStatusLabel(quote, invoice)}</Badge>
                      {quote.status === "pending_approval" || quote.status === "cancelled" ? (
                        <Button size="sm" variant="outline" onClick={() => loadForRework(quote)}>
                          {quote.status === "cancelled" ? "Rework" : "Edit"}
                        </Button>
                      ) : null}
                      {canDownloadQuote ? (
                        <Button size="sm" variant="outline" onClick={() => void downloadApproved(quote)}>
                          Download quote
                        </Button>
                      ) : null}
                      {canConvert ? (
                        <Button
                          size="sm"
                          onClick={() => void convertToInvoice(quote)}
                          disabled={convertingId === quote._id}
                        >
                          {convertingId === quote._id ? "Converting…" : "Convert to invoice"}
                        </Button>
                      ) : null}
                      {invoice?.status === "pending_approval" ? (
                        <span className="text-xs text-muted-foreground">Waiting for invoice approval</span>
                      ) : null}
                      {invoiceReady && invoice ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => void downloadIssuedInvoice(invoice)}>
                            Download invoice
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={clientInvoicePdfUrl(invoice._id)} target="_blank" rel="noreferrer">
                              Client download
                            </a>
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void copyClientLink(invoice)}>
                            Copy client link
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
