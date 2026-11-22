"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Printer, QrCode, RefreshCw, Search } from "lucide-react"
import {
  DesktopTableShell,
  MobileCard,
  MobileCardList,
  TechnicalServiceHeader,
  TechnicalServicePage,
} from "@/components/admin/technical-service-ui"
import { printMachineQr, qrImageUrl } from "@/lib/machine-qr"

type QrMachine = {
  _id: string
  productName: string
  serialNumber?: string
  client?: { name?: string }
  installationLocation?: string
  qrToken?: string
  publicUrl?: string
  qrScanCount?: number
  lastQrScanAt?: string
  invoiceId?: string
}

type InvoiceRow = {
  _id: string
  invoiceNumber: string
  client?: { name?: string; location?: string; number?: string }
  items: Array<{
    productId: string
    productName: string
    quantity: number
    existingMachines?: Array<{ _id: string; serialNumber?: string; hasQr?: boolean }>
  }>
}

const MODES = [
  { id: "codes", label: "All QR codes" },
  { id: "invoice", label: "From invoice" },
  { id: "manual", label: "New machine" },
] as const

function TechnicalServiceQrCodesPage() {
  const searchParams = useSearchParams()
  const machineIdFromUrl = searchParams.get("machineId") || ""
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("codes")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState("")
  const [q, setQ] = useState("")
  const [codes, setCodes] = useState<QrMachine[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [invoiceQuery, setInvoiceQuery] = useState("")
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("")
  const [invoiceForm, setInvoiceForm] = useState({
    productId: "",
    productName: "",
    serialNumber: "",
    installationLocation: "",
    attendant: "",
    attendantNumber: "",
  })
  const [manual, setManual] = useState({
    clientName: "",
    clientNumber: "",
    clientLocation: "",
    productName: "",
    serialNumber: "",
    installationLocation: "",
    attendant: "",
    attendantNumber: "",
    notes: "",
  })
  const [preview, setPreview] = useState<QrMachine | null>(null)
  const [message, setMessage] = useState("")

  const loadCodes = (query = q) => {
    setLoading(true)
    engineeringApi
      .listQrCodes(query)
      .then((res) => setCodes(res.data || []))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }

  const loadInvoices = (query = invoiceQuery) => {
    engineeringApi
      .listQrInvoices(query)
      .then((res) => setInvoices(res.data || []))
      .catch((error) => console.error(error))
  }

  useEffect(() => {
    loadCodes()
    loadInvoices()
  }, [])

  useEffect(() => {
    if (!machineIdFromUrl) return
    generateExisting(machineIdFromUrl)
  }, [machineIdFromUrl])

  const selectedInvoice = useMemo(
    () => invoices.find((row) => row._id === selectedInvoiceId) || null,
    [invoices, selectedInvoiceId],
  )

  const showPreview = (machine: QrMachine) => {
    setPreview(machine)
    setMessage("QR code ready. Print this label and attach it to the machine.")
  }

  const copyUrl = async (url?: string) => {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setMessage("Public link copied.")
  }

  const generateExisting = async (machineId: string) => {
    setSaving(machineId)
    try {
      const res = await engineeringApi.ensureMachineQr(machineId)
      const machine = res.data || res
      loadCodes()
      showPreview(machine)
    } catch (error: any) {
      window.alert(error?.message || "Could not generate this QR code.")
    } finally {
      setSaving("")
    }
  }

  const createFromInvoice = async () => {
    if (!selectedInvoice || !invoiceForm.productId) {
      window.alert("Choose an invoice and a machine on that invoice.")
      return
    }
    setSaving("invoice")
    try {
      const res = await engineeringApi.createQrFromInvoice({
        invoiceId: selectedInvoice._id,
        ...invoiceForm,
        installationLocation:
          invoiceForm.installationLocation || selectedInvoice.client?.location || "",
      })
      const machine = res.data || res
      setInvoiceForm({
        productId: "",
        productName: "",
        serialNumber: "",
        installationLocation: "",
        attendant: "",
        attendantNumber: "",
      })
      loadCodes()
      loadInvoices()
      showPreview(machine)
      setMode("codes")
    } catch (error: any) {
      window.alert(error?.message || "Could not create this machine QR.")
    } finally {
      setSaving("")
    }
  }

  const createManual = async () => {
    if (!manual.clientName.trim() || !manual.productName.trim()) {
      window.alert("Enter the client and the machine name.")
      return
    }
    setSaving("manual")
    try {
      const res = await engineeringApi.createManualQrMachine(manual)
      const machine = res.data || res
      setManual({
        clientName: "",
        clientNumber: "",
        clientLocation: "",
        productName: "",
        serialNumber: "",
        installationLocation: "",
        attendant: "",
        attendantNumber: "",
        notes: "",
      })
      loadCodes()
      showPreview(machine)
      setMode("codes")
    } catch (error: any) {
      window.alert(error?.message || "Could not save this machine.")
    } finally {
      setSaving("")
    }
  }

  if (loading && codes.length === 0) return <PageLoadingSkeleton title="QR codes" />

  return (
    <TechnicalServicePage>
      <TechnicalServiceHeader
        title="Machine QR codes"
        description="Generate a unique public QR for each machine. Attendants scan it to request service, report a breakdown, or order a product."
        actions={
          <Button variant="outline" size="sm" onClick={() => loadCodes()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {MODES.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={mode === item.id ? "default" : "outline"}
            onClick={() => setMode(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      ) : null}

      {preview?.publicUrl ? (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Print this QR</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 px-4 pb-4 sm:flex-row sm:items-center">
            <img
              src={qrImageUrl(preview.publicUrl, 220)}
              alt="Machine QR"
              className="h-40 w-40 rounded-lg border bg-white p-2"
            />
            <div className="space-y-2">
              <p className="font-medium">{preview.productName}</p>
              <p className="text-sm text-muted-foreground">
                {preview.client?.name || "No client"}
                {preview.serialNumber ? ` · SN ${preview.serialNumber}` : ""}
              </p>
              <p className="break-all text-xs text-muted-foreground">{preview.publicUrl}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => printMachineQr(preview)}>
                  <Printer className="mr-1.5 h-4 w-4" />
                  Print label
                </Button>
                <Button size="sm" variant="outline" onClick={() => copyUrl(preview.publicUrl)}>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Copy link
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {mode === "invoice" ? (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Generate from an invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 pb-4">
            <div>
              <Label>Search invoices</Label>
              <div className="mt-1 flex gap-2">
                <Input
                  value={invoiceQuery}
                  onChange={(e) => setInvoiceQuery(e.target.value)}
                  placeholder="Invoice number or client"
                />
                <Button type="button" variant="outline" onClick={() => loadInvoices(invoiceQuery)}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label>Invoice</Label>
              <select
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={selectedInvoiceId}
                onChange={(e) => {
                  setSelectedInvoiceId(e.target.value)
                  setInvoiceForm((current) => ({ ...current, productId: "", productName: "" }))
                }}
              >
                <option value="">Select an issued invoice</option>
                {invoices.map((invoice) => (
                  <option key={invoice._id} value={invoice._id}>
                    {invoice.invoiceNumber} · {invoice.client?.name || "Client"}
                  </option>
                ))}
              </select>
            </div>
            {selectedInvoice ? (
              <>
                <div>
                  <Label>Machine on invoice</Label>
                  <select
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={invoiceForm.productId}
                    onChange={(e) => {
                      const item = selectedInvoice.items.find((row) => row.productId === e.target.value)
                      setInvoiceForm((current) => ({
                        ...current,
                        productId: e.target.value,
                        productName: item?.productName || "",
                        installationLocation: current.installationLocation || selectedInvoice.client?.location || "",
                      }))
                    }}
                  >
                    <option value="">Select a product</option>
                    {selectedInvoice.items.map((item) => (
                      <option key={item.productId} value={item.productId}>
                        {item.productName} × {item.quantity}
                        {item.existingMachines?.some((row) => row.hasQr) ? " · QR exists" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Serial number</Label>
                    <Input
                      className="mt-1"
                      value={invoiceForm.serialNumber}
                      onChange={(e) => setInvoiceForm((current) => ({ ...current, serialNumber: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Install location</Label>
                    <Input
                      className="mt-1"
                      value={invoiceForm.installationLocation}
                      onChange={(e) =>
                        setInvoiceForm((current) => ({ ...current, installationLocation: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Attendant</Label>
                    <Input
                      className="mt-1"
                      value={invoiceForm.attendant}
                      onChange={(e) => setInvoiceForm((current) => ({ ...current, attendant: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Attendant phone</Label>
                    <Input
                      className="mt-1"
                      value={invoiceForm.attendantNumber}
                      onChange={(e) =>
                        setInvoiceForm((current) => ({ ...current, attendantNumber: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <Button onClick={createFromInvoice} disabled={saving === "invoice"}>
                  {saving === "invoice" ? "Saving…" : "Save machine and generate QR"}
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {mode === "manual" ? (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Register a machine and generate QR</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-2">
            <div>
              <Label>Client name</Label>
              <Input
                className="mt-1"
                value={manual.clientName}
                onChange={(e) => setManual((current) => ({ ...current, clientName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Client phone</Label>
              <Input
                className="mt-1"
                value={manual.clientNumber}
                onChange={(e) => setManual((current) => ({ ...current, clientNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label>Client location</Label>
              <Input
                className="mt-1"
                value={manual.clientLocation}
                onChange={(e) => setManual((current) => ({ ...current, clientLocation: e.target.value }))}
              />
            </div>
            <div>
              <Label>Machine / product</Label>
              <Input
                className="mt-1"
                value={manual.productName}
                onChange={(e) => setManual((current) => ({ ...current, productName: e.target.value }))}
              />
            </div>
            <div>
              <Label>Serial number</Label>
              <Input
                className="mt-1"
                value={manual.serialNumber}
                onChange={(e) => setManual((current) => ({ ...current, serialNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label>Install location</Label>
              <Input
                className="mt-1"
                value={manual.installationLocation}
                onChange={(e) => setManual((current) => ({ ...current, installationLocation: e.target.value }))}
              />
            </div>
            <div>
              <Label>Attendant</Label>
              <Input
                className="mt-1"
                value={manual.attendant}
                onChange={(e) => setManual((current) => ({ ...current, attendant: e.target.value }))}
              />
            </div>
            <div>
              <Label>Attendant phone</Label>
              <Input
                className="mt-1"
                value={manual.attendantNumber}
                onChange={(e) => setManual((current) => ({ ...current, attendantNumber: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea
                className="mt-1"
                value={manual.notes}
                onChange={(e) => setManual((current) => ({ ...current, notes: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={createManual} disabled={saving === "manual"}>
                {saving === "manual" ? "Saving…" : "Save machine and generate QR"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {mode === "codes" ? (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Machines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 px-4 pb-4">
            <div className="flex gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search machine, serial, or client"
                onKeyDown={(e) => {
                  if (e.key === "Enter") loadCodes(q)
                }}
              />
              <Button variant="outline" onClick={() => loadCodes(q)}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <DesktopTableShell>
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Machine</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Scans</th>
                    <th className="px-4 py-3">QR</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No machines yet. Create one from an invoice or the new machine form.
                      </td>
                    </tr>
                  ) : (
                    codes.map((machine) => (
                      <tr key={machine._id} className="border-t">
                        <td className="px-4 py-3">
                          <p className="font-medium">{machine.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {machine.serialNumber ? `SN ${machine.serialNumber}` : "No serial"}
                          </p>
                        </td>
                        <td className="px-4 py-3">{machine.client?.name || "—"}</td>
                        <td className="px-4 py-3">{machine.qrScanCount || 0}</td>
                        <td className="px-4 py-3">
                          {machine.qrToken ? (
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" onClick={() => showPreview(machine)}>
                                <QrCode className="mr-1 h-3.5 w-3.5" />
                                View
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => printMachineQr(machine)}>
                                Print
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => generateExisting(machine._id)}
                              disabled={saving === machine._id}
                            >
                              Generate QR
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </DesktopTableShell>
            <MobileCardList label="QR machines">
              {codes.map((machine) => (
                <MobileCard key={machine._id}>
                  <p className="font-medium">{machine.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {machine.client?.name || "No client"}
                    {machine.serialNumber ? ` · SN ${machine.serialNumber}` : ""}
                  </p>
                  <div className="mt-2">
                    {machine.qrToken ? (
                      <Button size="sm" variant="outline" onClick={() => showPreview(machine)}>
                        View QR
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => generateExisting(machine._id)}>
                        Generate QR
                      </Button>
                    )}
                  </div>
                </MobileCard>
              ))}
            </MobileCardList>
          </CardContent>
        </Card>
      ) : null}
    </TechnicalServicePage>
  )
}

export default function TechnicalServiceQrCodesRoute() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="QR codes" />}>
      <TechnicalServiceQrCodesPage />
    </Suspense>
  )
}
