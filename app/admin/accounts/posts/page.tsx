"use client"

import { useEffect, useMemo, useState } from "react"
import { stockApi, api } from "@/lib/api"
import { runDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { CheckCircle2, AlertTriangle, RefreshCw, Send, Settings, ServerCrash, Clock, Building2 } from "lucide-react"

interface ClientProfile {
  _id: string
  legalName: string
  kraPin: string
  email?: string
  branchId?: string
  hasKraDetails: boolean
}

interface PostInvoice {
  _id: string
  invoiceNumber: string
  createdAt: string
  subTotal: number
  client: { name: string; number: string; location: string }
  etimsStatus: "not_posted" | "posted" | "failed"
  etims?: {
    status: "not_posted" | "posted" | "failed"
    kraInvoiceId?: string
    responseMessage?: string
  }
  clientProfile: ClientProfile | null
  hasKraSaved: boolean
}

interface ClientForm {
  legalName: string
  kraPin: string
  email: string
  branchId: string
}

const EMPTY_FORM: ClientForm = {
  legalName: "",
  kraPin: "",
  email: "",
  branchId: "",
}

export default function AccountsPostsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [posting, setPosting] = useState(false)
  const [invoices, setInvoices] = useState<PostInvoice[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("")
  const [form, setForm] = useState<ClientForm>(EMPTY_FORM)
  const [search, setSearch] = useState("")
  const [showEtimsConfig, setShowEtimsConfig] = useState(false)

  const [etimsStats, setEtimsStats] = useState<any>({
    submitted: 0,
    failed: 0,
    pending: 0,
    isConnected: false,
  })

  // eTIMS Config
  const [etimsConfig, setEtimsConfig] = useState<any>({
    companyName: "",
    kraPin: "",
    branchId: "00",
    deviceSerialNumber: "",
    deviceId: "",
    sdcId: "",
    communicationKey: "",
    environment: "Sandbox",
    apiEndpoint: "https://etims-api-sbx.kra.go.ke/etims-api",
    status: "Active"
  });

  const loadData = async (opts?: SilentLoadOptions) => {
    try {
      await runDataLoad(
        setLoading,
        async () => {
          const [response, statsResponse, configResponse] = await Promise.all([
            stockApi.getAccountsPosts(),
            api.etims.getStats().catch(() => ({ success: false, data: {} })),
            api.etims.getConfig().catch(() => ({ success: false, data: null }))
          ]);
          const rows = response.data || []
          setInvoices(rows)

          if (statsResponse?.success) {
            setEtimsStats(statsResponse.data)
          }

          if (configResponse?.success && configResponse.data) {
            setEtimsConfig((prev: typeof etimsConfig) => ({ ...prev, ...configResponse.data }))
          }

          if (!selectedInvoiceId && rows.length > 0) {
            setSelectedInvoiceId(rows[0]._id)
          }
        },
        opts,
        setRefreshing,
      )
    } catch (error: any) {
      window.alert(error?.message || "Failed to load posts")
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return invoices

    return invoices.filter((row) =>
      [
        row.invoiceNumber,
        row.client?.name,
        row.client?.number,
        row.client?.location,
        row.clientProfile?.legalName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [invoices, search])

  const selectedInvoice = useMemo(
    () => invoices.find((row) => row._id === selectedInvoiceId) || null,
    [invoices, selectedInvoiceId],
  )

  useEffect(() => {
    if (!selectedInvoice) {
      setForm(EMPTY_FORM)
      return
    }

    setForm({
      legalName: selectedInvoice.clientProfile?.legalName || selectedInvoice.client.name || "",
      kraPin: selectedInvoice.clientProfile?.kraPin || "",
      email: selectedInvoice.clientProfile?.email || "",
      branchId: selectedInvoice.clientProfile?.branchId || "",
    })
  }, [selectedInvoiceId, selectedInvoice])

  const saveClientProfile = async () => {
    if (!selectedInvoice) return
    if (!form.legalName.trim() || !form.kraPin.trim()) {
      window.alert("Legal name and KRA PIN are required")
      return
    }

    try {
      setSaving(true)
      await stockApi.saveInvoiceClientProfile(selectedInvoice._id, {
        legalName: form.legalName.trim(),
        kraPin: form.kraPin.trim().toUpperCase(),
        email: form.email.trim() || undefined,
        branchId: form.branchId.trim() || undefined,
      })
      await loadData({ silent: true })
      window.alert("Client details saved")
    } catch (error: any) {
      window.alert(error?.message || "Failed to save client details")
    } finally {
      setSaving(false)
    }
  }

  const saveEtimsConfig = async () => {
    setSaving(true);
    try {
      const res = await api.etims.saveConfig(etimsConfig);
      if (res?.success) {
        window.alert("eTIMS configuration saved successfully");
        setShowEtimsConfig(false);
        await loadData({ silent: true });
      } else {
        window.alert("Failed to save eTIMS config: " + (res?.message || "Unknown error"));
      }
    } catch (e: any) {
      window.alert("Error: " + (e?.message || "Could not save eTIMS config"));
    } finally {
      setSaving(false);
    }
  };

  const initializeDevice = async () => {
    setInitializing(true);
    try {
      // Need to save first to make sure serial number is persisted
      await api.etims.saveConfig(etimsConfig);
      
      const res = await api.etims.initDevice();
      if (res?.success && res.data) {
        setEtimsConfig({ ...etimsConfig, ...res.data });
        window.alert("Device successfully initialized with KRA!");
        await loadData({ silent: true });
      } else {
        window.alert("Initialization failed: " + (res?.message || "Unknown error"));
      }
    } catch (e: any) {
      window.alert("Error: " + (e?.message || "Could not initialize device"));
    } finally {
      setInitializing(false);
    }
  };

  const postToEtims = async () => {
    if (!selectedInvoice) return

    try {
      setPosting(true)
      const response = await api.etims.submitInvoice({ invoice_id: selectedInvoice._id })
      await loadData({ silent: true })
      window.alert(response.message || "Sale processing via eTIMS OSCU")
    } catch (error: any) {
      window.alert(error?.message || "Failed to post sale to eTIMS")
    } finally {
      setPosting(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading posts" rows={8} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">eTIMS OSCU Integration</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and post electronic tax invoices to KRA.</p>
        </div>
        <Button variant="outline" onClick={() => loadData({ silent: true })} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button variant="outline" onClick={() => setShowEtimsConfig(true)} className="gap-2">
          <Settings className="h-4 w-4" />
          OSCU Configuration
        </Button>
      </div>

      {/* DASHBOARD STATS */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-slate-50 border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Connection Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {etimsStats?.isConnected ? (
                <><CheckCircle2 className="h-5 w-5 text-emerald-600" /><span className="text-lg font-bold text-slate-900">Connected</span></>
              ) : (
                <><ServerCrash className="h-5 w-5 text-destructive" /><span className="text-lg font-bold text-destructive">Disconnected</span></>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Submitted Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{etimsStats?.submitted || 0}</span>
              <Send className="h-4 w-4 text-slate-400" />
            </div>
            {etimsStats?.lastSuccessTime && (
              <p className="text-xs text-muted-foreground mt-1">Last: {new Date(etimsStats.lastSuccessTime).toLocaleDateString()}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{etimsStats?.pending || 0}</span>
              <Clock className="h-4 w-4 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-destructive">{etimsStats?.failed || 0}</span>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            {etimsStats?.lastErrorTime && (
              <p className="text-xs text-destructive mt-1 truncate" title={etimsStats.lastErrorMsg}>
                {etimsStats.lastErrorMsg}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Posts Queue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Search by invoice, client, number..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="max-h-[520px] overflow-auto space-y-2">
              {filteredInvoices.map((row) => (
                <button
                  key={row._id}
                  onClick={() => setSelectedInvoiceId(row._id)}
                  className={`w-full rounded border p-3 text-left transition hover:bg-muted/50 ${
                    selectedInvoiceId === row._id ? "border-primary bg-muted/40" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{row.invoiceNumber}</div>
                    <div className="flex items-center gap-2">
                      <Badge variant={row.hasKraSaved ? "default" : "secondary"}>
                        {row.hasKraSaved ? "KRA Saved" : "KRA Missing"}
                      </Badge>
                      <Badge variant={row.etimsStatus === "posted" ? "default" : "outline"}>
                        {row.etimsStatus === "posted" ? "Posted" : row.etimsStatus === "failed" ? "Failed" : "Not Posted"}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm mt-1">{row.client.name}</div>
                  <div className="text-xs text-muted-foreground">{row.client.number} · {row.client.location}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client KRA Details & Posting</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedInvoice ? (
              <p className="text-sm text-muted-foreground">Select an invoice/client to continue.</p>
            ) : (
              <>
                <div className="rounded border p-3 bg-muted/30">
                  <p className="text-sm font-medium">Invoice: {selectedInvoice.invoiceNumber}</p>
                  <p className="text-sm">Client: {selectedInvoice.client.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedInvoice.client.number} · {selectedInvoice.client.location}
                  </p>
                </div>

                <div className="grid gap-3">
                  <div>
                    <Label>Legal Name</Label>
                    <Input
                      value={form.legalName}
                      onChange={(event) => setForm((prev) => ({ ...prev, legalName: event.target.value }))}
                      placeholder="Registered legal name"
                    />
                  </div>
                  <div>
                    <Label>KRA PIN</Label>
                    <Input
                      value={form.kraPin}
                      onChange={(event) => setForm((prev) => ({ ...prev, kraPin: event.target.value.toUpperCase() }))}
                      placeholder="A123456789B"
                    />
                  </div>
                  <div>
                    <Label>Email (optional)</Label>
                    <Input
                      value={form.email}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="client@email.com"
                    />
                  </div>
                  <div>
                    <Label>Branch ID (optional)</Label>
                    <Input
                      value={form.branchId}
                      onChange={(event) => setForm((prev) => ({ ...prev, branchId: event.target.value }))}
                      placeholder="001"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveClientProfile} disabled={saving}>
                    {saving ? "Saving..." : "Save Client Details"}
                  </Button>
                  {selectedInvoice.etimsStatus !== "posted" ? (
                    <Button
                      variant="outline"
                      onClick={postToEtims}
                      disabled={posting || !selectedInvoice.hasKraSaved}
                    >
                      {posting ? "Posting..." : "Post Sale to eTIMS"}
                    </Button>
                  ) : (
                    <Badge className="h-10 px-3 flex items-center">Already Posted to eTIMS</Badge>
                  )}
                </div>

                {!selectedInvoice.hasKraSaved && (
                  <p className="text-xs text-amber-700">
                    Save legal name and KRA PIN first before posting to eTIMS.
                  </p>
                )}

                {selectedInvoice.etims?.kraInvoiceId && (
                  <p className="text-sm text-green-700 font-medium">
                    KRA Invoice ID: {selectedInvoice.etims.kraInvoiceId}
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showEtimsConfig} onOpenChange={setShowEtimsConfig}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              eTIMS Configuration (OSCU)
            </DialogTitle>
            <DialogDescription>
              Configure Kenya Revenue Authority (KRA) eTIMS integration settings for this tenant.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={etimsConfig.companyName}
                onChange={(e) => setEtimsConfig({ ...etimsConfig, companyName: e.target.value })}
                placeholder="Registered business name"
              />
            </div>
            <div className="space-y-2">
              <Label>KRA PIN (TIN)</Label>
              <Input
                value={etimsConfig.kraPin}
                onChange={(e) => setEtimsConfig({ ...etimsConfig, kraPin: e.target.value })}
                placeholder="P000000000A"
              />
            </div>
            <div className="space-y-2">
              <Label>Branch ID</Label>
              <Input
                value={etimsConfig.branchId}
                onChange={(e) => setEtimsConfig({ ...etimsConfig, branchId: e.target.value })}
                placeholder="00"
              />
            </div>
            <div className="space-y-2">
              <Label>Device Serial Number</Label>
              <Input
                value={etimsConfig.deviceSerialNumber}
                onChange={(e) => setEtimsConfig({ ...etimsConfig, deviceSerialNumber: e.target.value })}
                placeholder="e.g. SETH-ERP-0001"
              />
            </div>
            <div className="space-y-2">
              <Label>Environment</Label>
              <Select
                value={etimsConfig.environment}
                onValueChange={(val) => setEtimsConfig({ ...etimsConfig, environment: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sandbox">Sandbox</SelectItem>
                  <SelectItem value="Production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Endpoint Base URL</Label>
              <Input
                value={etimsConfig.apiEndpoint}
                onChange={(e) => setEtimsConfig({ ...etimsConfig, apiEndpoint: e.target.value })}
                placeholder="https://api.kra.go.ke"
              />
            </div>
            <div className="space-y-2">
              <Label>Communication Key</Label>
              <Input
                type="password"
                value={etimsConfig.communicationKey}
                disabled={true}
                placeholder="Auto-filled via Device Initialization"
              />
            </div>
            <div className="space-y-2 flex items-center col-span-1 md:col-span-2 pt-2">
              <Checkbox
                id="etims-status"
                checked={etimsConfig.status === "Active"}
                onCheckedChange={(checked) => setEtimsConfig({ ...etimsConfig, status: checked ? "Active" : "Inactive" })}
              />
              <label htmlFor="etims-status" className="text-sm font-medium leading-none ml-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Enable eTIMS Integration
              </label>
            </div>
          </div>
          
          <DialogFooter className="flex justify-between items-center sm:justify-between w-full">
            <div>
              <Button 
                variant="secondary" 
                onClick={initializeDevice} 
                disabled={initializing || !etimsConfig.deviceSerialNumber || !etimsConfig.kraPin}
              >
                {initializing ? "Initializing..." : "Initialize Device"}
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setShowEtimsConfig(false)}>Cancel</Button>
              <Button onClick={saveEtimsConfig} disabled={saving}>
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
