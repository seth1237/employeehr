"use client"

import { FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import { API_URL } from "@/lib/apiBase"
import { applyBrandTokens } from "@/lib/brand-tokens"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, CheckCircle2, Loader2, Package, TriangleAlert, Wrench } from "lucide-react"

type RequestType = "service" | "breakdown" | "product_order"

const ACTIONS: Array<{ id: RequestType; title: string; hint: string; documentTitle: string; icon: typeof Wrench }> = [
  { id: "service", title: "Request service", hint: "Book a visit or routine support", documentTitle: "SERVICE REQUEST", icon: Wrench },
  { id: "breakdown", title: "Report a breakdown", hint: "The machine is not working", documentTitle: "BREAKDOWN REPORT", icon: TriangleAlert },
  { id: "product_order", title: "Order a product", hint: "Request consumables or a replacement", documentTitle: "PRODUCT ORDER", icon: Package },
]

function logoSrc(logo?: string) {
  if (!logo) return ""
  if (logo.startsWith("http") || logo.startsWith("data:") || logo.startsWith("blob:")) return logo
  const path = logo.startsWith("/") ? logo : `/uploads/logos/${logo}`
  return `${API_URL}${path}`
}

function todayLabel() {
  return new Date().toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export default function PublicMachineQrPage() {
  const params = useParams()
  const rootRef = useRef<HTMLDivElement>(null)
  const token = String(params.token || "")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState("")
  const [reference, setReference] = useState("")
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

  useEffect(() => {
    if (!rootRef.current || !payload?.company) return
    applyBrandTokens(rootRef.current, payload.company)
  }, [payload])

  const catalog = payload?.catalog || []
  const machine = payload?.machine
  const selectedAction = useMemo(() => ACTIONS.find((item) => item.id === type), [type])
  const documentTitle = selectedAction?.documentTitle || "SERVICE REQUEST"
  const logo = logoSrc(branding.logo)

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
      setReference(json.data?.id ? String(json.data.id).slice(-8).toUpperCase() : "")
    } catch (err: any) {
      setError(err.message || "Could not send this request.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!machine) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7f9] px-4">
        <div className="w-full max-w-[520px] rounded-lg border bg-white px-8 py-10 text-center shadow-sm">
          <p className="text-lg font-semibold tracking-tight">This QR code is not valid</p>
          <p className="mt-2 text-sm text-slate-500">{error || "Ask technical service for a new label."}</p>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="min-h-screen bg-[#f6f7f9] px-3 py-6 sm:px-6 sm:py-10">
      <article className="relative mx-auto max-w-[820px] overflow-hidden rounded-lg border bg-white text-slate-800 shadow-sm">
        {done ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
            <span className="rotate-[-28deg] text-6xl font-bold uppercase tracking-widest text-emerald-200/80">
              Received
            </span>
          </div>
        ) : null}

        <header
          className="border-b px-5 py-5 sm:px-8 sm:py-6"
          style={{ borderColor: "color-mix(in srgb, var(--brand-primary) 20%, transparent)" }}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 space-y-2">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo}
                  alt={branding.name || "Company"}
                  className="h-12 w-auto max-w-[180px] object-contain"
                />
              ) : (
                <p className="text-lg font-semibold" style={{ color: "var(--brand-primary)" }}>
                  {branding.name || "Technical service"}
                </p>
              )}
              <div className="space-y-0.5 text-xs text-slate-500">
                {branding.officeLocation ? <p>{branding.officeLocation}</p> : null}
                {branding.phone ? <p>{branding.phone}</p> : null}
                {branding.email ? <p>{branding.email}</p> : null}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p
                className="text-xl font-bold tracking-tight sm:text-3xl"
                style={{ color: "var(--brand-primary)" }}
              >
                {documentTitle}
              </p>
              <p className="mt-2 text-sm">
                <span className="text-slate-500">Date:</span> {todayLabel()}
              </p>
              {reference ? (
                <p className="text-sm">
                  <span className="text-slate-500">Ref:</span> {reference}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <section className="grid gap-6 px-5 py-5 sm:grid-cols-2 sm:px-8 sm:py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Client</p>
            <p className="mt-1 font-medium">{machine.clientName || "—"}</p>
            {machine.location ? <p className="text-sm text-slate-600">{machine.location}</p> : null}
            {machine.attendant ? <p className="text-sm text-slate-600">Attendant {machine.attendant}</p> : null}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Machine</p>
            <p className="mt-1 font-medium">{machine.productName}</p>
          </div>
        </section>

        <section className="border-t px-5 py-5 sm:px-8 sm:py-6">
        {done ? (
          <div className="relative py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-3 text-lg font-semibold">Received</p>
            <p className="mt-1 text-sm text-slate-600">{done}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setDone("")
                setReference("")
                setType("")
                setForm((current) => ({ ...current, message: "", productName: "", quantity: "1" }))
              }}
            >
              Send another request
            </Button>
          </div>
        ) : selectedAction ? (
              <form onSubmit={submit} className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
                    onClick={() => {
                      setType("")
                      setError("")
                    }}
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                  </button>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {selectedAction.title}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="erp-icon-well flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    1
                  </div>
                  <h3 className="text-sm font-semibold">Your details</h3>
                </div>
                <div className="grid gap-3 rounded-xl border bg-muted/20 p-3 sm:grid-cols-2 sm:p-4">
                  <div className="sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Your name</Label>
                    <Input
                      className="mt-1"
                      required
                      value={form.contactName}
                      onChange={(e) => setForm((current) => ({ ...current, contactName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Phone</Label>
                    <Input
                      className="mt-1"
                      required
                      value={form.contactPhone}
                      onChange={(e) => setForm((current) => ({ ...current, contactPhone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email (optional)</Label>
                    <Input
                      className="mt-1"
                      type="email"
                      value={form.contactEmail}
                      onChange={(e) => setForm((current) => ({ ...current, contactEmail: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="erp-icon-well flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
                    2
                  </div>
                  <h3 className="text-sm font-semibold">{selectedAction.title}</h3>
                </div>
                <div className="grid gap-3 rounded-xl border bg-muted/20 p-3 sm:p-4">
                  {type === "product_order" ? (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">Product</Label>
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
                      <div className="max-w-[160px]">
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Input
                          className="mt-1"
                          type="number"
                          min={1}
                          value={form.quantity}
                          onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Notes</Label>
                        <Textarea
                          className="mt-1"
                          value={form.message}
                          onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          {type === "breakdown" ? "What happened?" : "What do you need?"}
                        </Label>
                        <Textarea
                          className="mt-1"
                          required
                          value={form.message}
                          onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Preferred date</Label>
                          <Input
                            className="mt-1"
                            type="date"
                            value={form.preferredDate}
                            onChange={(e) => setForm((current) => ({ ...current, preferredDate: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Urgency</Label>
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
                </div>

                {error ? <p className="text-sm text-rose-600">{error}</p> : null}
                <Button type="submit" className="w-full sm:w-auto" disabled={submitting}>
                  {submitting ? "Sending…" : "Send request"}
                </Button>
              </form>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What do you need?</p>
            <div className="mt-2 overflow-hidden rounded-md border">
              {ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => setType(action.id)}
                    className="flex w-full items-start gap-3 border-b bg-white px-3 py-3 text-left last:border-b-0 hover:bg-slate-50"
                  >
                    <span className="erp-icon-well mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{action.title}</span>
                      <span className="text-xs text-slate-500">{action.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-sm text-slate-500">Choose one. No login is required.</p>
          </>
        )}
        </section>

        <footer className="border-t px-5 py-4 text-xs text-slate-500 sm:px-8">
          {branding.name ? `${branding.name} · ` : ""}Technical service
          {branding.phone ? ` · ${branding.phone}` : ""}
        </footer>
      </article>
    </div>
  )
}
