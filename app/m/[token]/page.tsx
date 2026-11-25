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

type PublicJob = {
  id: string
  date?: string | null
  type?: string
  title?: string
  status?: string
  engineer?: string
  note?: string
  machineOkay?: boolean | null
}

const ACTIONS: Array<{ id: RequestType; title: string; hint: string; icon: typeof Wrench }> = [
  { id: "service", title: "Request service", hint: "Book a visit or routine support", icon: Wrench },
  { id: "breakdown", title: "Report a breakdown", hint: "The machine is not working", icon: TriangleAlert },
  { id: "product_order", title: "Order a product", hint: "Consumables or a replacement", icon: Package },
]

function logoSrc(logo?: string) {
  if (!logo) return ""
  if (logo.startsWith("http") || logo.startsWith("data:") || logo.startsWith("blob:")) return logo
  const path = logo.startsWith("/") ? logo : `/uploads/logos/${logo}`
  return `${API_URL}${path}`
}

function formatWhen(value?: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })
}

function statusTone(status?: string) {
  const value = String(status || "active")
  if (value === "active") return "bg-emerald-50 text-emerald-800"
  if (value === "maintenance" || value === "in_workshop") return "bg-amber-50 text-amber-800"
  if (value === "installation_pending") return "bg-sky-50 text-sky-800"
  return "bg-slate-100 text-slate-700"
}

function jobStatusLabel(status?: string) {
  const value = String(status || "")
  if (value === "in_progress") return "In progress"
  if (value === "waiting_parts") return "Waiting for parts"
  if (value === "on_hold") return "On hold"
  if (value === "assigned") return "Assigned"
  if (value === "completed") return "Completed"
  if (value === "open") return "Open"
  return value.replaceAll("_", " ")
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
  const history: PublicJob[] = payload?.history || []
  const engineerUpdate: PublicJob | null = payload?.engineerUpdate || null
  const currentJob: PublicJob | null = payload?.currentJob || null
  const selectedAction = useMemo(() => ACTIONS.find((item) => item.id === type), [type])
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
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f6f7f9]">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    )
  }

  if (!machine) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#f6f7f9] px-4">
        <div className="w-full max-w-[400px] rounded-2xl border bg-white px-6 py-8 text-center">
          <p className="text-lg font-semibold tracking-tight">This QR code is not valid</p>
          <p className="mt-2 text-sm text-slate-500">{error || "Ask technical service for a new label."}</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className="min-h-[100dvh] bg-[#f6f7f9] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
    >
      <div className="mx-auto w-full max-w-[430px] space-y-3">
        <header className="flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-9 w-auto max-w-[140px] object-contain" />
          ) : (
            <p className="text-sm font-semibold" style={{ color: "var(--brand-primary)" }}>
              {branding.name || "Technical service"}
            </p>
          )}
        </header>

        <section className="rounded-2xl border bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Machine</p>
              <h1 className="mt-0.5 text-lg font-semibold leading-tight text-slate-900">{machine.productName}</h1>
              {machine.serialNumber ? (
                <p className="mt-0.5 text-xs text-slate-500">SN {machine.serialNumber}</p>
              ) : null}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusTone(machine.status)}`}>
              {machine.statusLabel || "Working"}
            </span>
          </div>
          <div className="mt-3 space-y-0.5 text-sm text-slate-600">
            {machine.clientName ? <p>{machine.clientName}</p> : null}
            {machine.location ? <p>{machine.location}</p> : null}
            {machine.attendant ? <p>In charge · {machine.attendant}</p> : null}
          </div>
        </section>

        {!type && !done ? (
          <>
            {currentJob ? (
              <section className="rounded-2xl border bg-white p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Current job</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{currentJob.title}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {jobStatusLabel(currentJob.status)}
                  {currentJob.engineer ? ` · ${currentJob.engineer}` : ""}
                  {currentJob.date ? ` · ${formatWhen(currentJob.date)}` : ""}
                </p>
              </section>
            ) : null}

            <section className="rounded-2xl border bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Engineer update</p>
              {engineerUpdate ? (
                <>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {engineerUpdate.machineOkay === true
                      ? "Machine okay"
                      : engineerUpdate.machineOkay === false
                        ? "Needs attention"
                        : engineerUpdate.title || "Last visit"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatWhen(engineerUpdate.date) || "Recent"}
                    {engineerUpdate.engineer ? ` · ${engineerUpdate.engineer}` : ""}
                  </p>
                  {engineerUpdate.note ? (
                    <p className="mt-2 text-sm leading-snug text-slate-700">{engineerUpdate.note}</p>
                  ) : null}
                </>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No engineer update yet.</p>
              )}
            </section>

            <section className="rounded-2xl border bg-white p-4">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Service history</p>
              {history.length ? (
                <ol className="mt-2 divide-y">
                  {history.map((row) => (
                    <li key={row.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{row.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatWhen(row.date) || "—"}
                          {row.engineer ? ` · ${row.engineer}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-medium text-slate-500">
                        {row.machineOkay === true ? "Okay" : row.machineOkay === false ? "Attention" : "Done"}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No service visits recorded yet.</p>
              )}
            </section>

            <section className="rounded-2xl border bg-white p-2">
              <p className="px-2 pt-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Need help?</p>
              <div className="mt-1">
                {ACTIONS.map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => setType(action.id)}
                      className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-slate-50"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-900">{action.title}</span>
                        <span className="text-xs text-slate-500">{action.hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          </>
        ) : done ? (
          <section className="rounded-2xl border bg-white px-4 py-8 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <p className="mt-3 text-lg font-semibold">Received</p>
            <p className="mt-1 text-sm text-slate-600">{done}</p>
            {reference ? <p className="mt-1 text-xs text-slate-500">Ref {reference}</p> : null}
            <Button
              variant="outline"
              className="mt-5 w-full"
              onClick={() => {
                setDone("")
                setReference("")
                setType("")
                setForm((current) => ({ ...current, message: "", productName: "", quantity: "1" }))
              }}
            >
              Back to machine
            </Button>
          </section>
        ) : selectedAction ? (
          <section className="rounded-2xl border bg-white p-4">
            <button
              type="button"
              className="inline-flex min-h-10 items-center text-sm font-medium text-slate-600"
              onClick={() => {
                setType("")
                setError("")
              }}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </button>
            <h2 className="mt-1 text-base font-semibold">{selectedAction.title}</h2>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500">Your name</Label>
                  <Input
                    className="mt-1 h-11"
                    required
                    value={form.contactName}
                    onChange={(e) => setForm((current) => ({ ...current, contactName: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Phone</Label>
                  <Input
                    className="mt-1 h-11"
                    required
                    inputMode="tel"
                    value={form.contactPhone}
                    onChange={(e) => setForm((current) => ({ ...current, contactPhone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Email (optional)</Label>
                  <Input
                    className="mt-1 h-11"
                    type="email"
                    inputMode="email"
                    value={form.contactEmail}
                    onChange={(e) => setForm((current) => ({ ...current, contactEmail: e.target.value }))}
                  />
                </div>
              </div>

              {type === "product_order" ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-500">Product</Label>
                    {catalog.length > 0 ? (
                      <select
                        className="mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm"
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
                      className="mt-2 h-11"
                      placeholder="Product name"
                      value={form.productName}
                      onChange={(e) => setForm((current) => ({ ...current, productName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Quantity</Label>
                    <Input
                      className="mt-1 h-11"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={form.quantity}
                      onChange={(e) => setForm((current) => ({ ...current, quantity: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Notes</Label>
                    <Textarea
                      className="mt-1 min-h-24"
                      value={form.message}
                      onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-slate-500">
                      {type === "breakdown" ? "What happened?" : "What do you need?"}
                    </Label>
                    <Textarea
                      className="mt-1 min-h-28"
                      required
                      value={form.message}
                      onChange={(e) => setForm((current) => ({ ...current, message: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500">Preferred date</Label>
                      <Input
                        className="mt-1 h-11"
                        type="date"
                        value={form.preferredDate}
                        onChange={(e) => setForm((current) => ({ ...current, preferredDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Urgency</Label>
                      <select
                        className="mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm"
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
                </div>
              )}

              {error ? <p className="text-sm text-rose-600">{error}</p> : null}
              <Button type="submit" className="h-11 w-full" disabled={submitting}>
                {submitting ? "Sending…" : "Send request"}
              </Button>
            </form>
          </section>
        ) : null}

        <p className="px-1 text-center text-[11px] text-slate-400">
          {branding.name || "Technical service"}
          {branding.phone ? ` · ${branding.phone}` : ""}
        </p>
      </div>
    </div>
  )
}
