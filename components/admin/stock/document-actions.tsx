"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Copy,
  Download,
  Eye,
  Mail,
  Printer,
  Receipt,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import API_URL from "@/lib/apiBase"
import { getToken, getUser } from "@/lib/auth"
import { stockApi } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type {
  InvoiceDocumentSettings,
  TenantBranding,
} from "@/lib/stock-document-pdf"
import {
  StockDocumentPreview,
  type StockDocumentData,
} from "@/components/admin/stock/document-preview"

type DocumentActionsProps = {
  kind: "invoice" | "quotation"
  documentId: string
  document: StockDocumentData
  onConverted?: (invoiceId: string) => void
}

export function StockDocumentActions({
  kind,
  documentId,
  document,
  onConverted,
}: DocumentActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const user = getUser()
  const canConvert =
    kind === "quotation" &&
    document.status === "draft" &&
    ["company_admin", "hr"].includes(String(user?.role || ""))

  const [branding, setBranding] = useState<TenantBranding>({})
  const [invoiceSettings, setInvoiceSettings] =
    useState<InvoiceDocumentSettings>({})
  const [previewOpen, setPreviewOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailTo, setEmailTo] = useState("")
  const [busy, setBusy] = useState<string | null>(null)

  const authHeaders = useCallback(() => {
    const token = getToken()
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [brandingRes, settingsRes] = await Promise.all([
          fetch(`${API_URL}/api/company/branding`, { headers: authHeaders() }),
          fetch(`${API_URL}/api/company/invoice-settings`, {
            headers: authHeaders(),
          }),
        ])
        if (cancelled) return
        if (brandingRes.ok) {
          const data = await brandingRes.json()
          setBranding(data.data || {})
        }
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          setInvoiceSettings(data.data || {})
        }
      } catch {
        // Preview still works with defaults
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authHeaders])

  const downloadPdf = async () => {
    setBusy("download")
    try {
      const { generateInvoicePdf, generateQuotationPdf } = await import(
        "@/lib/stock-document-pdf"
      )
      const common = {
        createdAt: document.createdAt || new Date().toISOString(),
        client: {
          name: document.client.name,
          number: document.client.number || "",
          location: document.client.location || "",
        },
        items: document.items,
        subTotal: document.subTotal,
        branding,
        invoiceSettings,
        preparedBy: document.preparedBy || [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "System",
        autoSave: true,
      }

      if (kind === "invoice") {
        generateInvoicePdf({
          ...common,
          invoiceNumber: document.number,
          deliveryNoteNumber: document.deliveryNoteNumber || "",
          quotationNumber: document.quotationNumber || "",
          watermarkText:
            document.status === "paid"
              ? "PAID"
              : document.status === "cancelled"
                ? "CANCELLED"
                : undefined,
        })
      } else {
        generateQuotationPdf({
          ...common,
          quotationNumber: document.number,
        })
      }
      toast({ title: "PDF downloaded" })
    } catch (e) {
      toast({
        title: "Download failed",
        description: e instanceof Error ? e.message : "Could not generate PDF",
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }

  const printDocument = () => {
    setPreviewOpen(true)
    setTimeout(() => window.print(), 300)
  }

  const sendEmail = async () => {
    if (!emailTo.trim()) return
    setBusy("email")
    try {
      const endpoint =
        kind === "invoice"
          ? `/api/stock/invoices/${documentId}/email`
          : `/api/stock/quotations/${documentId}/email`
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ to: emailTo.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to send email")
      }
      toast({ title: "Email sent", description: `Sent to ${emailTo.trim()}` })
      setEmailOpen(false)
    } catch (e) {
      toast({
        title: "Email failed",
        description: e instanceof Error ? e.message : "Could not send email",
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }

  const convertToInvoice = async () => {
    setBusy("convert")
    try {
      const res = await stockApi.convertQuotation(documentId)
      if (!res.success) throw new Error(res.message || "Convert failed")
      const invoiceId = (res.data as { _id?: string })?._id
      const invoiceNumber = (res.data as { invoiceNumber?: string })?.invoiceNumber
      toast({
        title: "Invoice created",
        description: invoiceNumber
          ? `${invoiceNumber} is ready — open it to preview, print, or email.`
          : "Quotation converted successfully.",
      })
      if (invoiceId) {
        onConverted?.(invoiceId)
        router.push(`/admin/stock/invoices/${invoiceId}`)
      }
    } catch (e) {
      toast({
        title: "Conversion failed",
        description: e instanceof Error ? e.message : "Could not convert",
        variant: "destructive",
      })
    } finally {
      setBusy(null)
    }
  }

  const duplicateDocument = () => {
    if (kind === "quotation") {
      router.push("/admin/stock/quotations?action=new")
      toast({
        title: "Create new quotation",
        description: "Use the quotation form to duplicate items for a new client.",
      })
      return
    }
    toast({
      title: "Duplicate invoice",
      description: "Create a new invoice from quotations or the sales workflow.",
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2" data-tour="document-actions">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPreviewOpen(true)}
          disabled={!!busy}
          aria-label={`Preview ${kind}`}
        >
          <Eye className="h-4 w-4 mr-1" aria-hidden />
          Preview
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={printDocument}
          disabled={!!busy}
          aria-label={`Print ${kind}`}
        >
          <Printer className="h-4 w-4 mr-1" aria-hidden />
          Print
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEmailOpen(true)}
          disabled={!!busy}
          aria-label={`Email ${kind}`}
        >
          <Mail className="h-4 w-4 mr-1" aria-hidden />
          Email
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadPdf}
          disabled={busy === "download"}
          aria-label={`Download ${kind} PDF`}
        >
          <Download className="h-4 w-4 mr-1" aria-hidden />
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={duplicateDocument}
          disabled={!!busy}
          aria-label={`Duplicate ${kind}`}
        >
          <Copy className="h-4 w-4 mr-1" aria-hidden />
          Duplicate
        </Button>
        {canConvert && (
          <Button
            size="sm"
            onClick={convertToInvoice}
            disabled={busy === "convert"}
            data-tour="convert-invoice"
            aria-label="Convert quotation to invoice"
          >
            <Receipt className="h-4 w-4 mr-1" aria-hidden />
            Convert to invoice
          </Button>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:overflow-visible">
          <DialogHeader className="print:hidden">
            <DialogTitle>
              {kind === "invoice" ? "Invoice" : "Quotation"} preview
            </DialogTitle>
          </DialogHeader>
          <StockDocumentPreview
            document={document}
            branding={branding}
            settings={invoiceSettings}
          />
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button onClick={printDocument}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Email {kind === "invoice" ? "invoice" : "quotation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="doc-email-to">Recipient email</Label>
            <Input
              id="doc-email-to"
              type="email"
              placeholder="client@example.com"
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A PDF copy of {document.number} will be attached using your company email settings.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendEmail} disabled={busy === "email" || !emailTo.trim()}>
              Send email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
