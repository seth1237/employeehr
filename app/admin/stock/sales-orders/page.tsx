"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { stockApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  EmptyState,
  PageLoadingSkeleton,
} from "@/components/admin/ui/page-states"
import { finishDataLoad, startDataLoad } from "@/lib/silent-load"
import { ClipboardList } from "lucide-react"

type SalesOrder = {
  _id: string
  orderNumber: string
  quotationNumber?: string
  status: "confirmed" | "invoiced" | "cancelled"
  client?: { name?: string; number?: string }
  items?: Array<{ productName: string; quantity: number; reservedQuantity?: number }>
  grandTotal?: number
  subTotal?: number
  convertedInvoiceId?: string
  reservedAt?: string
  createdAt?: string
}

function money(n: number) {
  return Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function statusClass(status: string) {
  if (status === "confirmed") return "border-amber-300 bg-amber-50 text-amber-900"
  if (status === "invoiced") return "border-emerald-300 bg-emerald-50 text-emerald-900"
  return "border-slate-300 bg-slate-50 text-slate-700"
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = startDataLoad(opts, setLoading)
    if (!silent) setError(null)
    try {
      const res = await stockApi.getSalesOrders()
      setOrders(res.data || [])
    } catch (err: any) {
      setError(err?.message || "Failed to load sales orders")
    } finally {
      finishDataLoad(silent, setLoading)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return <PageLoadingSkeleton title="Sales orders" rows={6} />
  }

  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales orders</h1>
          <p className="text-sm text-muted-foreground">
            Confirmed orders hold reserved stock. Invoice when you are ready to bill and dispatch.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/stock/quotations">Quotations</Link>
        </Button>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No sales orders yet"
          description="Convert an approved quotation to reserve stock before invoicing."
          actionLabel="Open quotations"
          actionHref="/admin/stock/quotations"
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order._id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/stock/sales-orders/${order._id}`}
                      className="font-semibold hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <Badge variant="outline" className={statusClass(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {order.client?.name || "No client"}
                    {order.quotationNumber ? ` · ${order.quotationNumber}` : ""}
                    {` · ${order.items?.length || 0} lines`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    KES {money(Number(order.grandTotal || order.subTotal || 0))}
                  </span>
                  <Button asChild size="sm">
                    <Link href={`/admin/stock/sales-orders/${order._id}`}>Open</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
