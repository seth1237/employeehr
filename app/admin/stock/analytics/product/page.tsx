"use client"

import { useEffect, useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { API_URL } from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

interface Product {
  _id: string
  name: string
  sku: string
  category?: string
  categoryDetails?: { name: string }
  currentQuantity: number
  sellingPrice: number
  startingPrice: number
}

interface Sale {
  _id: string
  product?: Product
  quantitySold: number
  soldPrice: number
  createdAt: string
  receiptNumber?: string
  clientName?: string
  clientPhone?: string
  clientLocation?: string
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

export default function ProductAnalyticsPage() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [dateStart, setDateStart] = useState("")
  const [dateEnd, setDateEnd] = useState("")
  const [loading, setLoading] = useState(true)
  const [categorySales, setCategorySales] = useState<any | null>(null)
  const [allCategorySales, setAllCategorySales] = useState<any[]>([])
  const [branding, setBranding] = useState<Branding>({})

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const productParam = searchParams.get("product")
    if (productParam) {
      setSelectedProductId(productParam)
    }
  }, [searchParams])

  const fetchData = async () => {
    try {
      const token = getToken()
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
      const [productsRes, salesRes, brandingRes] = await Promise.all([
        fetch(`${API_URL}/api/stock/products`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/stock/sales`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/company/branding`, { headers }),
      ])

      if (productsRes.ok) {
        const productsJson = await productsRes.json()
        setProducts(productsJson.data || productsJson || [])
      }
      if (salesRes.ok) {
        const salesJson = await salesRes.json()
        setSales(salesJson.data || salesJson || [])
      }
      if (brandingRes.ok) {
        const brandingJson = await brandingRes.json()
        setBranding(brandingJson.data || {})
      }

      // Set default date range to last 12 months
      if (!dateStart && !dateEnd) {
        const end = new Date()
        const start = new Date()
        start.setMonth(start.getMonth() - 11)
        setDateStart(start.toISOString().slice(0, 10))
        setDateEnd(end.toISOString().slice(0, 10))
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        const headers = { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }
        const res = await fetch(`${API_URL}/api/stock/categories/sales`, { headers })
        if (res.ok) {
          const json = await res.json()
          setAllCategorySales(json.data || [])
        }
      } catch (e) {
        // ignore
      }
    }
    fetchAllCategories()
  }, [])

  const selectedProduct = useMemo(() => products.find((p) => p._id === selectedProductId) || null, [products, selectedProductId])

  useEffect(() => {
    if (!selectedProduct || !selectedProduct.category) {
      setCategorySales(null)
      return
    }

    const fetchCategorySales = async () => {
      try {
        const headers = { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }
        const res = await fetch(`${API_URL}/api/stock/categories/${selectedProduct.category}/sales`, { headers })
        if (res.ok) {
          const json = await res.json()
          setCategorySales(json.data || null)
        } else {
          setCategorySales(null)
        }
      } catch (e) {
        setCategorySales(null)
      }
    }

    fetchCategorySales()
  }, [selectedProduct])

  const selectedProductSales = useMemo(
    () => sales.filter((sale) => String(sale.product?._id || "") === selectedProductId),
    [sales, selectedProductId]
  )

  const selectedProductSalesInRange = useMemo(() => {
    const start = dateStart ? new Date(`${dateStart}T00:00:00.000`) : null
    const end = dateEnd ? new Date(`${dateEnd}T23:59:59.999`) : null

    return selectedProductSales.filter((sale) => {
      const saleDate = new Date(sale.createdAt)
      if (start && saleDate < start) return false
      if (end && saleDate > end) return false
      return true
    })
  }, [selectedProductSales, dateStart, dateEnd])

  const analytics = useMemo(() => {
    const totalQty = selectedProductSalesInRange.reduce((sum, s) => sum + (s.quantitySold || 0), 0)
    const totalRevenue = selectedProductSalesInRange.reduce((sum, s) => sum + (s.quantitySold || 0) * (s.soldPrice || 0), 0)

    if (totalQty === 0) {
      return { totalQty, totalRevenue, avgPrice: 0, topClients: [], priceBreakdown: [] }
    }

    const avgPrice = totalRevenue / totalQty
    const costBasis = totalQty * (selectedProduct?.startingPrice || 0)
    const grossProfit = totalRevenue - costBasis

    // Top clients
    const clientMap = new Map<string, { name: string; phone?: string; location?: string; units: number; revenue: number }>()
    selectedProductSalesInRange.forEach((sale) => {
      const key = `${sale.clientName || "Unknown"}`
      const existing = clientMap.get(key) || { name: sale.clientName || "Unknown", phone: sale.clientPhone, location: sale.clientLocation, units: 0, revenue: 0 }
      existing.units += sale.quantitySold || 0
      existing.revenue += (sale.quantitySold || 0) * (sale.soldPrice || 0)
      clientMap.set(key, existing)
    })
    const topClients = Array.from(clientMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5)

    // Price breakdown
    const priceMap = new Map<string, { price: number; units: number; revenue: number; salesCount: number }>()
    selectedProductSalesInRange.forEach((sale) => {
      const key = String(sale.soldPrice || 0)
      const existing = priceMap.get(key) || { price: sale.soldPrice || 0, units: 0, revenue: 0, salesCount: 0 }
      existing.units += sale.quantitySold || 0
      existing.revenue += (sale.quantitySold || 0) * (sale.soldPrice || 0)
      existing.salesCount += 1
      priceMap.set(key, existing)
    })
    const priceBreakdown = Array.from(priceMap.values()).sort((a, b) => b.revenue - a.revenue)

    return { totalQty, totalRevenue, avgPrice, topClients, priceBreakdown, costBasis, grossProfit, grossMargin: ((grossProfit / totalRevenue) * 100).toFixed(1) }
  }, [selectedProductSalesInRange, selectedProduct])

  if (loading) return <PageLoadingSkeleton title="Loading product analytics" rows={8} />

  if (!selectedProduct) {
    return (
      <div
        className="rounded-lg border p-8 text-center"
        style={{
          borderColor: primaryBorderColor,
          background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})`,
        }}
      >
        <p className="text-slate-600">Select a product from the search bar above to view analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl border p-4 shadow-sm md:p-5"
        style={{
          borderColor: primaryBorderColor,
          background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})`,
        }}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-xs text-slate-500">Total Revenue</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: primaryColor }}>{analytics.totalRevenue.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-xs text-slate-500">Qty Sold</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{analytics.totalQty}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-xs text-slate-500">Avg Price</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{analytics.avgPrice.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
            <p className="text-xs text-slate-500">Gross Margin</p>
            <p className="mt-1 text-lg font-semibold" style={{ color: secondaryColor }}>{analytics.grossMargin}%</p>
          </div>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b" style={{ backgroundColor: primarySoftColor }}>
          <CardTitle className="text-base font-semibold text-slate-900">Date Range</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5 md:p-6">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <Label>From</Label>
              <Input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
            </div>
            <Button
              variant="outline"
              style={{ borderColor: primaryBorderColor, color: primaryColor }}
              onClick={() => {
                const end = new Date()
                const start = new Date()
                start.setMonth(start.getMonth() - 11)
                setDateStart(start.toISOString().slice(0, 10))
                setDateEnd(end.toISOString().slice(0, 10))
              }}
            >
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b" style={{ backgroundColor: primarySoftColor }}>
            <CardTitle className="text-base">Top Clients</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {analytics.topClients.length === 0 ? (
              <p className="text-sm text-slate-500">No client history yet.</p>
            ) : (
              <div className="space-y-2">
                {analytics.topClients.map((client) => (
                  <div key={client.name} className="rounded border border-slate-200 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500">{client.phone || "-"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900">{client.revenue.toFixed(2)}</p>
                        <p className="text-xs text-slate-500">{client.units} units</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b" style={{ backgroundColor: secondarySoftColor }}>
            <CardTitle className="text-base">Category Sales</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {!categorySales ? (
              <p className="text-sm text-slate-500">Select a product to load category sales.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs text-slate-500">Category products</p>
                    <p className="font-medium text-slate-900">{(categorySales.products || []).length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total revenue</p>
                    <p className="font-medium text-slate-900">{Number(categorySales.totalRevenue || 0).toFixed(2)}</p>
                  </div>
                </div>

                {categorySales.monthlyTrend && categorySales.monthlyTrend.length > 0 && (
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={categorySales.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="units" stroke={primaryColor} name="Units" strokeWidth={2} />
                        <Line type="monotone" dataKey="revenue" stroke={secondaryColor} name="Revenue" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="space-y-2">
                  {(categorySales.products || []).map((p: any) => (
                    <div key={p._id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{p.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">View product analytics for this product</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b" style={{ backgroundColor: primarySoftColor }}>
            <CardTitle className="text-base">Price Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {analytics.priceBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No price history yet.</p>
            ) : (
              <div className="space-y-2">
                {analytics.priceBreakdown.map((row) => (
                  <div key={row.price} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-slate-900">{row.price.toFixed(2)}</p>
                      <p className="text-xs text-slate-500">{row.salesCount} sale(s)</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-900">{row.units} units</p>
                      <p className="text-xs text-slate-500">{row.revenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b" style={{ backgroundColor: primarySoftColor }}>
          <CardTitle className="text-base">Sales History</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-5">
          {selectedProductSalesInRange.length === 0 ? (
            <p className="text-sm text-slate-500">No sales history.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Date</th>
                    <th className="py-2">Receipt</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2">Price</th>
                    <th className="py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProductSalesInRange.map((sale) => {
                    const revenue = (sale.quantitySold || 0) * (sale.soldPrice || 0)
                    return (
                      <tr key={sale._id} className="border-b">
                        <td className="py-2">{new Date(sale.createdAt).toLocaleDateString()}</td>
                        <td className="py-2">{sale.receiptNumber || "-"}</td>
                        <td className="py-2">{sale.quantitySold}</td>
                        <td className="py-2">{(sale.soldPrice || 0).toFixed(2)}</td>
                        <td className="py-2">{revenue.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b" style={{ backgroundColor: secondarySoftColor }}>
          <CardTitle className="text-base">Categories Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {allCategorySales.length === 0 ? (
            <p className="text-sm text-slate-500">No category data yet.</p>
          ) : (
            <div className="space-y-2">
              {allCategorySales.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div>
                    <p className="text-slate-700">{cat.name}</p>
                    <p className="text-xs text-slate-500">Units: {cat.units}</p>
                  </div>
                  <div className="font-medium text-slate-900">{cat.revenue.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
