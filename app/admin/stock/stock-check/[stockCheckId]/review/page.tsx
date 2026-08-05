"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { fetchJson } from "@/lib/fetchUtils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

interface CountEntry {
  productId: string
  productName?: string
  categoryId?: string
  expiryDate?: string
  warehouseQuantity?: number
  expectedQuantity?: number
  countedQuantity?: number
  variance?: number
}

interface StockCheck {
  _id: string
  stockCheckNumber: string
  warehouse: { _id: string; name: string }
  status: string
  itemsTotal: number
  itemsCounted: number
  varianceCount: number
  totalVarianceValue: number
  createdAt: string
  updatedAt?: string
  categories?: string[]
  countedItems?: CountEntry[]
}

interface ProductRow {
  _id: string
  name: string
  currentQuantity: number
  expiryEnabled?: boolean
  expiryDate?: string | null
  warehouseQuantity: number
  categoryDetails?: { _id?: string; name?: string } | null
  countedQuantity?: number | null
  expectedQuantity: number
  variance: number
}

export default function StockCheckReviewPage() {
  const params = useParams() as { stockCheckId: string }
  const stockCheckId = String(params.stockCheckId || "")
  const [stockCheck, setStockCheck] = useState<StockCheck | null>(null)
  const [products, setProducts] = useState<ProductRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)

  const productFilter = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) return products
    return products.filter((product) =>
      product.name.toLowerCase().includes(normalized) ||
      product.categoryDetails?.name?.toLowerCase().includes(normalized),
    )
  }, [products, searchTerm])

  useEffect(() => {
    const loadStockCheckAndProducts = async () => {
      setLoading(true)
      setSaveError(null)
      setSaveMessage(null)

      try {
        const stockRes = await fetchJson(`/api/stock/stock-checks/${stockCheckId}`)
        if (!stockRes.response.ok || !stockRes.data) {
          window.alert(stockRes.errorMessage || "Unable to load stock check")
          return
        }

        const stockData = stockRes.data.data
        setStockCheck(stockData)

        const categoryQuery = Array.isArray(stockData.categories) && stockData.categories.length
          ? `&categoryIds=${stockData.categories.join(",")}`
          : ""

        const productRes = await fetchJson(
          `/api/stock/products?warehouseId=${stockData.warehouse._id}${categoryQuery}`,
        )

        if (!productRes.response.ok || !productRes.data) {
          window.alert(productRes.errorMessage || "Unable to load products for stock check")
          return
        }

        const existingCounts = Array.isArray(stockData.countedItems)
          ? stockData.countedItems
          : []

        const rows: ProductRow[] = (productRes.data.data || []).map((product: any) => {
          const expectedQuantity = Number(product.warehouseQuantity ?? product.currentQuantity ?? 0)
          const existing = existingCounts.find(
            (item) => String(item.productId) === String(product._id),
          )
          const countedQuantity = existing?.countedQuantity != null ? Number(existing.countedQuantity) : null
          return {
            _id: String(product._id),
            name: String(product.name || ""),
            currentQuantity: Number(product.currentQuantity || 0),
            expiryEnabled: Boolean(product.expiryEnabled),
            expiryDate: product.expiryDate ? String(product.expiryDate) : null,
            warehouseQuantity: expectedQuantity,
            categoryDetails: product.categoryDetails || null,
            countedQuantity,
            expectedQuantity,
            variance:
              countedQuantity != null ? countedQuantity - expectedQuantity : 0,
          }
        })

        setProducts(rows)
      } catch (error) {
        window.alert("Unable to load stock check data")
      } finally {
        setLoading(false)
      }
    }

    loadStockCheckAndProducts()
  }, [stockCheckId])

  const saveCounts = async (rows: ProductRow[]) => {
    setSaving(true)
    setSaveError(null)
    setSaveMessage(null)
    try {
      const payload = rows.map((row) => ({
        productId: row._id,
        productName: row.name,
        categoryId: row.categoryDetails?._id,
        expiryDate: row.expiryDate || undefined,
        warehouseQuantity: row.warehouseQuantity,
        expectedQuantity: row.expectedQuantity,
        countedQuantity: row.countedQuantity != null ? Number(row.countedQuantity) : undefined,
      }))

      const result = await fetchJson(`/api/stock/stock-checks/${stockCheckId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countedItems: payload }),
      })

      if (!result.response.ok || !result.data) {
        setSaveError(result.errorMessage || "Could not save stock counts")
        return
      }

      const updatedStockCheck = result.data.data
      setStockCheck((prev) => (prev ? { ...prev, ...updatedStockCheck } : prev))
      setSaveMessage("Saved")
    } catch (error) {
      setSaveError("Unable to save count data")
    } finally {
      setSaving(false)
    }
  }

  const updateProductCount = (productId: string, value: number | null) => {
    const updated = products.map((product) => {
      if (product._id !== productId) return product
      const countedQuantity =
        value === null || Number.isNaN(value) ? null : Math.max(0, value)
      return {
        ...product,
        countedQuantity,
        variance:
          countedQuantity != null ? countedQuantity - product.expectedQuantity : 0,
      }
    })
    setProducts(updated)

    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveCounts(updated)
    }, 600)
  }

  const countedItems = products.filter((item) => item.countedQuantity != null).length
  const expectedItems = stockCheck?.itemsTotal || products.length
  const varianceTotal = products.reduce((sum, item) => sum + item.variance, 0)
  const progress = expectedItems ? Math.min((countedItems / expectedItems) * 100, 100) : 0

  if (loading) return <PageLoadingSkeleton title="Loading review" rows={4} />
  if (!stockCheck) return <div className="p-6">Stock check not found.</div>

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Review stock count</h1>
            <p className="text-sm text-muted-foreground">
              Compare counted stock against warehouse inventory and update the current count.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/admin/stock/stock-check/${stockCheckId}`}>Back to details</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Count summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Stock check #</Label>
              <p>{stockCheck.stockCheckNumber}</p>
            </div>
            <div className="grid gap-2">
              <Label>Warehouse</Label>
              <p>{stockCheck.warehouse.name}</p>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <p>{stockCheck.status.replace(/_/g, " ")}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <Label>Expected items</Label>
                <p>{expectedItems}</p>
              </div>
              <div>
                <Label>Counted items</Label>
                <p>{countedItems}</p>
              </div>
              <div>
                <Label>Variance</Label>
                <p>{varianceTotal}</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Progress</Label>
              <div className="rounded-full bg-slate-100 h-3 overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} />
              </div>
              <p>{progress.toFixed(0)}%</p>
            </div>
            {saveMessage && <p className="text-sm text-emerald-600">{saveMessage}</p>}
            {saveError && <p className="text-sm text-rose-600">{saveError}</p>}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Filter and status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Search products</Label>
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by product or category"
              />
            </div>
            <div className="grid gap-2">
              <Label>Last updated</Label>
              <p>{stockCheck.updatedAt ? new Date(stockCheck.updatedAt).toLocaleString() : "Not yet updated"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Counted inventory</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[880px] space-y-4">
            <div className="grid grid-cols-6 gap-4 text-sm font-semibold text-slate-700 pb-2 border-b">
              <div>Product</div>
              <div>Category</div>
              <div>Expected</div>
              <div>Counted</div>
              <div>Variance</div>
              <div>Expiry</div>
            </div>
            {productFilter.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">No matching products found.</p>
            ) : (
              productFilter.map((product) => (
                <div
                  key={product._id}
                  className="grid grid-cols-6 gap-4 items-center py-3 border-b last:border-b-0"
                >
                  <div>{product.name}</div>
                  <div>{product.categoryDetails?.name || "—"}</div>
                  <div>{product.expectedQuantity}</div>
                  <div>
                    <Input
                      type="number"
                      min={0}
                      value={product.countedQuantity ?? ""}
                      onChange={(event) => {
                        const raw = event.target.value
                        updateProductCount(
                          product._id,
                          raw === "" ? null : Number(raw),
                        )
                      }}
                      className="max-w-[120px]"
                    />
                  </div>
                  <div>{product.countedQuantity != null ? product.variance : "—"}</div>
                  <div>
                    {product.expiryEnabled && product.expiryDate
                      ? new Date(product.expiryDate).toLocaleDateString()
                      : "—"}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
