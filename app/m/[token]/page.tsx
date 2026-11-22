"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { API_URL } from "@/lib/apiBase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CheckCircle2, Loader2, Package, TriangleAlert, Wrench } from "lucide-react"

type RequestType = "service" | "breakdown" | "product_order"

const ACTIONS: Array<{ id: RequestType; title: string; hint: string; icon: typeof Wrench }> = [
  { id: "service", title: "Request service", hint: "Book a visit or routine support", icon: Wrench },
  { id: "breakdown", title: "Report a breakdown", hint: "The machine is not working", icon: TriangleAlert },
  { id: "product_order", title: "Order a product", hint: "Request consumables or a replacement", icon: Package },
]

export default function PublicMachineQrPage() {
  const params = useParams()
  const token = String(params.token || "")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState("")
  const [payload, setPayload] = useState<any>(null)
  const [type, setType] = useState<RequestType | "">("")
  const [form, setForm] = useState({
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    message: "",
    preferredDate: "",
    urgency: "normal",
    productName: "",
    quantity: "1",
  })

  const branding = payload?.company || {}
  const primary = branding.primaryColor || "#0f766e"

  useEffect(() => {
    if (!token) return
    setLoading(true)
    fetch(`${API_URL}/api/public/machine-qr/${encodeURIComponent(token)}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json?.message || "This QR code is not valid.")
        setPayload(json.data || json)
      })
      .catch((err) => setError(err.message || "Could not load this machine."))
      .finally(() => setLoading(false))
  }, [token])

  const catalog = payload?.catalog || []
  const machine = payload?.machine
  const selectedAction = useMemo(() => ACTIONS.find((item) => item.id === type), [type])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!type) return
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch(`${API_URL}/api/public/machine-qr/${encodeURIComponent(token)}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          ...form,
          quantity: Number(form.quantity || 1),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.message || "Could not send this request.")
      setDone(json.message || "Request sent.")
    } catch (err: any) {
      setError(err.message || "Could not send this request.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!machine) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
        <div className="w-full rounded-2xl border bg-white p-6 text-center shadow-sm">
          <p className="font-semibold">This QR code is not valid</p>
          <p className="mt-2 text-sm text-slate-500">{error || "Ask technical service for a new label."}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="px-4 py-6" style={{ backgroundColor: primary }}>
        <div className="mx-auto max-w-md text-white">
          <p className="text-xs uppercase tracking-[0.18em] opacity-80">
            {branding.name || "Technical Service"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">{machine.productName}</h1>
          <p className="mt-1 text-sm opacity-90">
            {machine.clientName}
            {machine.serialNumber ? ` · SN ${machine.serialNumber}` : ""}
          </p>
          {machine.location ? <p className="text-sm opacity-80">{machine.location}</p> : null}
        </div>
      </div>

      <div className="mx-auto max-w-md space-y-4 px-4 py-5">
        {done ? (
          <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-3 text-lg font-semibold">Received</p>
            <p className="mt-1 text-sm text-slate-600">{done}</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => {
                setDone("")
                setType("")
                setForm((current) => ({ ...current, message: "", productName: "", quantity: "1" }))
              }}
            >
              Send another request
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              {ACTIONS.map((action) => {
                const Icon = action.icon
                const active = type === action.id
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => setType(action.id)}
                    className="flex items-start gap-3 rounded-2xl border bg-white p-4 text-left shadow-sm"
                    aria-pressed={active}
                    style={active ? { borderColor: primary, boxShadow: `0 0 0 1px ${primary}` } : undefined}
                  >
                    <span
                      className="rounded-full p-2"
                      style={{ backgroundColor: `${primary}18`, color: primary }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block font-medium">{action.title}</span>
                      <span className="text-sm text-slate-500">{action.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            {selectedAction ? (
              <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-white p-4 shadow-sm">
                <p className="font-medium">{selectedAction.title}</p>
                <div>
                  <Label>Your name</Label>
                  <Input
                    className="mt-1"
                    required
                    value={form.contactName}
                    onChange={(e) => setForm((current) => ({ ...current, contactName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    className="mt-1"
                    required
                    value={form.contactPhone}
                    onChange={(e) => setForm((current) => ({ ...current, contactPhone: e.target.value }))}
                  />
                </div>
                {type === "product_order" ? (
                  <>
                    <div>
                      <Label>Product</Label>
                      {catalog.length > 0 ? (
                        <select
                          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={form.productName}
                          onChange={(e) => setForm((current) => ({ ...current, productName: e.target.value }))}
                        >
                          <option value="">Select or type below</option>
                          {catalog.map((item: any) => (
                            <option key={item.name} value={item.name}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      <Input
                        className="mt-2"
                        placeholder="Product name"
                        value={form.productName}
                        onChange={(e) => setForm((current) => ({ ...current, productName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        className="mt-1"
                        type="number"
                        min={1}
                        value={form.quantity}
                        onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>{type === "breakdown" ? "What happened?" : "What do you need?"}</Label>
                      <Textarea
                        className="mt-1"
                        required
                        value={form.message}
                        onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Preferred date</Label>
                        <Input
                          className="mt-1"
                          type="date"
                          value={form.preferredDate}
                          onChange={(e) => setForm((current) => ({ ...current, preferredDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Urgency</Label>
                        <select
                          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={form.urgency}
                          onChange={(e) => setForm((current) => ({ ...current, urgency: e.target.value }))}
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
                {type === "product_order" ? (
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      className="mt-1"
                      value={form.message}
                      onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                    />
                  </div>
                ) : null}
                {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                <Button type="submit" className="w-full" disabled={submitting} style={{ backgroundColor: primary }}>
                  {submitting ? "Sending…" : "Send request"}
                </Button>
              </form>
            ) : (
              <p className="px-1 text-sm text-slate-500">Choose what you need. No login is required.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
