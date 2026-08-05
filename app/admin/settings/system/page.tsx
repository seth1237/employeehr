"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { getUser } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { useRouter } from "next/navigation"
import { Settings, ShieldCheck, FileText, MapPin, Globe2, Download, Copy, Mail } from "lucide-react"

const DEPLOYED_API_URL = "https://backend.codewithseth.co.ke"

export default function SystemSettingsPage() {
  const router = useRouter()
  const apiBaseUrl = DEPLOYED_API_URL || API_URL
  const user = getUser()
  const organizationId = user?.org_id || user?.organizationId || user?.companyId || ""
  const [bypass, setBypass] = useState<boolean | null>(null)

  const loadStockSettings = async () => {
    try {
      const token = undefined
      const res = await fetch(`${API_URL}/api/company/stock-settings`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || "Failed to load settings")
      setBypass(Boolean(json.data?.stockSettings?.bypassWebsiteQuotationApproval))
    } catch (err) {
      // ignore
    }
  }

  useEffect(() => {
    loadStockSettings()
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg"><Settings className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Settings</h1>
            <p className="text-muted-foreground">High-level system configuration</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push("/admin/settings/company")}>Company Branding</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Use Company Branding to control primary/secondary colors and logo. These apply across all users in your organization.</p>
            <Button className="mt-2" onClick={() => router.push("/admin/settings/company")}>Go to Company Branding</Button>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">Email / SMTP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Configure your company domain email for notifications and invites.
              If unset or unverified, the platform system email is used.
            </p>
            <Button onClick={() => router.push("/admin/settings/system/email")} className="gap-2">
              <Mail className="w-4 h-4" />
              Manage Email Settings
            </Button>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="text-base">Invoice Generation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Configure invoice email, terms and conditions, payment channels, and the sections shown on invoice PDFs.</p>
            <Button onClick={() => router.push("/admin/settings/system/invoice-generation")} className="gap-2">
              <FileText className="w-4 h-4" />
              Manage Invoice Settings
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Page Access Control</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Assign which admin page categories are visible for HR, Managers, and Employees.</p>
            <Button onClick={() => router.push("/admin/settings/system/page-access")} className="gap-2">
              <ShieldCheck className="w-4 h-4" />
              Manage Page Access
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Branch Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Create and manage multiple office/branch locations. Assign branch managers and track stock, analytics, and attendance per branch.</p>
            <Button onClick={() => router.push("/admin/settings/system/branches")} className="gap-2">
              <MapPin className="w-4 h-4" />
              Manage Branches
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe2 className="w-4 h-4" />
              Website Integration API
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>Use this ERP endpoint base URL to connect client websites to products, quotation requests, and invoice downloads.</p>

            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <p className="font-medium text-foreground">API base URL</p>
              <code className="block break-all text-xs">{apiBaseUrl}</code>
              <p className="text-xs">Send the tenant/company <span className="font-medium text-foreground">orgId</span> with every public request.</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border p-3">
                <p className="font-medium text-foreground">Public product catalog</p>
                <code className="mt-1 block break-all text-xs">GET {apiBaseUrl}/api/stock/public/products?orgId=your-org-id</code>
              </div>
              <div className="rounded-lg border p-3">
                <p className="font-medium text-foreground">Create quotation request</p>
                <code className="mt-1 block break-all text-xs">POST {apiBaseUrl}/api/stock/public/quote-requests</code>
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="font-medium text-foreground">Generate invoice PDF</p>
              <code className="mt-1 block break-all text-xs">POST {apiBaseUrl}/api/stock/public/quotations/{'{quotationId}'}/request-invoice?orgId=your-org-id</code>
              <p className="mt-2 text-xs">This converts the quotation to an invoice and returns the PDF for download.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-lg border bg-background px-3 py-2 min-w-[220px]">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Organization ID</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="text-xs break-all text-foreground">{organizationId || "Not available"}</code>
                  {organizationId ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigator.clipboard?.writeText(organizationId)}
                      aria-label="Copy organization ID"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/PUBLIC_API_GUIDE.md" download className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  <Download className="w-4 h-4" />
                  API Guide for Developers
                </a>
                <a href="/documentation.md" download className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <Download className="w-4 h-4" />
                  Quick Reference
                </a>
              </div>
            </div>
            <div className="mt-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Bypass Website Quotation Approval</p>
                  <p className="text-xs text-muted-foreground">Enable to auto-approve/convert website quotation requests</p>
                </div>
                <div>
                  <Switch checked={!!bypass} onCheckedChange={async (val) => {
                    try {
                      const token = undefined
                      const res = await fetch(`${API_URL}/api/company/stock-settings`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                        body: JSON.stringify({ bypassWebsiteQuotationApproval: Boolean(val) }),
                      })
                      const json = await res.json()
                      if (!res.ok) throw new Error(json.message || "Failed to update")
                      setBypass(Boolean(json.data?.stockSettings?.bypassWebsiteQuotationApproval))
                    } catch (err) {
                      // ignore errors in UI
                    }
                  }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Defaults (Coming soon)</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            - Default landing pages per role<br />
            - Locale and timezone<br />
            - Email template overrides
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
