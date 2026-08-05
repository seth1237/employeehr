"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

interface StockCheckUserRef {
  _id: string
  firstName?: string
  lastName?: string
  email?: string
}

interface Warehouse {
  _id: string
  name: string
}

interface StockCheck {
  _id: string
  stockCheckNumber: string
  warehouse: Warehouse
  checkType: string
  status: string
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

function getUserDisplayName(user?: StockCheckUserRef | string | null): string {
  if (!user) return "Unassigned"
  if (typeof user === "string") return user
  const first = user.firstName || ""
  const last = user.lastName || ""
  return [first, last].filter(Boolean).join(" ") || user.email || "System User"
}

export default function StockCheckDetailsPage() {
  const router = useRouter()
  const params = useParams() as { stockCheckId: string }
  const stockCheckId = String(params.stockCheckId || "")
  const [stockCheck, setStockCheck] = useState<StockCheck | null>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  useEffect(() => {
    const loadStockCheck = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `${API_URL}/api/stock/stock-checks/${stockCheckId}`,
          { headers },
        )
        const json = await response.json()
        if (!response.ok) {
          window.alert(json.message || "Stock check not found")
          router.replace("/admin/stock/stock-check")
          return
        }
        setStockCheck(json.data)
      } catch {
        window.alert("Failed to load stock check")
        router.replace("/admin/stock/stock-check")
      } finally {
        setLoading(false)
      }
    }

    loadStockCheck()
  }, [headers, stockCheckId, router])

  const closeStockCheck = async () => {
    if (!stockCheck) return
    const confirmClose = window.confirm(
      "Close this stock check? Closed stock checks cannot be edited or re-opened.",
    )
    if (!confirmClose) return

    setClosing(true)
    try {
      const response = await fetch(
        `${API_URL}/api/stock/stock-checks/${stockCheckId}/close`,
        { method: "POST", headers },
      )
      const json = await response.json()
      if (!response.ok) {
        window.alert(json.message || "Failed to close stock check")
        return
      }
      setStockCheck(json.data)
    } catch {
      window.alert("Failed to close stock check")
    } finally {
      setClosing(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading stock check" rows={4} />
  if (!stockCheck) return <div className="p-6">Stock check not found.</div>

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Stock check details</h1>
            <p className="text-sm text-muted-foreground">
              Review the current stock check metadata and actions for this warehouse.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/stock/stock-check">Back to stock checks</Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/admin/stock/stock-check/${stockCheckId}/review`}>
                Review count
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`/admin/stock/stock-check/${stockCheckId}/audit-trail`}>
                Audit trail
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Stock check overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">Stock check #</div>
              <div className="text-lg font-semibold">{stockCheck.stockCheckNumber}</div>
            </div>
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">Warehouse</div>
              <div className="text-lg font-semibold">{stockCheck.warehouse?.name || "Unknown"}</div>
            </div>
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge>{stockCheck.status.replace(/_/g, " ")}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Created by</div>
                <div>{getUserDisplayName(stockCheck.createdBy)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Supervisor</div>
                <div>{getUserDisplayName(stockCheck.supervisor)}</div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <div className="text-sm text-muted-foreground">Items total</div>
                <div>{stockCheck.itemsTotal}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Items counted</div>
                <div>{stockCheck.itemsCounted}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Variance count</div>
                <div>{stockCheck.varianceCount}</div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Variance value</div>
                <div>{stockCheck.totalVarianceValue.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Start date</div>
                <div>{stockCheck.startTime ? new Date(stockCheck.startTime).toLocaleString() : "Not started"}</div>
              </div>
            </div>
            <div className="grid gap-2">
              <div className="text-sm text-muted-foreground">Notes</div>
              <div>{stockCheck.notes || "No notes provided."}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-muted-foreground">
              Use the review and audit pages to validate counts and trace this stock check’s progress.
            </div>
            <Button
              variant="ghost"
              onClick={closeStockCheck}
              disabled={closing || stockCheck.status === "closed"}
            >
              {stockCheck.status === "closed" ? "Already closed" : closing ? "Closing..." : "Close stock check"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
