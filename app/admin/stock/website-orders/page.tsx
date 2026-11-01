"use client"

import { useEffect, useState } from "react"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type WebsiteOrder = {
  id: string
  shopOrderId: string
  customerName: string
  phone: string
  email: string
  location: string
  items: { name?: string; qty?: number; price?: number }[]
  total: number
  status: string
  paymentStatus: string
  mpesaReceipt: string
  quotationNumber: string
}

const labels: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  paid: "Paid",
  dispatched: "Dispatched",
  delivered: "Delivered",
  pending: "Pending",
  failed: "Failed",
}

export default function WebsiteOrdersPage() {
  const [orders, setOrders] = useState<WebsiteOrder[]>([])
  const [message, setMessage] = useState("")

  async function load() {
    const token = getToken()
    const response = await fetch(`${API_URL}/api/website-orders`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    })
    const data = await response.json().catch(() => null)
    setOrders(Array.isArray(data?.orders) ? data.orders : [])
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [])

  async function mark(id: string, status: "dispatched" | "delivered") {
    setMessage("")
    const token = getToken()
    const response = await fetch(`${API_URL}/api/website-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ status }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) {
      setMessage(data?.message || "The order could not be updated.")
      return
    }
    await load()
  }

  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Website orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {message ? <p className="text-sm text-red-700">{message}</p> : null}
          {orders.length ? orders.map((order) => (
            <article key={order.id} className="rounded-md border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{order.customerName || "Customer"} · Shop order {order.shopOrderId}</p>
                  <p className="text-sm text-muted-foreground">{order.phone} · {order.email}</p>
                  <p className="text-sm text-muted-foreground">{order.location}</p>
                </div>
                <div className="text-right text-sm">
                  <p>{labels[order.paymentStatus] || order.paymentStatus}</p>
                  <p className="font-semibold">{labels[order.status] || order.status}</p>
                  <p>KSh {Number(order.total || 0).toLocaleString("en-KE")}</p>
                  <p>{order.mpesaReceipt ? `Receipt ${order.mpesaReceipt}` : "No receipt yet"}</p>
                </div>
              </div>
              <ul className="mt-3 text-sm">
                {(order.items || []).map((item, index) => (
                  <li key={`${order.id}-${index}`}>{item.name} × {item.qty}</li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                {order.paymentStatus === "paid" && order.status !== "dispatched" && order.status !== "delivered" ? (
                  <Button type="button" onClick={() => void mark(order.id, "dispatched")}>Mark dispatched</Button>
                ) : null}
                {order.status === "dispatched" ? (
                  <Button type="button" onClick={() => void mark(order.id, "delivered")}>Mark delivered</Button>
                ) : null}
              </div>
            </article>
          )) : <p className="text-sm text-muted-foreground">No website orders yet. A paid shop checkout appears here.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
