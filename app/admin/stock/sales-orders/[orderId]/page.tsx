"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Ban, FileText, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { stockApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import {
  ErrorState,
  PageLoadingSkeleton,
} from "@/components/admin/ui/page-states"
import {
  QuotationTransportDialog,
  type QuotationTransportInput,
} from "@/components/admin/stock/quotation-transport-dialog"

type OrderItem = {
  productName: string
  quantity: number
  reservedQuantity?: number
  invoicedQuantity?: number
  unitPrice: number
  lineTotal: number
  productType?: string
  isOutsourced?: boolean
}

type SalesOrder = {
  _id: string
  orderNumber: string
  quotationId?: string
  quotationNumber?: string
  convertedInvoiceId?: string
  status: "confirmed" | "invoiced" | "cancelled"
  client: { name: string; number?: string; location?: string }
  items: OrderItem[]
  subTotal: number
  taxTotal?: number
  grandTotal?: number
  reservedAt?: string
  invoicedAt?: string
  cancelledAt?: string
  cancelReason?: string
}

function money(n: number) {
  return Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const user = getUser()
  const canManage = ["company_admin", "hr", "admin", "super_admin", "sales_rep"].includes(
    String(user?.role || ""),
  )
  const canCancel = ["company_admin", "hr", "admin", "super_admin"].includes(
    String(user?.role || ""),
  )

  const [order, setOrder] = useState<SalesOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [transportOpen, setTransportOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await stockApi.getSalesOrderById(orderId)
      setOrder(res.data)
    } catch (err: any) {
      setError(err?.message || "Sales order not found")
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void load()
  }, [load])

  const invoiceOrder = async (transport?: QuotationTransportInput) => {
    setBusy("invoice")
    try {
      const res = await stockApi.invoiceSalesOrder(orderId, transport)
      if (!res?.success) throw new Error(res.message || "Failed to create invoice")
      const invoiceId = res.data?._id
      toast({
        title: res.data?.status === "pending_approval" ? "Invoice submitted" : "Draft invoice created",
        description: "Post the invoice to issue reserved stock and post COGS.",
      })
      setTransportOpen(false)
      if (invoiceId) router.push(`/admin/stock/invoices/${invoiceId}`)
      else void load()
    } catch (err: any) {
      toast({
        title: "Could not invoice",
        description: err?.message || "Failed to create invoice",
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }

  const cancelOrder = async () => {
    if (!window.confirm("Cancel this sales order and release reserved stock?")) return
    setBusy("cancel")
    try {
      const res = await stockApi.cancelSalesOrder(orderId)
      if (!res?.success) throw new Error(res.message || "Cancel failed")
      toast({ title: "Sales order cancelled", description: "Reserved stock is available again." })
      void load()
    } catch (err: any) {
      toast({
        title: "Could not cancel",
        description: err?.message || "Cancel failed",
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Sales order" rows={6} />
  if (error || !order) {
    return (
      <ErrorState
        title="Sales order not found"
        message={error || "This order is missing or you do not have access."}
        backHref="/admin/stock/sales-orders"
        backLabel="Back to sales orders"
      />
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href="/admin/stock/sales-orders">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Sales orders
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {order.client.name}
            {order.client.number ? ` · ${order.client.number}` : ""}
            {order.client.location ? ` · ${order.client.location}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {order.status}
          </Badge>
          {order.quotationId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/stock/quotations/${order.quotationId}`}>
                <FileText className="mr-1 h-4 w-4" />
                Quotation
              </Link>
            </Button>
          ) : null}
          {order.convertedInvoiceId ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/stock/invoices/${order.convertedInvoiceId}`}>
                <Receipt className="mr-1 h-4 w-4" />
                Invoice
              </Link>
            </Button>
          ) : null}
          {order.status === "confirmed" && canManage ? (
            <Button size="sm" onClick={() => setTransportOpen(true)} disabled={busy === "invoice"}>
              <Receipt className="mr-1 h-4 w-4" />
              Create invoice
            </Button>
          ) : null}
          {order.status === "confirmed" && canCancel ? (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => void cancelOrder()}
              disabled={busy === "cancel"}
            >
              <Ban className="mr-1 h-4 w-4" />
              Cancel
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reserved lines</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Item</th>
                <th className="py-2 pr-3 font-medium">Qty</th>
                <th className="py-2 pr-3 font-medium">Reserved</th>
                <th className="py-2 pr-3 font-medium">Unit</th>
                <th className="py-2 font-medium">Line</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={`${item.productName}-${index}`} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    {item.productName}
                    {item.isOutsourced || item.productType === "service" ? (
                      <span className="ml-2 text-xs text-muted-foreground">not stocked</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">{item.quantity}</td>
                  <td className="py-2 pr-3">{item.reservedQuantity || 0}</td>
                  <td className="py-2 pr-3">KES {money(item.unitPrice)}</td>
                  <td className="py-2">KES {money(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>KES {money(order.subTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>KES {money(Number(order.taxTotal || 0))}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>KES {money(Number(order.grandTotal || order.subTotal || 0))}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <QuotationTransportDialog
        open={transportOpen}
        onOpenChange={setTransportOpen}
        onConfirm={invoiceOrder}
        loading={busy === "invoice"}
        clientName={order.client.name}
        confirmLabel="Create invoice"
      />
    </div>
  )
}
