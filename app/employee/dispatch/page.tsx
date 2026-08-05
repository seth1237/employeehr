"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface DispatchInvoice {
  _id: string
  invoiceNumber: string
  client: { name: string }
  dispatch?: {
    status: string
    packingItems?: Array<{ requiredQuantity: number; packedQuantity: number }>
  }
  createdAt: string
}

export default function EmployeeDispatchPage() {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<DispatchInvoice[]>([])

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/api/stock/dispatch/my`, { headers })
        const json = await response.json()
        setInvoices(json.data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const queue = useMemo(() => {
    return [...invoices].sort((a, b) => {
      const aTime = new Date(a.dispatch?.packingItems?.length ? a.createdAt : a.createdAt).getTime()
      const bTime = new Date(b.dispatch?.packingItems?.length ? b.createdAt : b.createdAt).getTime()
      return aTime - bTime
    })
  }, [invoices])

  const stats = useMemo(() => {
    const total = invoices.length
    const inProgress = invoices.filter((invoice) => ["assigned", "packing", "packed"].includes(invoice.dispatch?.status || "not_assigned")).length
    const ready = invoices.filter((invoice) => invoice.dispatch?.status === "packed").length
    const done = invoices.filter((invoice) => invoice.dispatch?.status === "delivered").length
    return { total, inProgress, ready, done }
  }, [invoices])

  if (loading) return <div className="p-4">Loading dispatch queue...</div>

  return (
    <div className="p-4 space-y-4 md:p-6">
      <div className="rounded-2xl border bg-gradient-to-r from-sky-50 to-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Employee dispatch</p>
            <h1 className="text-2xl font-bold tracking-tight">My Dispatch Queue</h1>
            <p className="text-sm text-muted-foreground">Only your assigned packages appear here. Open a form, pack items, and finish faster.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/employee">Back to dashboard</Link>
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="shadow-sm"><CardContent className="p-3"><div className="text-xs text-muted-foreground">Assigned</div><div className="mt-1 text-2xl font-bold">{stats.total}</div></CardContent></Card>
          <Card className="shadow-sm"><CardContent className="p-3"><div className="text-xs text-muted-foreground">In progress</div><div className="mt-1 text-2xl font-bold text-amber-600">{stats.inProgress}</div></CardContent></Card>
          <Card className="shadow-sm"><CardContent className="p-3"><div className="text-xs text-muted-foreground">Ready to send</div><div className="mt-1 text-2xl font-bold text-sky-600">{stats.ready}</div></CardContent></Card>
          <Card className="shadow-sm"><CardContent className="p-3"><div className="text-xs text-muted-foreground">Delivered</div><div className="mt-1 text-2xl font-bold text-green-600">{stats.done}</div></CardContent></Card>
        </div>
      </div>

      {queue.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">No dispatch invoices assigned right now. Check back later or ask admin to assign new work.</CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
        {queue.map((invoice) => {
          const items = invoice.dispatch?.packingItems || []
          const required = items.reduce((sum, item) => sum + Number(item.requiredQuantity || 0), 0)
          const packed = items.reduce((sum, item) => sum + Number(item.packedQuantity || 0), 0)
          const complete = required > 0 && packed >= required
          const progress = required > 0 ? Math.round((packed / required) * 100) : 0
          const status = invoice.dispatch?.status || "not_assigned"
          return (
            <Card key={invoice._id} className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex flex-col gap-2 text-base md:flex-row md:items-center md:justify-between">
                  <span>{invoice.invoiceNumber}</span>
                  <Badge className={complete ? "bg-green-100 text-green-700" : packed > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}>
                    {status.replaceAll("_", " ")}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-2 md:grid-cols-3">
                  <p><strong>Client:</strong> {invoice.client.name}</p>
                  <p><strong>Items packed:</strong> {packed}/{required || 0}</p>
                  <p><strong>Progress:</strong> {progress}%</p>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Packing progress</span>
                    <span>{complete ? "Complete" : "In progress"}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100">
                    <div className={`h-2 rounded-full ${complete ? "bg-green-500" : "bg-sky-500"}`} style={{ width: `${progress}%` }} />
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="flex-1" asChild>
                    <Link href={`/employee/dispatch/${invoice._id}`}>Open Dispatch Form</Link>
                  </Button>
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href={`/employee/dispatch/${invoice._id}`}>View details</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        </div>
      )}
    </div>
  )
}
