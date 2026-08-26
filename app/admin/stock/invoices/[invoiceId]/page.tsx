"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  FileText,
  Package,
  Pencil,
  Truck,
  Lock,
  CheckCircle2,
  Copy,
  Ban,
  FileMinus2,
  Search,
  Trash2,
  Plus,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { stockApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import {
  ErrorState,
  PageLoadingSkeleton,
} from "@/components/admin/ui/page-states"
import { StockDocumentActions } from "@/components/admin/stock/document-actions"
import { formatStatusLabel } from "@/components/admin/ui/status-badge"
import type { StockDocumentData } from "@/components/admin/stock/document-preview"

type StockProduct = {
  _id: string
  name: string
  sellingPrice?: number
  currentQuantity?: number
  productType?: string
  isOutsourced?: boolean
  taxable?: boolean
  taxRate?: number
  description?: string
  categoryDetails?: { name?: string } | null
}

type InvoiceItem = {
  productId?: string
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
  description?: string
  taxAmount?: number
  totalAfterTax?: number
  productType?: string
  isOutsourced?: boolean
  taxable?: boolean
  taxRate?: number
}

type EditLine = {
  productId: string
  productName: string
  quantity: string
  unitPrice: string
  description: string
  productType?: string
  isOutsourced?: boolean
  stockAvailable?: number
}

type Invoice = {
  _id: string
  invoiceNumber: string
  deliveryNoteNumber?: string
  quotationId?: string
  quotationNumber?: string
  revisedFromInvoiceId?: string
  client: { name: string; number?: string; location?: string }
  items: InvoiceItem[]
  subTotal: number
  taxTotal?: number
  grandTotal?: number
  transportCost?: number
  transportNote?: string
  status: string
  createdAt?: string
  postedAt?: string
  dispatch?: {
    status?: string
    packingCompleted?: boolean
  }
  etims?: {
    status?: string
    responseMessage?: string
  }
}

function money(n: number) {
  return Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const { invoiceId } = use(params)
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lifecycle, setLifecycle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editClient, setEditClient] = useState({
    name: "",
    number: "",
    location: "",
  })
  const [editItems, setEditItems] = useState<EditLine[]>([])
  const [editTransportCost, setEditTransportCost] = useState("")
  const [editTransportNote, setEditTransportNote] = useState("")

  const [products, setProducts] = useState<StockProduct[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState("")
  const [productSearch, setProductSearch] = useState("")
  const [addQty, setAddQty] = useState("1")
  const [addPrice, setAddPrice] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [invRes, lifeRes] = await Promise.all([
        stockApi.getInvoiceById(invoiceId),
        stockApi.getInvoiceLifecycle(invoiceId).catch(() => null),
      ])
      if (!invRes.success || !invRes.data) {
        setError(invRes.message || "Invoice not found")
        setInvoice(null)
        return
      }
      setInvoice(invRes.data as Invoice)
      setLifecycle(lifeRes?.data || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoice")
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    load()
  }, [load])

  const loadProducts = useCallback(async () => {
    setProductsLoading(true)
    setProductsError("")
    try {
      const res = await stockApi.getProducts()
      if (!res.success) {
        throw new Error(res.message || "Failed to load products")
      }
      setProducts((res.data || []) as StockProduct[])
    } catch (e) {
      setProducts([])
      setProductsError(
        e instanceof Error ? e.message : "Failed to load products",
      )
    } finally {
      setProductsLoading(false)
    }
  }, [])

  const startEdit = async () => {
    if (!invoice || invoice.status !== "draft") return
    setEditClient({
      name: invoice.client.name || "",
      number: invoice.client.number || "",
      location: invoice.client.location || "",
    })
    setEditItems(
      (invoice.items || []).map((item) => ({
        productId: String(item.productId || ""),
        productName: item.productName,
        quantity: String(item.quantity ?? 1),
        unitPrice: String(item.unitPrice ?? 0),
        description: item.description || "",
        productType: item.productType,
        isOutsourced: item.isOutsourced,
      })),
    )
    setEditTransportCost(
      invoice.transportCost != null ? String(invoice.transportCost) : "",
    )
    setEditTransportNote(invoice.transportNote || "")
    setProductSearch("")
    setAddQty("1")
    setAddPrice("")
    setEditing(true)
    await loadProducts()
  }

  // Attach live stock levels once inventory finishes loading
  useEffect(() => {
    if (!editing || products.length === 0) return
    setEditItems((rows) =>
      rows.map((row) => {
        const product = products.find((p) => p._id === row.productId)
        if (!product) return row
        const isStocked =
          product.productType !== "service" && !product.isOutsourced
        return {
          ...row,
          productType: row.productType || product.productType,
          isOutsourced: row.isOutsourced ?? product.isOutsourced,
          stockAvailable: isStocked
            ? Number(product.currentQuantity || 0)
            : undefined,
        }
      }),
    )
  }, [editing, products])

  const matchingProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase()
    if (!query) return []
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(query) ||
        (product.categoryDetails?.name || "").toLowerCase().includes(query),
    )
  }, [products, productSearch])

  const outOfStockHiddenCount = matchingProducts.filter((product) => {
    if (product.productType === "service" || product.isOutsourced) return false
    return Number(product.currentQuantity || 0) <= 0
  }).length

  const productSuggestions = matchingProducts
    .filter((product) => {
      if (product.productType === "service" || product.isOutsourced) return true
      return Number(product.currentQuantity || 0) > 0
    })
    .slice(0, 8)

  const qtyOnInvoiceByProduct = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of editItems) {
      if (!row.productId) continue
      map.set(
        row.productId,
        (map.get(row.productId) || 0) + Math.max(0, Number(row.quantity) || 0),
      )
    }
    return map
  }, [editItems])

  const draftSubtotal = useMemo(
    () =>
      editItems.reduce(
        (sum, row) =>
          sum +
          Math.max(0, Number(row.quantity) || 0) *
            Math.max(0, Number(row.unitPrice) || 0),
        0,
      ),
    [editItems],
  )

  const stockWarnings = useMemo(() => {
    const warnings: string[] = []
    for (const [productId, qty] of qtyOnInvoiceByProduct) {
      const product = products.find((p) => p._id === productId)
      if (!product) continue
      if (product.productType === "service" || product.isOutsourced) continue
      const available = Number(product.currentQuantity || 0)
      if (qty > available) {
        warnings.push(
          `${product.name}: invoice qty ${qty} exceeds stock ${available}`,
        )
      }
    }
    return warnings
  }, [qtyOnInvoiceByProduct, products])

  const addProductFromSearch = (product: StockProduct) => {
    const qty = Math.max(1, Number(addQty) || 1)
    const isStocked =
      product.productType !== "service" && !product.isOutsourced
    const available = Number(product.currentQuantity || 0)
    const alreadyOnInvoice = qtyOnInvoiceByProduct.get(product._id) || 0

    if (isStocked && alreadyOnInvoice + qty > available) {
      window.alert(
        `Not enough stock for ${product.name}. Available: ${available}, already on invoice: ${alreadyOnInvoice}, requested: ${qty}`,
      )
      return
    }

    const unitPrice = addPrice
      ? Math.max(0, Number(addPrice) || 0)
      : Number(product.sellingPrice || 0)

    setEditItems((prev) => {
      const existingIdx = prev.findIndex((row) => row.productId === product._id)
      if (existingIdx >= 0) {
        const next = [...prev]
        const currentQty = Math.max(0, Number(next[existingIdx].quantity) || 0)
        next[existingIdx] = {
          ...next[existingIdx],
          quantity: String(currentQty + qty),
          unitPrice: String(unitPrice),
          stockAvailable: isStocked ? available : undefined,
        }
        return next
      }
      return [
        ...prev,
        {
          productId: product._id,
          productName: product.name,
          quantity: String(qty),
          unitPrice: String(unitPrice),
          description: product.description || "",
          productType: product.productType,
          isOutsourced: product.isOutsourced,
          stockAvailable: isStocked ? available : undefined,
        },
      ]
    })

    setProductSearch("")
    setAddQty("1")
    setAddPrice("")
  }

  const updateLine = (idx: number, patch: Partial<EditLine>) => {
    setEditItems((rows) => {
      const next = [...rows]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const saveDraft = async () => {
    if (!invoice) return
    if (stockWarnings.length > 0) {
      window.alert(
        `Fix stock shortages before saving:\n\n${stockWarnings.join("\n")}`,
      )
      return
    }
    setBusy("save")
    try {
      const items = editItems
        .filter((row) => row.productId && row.productName.trim())
        .map((row) => ({
          productId: row.productId,
          productName: row.productName.trim(),
          quantity: Math.max(1, Number(row.quantity) || 1),
          unitPrice: Math.max(0, Number(row.unitPrice) || 0),
          description: row.description.trim() || undefined,
          productType: row.productType,
          isOutsourced: row.isOutsourced,
        }))
      if (items.length === 0) {
        window.alert("Add at least one product from inventory search")
        return
      }
      const res = await stockApi.updateDraftInvoice(invoice._id, {
        client: editClient,
        items,
        transportCost: editTransportCost
          ? Number(editTransportCost)
          : undefined,
        transportNote: editTransportNote || undefined,
      })
      if (!res.success) {
        window.alert(res.message || "Failed to save draft")
        return
      }
      setEditing(false)
      await load()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Failed to save draft")
    } finally {
      setBusy(null)
    }
  }

  const runAction = async (
    action: "post" | "approve" | "reject" | "cancel" | "revise",
  ) => {
    if (!invoice) return
    const labels: Record<string, string> = {
      post: "post this invoice?\n\nStock will be deducted from inventory and the invoice will be locked.",
      approve:
        "approve and post this invoice?\n\nStock will be deducted from inventory.",
      reject: "reject / cancel this pending invoice?",
      cancel: "cancel this invoice?",
      revise: "create a revision draft from this invoice?",
    }
    if (!window.confirm(`Are you sure you want to ${labels[action]}`)) return

    setBusy(action)
    try {
      let res: any
      if (action === "post" || action === "approve") {
        res = await stockApi.postInvoice(invoice._id)
      } else if (action === "reject") {
        res = await stockApi.rejectInvoice(invoice._id)
      } else if (action === "cancel") {
        res = await stockApi.cancelInvoice(invoice._id)
      } else {
        res = await stockApi.reviseInvoice(invoice._id)
      }
      if (!res.success) {
        window.alert(res.message || `Failed to ${action} invoice`)
        return
      }
      if (action === "revise" && res.data?._id) {
        router.push(`/admin/stock/invoices/${res.data._id}`)
        return
      }
      if (action === "post" || action === "approve") {
        window.alert(
          "Invoice posted. Inventory quantities have been reduced for stocked items.",
        )
      }
      await load()
    } catch (e) {
      window.alert(
        e instanceof Error ? e.message : `Failed to ${action} invoice`,
      )
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return <PageLoadingSkeleton title="Loading invoice" rows={4} />
  }

  if (error || !invoice) {
    return (
      <ErrorState
        title="We couldn't load this invoice"
        message={error || "Invoice not found"}
        onRetry={load}
        backHref="/admin/stock/invoices"
        backLabel="Back to invoices"
      />
    )
  }

  const paymentSummary = lifecycle?.paymentSummary
  const steps = Array.isArray(lifecycle?.steps) ? lifecycle.steps : []
  const canManage = ["company_admin", "hr", "admin", "super_admin"].includes(
    String(getUser()?.role || ""),
  )
  const isDraft = invoice.status === "draft"
  const isPending = invoice.status === "pending_approval"
  const isPosted = invoice.status === "issued" || invoice.status === "paid"
  const isCancelled = invoice.status === "cancelled"
  const isLocked = isPosted || isCancelled

  const documentData: StockDocumentData = {
    kind: "invoice",
    number: invoice.invoiceNumber,
    deliveryNoteNumber: invoice.deliveryNoteNumber,
    quotationNumber: invoice.quotationNumber,
    createdAt: invoice.createdAt,
    client: {
      name: invoice.client.name,
      number: invoice.client.number || "",
      location: invoice.client.location || "",
    },
    items: (invoice.items || []).map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      description: item.description,
    })),
    subTotal: invoice.subTotal,
    status: invoice.status,
  }

  const workflowHint = isDraft
    ? "Draft — search inventory to add products, then post to deduct stock and lock."
    : isPending
      ? "Awaiting approval — post to deduct stock and lock."
      : isPosted
        ? "Posted — locked. Stock already deducted. Use revision, credit note, or cancel."
        : "Cancelled."

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href="/admin/stock/invoices">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Invoices
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {invoice.invoiceNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {invoice.client.name}
            {invoice.client.number ? ` · ${invoice.client.number}` : ""}
            {invoice.client.location ? ` · ${invoice.client.location}` : ""}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            {isLocked ? (
              <Lock className="h-3 w-3" />
            ) : (
              <Pencil className="h-3 w-3" />
            )}
            {workflowHint}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          <Badge variant="outline" className="capitalize">
            {formatStatusLabel(invoice.status)}
          </Badge>
          {invoice.dispatch?.status && isPosted && (
            <Badge variant="secondary" className="capitalize">
              Dispatch: {invoice.dispatch.status.replaceAll("_", " ")}
            </Badge>
          )}

          {isPosted && (
            <StockDocumentActions
              kind="invoice"
              documentId={invoice._id}
              document={documentData}
            />
          )}

          {isDraft && canManage && !editing && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void startEdit()}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                onClick={() => void runAction("post")}
                disabled={busy !== null}
              >
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {busy === "post" ? "Posting…" : "Post invoice"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void runAction("cancel")}
                disabled={busy !== null}
              >
                <Ban className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </>
          )}

          {isPending && canManage && (
            <>
              <Button
                size="sm"
                onClick={() => void runAction("approve")}
                disabled={busy !== null}
              >
                {busy === "approve" ? "Posting…" : "Approve & post"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => void runAction("reject")}
                disabled={busy !== null}
              >
                Reject
              </Button>
            </>
          )}

          {isPosted && canManage && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void runAction("revise")}
                disabled={busy !== null}
              >
                <Copy className="h-4 w-4 mr-1" />
                Create revision
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link
                  href={`/admin/stock/credit-notes?invoiceId=${invoice._id}`}
                >
                  <FileMinus2 className="h-4 w-4 mr-1" />
                  Create credit note
                </Link>
              </Button>
              {invoice.status === "issued" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => void runAction("cancel")}
                  disabled={busy !== null}
                >
                  <Ban className="h-4 w-4 mr-1" />
                  Cancel invoice
                </Button>
              )}
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/stock/dispatch/${invoice._id}`}>
                  <Truck className="h-4 w-4 mr-1" />
                  Dispatch
                </Link>
              </Button>
            </>
          )}

          {isCancelled && canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void runAction("revise")}
              disabled={busy !== null}
            >
              <Copy className="h-4 w-4 mr-1" />
              Create revision
            </Button>
          )}

          {invoice.quotationId && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/stock/quotations/${invoice.quotationId}`}>
                <FileText className="h-4 w-4 mr-1" />
                Quotation
              </Link>
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <Card className="border-sky-200/80 shadow-sm">
          <CardHeader className="border-b bg-sky-50/50">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">Edit draft invoice</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Search inventory to add products. Stock is checked now and
                  deducted when you <span className="font-medium">Post</span>{" "}
                  the invoice.
                </p>
              </div>
              <Badge variant="secondary">
                {editItems.length} line{editItems.length === 1 ? "" : "s"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Client name</Label>
                <Input
                  value={editClient.name}
                  onChange={(e) =>
                    setEditClient((c) => ({ ...c, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={editClient.number}
                  onChange={(e) =>
                    setEditClient((c) => ({ ...c, number: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  value={editClient.location}
                  onChange={(e) =>
                    setEditClient((c) => ({ ...c, location: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-3 sm:p-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Search inventory
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Type product name or category…"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      disabled={productsLoading}
                    />
                  </div>
                  {productsError ? (
                    <p className="text-[11px] text-destructive">
                      {productsError} —{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => void loadProducts()}
                      >
                        retry
                      </button>
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      {productsLoading
                        ? "Loading products…"
                        : `${products.length} products in inventory`}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={addQty}
                    onChange={(e) => setAddQty(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Price override (optional)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Uses selling price"
                    value={addPrice}
                    onChange={(e) => setAddPrice(e.target.value)}
                  />
                </div>
              </div>

              {productSearch.trim() && (
                <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
                  {productSuggestions.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground space-y-1">
                      <p>No matching products in stock</p>
                      {outOfStockHiddenCount > 0 && (
                        <p className="text-xs">
                          {outOfStockHiddenCount} out-of-stock match
                          {outOfStockHiddenCount === 1 ? "" : "es"} hidden
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="max-h-64 divide-y overflow-auto">
                        {productSuggestions.map((product) => {
                          const stocked =
                            product.productType !== "service" &&
                            !product.isOutsourced
                          const available = Number(
                            product.currentQuantity || 0,
                          )
                          return (
                            <button
                              key={product._id}
                              type="button"
                              className="flex w-full items-center justify-between gap-3 p-3 text-left text-sm transition hover:bg-muted/60"
                              onClick={() => addProductFromSearch(product)}
                            >
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2 font-medium">
                                  {product.name}
                                  {product.isOutsourced && (
                                    <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                                      Outsourced
                                    </span>
                                  )}
                                  {product.productType === "service" && (
                                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                                      Service
                                    </span>
                                  )}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {product.categoryDetails?.name || "Uncategorized"}
                                  {stocked
                                    ? ` · In stock: ${available}`
                                    : " · Not stock-tracked"}
                                </div>
                              </div>
                              <span className="shrink-0 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
                                KES{" "}
                                {Number(
                                  product.sellingPrice || 0,
                                ).toLocaleString("en-KE")}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                      {outOfStockHiddenCount > 0 && (
                        <div className="border-t bg-muted/30 p-2.5 text-center text-xs text-muted-foreground">
                          {outOfStockHiddenCount} out-of-stock product(s) hidden
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {stockWarnings.length > 0 && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Stock shortage</p>
                  <ul className="mt-1 list-disc pl-4 text-xs space-y-0.5">
                    {stockWarnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {editItems.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <Package className="mx-auto h-8 w-8 mb-2 opacity-40" />
                No products yet. Search inventory above to add lines.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground text-left">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">#</th>
                        <th className="px-3 py-2.5 font-medium">Product</th>
                        <th className="px-3 py-2.5 font-medium">Stock</th>
                        <th className="px-3 py-2.5 font-medium">Qty</th>
                        <th className="px-3 py-2.5 font-medium">Unit price</th>
                        <th className="px-3 py-2.5 font-medium text-right">
                          Line total
                        </th>
                        <th className="px-3 py-2.5 font-medium text-right" />
                      </tr>
                    </thead>
                    <tbody>
                      {editItems.map((row, idx) => {
                        const qty = Math.max(0, Number(row.quantity) || 0)
                        const price = Math.max(0, Number(row.unitPrice) || 0)
                        const overStock =
                          row.stockAvailable != null &&
                          qty > row.stockAvailable
                        return (
                          <tr key={`${row.productId}-${idx}`} className="border-t">
                            <td className="px-3 py-2 text-muted-foreground">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium">{row.productName}</div>
                              <Input
                                className="mt-1 h-8 text-xs"
                                placeholder="Description / note"
                                value={row.description}
                                onChange={(e) =>
                                  updateLine(idx, {
                                    description: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                              {row.stockAvailable != null
                                ? row.stockAvailable
                                : "—"}
                            </td>
                            <td className="px-3 py-2 w-24">
                              <Input
                                className={`h-8 ${overStock ? "border-amber-500" : ""}`}
                                type="number"
                                min={1}
                                value={row.quantity}
                                onChange={(e) =>
                                  updateLine(idx, {
                                    quantity: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="px-3 py-2 w-32">
                              <Input
                                className="h-8"
                                type="number"
                                min={0}
                                value={row.unitPrice}
                                onChange={(e) =>
                                  updateLine(idx, {
                                    unitPrice: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                              KES {money(qty * price)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() =>
                                  setEditItems((rows) =>
                                    rows.filter((_, i) => i !== idx),
                                  )
                                }
                                aria-label={`Remove ${row.productName}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/30">
                        <td
                          colSpan={5}
                          className="px-3 py-2.5 text-right text-sm font-medium"
                        >
                          Subtotal
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold whitespace-nowrap">
                          KES {money(draftSubtotal)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Transport cost</Label>
                <Input
                  type="number"
                  min={0}
                  value={editTransportCost}
                  onChange={(e) => setEditTransportCost(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Transport note</Label>
                <Input
                  value={editTransportNote}
                  onChange={(e) => setEditTransportNote(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => void saveDraft()}
                disabled={busy !== null || stockWarnings.length > 0}
              >
                <Plus className="h-4 w-4 mr-1" />
                {busy === "save" ? "Saving…" : "Save draft"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false)
                  setProductSearch("")
                }}
                disabled={busy !== null}
              >
                Cancel edit
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              KES{" "}
              {money(
                invoice.grandTotal ??
                  Number(invoice.subTotal || 0) + Number(invoice.taxTotal || 0),
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Subtotal {money(invoice.subTotal || 0)} · Tax{" "}
              {money(invoice.taxTotal || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {paymentSummary
                ? `KES ${money(paymentSummary.paidAmount || 0)}`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {paymentSummary
                ? `KES ${money(paymentSummary.balanceRemaining || 0)}`
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Line items
            {isLocked && (
              <span className="text-xs font-normal text-muted-foreground flex items-center gap-1 ml-2">
                <Lock className="h-3 w-3" /> locked
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Qty</th>
                  <th className="px-4 py-2 font-medium">Unit price</th>
                  <th className="px-4 py-2 font-medium">Tax</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, idx) => {
                  const taxAmount = Number(item.taxAmount || 0)
                  const total = Number(
                    item.totalAfterTax !== undefined
                      ? item.totalAfterTax
                      : Number(item.lineTotal || 0) + taxAmount,
                  )
                  return (
                    <tr
                      key={`${item.productName}-${idx}`}
                      className="border-t"
                    >
                      <td className="px-4 py-2 text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{item.productName}</div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2">{item.quantity}</td>
                      <td className="px-4 py-2">
                        KES {Number(item.unitPrice || 0).toLocaleString("en-KE")}
                      </td>
                      <td className="px-4 py-2">KES {money(taxAmount)}</td>
                      <td className="px-4 py-2 font-medium">
                        KES {money(total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {steps.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {steps.map((step: any, idx: number) => {
              const done =
                step.done ||
                step.completed ||
                step.status === "completed" ||
                step.status === "has_credit_notes"
              return (
                <div
                  key={step.key || step.label || idx}
                  className="flex items-start gap-3 text-sm"
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${
                      done
                        ? "bg-emerald-500"
                        : step.status === "in_progress"
                          ? "bg-amber-500"
                          : step.status === "cancelled"
                            ? "bg-rose-500"
                            : "bg-muted-foreground/30"
                    }`}
                  />
                  <div>
                    <p className="font-medium">
                      {step.label || step.title || step.key}
                    </p>
                    {step.reference && (
                      <p className="text-xs text-muted-foreground">
                        {step.reference}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Document info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-muted-foreground">
            <p>
              DN:{" "}
              <span className="text-foreground">
                {invoice.deliveryNoteNumber || "—"}
              </span>
            </p>
            <p>
              Quotation:{" "}
              <span className="text-foreground">
                {invoice.quotationNumber || "—"}
              </span>
            </p>
            {invoice.revisedFromInvoiceId && (
              <p>
                Revision of:{" "}
                <Link
                  href={`/admin/stock/invoices/${invoice.revisedFromInvoiceId}`}
                  className="text-foreground underline"
                >
                  prior invoice
                </Link>
              </p>
            )}
            <p>
              Created:{" "}
              <span className="text-foreground">
                {invoice.createdAt
                  ? new Date(invoice.createdAt).toLocaleString("en-KE")
                  : "—"}
              </span>
            </p>
            {invoice.postedAt && (
              <p>
                Posted:{" "}
                <span className="text-foreground">
                  {new Date(invoice.postedAt).toLocaleString("en-KE")}
                </span>
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">eTIMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-muted-foreground">
            <p className="capitalize">
              Status:{" "}
              <span className="text-foreground">
                {(invoice.etims?.status || "not_posted").replaceAll("_", " ")}
              </span>
            </p>
            {invoice.etims?.responseMessage && (
              <p className="text-xs">{invoice.etims.responseMessage}</p>
            )}
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/admin/accounts/posts">Open OSCU posts</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
