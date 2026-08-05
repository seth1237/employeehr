"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"

interface DispatchWorkflowProps {
  invoiceId: string
  allowBackTo?: string
}

interface PackingItem {
  productId: string
  productName: string
  requiredQuantity: number
  packedQuantity: number
}

interface DispatchState {
  status: "not_assigned" | "assigned" | "packing" | "packed" | "dispatched" | "delivered"
  packingItems: PackingItem[]
  packingCompleted?: boolean
  transportMeans?: string
  dispatchedAt?: string
  dispatchedByUserId?: string
  courier?: {
    name: string
    contactName: string
    contactNumber: string
  }
  inquiries?: Array<{ mode: "client" | "courier"; method: "call"; note?: string; createdAt: string }>
  delivery?: {
    condition: "good" | "not_good"
    arrivalTime: string
    everythingPacked: boolean
    note?: string
  }
}

interface InvoiceData {
  _id: string
  invoiceNumber: string
  deliveryNoteNumber: string
  client: { name: string; number: string; location: string }
  dispatch?: DispatchState
}

interface Courier {
  _id: string
  name: string
  contactName: string
  contactNumber: string
}

export function DispatchWorkflow({ invoiceId, allowBackTo }: DispatchWorkflowProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [invoice, setInvoice] = useState<InvoiceData | null>(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [packingItems, setPackingItems] = useState<PackingItem[]>([])
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [selectedCourierId, setSelectedCourierId] = useState("")
  const [transportMeans, setTransportMeans] = useState("")
  const [newCourier, setNewCourier] = useState({ name: "", contactName: "", contactNumber: "" })
  const [inquiryMode, setInquiryMode] = useState<"client" | "courier">("client")
  const [inquiryNote, setInquiryNote] = useState("")
  const [delivery, setDelivery] = useState({ condition: "good" as "good" | "not_good", arrivalTime: "", everythingPacked: true, note: "" })

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  const dispatchStatus = invoice?.dispatch?.status || "not_assigned"
  const isPacked = invoice?.dispatch?.packingCompleted || false

  const packingSummary = useMemo(() => {
    const required = packingItems.reduce<number>((sum, item) => sum + Number(item.requiredQuantity || 0), 0)
    const packed = packingItems.reduce<number>((sum, item) => sum + Number(item.packedQuantity || 0), 0)
    const remaining = Math.max(0, required - packed)
    const progress = required > 0 ? Math.round((packed / required) * 100) : 0
    return { required, packed, remaining, progress, lineCount: packingItems.length }
  }, [packingItems])

  const inquiries = invoice?.dispatch?.inquiries || []
  const latestInquiry = inquiries[inquiries.length - 1]

  const load = async () => {
    try {
      setLoading(true)
      const [invoiceRes, courierRes] = await Promise.all([
        fetch(`${API_URL}/api/stock/invoices/${invoiceId}`, { headers }),
        fetch(`${API_URL}/api/stock/couriers`, { headers }),
      ])
      const [invoiceJson, courierJson] = await Promise.all([invoiceRes.json(), courierRes.json()])
      if (!invoiceRes.ok) throw new Error(invoiceJson.message || "Failed to load invoice")

      setInvoice(invoiceJson.data)
      setPackingItems(invoiceJson.data?.dispatch?.packingItems || [])
      setCouriers(courierJson.data || [])
      setTransportMeans(invoiceJson.data?.dispatch?.transportMeans || "")
      if (invoiceJson.data?.dispatch?.courier?.name) {
        setNewCourier({
          name: invoiceJson.data.dispatch.courier.name,
          contactName: invoiceJson.data.dispatch.courier.contactName,
          contactNumber: invoiceJson.data.dispatch.courier.contactNumber,
        })
      }
    } catch (loadError: any) {
      setError(loadError.message || "Failed to load dispatch workflow")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [invoiceId])

  const savePacking = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")
      const response = await fetch(`${API_URL}/api/stock/invoices/${invoiceId}/dispatch/packing`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ items: packingItems.map((item) => ({ productId: item.productId, packedQuantity: item.packedQuantity })) }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to save packing")
      setInvoice(json.data)
      setPackingItems(json.data.dispatch?.packingItems || [])
      setSuccess("Packing progress saved")
    } catch (saveError: any) {
      setError(saveError.message || "Failed to save packing")
    } finally {
      setSaving(false)
    }
  }

  const markDispatched = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      // Validate required fields
      if (!transportMeans || transportMeans.trim() === "") {
        setError("Transport means/courier type is required")
        setSaving(false)
        return
      }

      if (!selectedCourierId && (!newCourier.name || !newCourier.contactName || !newCourier.contactNumber)) {
        setError("Either select a courier or fill in all new courier details")
        setSaving(false)
        return
      }

      const payload: any = { transportMeans: transportMeans.trim() }
      if (selectedCourierId) {
        payload.courierId = selectedCourierId
      } else {
        payload.courierName = newCourier.name.trim()
        payload.courierContactName = newCourier.contactName.trim()
        payload.courierContactNumber = newCourier.contactNumber.trim()
      }

      const response = await fetch(`${API_URL}/api/stock/invoices/${invoiceId}/dispatch/dispatch`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to mark dispatched")
      setInvoice(json.data)
      const smsSuccess = json?.smsNotification?.success
      const smsMessage = json?.smsNotification?.message
      if (smsSuccess === false) {
        setSuccess("Invoice marked as dispatched")
        setError(`SMS not sent: ${smsMessage || "Dispatch SMS failed"}`)
      } else if (smsMessage) {
        setSuccess(`Invoice marked as dispatched. SMS: ${smsMessage}`)
      } else {
        setSuccess("Invoice marked as dispatched")
      }
    } catch (dispatchError: any) {
      setError(dispatchError.message || "Failed to mark dispatched")
    } finally {
      setSaving(false)
    }
  }

  const submitInquiry = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")
      const response = await fetch(`${API_URL}/api/stock/invoices/${invoiceId}/dispatch/inquiry`, {
        method: "POST",
        headers,
        body: JSON.stringify({ mode: inquiryMode, note: inquiryNote }),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to save inquiry")
      setInquiryNote("")
      setSuccess("Inquiry logged")
      await load()
    } catch (inquiryError: any) {
      setError(inquiryError.message || "Failed to log inquiry")
    } finally {
      setSaving(false)
    }
  }

  const confirmDelivered = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")
      const response = await fetch(`${API_URL}/api/stock/invoices/${invoiceId}/dispatch/delivery`, {
        method: "POST",
        headers,
        body: JSON.stringify(delivery),
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to confirm delivery")
      setInvoice(json.data)
      const smsSuccess = json?.deliverySmsNotification?.success
      const smsMessage = json?.deliverySmsNotification?.message
      if (smsSuccess === false) {
        setSuccess("Package marked as delivered")
        setError(`Delivery SMS not sent: ${smsMessage || "Delivery SMS failed"}`)
      } else if (smsMessage) {
        setSuccess(`Package marked as delivered. SMS: ${smsMessage}`)
      } else {
        setSuccess("Package marked as delivered")
      }
    } catch (deliveryError: any) {
      setError(deliveryError.message || "Failed to confirm delivery")
    } finally {
      setSaving(false)
    }
  }

  const sendClientSms = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")
      const response = await fetch(`${API_URL}/api/stock/invoices/${invoiceId}/dispatch/notify-client`, {
        method: "POST",
        headers,
      })
      const json = await response.json()
      if (!response.ok) throw new Error(json.message || "Failed to send client SMS")
      const smsSuccess = json?.smsNotification?.success
      const smsMessage = json?.smsNotification?.message || "Client SMS sent"
      if (smsSuccess === false) {
        setError(`SMS not sent: ${smsMessage}`)
      } else {
        setSuccess(`SMS: ${smsMessage}`)
      }
    } catch (smsError: any) {
      setError(smsError.message || "Failed to send client SMS")
    } finally {
      setSaving(false)
    }
  }

  const statusColor = !invoice?.dispatch
    ? "bg-gray-100 text-gray-700"
    : invoice.dispatch.status === "delivered" || invoice.dispatch.status === "dispatched" || isPacked
      ? "bg-green-100 text-green-700"
      : invoice.dispatch.status === "packing"
        ? "bg-red-100 text-red-700"
        : "bg-yellow-100 text-yellow-700"

  if (loading) return <div className="p-4">Loading dispatch workflow...</div>
  if (!invoice) return <div className="p-4">Invoice not found.</div>

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Order</span>
              <span className="h-4 w-px bg-border" />
              <span className="text-sm font-medium text-muted-foreground">Dispatch</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{invoice.invoiceNumber}</h1>
            <p className="text-sm text-muted-foreground">{invoice.client.name} • {invoice.client.number}</p>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
            <Badge className={statusColor} style={{ fontSize: "0.875rem", padding: "0.5rem 0.75rem" }}>
              {dispatchStatus.charAt(0).toUpperCase() + dispatchStatus.slice(1).replaceAll("_", " ")}
            </Badge>
            {allowBackTo && (
              <Button variant="outline" onClick={() => (window.location.href = allowBackTo)}>
                Back
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground">Client</p>
                <p className="mt-1.5 font-semibold text-foreground">{invoice.client.name}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground">Location</p>
                <p className="mt-1.5 font-semibold text-foreground">{invoice.client.location || "—"}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground">Packing</p>
                <p className="mt-1.5 font-semibold text-foreground">{packingSummary.packed}/{packingSummary.required || 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs font-medium text-muted-foreground">Courier</p>
                <p className="mt-1.5 font-semibold text-foreground">{invoice.dispatch?.courier?.name || "—"}</p>
              </div>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {success && <Alert><AlertDescription className="text-green-700">{success}</AlertDescription></Alert>}

            {(dispatchStatus === "not_assigned" || dispatchStatus === "assigned" || dispatchStatus === "packing" || dispatchStatus === "packed") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Packing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 lg:grid-cols-2">
                    {packingItems.map((item, index) => {
                      const complete = Number(item.packedQuantity) >= Number(item.requiredQuantity)
                      return (
                        <div key={item.productId} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">Need: {item.requiredQuantity}</p>
                            </div>
                            <Checkbox checked={complete} disabled />
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_1fr] sm:items-end">
                            <div>
                              <Label className="text-xs">Packed Qty</Label>
                              <Input
                                type="number"
                                min={0}
                                max={item.requiredQuantity}
                                value={item.packedQuantity}
                                onChange={(event) => {
                                  const next = Math.max(0, Number(event.target.value || 0))
                                  setPackingItems((prev) => prev.map((entry, i) => i === index ? { ...entry, packedQuantity: next } : entry))
                                }}
                              />
                            </div>
                            <div className="text-xs font-medium text-muted-foreground sm:text-right">
                              {item.packedQuantity}/{item.requiredQuantity}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <Button onClick={savePacking} disabled={saving} className="w-full lg:w-auto">
                    {dispatchStatus === "packed" ? "Done packing" : "Save"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {(dispatchStatus === "packed" || dispatchStatus === "dispatched" || dispatchStatus === "delivered") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dispatch</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="space-y-3">
                    <div>
                      <Label>Courier Means / Transport</Label>
                      <Input value={transportMeans} onChange={(event) => setTransportMeans(event.target.value)} placeholder="Motorbike, Van, Bus, etc" />
                    </div>

                    <div className="space-y-2">
                      <Label>Select Existing Courier</Label>
                      <select
                        className="w-full rounded-md border bg-background px-3 py-2"
                        value={selectedCourierId}
                        onChange={(event) => setSelectedCourierId(event.target.value)}
                        disabled={dispatchStatus !== "packed"}
                      >
                        <option value="">Use new courier details</option>
                        {couriers.map((courier) => (
                          <option key={courier._id} value={courier._id}>{courier.name} - {courier.contactName}</option>
                        ))}
                      </select>
                    </div>

                    {!selectedCourierId && (
                      <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
                        <Input placeholder="Courier name" value={newCourier.name} onChange={(event) => setNewCourier((prev) => ({ ...prev, name: event.target.value }))} disabled={dispatchStatus !== "packed"} />
                        <Input placeholder="Contact person" value={newCourier.contactName} onChange={(event) => setNewCourier((prev) => ({ ...prev, contactName: event.target.value }))} disabled={dispatchStatus !== "packed"} />
                        <Input placeholder="Contact number" value={newCourier.contactNumber} onChange={(event) => setNewCourier((prev) => ({ ...prev, contactNumber: event.target.value }))} disabled={dispatchStatus !== "packed"} />
                      </div>
                    )}

                    {dispatchStatus === "packed" && (
                      <div className="space-y-2">
                        <Button
                          onClick={markDispatched}
                          disabled={saving || !transportMeans.trim() || (!selectedCourierId && (!newCourier.name || !newCourier.contactName || !newCourier.contactNumber))}
                          className="w-full lg:w-auto"
                        >
                          {saving ? "Processing..." : "Mark as Dispatched"}
                        </Button>
                        {(!transportMeans.trim() || (!selectedCourierId && (!newCourier.name || !newCourier.contactName || !newCourier.contactNumber))) && (
                          <p className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                            ⚠️ Fill in transport means and courier details to continue
                          </p>
                        )}
                      </div>
                    )}
                    {dispatchStatus !== "packed" && dispatchStatus !== "delivered" && (
                      <div className="rounded bg-slate-50 p-2 text-xs text-slate-600">
                        ✓ Dispatch recorded on {invoice.dispatch?.dispatchedAt ? new Date(invoice.dispatch.dispatchedAt).toLocaleString() : ""}
                      </div>
                    )}
                    {(dispatchStatus === "dispatched" || dispatchStatus === "delivered") && (
                      <Button variant="outline" onClick={sendClientSms} disabled={saving} className="w-full lg:w-auto">
                        {saving ? "Sending SMS..." : "Send / Retry Client SMS"}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3 rounded-xl border bg-muted/30 p-4 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status snapshot</p>
                    <p className="font-semibold text-foreground">{invoice.client.name}</p>
                    <p className="text-muted-foreground">{invoice.client.number}</p>
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Packing progress</span>
                        <span>{packingSummary.progress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100">
                        <div className="h-2 rounded-full bg-sky-500" style={{ width: `${packingSummary.progress}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {packingSummary.packed}/{packingSummary.required || 0} packed · {packingSummary.remaining} remaining · {packingSummary.lineCount} lines
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Courier: {invoice.dispatch?.courier?.name || "Unassigned"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Transport: {transportMeans || "Not recorded"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {(dispatchStatus === "dispatched" || dispatchStatus === "delivered") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Follow-up</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button variant={inquiryMode === "client" ? "default" : "outline"} onClick={() => setInquiryMode("client")}>
                        Call Client
                      </Button>
                      <Button variant={inquiryMode === "courier" ? "default" : "outline"} onClick={() => setInquiryMode("courier")}>
                        Call Courier
                      </Button>
                    </div>

                    {inquiryMode === "client" ? (
                      <a href={`tel:${invoice.client.number}`} className="text-sm underline text-blue-600">Prompt Call Client: {invoice.client.number}</a>
                    ) : (
                      <a href={`tel:${invoice.dispatch?.courier?.contactNumber || ""}`} className="text-sm underline text-blue-600">Prompt Call Courier: {invoice.dispatch?.courier?.contactNumber || "No courier number"}</a>
                    )}

                    <Input placeholder="Inquiry note" value={inquiryNote} onChange={(event) => setInquiryNote(event.target.value)} disabled={dispatchStatus === "delivered"} />
                    <Button onClick={submitInquiry} disabled={saving || dispatchStatus === "delivered"} className="w-full lg:w-auto">Log Inquiry</Button>
                  </div>

                  <div className="space-y-2 rounded-xl border bg-background p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Recent inquiries</p>
                    {(invoice.dispatch?.inquiries || []).slice(-5).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No inquiries recorded yet.</p>
                    ) : (
                      (invoice.dispatch?.inquiries || []).slice(-5).map((entry, idx) => (
                        <div key={`inquiry_${idx}`} className="rounded border p-2 text-xs">
                          <span className="font-semibold uppercase">{entry.mode}</span> - {entry.note || "No note"}
                        </div>
                      ))
                    )}
                    {latestInquiry && (
                      <p className="pt-2 text-xs text-muted-foreground">Latest update: {latestInquiry.mode} call · {latestInquiry.note || "No note"}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {dispatchStatus === "dispatched" && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Delivery Confirmation</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Condition on Arrival</Label>
                    <select
                      className="w-full rounded-md border bg-background px-3 py-2"
                      value={delivery.condition}
                      onChange={(event) => setDelivery((prev) => ({ ...prev, condition: event.target.value as "good" | "not_good" }))}
                    >
                      <option value="good">Good Condition</option>
                      <option value="not_good">Not Good</option>
                    </select>
                  </div>

                  <div>
                    <Label>Arrival Time</Label>
                    <Input type="datetime-local" value={delivery.arrivalTime} onChange={(event) => setDelivery((prev) => ({ ...prev, arrivalTime: event.target.value }))} />
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox checked={delivery.everythingPacked} onCheckedChange={(checked) => setDelivery((prev) => ({ ...prev, everythingPacked: Boolean(checked) }))} />
                    <span>Everything packed in?</span>
                  </label>

                  <Input placeholder="Delivery note" value={delivery.note} onChange={(event) => setDelivery((prev) => ({ ...prev, note: event.target.value }))} />
                  <Button onClick={confirmDelivered} disabled={saving} className="w-full lg:w-auto">Submit as Delivered ✓</Button>
                </CardContent>
              </Card>
            )}

            {dispatchStatus === "delivered" && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Delivery Complete</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Condition:</strong> {invoice.dispatch?.delivery?.condition === "good" ? "Good" : "Not Good"}</p>
                  <p><strong>Arrival Time:</strong> {invoice.dispatch?.delivery?.arrivalTime ? new Date(invoice.dispatch.delivery.arrivalTime).toLocaleString() : ""}</p>
                  <p><strong>Note:</strong> {invoice.dispatch?.delivery?.note || "—"}</p>
                  <Button variant="outline" className="w-full" onClick={() => (window.location.href = allowBackTo || "/employee/dispatch")}>Back to Queue</Button>
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Packing progress</span>
                    <span className="font-semibold">{packingSummary.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${packingSummary.progress}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{packingSummary.packed}/{packingSummary.required || 0} packed</p>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <p className="font-medium text-foreground">{invoice.client.name}</p>
                  <p className="text-xs text-muted-foreground">{invoice.client.number}</p>
                  <p className="text-xs text-muted-foreground">{invoice.client.location || "—"}</p>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <p className="text-xs font-medium text-muted-foreground">Courier</p>
                  <p className="font-medium text-foreground">{invoice.dispatch?.courier?.name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{invoice.dispatch?.courier?.contactNumber || "—"}</p>
                </div>

                <div className="flex flex-col gap-2 border-t pt-4">
                  {(dispatchStatus === "dispatched" || dispatchStatus === "delivered") && (
                    <Button size="sm" variant="outline" onClick={sendClientSms} disabled={saving} className="w-full text-xs">
                      {saving ? "Sending..." : "Send SMS"}
                    </Button>
                  )}
                  {allowBackTo && (
                    <Button size="sm" variant="ghost" onClick={() => (window.location.href = allowBackTo)} className="w-full text-xs">
                      Back
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}
