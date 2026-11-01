"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { api, companyApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { StatusBadge } from "@/components/admin/ui/status-badge"
import { TransferDocumentPreview } from "@/components/admin/stock/transfer-document-preview"
import { useAccountsBranding } from "@/components/accounts/use-accounts-branding"
import type { InvoiceDocumentSettings, TenantBranding } from "@/lib/stock-document-pdf"

export default function TransferDocumentPage() {
  const params = useParams()
  const pathname = usePathname()
  const id = String(params.id || "")
  const basePath = pathname.startsWith("/manager") ? "/manager/transfers" : "/admin/stock/transfers"
  const { toast } = useToast()
  const accountsBrand = useAccountsBranding()
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState("")
  const [doc, setDoc] = useState<any>(null)
  const [context, setContext] = useState<any>(null)
  const [receiveNotes, setReceiveNotes] = useState("")
  const [branding, setBranding] = useState<TenantBranding>()
  const [settings, setSettings] = useState<InvoiceDocumentSettings>()

  const load = async () => {
    try {
      const [docRes, ctxRes, brandRes, settingsRes] = await Promise.all([
        api.transfers.getById(id),
        api.transfers.context(),
        companyApi.getBranding().catch(() => null),
        companyApi.getInvoiceSettings().catch(() => null),
      ])
      setDoc(docRes.data)
      setContext(ctxRes.data)
      const brandData = brandRes?.data || settingsRes?.data?.branding || {}
      setBranding({
        name: brandData.name || ctxRes.data?.companyName,
        logo: brandData.logo || settingsRes?.data?.logoUrl,
        primaryColor: brandData.primaryColor || accountsBrand.primaryColor,
        secondaryColor: brandData.secondaryColor || accountsBrand.secondaryColor,
        email: brandData.email,
        phone: brandData.phone,
        website: brandData.website,
        city: brandData.city,
        country: brandData.country,
      })
      if (settingsRes?.data) setSettings(settingsRes.data)
    } catch (error: any) {
      toast({ description: error?.message || "Transfer not found", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) void load()
  }, [id])

  const canManage = (branchId: string) =>
    Boolean(context?.canManageAll || context?.managedBranchIds?.includes(String(branchId)))

  const run = async (action: string, fn: () => Promise<any>, success: string) => {
    setWorking(action)
    try {
      await fn()
      toast({ description: success })
      await load()
    } catch (error: any) {
      toast({ description: error?.message || "Action failed", variant: "destructive" })
    } finally {
      setWorking("")
    }
  }

  if (loading) return <PageLoadingSkeleton title="Transfer document" />
  if (!doc) {
    return (
      <div className="space-y-5 p-4 sm:p-6 max-w-5xl">
        <p className="text-sm text-muted-foreground">Transfer not found.</p>
        <Button asChild variant="outline">
          <Link href={basePath}>Back to transfers</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href={basePath}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Transfers
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{doc.documentNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {doc.fromBranchName} → {doc.toBranchName}
            {doc.kind ? ` · ${doc.kind}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          <StatusBadge status={doc.status} />
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={() => api.transfers.downloadPdf(doc._id, doc.documentNumber)}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
          {doc.status === "draft" && canManage(doc.fromBranchId) && (
            <Button
              size="sm"
              disabled={Boolean(working)}
              onClick={() =>
                run("issue", () => api.transfers.issue(doc._id), "Document issued. Goods are now in transit.")
              }
            >
              {working === "issue" ? "Issuing..." : "Issue & transfer"}
            </Button>
          )}
          {(doc.status === "draft" || doc.status === "in_transit") &&
            (canManage(doc.fromBranchId) || canManage(doc.toBranchId)) && (
              <Button
                size="sm"
                variant="outline"
                disabled={Boolean(working)}
                onClick={() => {
                  const reason = window.prompt("Cancel reason") || ""
                  void run("cancel", () => api.transfers.cancel(doc._id, reason), "Transfer cancelled")
                }}
              >
                Cancel
              </Button>
            )}
        </div>
      </div>

      <TransferDocumentPreview
        document={{
          ...doc,
          createdAt: doc.issuedAt || doc.createdAt,
        }}
        branding={branding}
        settings={settings}
      />

      {doc.status === "in_transit" && canManage(doc.toBranchId) && (
        <div className="mx-auto max-w-[820px] space-y-3 rounded-lg border bg-white p-4 shadow-sm">
          <p className="text-sm font-medium">Receive this transfer</p>
          <Textarea
            value={receiveNotes}
            onChange={(e) => setReceiveNotes(e.target.value)}
            placeholder="Receipt notes (condition, shortages...)"
          />
          <Button
            disabled={Boolean(working)}
            onClick={() =>
              run(
                "receive",
                () => api.transfers.receive(doc._id, receiveNotes),
                "Received. Inventory, assets, and staff have been moved.",
              )
            }
          >
            {working === "receive" ? "Receiving..." : "Receive & complete transfer"}
          </Button>
        </div>
      )}
    </div>
  )
}
