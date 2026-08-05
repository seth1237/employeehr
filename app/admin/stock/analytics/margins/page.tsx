"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { API_URL } from "@/lib/apiBase"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

interface Product {
  _id: string
  name: string
  sku: string
  startingPrice: number
  sellingPrice: number
  currentQuantity: number
}

interface Sale {
  _id: string
  product?: Product
  quantitySold: number
  soldPrice: number
  createdAt: string
}

export default function MarginsAnalyticsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
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

  const marginByProduct = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; cost: number; profit: number; units: number }>()

    filteredSales.forEach((sale) => {
      const productId = sale.product?._id || "unknown"
      const existing = map.get(productId) || {
        name: sale.product?.name || "Unknown",
        revenue: 0,
        cost: 0,
        profit: 0,
        units: 0,
      }
      const saleRevenue = (sale.quantitySold || 0) * (sale.soldPrice || 0)
      const saleCost = (sale.quantitySold || 0) * (sale.product?.startingPrice || 0)
      existing.revenue += saleRevenue
      existing.cost += saleCost
      existing.profit += saleRevenue - saleCost
      existing.units += sale.quantitySold || 0
      map.set(productId, existing)
    })

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        margin: item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(1) : "0",
      }))
      .sort((a, b) => parseFloat(b.margin) - parseFloat(a.margin))
  }, [filteredSales])

  const overallStats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.quantitySold || 0) * (s.soldPrice || 0), 0)
    const totalCost = filteredSales.reduce((sum, s) => sum + (s.quantitySold || 0) * (s.product?.startingPrice || 0), 0)
    const totalProfit = totalRevenue - totalCost
    const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0"

    return { totalRevenue, totalCost, totalProfit, avgMargin }
  }, [filteredSales])

  const bestPerformers = useMemo(() => marginByProduct.slice(0, 5), [marginByProduct])
  const worstPerformers = useMemo(() => marginByProduct.slice(-5).reverse(), [marginByProduct])

  if (loading) return <PageLoadingSkeleton title="Loading margins analytics" rows={8} />

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Total Revenue</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{overallStats.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Total Cost</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{overallStats.totalCost.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Total Profit</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{overallStats.totalProfit.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Avg Margin</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{overallStats.avgMargin}%</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/80">
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
          <CardHeader className="border-b bg-slate-50/70">
            <CardTitle className="text-base">Best Margin Products</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {bestPerformers.length === 0 ? (
              <p className="text-sm text-slate-500">No data available.</p>
            ) : (
              <div className="space-y-2">
                {bestPerformers.map((product) => (
                  <div key={product.name} className="rounded border border-green-200 bg-green-50/50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.units} units · {product.revenue.toFixed(2)} revenue</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-700">{product.margin}%</p>
                        <p className="text-xs text-slate-500">{product.profit.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b bg-slate-50/70">
            <CardTitle className="text-base">Lowest Margin Products</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {worstPerformers.length === 0 ? (
              <p className="text-sm text-slate-500">No data available.</p>
            ) : (
              <div className="space-y-2">
                {worstPerformers.map((product) => (
                  <div key={product.name} className="rounded border border-orange-200 bg-orange-50/50 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.units} units · {product.revenue.toFixed(2)} revenue</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-orange-700">{product.margin}%</p>
                        <p className="text-xs text-slate-500">{product.profit.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b bg-slate-50/70">
          <CardTitle className="text-base">All Products by Margin</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {marginByProduct.length === 0 ? (
            <p className="text-sm text-slate-500">No sales data available.</p>
          ) : (
            <div className="space-y-2">
              {marginByProduct.map((product) => {
                const isHighMargin = parseFloat(product.margin) >= 20
                const isLowMargin = parseFloat(product.margin) < 5
                return (
                  <div
                    key={product.name}
                    className={`rounded border px-3 py-2 text-sm ${
                      isHighMargin ? "border-green-200 bg-green-50/30" : isLowMargin ? "border-orange-200 bg-orange-50/30" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">
                          Revenue {product.revenue.toFixed(2)} · Cost {product.cost.toFixed(2)} · Qty {product.units}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${isHighMargin ? "text-green-700" : isLowMargin ? "text-orange-700" : "text-slate-900"}`}>
                          {product.margin}%
                        </p>
                        <p className="text-xs text-slate-500">Profit {product.profit.toFixed(2)}</p>
                      </div>
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
