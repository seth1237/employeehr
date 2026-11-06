"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowLeft,
  Check,
  Download,
  Plus,
  Receipt,
  Search,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { companyApi, stockApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import type { InvoiceDocumentSettings, TenantBranding } from "@/lib/stock-document-pdf"

type Product = {
  _id: string
  name: string
  sku?: string
  sellingPrice?: number
  currentQuantity?: number
  reservedQuantity?: number
  availableQuantity?: number
  taxable?: boolean
  taxRate?: number
  productType?: string
  isOutsourced?: boolean
}

type SavedClient = {
  _id?: string
  name: string
  number?: string
  location?: string
  contactPerson?: string
}

type DraftLine = {
  key: string
  productId?: string
  productName: string
  quantity: number
  unitPrice: number
  taxable: boolean
  taxRate: number
}

type SavedQuote = {
  _id: string
  quotationNumber: string
  status: string
  client: { name: string; number?: string; location?: string }
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    lineTotal: number
    taxAmount?: number
    description?: string
  }>
  subTotal: number
  taxTotal?: number
  grandTotal?: number
  createdAt?: string
  convertedInvoiceId?: string
  convertedSalesOrderId?: string
}

const VAT = 16

function money(n: number) {
  return Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function lineTotal(line: DraftLine) {
  const base = Number(line.quantity || 0) * Number(line.unitPrice || 0)
  const tax = line.taxable ? (base * Number(line.taxRate || VAT)) / 100 : 0
  return { base, tax, total: base + tax }
}

export function OnTheGoQuoteComposer() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const user = getUser()
  const editId = searchParams.get("edit") || ""

  const [ready, setReady] = useState(false)
  const [clients, setClients] = useState<SavedClient[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [branding, setBranding] = useState<TenantBranding>({})
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceDocumentSettings>({})

  const [clientName, setClientName] = useState("")
  const [clientNumber, setClientNumber] = useState("")
  const [clientLocation, setClientLocation] = useState("")
  const [clientQuery, setClientQuery] = useState("")
  const [showClients, setShowClients] = useState(false)

  const [productQuery, setProductQuery] = useState("")
  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState("")
  const [customQty, setCustomQty] = useState("1")
  const [customPrice, setCustomPrice] = useState("")
  const [lines, setLines] = useState<DraftLine[]>([])

  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [saved, setSaved] = useState<SavedQuote | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [clientRes, productRes, brandingRes, settingsRes] = await Promise.all([
          stockApi.getSavedClients().catch(() => ({ data: [] })),
          stockApi.getProducts().catch(() => ({ data: [] })),
          companyApi.getBranding().catch(() => ({ data: {} })),
          companyApi.getInvoiceSettings().catch(() => ({ data: {} })),
        ])
        if (cancelled) return
        const clientList = Array.isArray(clientRes?.data) ? clientRes.data : []
        const productList = Array.isArray(productRes?.data) ? productRes.data : []
        setClients(clientList)
        setProducts(productList)
        setBranding((brandingRes as { data?: TenantBranding })?.data || {})
        setInvoiceSettings((settingsRes as { data?: InvoiceDocumentSettings })?.data || {})
        if (editId) {
          const quoteRes = await stockApi.getQuotationById(editId)
          const quote = quoteRes?.data
          if (quote) {
            setClientName(quote.client?.name || "")
            setClientNumber(quote.client?.number || "")
            setClientLocation(quote.client?.location || "")
            setClientQuery(quote.client?.name || "")
            setLines(
              (quote.items || []).map((item: any) => ({
                key: newKey(),
                productId: item.productId,
                productName: item.productName,
                quantity: Number(item.quantity || 1),
                unitPrice: Number(item.unitPrice || 0),
                taxable: Boolean(item.taxable),
                taxRate: Number(item.taxRate || VAT),
              })),
            )
          }
        }
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [editId])

  const matchingClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase()
    if (q.length < 1) return clients.slice(0, 6)
    return clients
      .filter((client) => {
        const hay = `${client.name} ${client.number || ""} ${client.location || ""}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 6)
  }, [clients, clientQuery])

  const matchingProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    if (q.length < 1) return []
    return products
      .filter((product) => {
        const hay = `${product.name} ${product.sku || ""}`.toLowerCase()
        return hay.includes(q)
      })
      .slice(0, 8)
  }, [products, productQuery])

  const totals = useMemo(
    () =>
      lines.reduce(
        (acc, line) => {
          const next = lineTotal(line)
          acc.sub += next.base
          acc.tax += next.tax
          acc.grand += next.total
          return acc
        },
        { sub: 0, tax: 0, grand: 0 },
      ),
    [lines],
  )

  const pickClient = (client: SavedClient) => {
    setClientName(client.name)
    setClientNumber(client.number || "")
    setClientLocation(client.location || "")
    setClientQuery(client.name)
    setShowClients(false)
  }

  const addProduct = (product: Product) => {
    setLines((current) => {
      const existing = current.find((line) => line.productId === product._id)
      if (existing) {
        return current.map((line) =>
          line.productId === product._id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        )
      }
      return [
        ...current,
        {
          key: newKey(),
          productId: product._id,
          productName: product.name,
          quantity: 1,
          unitPrice: Number(product.sellingPrice || 0),
          taxable: Boolean(product.taxable),
          taxRate: Number(product.taxRate || VAT),
        },
      ]
    })
    setProductQuery("")
  }

  const addCustomLine = () => {
    const name = customName.trim()
    const quantity = Number(customQty)
    const unitPrice = Number(customPrice)
    if (!name) {
      toast({ title: "Add a line name", variant: "destructive" })
      return
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast({ title: "Quantity must be more than 0", variant: "destructive" })
      return
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      toast({ title: "Enter a price", variant: "destructive" })
      return
    }
    setLines((current) => [
      ...current,
      {
        key: newKey(),
        productName: name,
        quantity,
        unitPrice,
        taxable: false,
        taxRate: VAT,
      },
    ])
    setCustomName("")
    setCustomQty("1")
    setCustomPrice("")
    setCustomOpen(false)
  }

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    )
  }

  const saveQuote = async () => {
    if (!clientName.trim() || !clientNumber.trim()) {
      toast({
        title: "Client needed",
        description: "Enter the client name and phone number.",
        variant: "destructive",
      })
      return
    }
    if (lines.length === 0) {
      toast({
        title: "Add a line",
        description: "Search a product or add a custom line.",
        variant: "destructive",
      })
      return
    }
    setSaving(true)
    try {
      const payload = {
        clientName: clientName.trim(),
        clientNumber: clientNumber.trim(),
        clientLocation: clientLocation.trim() || "N/A",
        items: lines.map((line) => ({
          productId: line.productId,
          productName: line.productName,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxable: line.taxable,
          taxRate: line.taxable ? line.taxRate : 0,
        })),
      }
      const res = editId
        ? await stockApi.updateQuotation(editId, payload)
        : await stockApi.createQuotation(payload)
      if (!res?.success || !res.data) {
        throw new Error(res?.message || "Could not save quote")
      }
      setSaved(res.data)
      toast({
        title: editId ? "Quote updated" : "Quote saved",
        description: res.data.quotationNumber,
      })
    } catch (error: any) {
      toast({
        title: "Could not save",
        description: error?.message || "Failed to save quote",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const downloadPdf = async () => {
    if (!saved) return
    setBusy("pdf")
    try {
      const { generateQuotationPdf } = await import("@/lib/stock-document-pdf")
      generateQuotationPdf({
        quotationNumber: saved.quotationNumber,
        createdAt: saved.createdAt || new Date().toISOString(),
        client: {
          name: saved.client.name,
          number: saved.client.number || "",
          location: saved.client.location || "",
        },
        items: saved.items,
        subTotal: saved.subTotal,
        taxTotal: saved.taxTotal,
        grandTotal: saved.grandTotal,
        branding,
        invoiceSettings,
        preparedBy:
          [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "System",
        autoSave: true,
      })
      toast({ title: "PDF downloaded" })
    } catch (error: any) {
      toast({
        title: "PDF failed",
        description: error?.message || "Could not generate PDF",
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }

  const convertToInvoice = async () => {
    if (!saved) return
    setBusy("convert")
    try {
      const converted = await stockApi.convertQuotation(saved._id)
      if (!converted?.success) {
        throw new Error(converted?.message || "Convert failed")
      }
      const doc = converted.data
      const alreadyInvoice =
        Boolean((converted as any).legacyInvoice) ||
        Boolean(doc?.invoiceNumber && !doc?.orderNumber)
      if (alreadyInvoice && doc?._id) {
        toast({ title: "Invoice ready", description: doc.invoiceNumber })
        router.push(`/admin/stock/invoices/${doc._id}`)
        return
      }
      if (doc?._id && doc.orderNumber) {
        const invoiceRes = await stockApi.invoiceSalesOrder(doc._id)
        if (!invoiceRes?.success || !invoiceRes.data?._id) {
          throw new Error(invoiceRes?.message || "Could not create invoice")
        }
        toast({
          title: "Invoice created",
          description: `${invoiceRes.data.invoiceNumber} is ready to review and post.`,
        })
        router.push(`/admin/stock/invoices/${invoiceRes.data._id}`)
        return
      }
      throw new Error("Convert did not return an invoice")
    } catch (error: any) {
      toast({
        title: "Could not convert",
        description: error?.message || "Failed to convert to invoice",
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }

  const resetForAnother = useCallback(() => {
    setSaved(null)
    setClientName("")
    setClientNumber("")
    setClientLocation("")
    setClientQuery("")
    setLines([])
    setProductQuery("")
    router.replace("/admin/stock/quotations/new")
  }, [router])

  if (!ready) {
    return <PageLoadingSkeleton title="New quote" rows={4} />
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-lg space-y-5 p-4 sm:p-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-5 w-5 text-emerald-700" />
          </div>
          <p className="text-sm font-medium text-emerald-800">Quote ready</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {saved.quotationNumber}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {saved.client.name} · KES {money(Number(saved.grandTotal || saved.subTotal || 0))}
          </p>
        </div>

        <div className="grid gap-2">
          <Button size="lg" className="h-12" onClick={() => void convertToInvoice()} disabled={!!busy}>
            <Receipt className="mr-2 h-4 w-4" />
            {busy === "convert" ? "Converting…" : "Convert to invoice"}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="h-12"
            onClick={() => void downloadPdf()}
            disabled={!!busy}
          >
            <Download className="mr-2 h-4 w-4" />
            {busy === "pdf" ? "Preparing…" : "Download PDF"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="ghost" className="flex-1">
            <Link href={`/admin/stock/quotations/${saved._id}`}>Open quote</Link>
          </Button>
          <Button variant="ghost" className="flex-1" onClick={resetForAnother}>
            New quote
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-5 p-4 pb-28 sm:max-w-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href="/admin/stock/quotations">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Quotes
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {editId ? "Edit quote" : "New quote"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Client, lines, price — then PDF or invoice.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            1. Client
          </p>
          <div className="relative space-y-1.5">
            <Label htmlFor="go-client">Name</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="go-client"
                className="h-11 pl-9"
                autoComplete="off"
                placeholder="Search or type a new client"
                value={clientQuery}
                onFocus={() => setShowClients(true)}
                onChange={(event) => {
                  setClientQuery(event.target.value)
                  setClientName(event.target.value)
                  setShowClients(true)
                }}
              />
            </div>
            {showClients && matchingClients.length > 0 ? (
              <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-background shadow-md">
                {matchingClients.map((client) => (
                  <button
                    key={client._id || `${client.name}-${client.number}`}
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-muted/60"
                    onClick={() => pickClient(client)}
                  >
                    <span className="font-medium">{client.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {[client.number, client.location].filter(Boolean).join(" · ") || "Saved client"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="go-phone">Phone</Label>
              <Input
                id="go-phone"
                className="h-11"
                inputMode="tel"
                placeholder="07xx"
                value={clientNumber}
                onChange={(event) => setClientNumber(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="go-location">Location (optional)</Label>
              <Input
                id="go-location"
                className="h-11"
                placeholder="Town or site"
                value={clientLocation}
                onChange={(event) => setClientLocation(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            2. Lines
          </p>
          <div className="relative space-y-1.5">
            <Label htmlFor="go-product">Add from products</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="go-product"
                className="h-11 pl-9"
                autoComplete="off"
                placeholder="Search name or SKU"
                value={productQuery}
                onChange={(event) => setProductQuery(event.target.value)}
              />
            </div>
            {matchingProducts.length > 0 ? (
              <div className="max-h-56 overflow-auto rounded-md border">
                {matchingProducts.map((product) => (
                  <button
                    key={product._id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/60"
                    onClick={() => addProduct(product)}
                  >
                    <span className="min-w-0 truncate font-medium">{product.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      KES {money(Number(product.sellingPrice || 0))}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {customOpen ? (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <Input
                className="h-11"
                placeholder="Line name"
                value={customName}
                onChange={(event) => setCustomName(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  className="h-11"
                  inputMode="decimal"
                  placeholder="Qty"
                  value={customQty}
                  onChange={(event) => setCustomQty(event.target.value)}
                />
                <Input
                  className="h-11"
                  inputMode="decimal"
                  placeholder="Price"
                  value={customPrice}
                  onChange={(event) => setCustomPrice(event.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" className="flex-1" onClick={addCustomLine}>
                  Add line
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCustomOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" className="w-full" onClick={() => setCustomOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Add a custom line
            </Button>
          )}

          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lines yet.</p>
          ) : (
            <ul className="space-y-2">
              {lines.map((line) => {
                const next = lineTotal(line)
                return (
                  <li key={line.key} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-tight">{line.productName}</p>
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                        aria-label={`Remove ${line.productName}`}
                        onClick={() =>
                          setLines((current) => current.filter((item) => item.key !== line.key))
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-muted-foreground">Qty</Label>
                        <Input
                          className="h-11"
                          inputMode="decimal"
                          value={String(line.quantity)}
                          onChange={(event) => {
                            const quantity = Number(event.target.value)
                            if (!Number.isFinite(quantity)) return
                            updateLine(line.key, { quantity })
                          }}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Price</Label>
                        <Input
                          className="h-11"
                          inputMode="decimal"
                          value={String(line.unitPrice)}
                          onChange={(event) => {
                            const unitPrice = Number(event.target.value)
                            if (!Number.isFinite(unitPrice)) return
                            updateLine(line.key, { unitPrice })
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={line.taxable}
                          onChange={(event) =>
                            updateLine(line.key, {
                              taxable: event.target.checked,
                              taxRate: event.target.checked ? line.taxRate || VAT : 0,
                            })
                          }
                        />
                        VAT
                      </label>
                      <span className="text-sm font-medium">KES {money(next.total)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 sm:max-w-2xl">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">KES {money(totals.grand)}</p>
          </div>
          <Button size="lg" className="h-12 min-w-36" onClick={() => void saveQuote()} disabled={saving}>
            {saving ? "Saving…" : editId ? "Update quote" : "Save quote"}
          </Button>
        </div>
      </div>
    </div>
  )
}
