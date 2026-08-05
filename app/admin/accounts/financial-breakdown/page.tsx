"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { api, companyApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  TrendingUp, 
  Package,
  Activity,
  BarChart3,
  Search,
  RefreshCcw,
  Download,
  AlertCircle,
  PieChart,
  Tag,
  LayoutDashboard,
  CalendarDays,
  MapPin,
  TrendingDown,
  UserCheck
} from "lucide-react"

interface FinancialSummary {
  totalInflow: number
  totalOutflow: number
  netCashFlow: number
  totalRevenue: number
  totalProfit: number
  totalInventoryValue: number
}

interface ProductBreakdown {
  productId: string
  productName: string
  category: string
  currentQuantity: number
  unitCost: number
  unitPrice: number
  quantitySold: number
  revenue: number
  cogs: number
  stockValue: number
  profit: number
  margin: number
}

interface CategoryStat {
  category: string
  revenue: number
  profit: number
  margin: number
  items: number
}

interface ComparisonData {
  revenueChange: number
  profitChange: number
  inflowChange: number
  outflowChange: number
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function FinancialBreakdownPage() {
  const [loading, setLoading] = useState(true)
  const [isRefreshing, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [period, setPeriod] = useState("this-month")
  const [selectedBranch, setSelectedBranch] = useState("all")
  const [selectedEmployee, setSelectedEmployee] = useState("all")
  const [branches, setBranches] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  
  const [data, setData] = useState<{
    summary: FinancialSummary
    breakdown: ProductBreakdown[]
    categories: CategoryStat[]
    comparison: ComparisonData | null
  } | null>(null)

  const [branding, setBranding] = useState<{ primaryColor?: string; secondaryColor?: string }>({})

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      
      const params: any = {}
      if (period !== "all") {
        const now = new Date()
        let startDate: string | undefined
        let endDate: string | undefined

        if (period === "this-month") {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
          endDate = now.toISOString()
        } else if (period === "last-30") {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
          endDate = now.toISOString()
        } else if (period === "this-year") {
          startDate = new Date(now.getFullYear(), 0, 1).toISOString()
          endDate = now.toISOString()
        }
        if (startDate) params.startDate = startDate
        if (endDate) params.endDate = endDate
      }

      if (selectedBranch !== "all") params.branchId = selectedBranch
      if (selectedEmployee !== "all") params.userId = selectedEmployee

      const [finRes, companyRes, branchesRes, usersRes] = await Promise.all([
        (api.stock as any).getFinancialBreakdown(params),
        companyApi.getBranding(),
        api.branches.getAll(),
        api.users.getAll()
      ])
      
      setData(finRes.data)
      setBranches(branchesRes.data || [])
      setEmployees(usersRes.data || [])
      if (companyRes.success) {
        setBranding({
          primaryColor: companyRes.data?.primaryColor,
          secondaryColor: companyRes.data?.secondaryColor
        })
      }
    } catch (error: any) {
      console.error(error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period, selectedBranch, selectedEmployee])

  const handleRefresh = () => {
    startTransition(async () => {
      await loadData(true)
    })
  }

  const filteredBreakdown = useMemo(() => {
    if (!data?.breakdown) return []
    const q = search.trim().toLowerCase()
    if (!q) return data.breakdown

    return data.breakdown.filter((item) =>
      item.productName.toLowerCase().includes(q) || 
      item.category.toLowerCase().includes(q)
    )
  }, [data?.breakdown, search])

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  const getMarginColor = (margin: number) => {
    if (margin > 40) return "bg-emerald-50 text-emerald-700 border-emerald-100"
    if (margin > 20) return "bg-blue-50 text-blue-700 border-blue-100"
    if (margin > 0) return "bg-amber-50 text-amber-700 border-amber-100"
    return "bg-rose-50 text-rose-700 border-rose-100"
  }

  const ComparisonBadge = ({ change }: { change?: number }) => {
    if (change === undefined || change === null) return null
    const isPositive = change > 0
    return (
      <div className={`flex items-center gap-0.5 text-[10px] font-semibold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {isPositive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
        {Math.abs(change).toFixed(1)}%
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-10 w-10 animate-spin text-primary opacity-30" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">Analyzing fiscal datasets...</p>
        </div>
      </div>
    )
  }

  if (!data) return <div className="p-6 text-center">Failed to load system financials.</div>

  const { summary, categories, comparison } = data

  return (
    <div className="space-y-4">
      {/* Header & Advanced Filters */}
      <div className="rounded-2xl border px-4 py-3 shadow-sm" style={{ borderColor: primaryBorderColor, background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})` }}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium tracking-wide" style={{ color: primaryColor }}>Fiscal Intelligence</p>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Financial Breakdown</h1>
            <p className="text-sm text-muted-foreground">Comparative tracking across branches, personnel, and timeframes.</p>
          </div>
          
          <div className="flex flex-wrap items-end gap-2.5">
            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground ml-1">Period</p>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[130px] h-9 bg-background/50 border-none shadow-sm text-xs">
                  <CalendarDays className="h-3.5 w-3.5 mr-1.5 opacity-50" />
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-30">Last 30 Days</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                  <SelectItem value="all">Global History</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground ml-1">Branch</p>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[140px] h-9 bg-background/50 border-none shadow-sm text-xs">
                  <MapPin className="h-3.5 w-3.5 mr-1.5 opacity-50" />
                  <SelectValue placeholder="All Branches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground ml-1">Employee</p>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger className="w-[150px] h-9 bg-background/50 border-none shadow-sm text-xs">
                  <UserCheck className="h-3.5 w-3.5 mr-1.5 opacity-50" />
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  {employees.map(u => (
                    <SelectItem key={u._id} value={u._id}>{u.firstName} {u.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-9 bg-background/50 border-none px-2.5">
                <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button size="sm" style={{ backgroundColor: primaryColor }} className="h-9 hover:opacity-90 px-4 text-xs font-medium">
                <Download className="mr-1.5 h-4 w-4" />
                Report
              </Button>
            </div>
          </div>
        </div>

        {/* Global Summary Grid */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Gross Revenue", value: summary.totalRevenue, change: comparison?.revenueChange, color: "text-foreground" },
            { label: "Net Operating Profit", value: summary.totalProfit, change: comparison?.profitChange, color: primaryColor, isDynamicColor: true },
            { label: "Actual Cash Inflow", value: summary.totalInflow, change: comparison?.inflowChange, color: "text-emerald-600" },
            { label: "Operating Outflow", value: summary.totalOutflow, change: comparison?.outflowChange, color: "text-rose-600" }
          ].map((item, idx) => (
            <Card key={idx} className="shadow-sm border-none bg-background/60 backdrop-blur-sm">
              <CardContent className="p-3 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] uppercase font-medium tracking-wide text-muted-foreground">{item.label}</div>
                  <ComparisonBadge change={item.change} />
                </div>
                <div className={`mt-1 text-xl font-semibold tabular-nums ${item.isDynamicColor ? '' : item.color}`} style={item.isDynamicColor ? { color: item.color } : {}}>
                  <span className="text-xs font-normal opacity-50 mr-1">KES</span>
                  {item.value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Category Performance */}
        <Card className="lg:col-span-4 border shadow-sm h-fit">
          <CardHeader className="bg-muted/5 border-b py-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PieChart className="h-4 w-4" style={{ color: secondaryColor }} />
                <CardTitle className="text-sm font-semibold">Category Analysis</CardTitle>
              </div>
              <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wide bg-background">Contribution</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {categories.map((cat, idx) => (
                <div key={idx} className="p-4 space-y-2.5 hover:bg-muted/5 transition-colors">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-foreground capitalize">{cat.category}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">{cat.items} Items Analysed</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold" style={{ color: primaryColor }}>KES {cat.revenue.toLocaleString()}</p>
                      <div className={`mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getMarginColor(cat.margin)}`}>
                        {cat.margin.toFixed(1)}% Margin
                      </div>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000" 
                      style={{ 
                        width: `${Math.min(100, (cat.revenue / (data.summary.totalRevenue || 1)) * 100)}%`,
                        backgroundColor: idx === 0 ? primaryColor : idx === 1 ? secondaryColor : undefined
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="border-t bg-muted/5 py-3 px-4">
            <div className="flex items-center justify-between text-xs">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Catalog Asset Valuation</p>
              <p className="font-semibold">KES {summary.totalInventoryValue.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        {/* Strategic Product Index */}
        <Card className="lg:col-span-8 border shadow-sm flex flex-col overflow-hidden">
          <CardHeader className="py-3 px-4 border-b bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" style={{ color: primaryColor }} />
                <CardTitle className="text-sm font-semibold">Catalog Profitability Index</CardTitle>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filter name or group..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 bg-muted/20 border-none text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                  <tr className="text-left">
                    <th className="py-3 px-4 font-semibold text-[10px] uppercase text-muted-foreground tracking-wide border-r w-10 text-center">#</th>
                    <th className="py-3 px-4 font-semibold text-[10px] uppercase text-muted-foreground tracking-wide">Product Logistics</th>
                    <th className="py-3 px-4 text-center font-semibold text-[10px] uppercase text-muted-foreground tracking-wide">Unit Dynamics</th>
                    <th className="py-3 px-4 text-right font-semibold text-[10px] uppercase text-muted-foreground tracking-wide">Revenue Flow</th>
                    <th className="py-3 px-4 text-right font-semibold text-[10px] uppercase text-muted-foreground tracking-wide">Net Operating</th>
                    <th className="py-3 px-6 text-right font-semibold text-[10px] uppercase text-muted-foreground tracking-wide">Profit Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredBreakdown.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-muted-foreground text-xs italic">
                        No financial traces found for this filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredBreakdown.map((row, idx) => (
                      <tr key={row.productId} className="hover:bg-muted/10 transition-colors group">
                        <td className="py-3 px-4 text-center border-r font-medium text-muted-foreground text-[10px] tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors leading-tight">{row.productName}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-medium text-primary bg-primary/5 px-1.5 py-0.5 rounded uppercase tracking-wide capitalize">{row.category}</span>
                            <span className="text-[9px] text-muted-foreground uppercase font-medium">Stock: {row.currentQuantity}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="text-[10px] font-medium text-emerald-600">Sell: {row.unitPrice.toLocaleString()}</div>
                          <div className="text-[10px] font-medium text-rose-600">Buy: {row.unitCost.toLocaleString()}</div>
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          <div className="text-xs font-semibold">{row.revenue.toLocaleString()}</div>
                          <div className="text-[9px] text-muted-foreground font-medium">{row.quantitySold} Sold</div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold tabular-nums text-foreground">
                          {row.profit.toLocaleString()}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border tabular-nums ${getMarginColor(row.margin)}`}>
                            {row.margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
          <div className="p-2 border-t bg-muted/10 text-center">
             <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-widest">
              Fiscal Intelligence Summary • Automated Profit Reconciliation
             </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
