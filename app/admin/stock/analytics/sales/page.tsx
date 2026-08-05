"use client"

import { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { API_URL } from "@/lib/apiBase"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

interface Product {
  _id: string
  name: string
  sku: string
  startingPrice: number
  currentQuantity: number
}

interface Sale {
  _id: string
  product?: Product
  quantitySold: number
  soldPrice: number
  createdAt: string
  receiptNumber?: string
}

export default function SalesAnalyticsPage() {
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

  const monthlyData = useMemo(() => {
    const map = new Map<string, { units: number; revenue: number }>()

    filteredSales.forEach((sale) => {
      const date = new Date(sale.createdAt)
      const monthKey = date.toLocaleDateString("en-US", { year: "numeric", month: "short" })
      const existing = map.get(monthKey) || { units: 0, revenue: 0 }
      existing.units += sale.quantitySold || 0
      existing.revenue += (sale.quantitySold || 0) * (sale.soldPrice || 0)
      map.set(monthKey, existing)
    })

    return Array.from(map.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  }, [filteredSales])

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; units: number; revenue: number }>()

    filteredSales.forEach((sale) => {
      const productId = sale.product?._id || "unknown"
      const existing = map.get(productId) || { name: sale.product?.name || "Unknown", units: 0, revenue: 0 }
      existing.units += sale.quantitySold || 0
      existing.revenue += (sale.quantitySold || 0) * (sale.soldPrice || 0)
      map.set(productId, existing)
    })

    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
  }, [filteredSales])

  const totalStats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + (s.quantitySold || 0) * (s.soldPrice || 0), 0)
    const totalUnits = filteredSales.reduce((sum, s) => sum + (s.quantitySold || 0), 0)
    const totalCost = filteredSales.reduce((sum, s) => sum + (s.quantitySold || 0) * (s.product?.startingPrice || 0), 0)
    const totalProfit = totalRevenue - totalCost
    const avgTransactionValue = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0

    return { totalRevenue, totalUnits, totalCost, totalProfit, avgTransactionValue, transactions: filteredSales.length }
  }, [filteredSales])

  if (loading) return <PageLoadingSkeleton title="Loading sales analytics" rows={8} />

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Total Revenue</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{totalStats.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Units Sold</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{totalStats.totalUnits}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Transactions</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{totalStats.transactions}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Avg Transaction</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{totalStats.avgTransactionValue.toFixed(2)}</p>
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
            <CardTitle className="text-base">Monthly Sales Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-80 p-4">
            {monthlyData.length === 0 ? (
              <p className="text-sm text-slate-500">No sales data in this range.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="units" stroke="#2563eb" name="Units Sold" strokeWidth={2} />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" name="Revenue" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b bg-slate-50/70">
            <CardTitle className="text-base">Top Selling Products</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {topProducts.length === 0 ? (
              <p className="text-sm text-slate-500">No sales data yet.</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((product) => (
                  <div key={product.name} className="rounded border border-slate-200 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.units} units</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-slate-900">{product.revenue.toFixed(2)}</p>
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
          <CardTitle className="text-base">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-5">
          {filteredSales.length === 0 ? (
            <p className="text-sm text-slate-500">No sales in this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2">Date</th>
                    <th className="py-2">Product</th>
                    <th className="py-2">Qty</th>
                    <th className="py-2">Price</th>
                    <th className="py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.slice(-20).reverse().map((sale) => {
                    const revenue = (sale.quantitySold || 0) * (sale.soldPrice || 0)
                    return (
                      <tr key={sale._id} className="border-b">
                        <td className="py-2">{new Date(sale.createdAt).toLocaleDateString()}</td>
                        <td className="py-2">{sale.product?.name || "Unknown"}</td>
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
    </div>
  )
}
