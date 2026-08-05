"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { API_URL } from "@/lib/apiBase"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

interface Product {
  _id: string
  name: string
  startingPrice: number
}

interface Sale {
  _id: string
  product?: Product
  quantitySold: number
  soldPrice: number
  createdAt: string
}

export default function TrendsAnalyticsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedProductId, setSelectedProductId] = useState("")
  const [dateStart, setDateStart] = useState("")
  const [dateEnd, setDateEnd] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token")
      const [productsRes, salesRes] = await Promise.all([
        fetch(`${API_URL}/api/stock/products`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/stock/sales`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (productsRes.ok) setProducts(await productsRes.json())
      if (salesRes.ok) setSales(await salesRes.json())

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

  const filteredSales = useMemo(() => {
    const start = dateStart ? new Date(`${dateStart}T00:00:00.000`) : null
    const end = dateEnd ? new Date(`${dateEnd}T23:59:59.999`) : null

    return sales.filter((sale) => {
      const saleDate = new Date(sale.createdAt)
      if (start && saleDate < start) return false
      if (end && saleDate > end) return false
      return true
    })
  }, [sales, dateStart, dateEnd])

  const monthlyOverallTrend = useMemo(() => {
    const map = new Map<string, { units: number; revenue: number; profit: number }>()

    filteredSales.forEach((sale) => {
      const date = new Date(sale.createdAt)
      const monthKey = date.toLocaleDateString("en-US", { year: "numeric", month: "short" })
      const existing = map.get(monthKey) || { units: 0, revenue: 0, profit: 0 }
      const saleRevenue = (sale.quantitySold || 0) * (sale.soldPrice || 0)
      const saleCost = (sale.quantitySold || 0) * (sale.product?.startingPrice || 0)
      existing.units += sale.quantitySold || 0
      existing.revenue += saleRevenue
      existing.profit += saleRevenue - saleCost
      map.set(monthKey, existing)
    })

    return Array.from(map.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  }, [filteredSales])

  const selectedProductTrend = useMemo(() => {
    if (!selectedProductId || selectedProductId === "__all__") return []

    const map = new Map<string, { units: number; revenue: number; profit: number }>()

    filteredSales
      .filter((sale) => sale.product?._id === selectedProductId)
      .forEach((sale) => {
        const date = new Date(sale.createdAt)
        const monthKey = date.toLocaleDateString("en-US", { year: "numeric", month: "short" })
        const existing = map.get(monthKey) || { units: 0, revenue: 0, profit: 0 }
        const saleRevenue = (sale.quantitySold || 0) * (sale.soldPrice || 0)
        const saleCost = (sale.quantitySold || 0) * (sale.product?.startingPrice || 0)
        existing.units += sale.quantitySold || 0
        existing.revenue += saleRevenue
        existing.profit += saleRevenue - saleCost
        map.set(monthKey, existing)
      })

    return Array.from(map.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  }, [filteredSales, selectedProductId])

  const monthlyProductComparison = useMemo(() => {
    const map = new Map<string, Record<string, number>>()

    filteredSales.slice(-100).forEach((sale) => {
      const date = new Date(sale.createdAt)
      const monthKey = date.toLocaleDateString("en-US", { year: "numeric", month: "short" })
      const productName = sale.product?.name || "Unknown"

      if (!map.has(monthKey)) {
        map.set(monthKey, {})
      }
      const monthData = map.get(monthKey)!
      monthData[productName] = (monthData[productName] || 0) + (sale.quantitySold || 0)
    })

    return Array.from(map.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  }, [filteredSales])

  const growthRateByProduct = useMemo(() => {
    const map = new Map<string, { first: number; last: number; name: string }>()

    filteredSales.forEach((sale) => {
      const productId = sale.product?._id || "unknown"
      const existing = map.get(productId) || { first: 0, last: 0, name: sale.product?.name || "Unknown" }
      existing.last = (sale.quantitySold || 0) * (sale.soldPrice || 0)
      if (existing.first === 0) {
        existing.first = existing.last
      }
      map.set(productId, existing)
    })

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        growth: item.first > 0 ? (((item.last - item.first) / item.first) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => parseFloat(b.growth) - parseFloat(a.growth))
  }, [filteredSales])

  if (loading) return <PageLoadingSkeleton title="Loading trends analytics" rows={8} />

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/80">
          <CardTitle className="text-base font-semibold text-slate-900">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-5 md:p-6">
          <div>
            <Label>Select product (optional)</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All products</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product._id} value={product._id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/70">
          <CardTitle className="text-base">Overall Monthly Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-80 p-4">
          {monthlyOverallTrend.length === 0 ? (
            <p className="text-sm text-slate-500">No data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyOverallTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="units" stroke="#2563eb" name="Units" strokeWidth={2} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#f59e0b" name="Profit" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {selectedProductId && selectedProductId !== "__all__" && (
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b bg-slate-50/70">
            <CardTitle className="text-base">Selected Product Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-80 p-4">
            {selectedProductTrend.length === 0 ? (
              <p className="text-sm text-slate-500">No data for this product.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedProductTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="units" stroke="#2563eb" name="Units" strokeWidth={2} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="#f59e0b" name="Profit" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/70">
          <CardTitle className="text-base">Product Growth Rates</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {growthRateByProduct.length === 0 ? (
            <p className="text-sm text-slate-500">No data available.</p>
          ) : (
            <div className="space-y-2">
              {growthRateByProduct.slice(0, 10).map((product) => {
                const growth = parseFloat(product.growth)
                const isPositive = growth > 0
                return (
                  <div
                    key={product.name}
                    className={`rounded border px-3 py-2 text-sm ${isPositive ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-slate-900">{product.name}</p>
                      <p className={`font-medium ${isPositive ? "text-green-700" : "text-red-700"}`}>{product.growth}%</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
