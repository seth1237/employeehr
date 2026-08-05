"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Building2, CheckCircle2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import type { TenantBranding } from "@/lib/stock-document-pdf"

interface PaymentChannel {
  paymentType: "bank" | "mpesa"
  mpesaMode?: "paybill" | "till"
  channelName: string
  bankName: string
  accountName: string
  accountNumber: string
  paybillNumber: string
  tillNumber: string
  branch: string
  notes: string
}

interface InvoiceSettings {
  invoiceEmail: string
  contactPhone: string
  officeLocation: string
  secondLocation: string
  useBothLocations: boolean
  contactEmail: string
  website: string
  vatNumber: string
  pinNumber: string
  termsAndConditions: string
  includeQuotationReference: boolean
  includeDeliveryNoteNumber: boolean
  includePreparedBy: boolean
  includeVat: boolean
  includePaymentChannels: boolean
  paymentChannels: PaymentChannel[]
  logoUrl?: string
  defaultTermsAndConditions?: string
}

const blankChannel = (): PaymentChannel => ({
  paymentType: "bank",
  mpesaMode: "paybill",
  channelName: "",
  bankName: "",
  accountName: "",
  accountNumber: "",
  paybillNumber: "",
  tillNumber: "",
  branch: "",
  notes: "",
})

const createMpesaChannel = (mode: "paybill" | "till" = "paybill"): PaymentChannel =>
  mode === "paybill"
    ? {
        paymentType: "mpesa",
        mpesaMode: "paybill",
        channelName: "M-Pesa Paybill",
        bankName: "Safaricom M-Pesa",
        accountName: "Account No",
        accountNumber: "149570",
        paybillNumber: "516600",
        tillNumber: "",
        branch: "",
        notes: "Mpesa Paybill with Account No 149570",
      }
    : {
        paymentType: "mpesa",
        mpesaMode: "till",
        channelName: "M-Pesa Till Number",
        bankName: "Safaricom M-Pesa",
        accountName: "Till Number",
        accountNumber: "",
        paybillNumber: "",
        tillNumber: "",
        branch: "",
        notes: "Enter the M-Pesa till number here",
      }

export default function InvoiceGenerationSettingsPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [branding, setBranding] = useState<TenantBranding>({})
  const [settings, setSettings] = useState<InvoiceSettings>({
    invoiceEmail: "",
    contactPhone: "",
    officeLocation: "",
    secondLocation: "",
    useBothLocations: false,
    contactEmail: "",
    website: "",
    vatNumber: "",
    pinNumber: "",
    termsAndConditions: "",
    includeQuotationReference: true,
    includeDeliveryNoteNumber: true,
    includePreparedBy: true,
    includeVat: false,
    includePaymentChannels: true,
    paymentChannels: [blankChannel()],
  })

  const invoiceLogo = useMemo(() => branding.logo || settings.logoUrl || "", [branding.logo, settings.logoUrl])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [brandingRes, settingsRes] = await Promise.all([
          api.company.getBranding(),
          api.company.getInvoiceSettings(),
        ])

        if (brandingRes?.success && brandingRes.data) {
          setBranding(brandingRes.data)
        }

        if (settingsRes?.success && settingsRes.data) {
          setSettings({
            invoiceEmail: settingsRes.data.invoiceEmail || "",
            contactPhone: settingsRes.data.contactPhone || "",
            officeLocation: settingsRes.data.officeLocation || "",
            secondLocation: settingsRes.data.secondLocation || "",
            useBothLocations: settingsRes.data.useBothLocations ?? false,
            contactEmail: settingsRes.data.contactEmail || "",
            website: settingsRes.data.website || "",
            vatNumber: settingsRes.data.vatNumber || "",
            pinNumber: settingsRes.data.pinNumber || "",
            termsAndConditions: settingsRes.data.termsAndConditions || "",
            includeQuotationReference: settingsRes.data.includeQuotationReference ?? true,
            includeDeliveryNoteNumber: settingsRes.data.includeDeliveryNoteNumber ?? true,
            includePreparedBy: settingsRes.data.includePreparedBy ?? true,
            includeVat: settingsRes.data.includeVat ?? false,
            includePaymentChannels: settingsRes.data.includePaymentChannels ?? true,
            paymentChannels: (settingsRes.data.paymentChannels || []).length
              ? settingsRes.data.paymentChannels.map((channel: any) => ({
                  ...blankChannel(),
                  ...channel,
                  paymentType: channel.paymentType === "mpesa" ? "mpesa" : "bank",
                  mpesaMode: channel.mpesaMode === "till" ? "till" : "paybill",
                }))
              : [blankChannel()],
            logoUrl: settingsRes.data.logoUrl || "",
            defaultTermsAndConditions: settingsRes.data.defaultTermsAndConditions || "",
          })
        }
      } catch (error: any) {
        toast({ description: error.message || "Failed to load invoice settings", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [toast])

  const updateChannel = (index: number, field: keyof PaymentChannel, value: string) => {
    setSettings((prev) => ({
      ...prev,
      paymentChannels: prev.paymentChannels.map((channel, i) => (i === index ? { ...channel, [field]: value } : channel)),
    }))
  }

  const addChannel = () => {
    setSettings((prev) => ({ ...prev, paymentChannels: [...prev.paymentChannels, blankChannel()] }))
  }

  const addMpesaChannel = (mode: "paybill" | "till" = "paybill") => {
    setSettings((prev) => ({ ...prev, paymentChannels: [...prev.paymentChannels, createMpesaChannel(mode)] }))
  }

  const removeChannel = (index: number) => {
    setSettings((prev) => {
      const next = prev.paymentChannels.filter((_, i) => i !== index)
      return { ...prev, paymentChannels: next.length ? next : [blankChannel()] }
    })
  }

  const setChannelType = (index: number, paymentType: "bank" | "mpesa") => {
    setSettings((prev) => ({
      ...prev,
      paymentChannels: prev.paymentChannels.map((channel, i) =>
        i === index
          ? paymentType === "mpesa"
            ? { ...channel, paymentType, mpesaMode: channel.mpesaMode || "paybill" }
            : { ...channel, paymentType, mpesaMode: "paybill" }
          : channel,
      ),
    }))
  }

  const save = async () => {
    try {
      setSaving(true)
      const res = await api.company.updateInvoiceSettings({
        invoiceEmail: settings.invoiceEmail,
        contactPhone: settings.contactPhone,
        officeLocation: settings.officeLocation,
        secondLocation: settings.secondLocation,
        useBothLocations: settings.useBothLocations,
        contactEmail: settings.contactEmail,
        website: settings.website,
        vatNumber: settings.vatNumber,
        pinNumber: settings.pinNumber,
        termsAndConditions: settings.termsAndConditions,
        includeQuotationReference: settings.includeQuotationReference,
        includeDeliveryNoteNumber: settings.includeDeliveryNoteNumber,
        includePreparedBy: settings.includePreparedBy,
        includeVat: settings.includeVat,
        includePaymentChannels: settings.includePaymentChannels,
        paymentChannels: settings.paymentChannels,
      })

      if (!res?.success) {
        throw new Error(res?.message || "Failed to save invoice settings")
      }

      toast({ description: "Invoice settings saved successfully" })
      setSettings((prev) => ({ ...prev, ...res.data }))
    } catch (error: any) {
      toast({ description: error.message || "Failed to save invoice settings", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading invoice generation settings" rows={4} />

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Invoice Generation</h1>
              <p className="text-muted-foreground">Edit invoice terms, included sections, payment channels, and contact slot details under the logo.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/settings/company")}>Edit Logo</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Invoice Settings"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Invoice Document Settings</CardTitle>
            <CardDescription>Configure the fields and payment details shown on generated invoices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="invoice-email">Invoice Email</Label>
                <Input
                  id="invoice-email"
                  type="email"
                  value={settings.invoiceEmail}
                  onChange={(e) => setSettings((prev) => ({ ...prev, invoiceEmail: e.target.value }))}
                  placeholder="billing@company.com"
                />
                <p className="text-xs text-muted-foreground">Used for invoice document contact and fallback communication details.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-phone">Office Phone (slot under logo)</Label>
                <Input
                  id="contact-phone"
                  value={settings.contactPhone}
                  onChange={(e) => setSettings((prev) => ({ ...prev, contactPhone: e.target.value }))}
                  placeholder="e.g. +254700000000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-email">Official Office Email (slot under logo)</Label>
                <Input
                  id="contact-email"
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="e.g. info@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-website">Website (slot under logo)</Label>
                <Input
                  id="contact-website"
                  value={settings.website}
                  onChange={(e) => setSettings((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="e.g. https://company.com"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="office-location">Office Location (slot under logo)</Label>
                <Input
                  id="office-location"
                  value={settings.officeLocation}
                  onChange={(e) => setSettings((prev) => ({ ...prev, officeLocation: e.target.value }))}
                  placeholder="e.g. Nairobi CBD, Westlands"
                />
                <p className="text-xs text-muted-foreground">This slot appears directly under the logo with phone, office email, website, location, VAT, and PIN.</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="second-location">Second Location</Label>
                <Input
                  id="second-location"
                  value={settings.secondLocation}
                  onChange={(e) => setSettings((prev) => ({ ...prev, secondLocation: e.target.value }))}
                  placeholder="e.g. Westlands Branch"
                />
                <p className="text-xs text-muted-foreground">Add this if the company operates from two locations.</p>
              </div>

              <div className="md:col-span-2 rounded-lg border p-4 bg-muted/20 space-y-3">
                <label className="flex items-center gap-3 text-sm">
                  <Checkbox
                    checked={settings.useBothLocations}
                    onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, useBothLocations: Boolean(checked) }))}
                  />
                  <span>Use both locations and hide the PIN slot on invoices</span>
                </label>
                <p className="text-xs text-muted-foreground">
                  When enabled, the invoice header will show a Both Locations line and the PIN line will be hidden.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vat-number">VAT Number (slot under logo)</Label>
                <Input
                  id="vat-number"
                  value={settings.vatNumber}
                  onChange={(e) => setSettings((prev) => ({ ...prev, vatNumber: e.target.value }))}
                  placeholder="e.g. VAT1234567"
                />
              </div>

              {!settings.useBothLocations && (
                <div className="space-y-2">
                  <Label htmlFor="pin-number">PIN Number (slot under logo)</Label>
                  <Input
                    id="pin-number"
                    value={settings.pinNumber}
                    onChange={(e) => setSettings((prev) => ({ ...prev, pinNumber: e.target.value }))}
                    placeholder="e.g. P051234567A"
                  />
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  rows={6}
                  value={settings.termsAndConditions}
                  onChange={(e) => setSettings((prev) => ({ ...prev, termsAndConditions: e.target.value }))}
                  placeholder="Write your invoice terms and conditions..."
                />
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-lg border p-4 bg-muted/30">
                {[
                  ["includeQuotationReference", "Show quotation reference"],
                  ["includeDeliveryNoteNumber", "Show delivery note number"],
                  ["includePreparedBy", "Show prepared by line"],
                  ["includeVat", "Show VAT breakdown"],
                  ["includePaymentChannels", "Show payment channels"],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={(settings as any)[key]}
                      onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, [key]: Boolean(checked) } as InvoiceSettings))}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">Payment Channels</h3>
                  <p className="text-sm text-muted-foreground">Add bank or M-Pesa payment options to print on invoices.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={addChannel} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Bank
                  </Button>
                  <Button variant="outline" onClick={() => addMpesaChannel("paybill")} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Mpesa
                  </Button>
                </div>
              </div>

              {settings.paymentChannels.map((channel, index) => (
                <Card key={index} className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>Channel {index + 1}</span>
                      <Button variant="ghost" size="sm" onClick={() => removeChannel(index)} className="gap-2 text-muted-foreground">
                        <Trash2 className="h-4 w-4" /> Remove
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Payment Type</Label>
                      <select
                        value={channel.paymentType}
                        onChange={(e) => setChannelType(index, e.target.value as "bank" | "mpesa")}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="bank">Bank</option>
                        <option value="mpesa">M-Pesa</option>
                      </select>
                    </div>

                    {channel.paymentType === "mpesa" ? (
                      <>
                        <div className="space-y-2 md:col-span-2">
                          <Label>M-Pesa Method</Label>
                          <select
                            value={channel.mpesaMode || "paybill"}
                            onChange={(e) =>
                              updateChannel(index, "mpesaMode" as keyof PaymentChannel, e.target.value as any)
                            }
                            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          >
                            <option value="paybill">Paybill</option>
                            <option value="till">Till Number</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <Label>Channel Name</Label>
                          <Input value={channel.channelName} onChange={(e) => updateChannel(index, "channelName", e.target.value)} placeholder="M-Pesa Paybill" />
                        </div>
                        <div className="space-y-2">
                          <Label>Network / Provider</Label>
                          <Input value={channel.bankName} onChange={(e) => updateChannel(index, "bankName", e.target.value)} placeholder="Safaricom M-Pesa" />
                        </div>

                        {channel.mpesaMode === "paybill" ? (
                          <>
                            <div className="space-y-2">
                              <Label>Paybill Number</Label>
                              <Input
                                value={channel.paybillNumber}
                                onChange={(e) => updateChannel(index, "paybillNumber", e.target.value)}
                                placeholder="516600"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Account No</Label>
                              <Input
                                value={channel.accountNumber}
                                onChange={(e) => updateChannel(index, "accountNumber", e.target.value)}
                                placeholder="149570"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2 md:col-span-2">
                            <Label>Till Number</Label>
                            <Input
                              value={channel.tillNumber}
                              onChange={(e) => updateChannel(index, "tillNumber", e.target.value)}
                              placeholder="Enter till number"
                            />
                          </div>
                        )}

                        <div className="space-y-2 md:col-span-2">
                          <Label>Notes</Label>
                          <Input value={channel.notes} onChange={(e) => updateChannel(index, "notes", e.target.value)} placeholder="Mpesa payment details" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label>Channel Name</Label>
                          <Input value={channel.channelName} onChange={(e) => updateChannel(index, "channelName", e.target.value)} placeholder="Bank transfer" />
                        </div>
                        <div className="space-y-2">
                          <Label>Bank Name</Label>
                          <Input value={channel.bankName} onChange={(e) => updateChannel(index, "bankName", e.target.value)} placeholder="Equity Bank" />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Name</Label>
                          <Input value={channel.accountName} onChange={(e) => updateChannel(index, "accountName", e.target.value)} placeholder="Aster Med Supplies Ltd" />
                        </div>
                        <div className="space-y-2">
                          <Label>Account Number</Label>
                          <Input value={channel.accountNumber} onChange={(e) => updateChannel(index, "accountNumber", e.target.value)} placeholder="0123456789" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Branch</Label>
                          <Input value={channel.branch} onChange={(e) => updateChannel(index, "branch", e.target.value)} placeholder="Nairobi CBD" />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Notes</Label>
                          <Input value={channel.notes} onChange={(e) => updateChannel(index, "notes", e.target.value)} placeholder="Optional bank transfer note" />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>Invoices use the company logo configured in branding.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-4 flex items-center justify-center min-h-32">
                {invoiceLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={invoiceLogo} alt="Invoice logo preview" className="max-h-24 max-w-full object-contain" />
                ) : (
                  <div className="text-center text-sm text-muted-foreground space-y-2">
                    <p>No logo configured yet.</p>
                    <p>Use Company Branding to upload one.</p>
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <p>Recommended logo size: 300 × 100 px or similar wide ratio, preferably transparent PNG or SVG.</p>
              </div>
              <Button variant="outline" className="w-full" onClick={() => router.push("/admin/settings/company")}>Open Company Branding</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                <p>Invoice email appears in the document header.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                <p>Terms and payment channels print on generated invoice PDFs.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                <p>Leave payment channels empty if you do not want them shown.</p>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-green-600" />
                <p>Use both locations when your business has two branches; the PIN slot will be hidden.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
