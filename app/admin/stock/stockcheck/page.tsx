"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { finishDataLoad, startDataLoad } from "@/lib/silent-load"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StockCheckStatus =
  | "draft"
  | "assigned"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "approved"
  | "adjusted"
  | "closed"

type CheckType = "full" | "partial" | "cycle" | "emergency"

interface StockCheckUserRef {
  _id: string
  firstName?: string
  lastName?: string
  first_name?: string
  last_name?: string
  email?: string
}

interface StockCheck {
  _id: string
  stockCheckNumber: string
  warehouse: { _id: string; name: string }
  checkType: CheckType
  status: StockCheckStatus
  createdBy: StockCheckUserRef | string
  supervisor?: StockCheckUserRef | string
  assignedCounters: (StockCheckUserRef | string)[]
  itemsTotal: number
  itemsCounted: number
  varianceCount: number
  totalVarianceValue: number
  startTime?: string
  endTime?: string
  createdAt: string
  notes?: string
}

interface Warehouse {
  _id: string
  name: string
}

type SortOption =
  | "date-desc"
  | "date-asc"
  | "warehouse-asc"
  | "warehouse-desc"
  | "variance-desc"
  | "progress-desc"
  | "number-asc"
  | "number-desc"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<StockCheckStatus, string> = {
  draft: "Draft",
  assigned: "Assigned",
  in_progress: "In progress",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  adjusted: "Adjusted",
  closed: "Closed",
}

const STATUS_TONE: Record<StockCheckStatus, string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  assigned: "border-sky-200 bg-sky-50 text-sky-700",
  in_progress: "border-amber-200 bg-amber-50 text-amber-700",
  submitted: "border-violet-200 bg-violet-50 text-violet-700",
  under_review: "border-orange-200 bg-orange-50 text-orange-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  adjusted: "border-teal-200 bg-teal-50 text-teal-700",
  closed: "border-zinc-300 bg-zinc-100 text-zinc-600",
}

const CHECK_TYPE_LABELS: Record<CheckType, string> = {
  full: "Full",
  partial: "Partial",
  cycle: "Cycle",
  emergency: "Emergency",
}

function getUserDisplayName(user?: StockCheckUserRef | string | null): string {
  if (!user) return "Unassigned"
  if (typeof user === "string") return user
  const first = user.firstName || user.first_name
  const last = user.lastName || user.last_name
  return [first, last].filter(Boolean).join(" ") || user.email || "System User"
}

function exportStockChecksCsv(stockChecks: StockCheck[]) {
  const headers = [
    "Stock Check #",
    "Warehouse",
    "Type",
    "Status",
    "Items Total",
    "Items Counted",
    "Variances",
    "Variance Value",
    "Supervisor",
    "Created By",
    "Date",
  ]
  const rows = stockChecks.map((check) => [
    check.stockCheckNumber,
    check.warehouse?.name || "",
    CHECK_TYPE_LABELS[check.checkType],
    STATUS_LABELS[check.status],
    String(check.itemsTotal),
    String(check.itemsCounted),
    String(check.varianceCount),
    check.totalVarianceValue.toFixed(2),
    getUserDisplayName(check.supervisor),
    getUserDisplayName(check.createdBy),
    new Date(check.createdAt).toISOString(),
  ])

  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((value) => {
          const stringValue = String(value ?? "")
          if (/[",\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`
          return stringValue
        })
        .join(","),
    ),
  ].join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "stock-checks.csv"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StockChecksPage() {
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stockChecks, setStockChecks] = useState<StockCheck[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StockCheckStatus | "all">("all")
  const [warehouseFilter, setWarehouseFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("date-desc")
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [closingId, setClosingId] = useState<string | null>(null)

  useEffect(() => {
    const q = searchParams.get("q") || ""
    if (!q) return
    setSearchInput(q)
    setSearch(q)
  }, [searchParams])

  useEffect(() => {
    setPage(1)
  }, [search, sortBy, statusFilter, warehouseFilter])

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  const loadStockChecks = async (opts?: { silent?: boolean }) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    try {
      const [stockChecksResponse, warehousesResult] = await Promise.allSettled([
        fetch(`${API_URL}/api/stock/stock-checks`, { headers }),
        fetch(`${API_URL}/api/warehouses`, { headers }),
      ])

      if (stockChecksResponse.status === "fulfilled") {
        const json = await stockChecksResponse.value.json()
        if (!stockChecksResponse.value.ok) {
          throw new Error(json.message || "Failed to load stock checks")
        }
        setStockChecks(json.data || [])
      } else {
        throw new Error("Failed to load stock checks")
      }

      if (warehousesResult.status === "fulfilled") {
        try {
          const warehousesJson = await warehousesResult.value.json()
          setWarehouses(warehousesJson.data || [])
        } catch {
          setWarehouses([])
        }
      } else {
        setWarehouses([])
      }
    } catch (loadError: any) {
      setStockChecks([])
      window.alert(loadError?.message || "Failed to load stock checks")
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }

  useEffect(() => {
    loadStockChecks()
  }, [])

  const closeStockCheck = async (stockCheckId: string) => {
    const confirmClose = window.confirm(
      "Close this stock check? Closed stock checks cannot be edited or re-opened.",
    )
    if (!confirmClose) return

    try {
      setClosingId(stockCheckId)
      const response = await fetch(`${API_URL}/api/stock/stock-checks/${stockCheckId}/close`, {
        method: "POST",
        headers,
      })
      const json = await response.json()
      if (!response.ok) {
        window.alert(json.message || "Failed to close stock check")
        return
      }
      await loadStockChecks({ silent: true })
    } finally {
      setClosingId(null)
    }
  }

  const filteredStockChecks = stockChecks.filter((check) => {
    if (statusFilter !== "all" && check.status !== statusFilter) return false
    if (warehouseFilter !== "all" && check.warehouse?._id !== warehouseFilter) return false
    const query = search.trim().toLowerCase()
    if (!query) return true
    return (
      check.stockCheckNumber.toLowerCase().includes(query) ||
      (check.warehouse?.name || "").toLowerCase().includes(query) ||
      getUserDisplayName(check.supervisor).toLowerCase().includes(query) ||
      getUserDisplayName(check.createdBy).toLowerCase().includes(query)
    )
  })

  const sortedStockChecks = useMemo(() => {
    return [...filteredStockChecks].sort((a, b) => {
      const aDate = new Date(a.createdAt).getTime()
      const bDate = new Date(b.createdAt).getTime()
      const aWarehouse = (a.warehouse?.name || "").toLowerCase()
      const bWarehouse = (b.warehouse?.name || "").toLowerCase()
      const aProgress = a.itemsTotal > 0 ? a.itemsCounted / a.itemsTotal : 0
      const bProgress = b.itemsTotal > 0 ? b.itemsCounted / b.itemsTotal : 0
      const aNumber = a.stockCheckNumber.toLowerCase()
      const bNumber = b.stockCheckNumber.toLowerCase()

      switch (sortBy) {
        case "date-asc":
          return aDate - bDate
        case "warehouse-asc":
          return aWarehouse.localeCompare(bWarehouse)
        case "warehouse-desc":
          return bWarehouse.localeCompare(aWarehouse)
        case "variance-desc":
          return b.totalVarianceValue - a.totalVarianceValue
        case "progress-desc":
          return bProgress - aProgress
        case "number-asc":
          return aNumber.localeCompare(bNumber)
        case "number-desc":
          return bNumber.localeCompare(aNumber)
        case "date-desc":
        default:
          return bDate - aDate
      }
    })
  }, [filteredStockChecks, sortBy])

  const totals = useMemo(() => {
    return stockChecks.reduce(
      (acc, check) => {
        acc.total += 1
        acc.varianceValue += Number(check.totalVarianceValue || 0)
        if (check.status === "in_progress" || check.status === "assigned") acc.active += 1
        if (check.status === "under_review" || check.status === "submitted") acc.awaitingReview += 1
        if (check.status === "closed") acc.closed += 1
        return acc
      },
      { total: 0, active: 0, awaitingReview: 0, closed: 0, varianceValue: 0 },
    )
  }, [stockChecks])

  const totalPages = Math.max(1, Math.ceil(sortedStockChecks.length / pageSize))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pagedStockChecks = useMemo(() => {
    const start = (page - 1) * pageSize
    return sortedStockChecks.slice(start, start + pageSize)
  }, [page, pageSize, sortedStockChecks])

  const visiblePages = useMemo(() => {
    const count = Math.min(8, totalPages)
    return Array.from({ length: count }, (_, index) => index + 1)
  }, [totalPages])

  if (loading) return <PageLoadingSkeleton title="Loading stock checks" rows={8} />

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border px-4 py-3 shadow-sm" style={{ borderColor: "rgba(15,118,110,0.18)", background: "linear-gradient(to right, rgba(15,118,110,0.08), rgba(14,165,233,0.08))" }}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium tracking-wide text-teal-700">Inventory</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Stock check dashboard</h1>
            <p className="text-sm text-muted-foreground">Schedule, count, review, and close stock checks for your warehouses.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportStockChecksCsv(sortedStockChecks)}>
              Export (Excel)
            </Button>
            <Button asChild>
              <Link href="/admin/stock/stock-check/new">New stock check</Link>
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Total stock checks</div>
              <div className="mt-1 text-xl font-semibold">{totals.total}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Active counts</div>
              <div className="mt-1 text-xl font-semibold text-amber-600">{totals.active}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Awaiting review</div>
              <div className="mt-1 text-xl font-semibold text-orange-600">{totals.awaitingReview}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-3">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Variance value (all time)</div>
              <div className="mt-1 text-xl font-semibold">
                KES {totals.varianceValue.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-3 rounded-xl border bg-white/90 p-3 shadow-sm backdrop-blur-sm">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_200px_200px_140px] lg:items-end">
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Stock check #, warehouse, supervisor..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") setSearch(searchInput)
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value: StockCheckStatus | "all") => setStatusFilter(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(Object.keys(STATUS_LABELS) as StockCheckStatus[]).map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All warehouses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All warehouses</SelectItem>
                  {warehouses.map((warehouse) => (
                    <SelectItem key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Sort by</Label>
              <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort stock checks" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Date: newest first</SelectItem>
                  <SelectItem value="date-asc">Date: oldest first</SelectItem>
                  <SelectItem value="warehouse-asc">Warehouse: A to Z</SelectItem>
                  <SelectItem value="warehouse-desc">Warehouse: Z to A</SelectItem>
                  <SelectItem value="variance-desc">Variance value: highest first</SelectItem>
                  <SelectItem value="progress-desc">Progress: most complete first</SelectItem>
                  <SelectItem value="number-asc">Stock check #: A to Z</SelectItem>
                  <SelectItem value="number-desc">Stock check #: Z to A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={() => setSearch(searchInput)}>
              Apply search
            </Button>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b bg-muted/30 pb-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">Stock check list</CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing {sortedStockChecks.length} of {stockChecks.length} stock checks
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Rows are compacted for faster scanning.</p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {sortedStockChecks.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center px-6 py-10 text-center">
              <div>
                <p className="text-sm font-medium text-foreground">No stock checks found</p>
                <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters, or start a new stock check.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1240px] w-full table-fixed text-[13px]">
                <thead className="sticky top-0 z-10 bg-muted/80 text-left text-[11px] uppercase tracking-wide text-muted-foreground backdrop-blur">
                  <tr className="border-b">
                    <th className="px-3 py-3 font-medium w-[13%]">Stock check #</th>
                    <th className="px-3 py-3 font-medium w-[15%]">Warehouse</th>
                    <th className="px-3 py-3 font-medium w-[9%]">Type</th>
                    <th className="px-3 py-3 font-medium w-[16%]">Counters</th>
                    <th className="px-3 py-3 font-medium w-[13%]">Progress</th>
                    <th className="px-3 py-3 font-medium w-[12%]">Variance</th>
                    <th className="px-3 py-3 font-medium w-[10%]">Status</th>
                    <th className="px-3 py-3 font-medium w-[8%]">Date</th>
                    <th className="px-3 py-3 font-medium w-[4%]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedStockChecks.map((check, index) => {
                    const progressPercent = check.itemsTotal > 0 ? Math.round((check.itemsCounted / check.itemsTotal) * 100) : 0
                    const hasVariance = check.varianceCount > 0
                    const canCount = check.status === "draft" || check.status === "assigned" || check.status === "in_progress"
                    const canReview = check.status === "submitted" || check.status === "under_review"
                    const canClose = check.status === "approved" || check.status === "adjusted"
                    const counterNames = check.assignedCounters.map((counter) => getUserDisplayName(counter))

                    return (
                      <tr
                        key={check._id}
                        className={`border-b align-top transition-colors hover:bg-muted/40 ${index % 2 === 0 ? "bg-white" : "bg-muted/20"}`}
                      >
                        <td className="px-3 py-2 align-top">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground" title={check.stockCheckNumber}>
                              {check.stockCheckNumber}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground" title={getUserDisplayName(check.supervisor)}>
                              Supervisor: {getUserDisplayName(check.supervisor)}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="truncate text-foreground" title={check.warehouse?.name}>
                            {check.warehouse?.name || "-"}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px] font-medium">
                            {CHECK_TYPE_LABELS[check.checkType]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="truncate text-muted-foreground" title={counterNames.join(", ")}>
                            {counterNames.length > 0 ? counterNames.join(", ") : "Unassigned"}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <div className="min-w-0">
                            <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-teal-600"
                                style={{ width: `${Math.min(100, progressPercent)}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {check.itemsCounted}/{check.itemsTotal} counted
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          {hasVariance ? (
                            <div className="min-w-0">
                              <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 whitespace-nowrap">
                                {check.varianceCount} variance{check.varianceCount === 1 ? "" : "s"}
                              </span>
                              <div className="mt-1 truncate text-[11px] text-muted-foreground">
                                KES {check.totalVarianceValue.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 whitespace-nowrap">
                              No variance
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <Badge
                            variant="outline"
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${STATUS_TONE[check.status]}`}
                          >
                            {STATUS_LABELS[check.status]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                          {new Date(check.createdAt).toLocaleDateString("en-KE", {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                          })}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline" className="h-8 w-full whitespace-nowrap">
                                Actions
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {canCount && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/stock/stock-check/${check._id}`}>
                                    {check.status === "draft" ? "Start counting" : "Continue counting"}
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {canReview && (
                                <DropdownMenuItem asChild>
                                  <Link href={`/admin/stock/stock-check/${check._id}/review`}>Review count</Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/stock/stock-check/${check._id}`}>View details</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/stock/stock-check/${check._id}/audit-trail`}>View audit trail</Link>
                              </DropdownMenuItem>
                              {canClose && (
                                <DropdownMenuItem
                                  onClick={() => closeStockCheck(check._id)}
                                  disabled={closingId === check._id}
                                >
                                  Close stock check
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {sortedStockChecks.length > 0 && (
            <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sortedStockChecks.length)} of {sortedStockChecks.length}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Prev
                </Button>
                {visiblePages.map((pageNumber) => (
                  <Button
                    key={pageNumber}
                    variant={pageNumber === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(pageNumber)}
                    className="min-w-9"
                  >
                    {pageNumber}
                  </Button>
                ))}
                {totalPages > 8 && <span className="px-1 text-sm text-muted-foreground">…</span>}
                {totalPages > 8 && (
                  <Button
                    variant={page === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPage(totalPages)}
                    className="min-w-9"
                  >
                    {totalPages}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}