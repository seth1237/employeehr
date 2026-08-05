"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FileText, Package, Truck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { stockApi } from "@/lib/api"
import {
  ErrorState,
  PageLoadingSkeleton,
} from "@/components/admin/ui/page-states"
import { StockDocumentActions } from "@/components/admin/stock/document-actions"
import type { StockDocumentData } from "@/components/admin/stock/document-preview"

type Invoice = {
  _id: string
  invoiceNumber: string
  deliveryNoteNumber?: string
  quotationId?: string
  quotationNumber?: string
  client: { name: string; number?: string; location?: string }
  items: Array<{
    productName: string
    quantity: number
    unitPrice: number
    lineTotal: number
    description?: string
  }>
  subTotal: number
  status: string
  createdAt?: string
  dispatch?: {
    status?: string
    packingCompleted?: boolean
  }
  etims?: {
    status?: string
    responseMessage?: string
  }
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const { invoiceId } = use(params)
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [lifecycle, setLifecycle] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [invRes, lifeRes] = await Promise.all([
        stockApi.getInvoiceById(invoiceId),
        stockApi.getInvoiceLifecycle(invoiceId).catch(() => null),
      ])
      if (!invRes.success || !invRes.data) {
        setError(invRes.message || "Invoice not found")
        setInvoice(null)
        return
      }
      setInvoice(invRes.data as Invoice)
      setLifecycle(lifeRes?.data || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoice")
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <PageLoadingSkeleton title="Loading invoice" rows={4} />
  }

  if (error || !invoice) {
    return (
      <ErrorState
        title="We couldn't load this invoice"
        message={error || "Invoice not found"}
        onRetry={load}
        backHref="/admin/stock/invoices"
        backLabel="Back to invoices"
      />
    )
  }

  const paymentSummary = lifecycle?.paymentSummary
  const steps = Array.isArray(lifecycle?.steps) ? lifecycle.steps : []

  const documentData: StockDocumentData = {
    kind: "invoice",
    number: invoice.invoiceNumber,
    deliveryNoteNumber: invoice.deliveryNoteNumber,
    quotationNumber: invoice.quotationNumber,
    createdAt: invoice.createdAt,
    client: {
      name: invoice.client.name,
      number: invoice.client.number || "",
      location: invoice.client.location || "",
    },
    items: (invoice.items || []).map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      description: item.description,
    })),
    subTotal: invoice.subTotal,
    status: invoice.status,
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href="/admin/stock/invoices">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Invoices
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {invoice.invoiceNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {invoice.client.name}
            {invoice.client.number ? ` · ${invoice.client.number}` : ""}
            {invoice.client.location ? ` · ${invoice.client.location}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          <Badge variant="outline" className="capitalize">
            {invoice.status}
          </Badge>
          {invoice.dispatch?.status && (
            <Badge variant="secondary" className="capitalize">
              Dispatch: {invoice.dispatch.status.replaceAll("_", " ")}
            </Badge>
          )}
          <StockDocumentActions
            kind="invoice"
            documentId={invoice._id}
            document={documentData}
          />
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/stock/dispatch/${invoice._id}`}>
              <Truck className="h-4 w-4 mr-1" />
              Dispatch
            </Link>
          </Button>
          {invoice.quotationId && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/stock/quotations/${invoice.quotationId}`}>
                <FileText className="h-4 w-4 mr-1" />
                Quotation
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              KES{" "}
              {Number(invoice.subTotal || 0).toLocaleString("en-KE", {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {paymentSummary
                ? `KES ${Number(paymentSummary.paidAmount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              {paymentSummary
                ? `KES ${Number(paymentSummary.balanceRemaining || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Line items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 font-medium">Qty</th>
                  <th className="px-4 py-2 font-medium">Unit</th>
                  <th className="px-4 py-2 font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                {(invoice.items || []).map((item, idx) => (
                  <tr key={`${item.productName}-${idx}`} className="border-t">
                    <td className="px-4 py-2">
                      <div className="font-medium">{item.productName}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">{item.quantity}</td>
                    <td className="px-4 py-2">
                      KES {Number(item.unitPrice || 0).toLocaleString("en-KE")}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      KES {Number(item.lineTotal || 0).toLocaleString("en-KE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {steps.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Lifecycle</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {steps.map((step: any, idx: number) => (
              <div
                key={step.key || step.label || idx}
                className="flex items-start gap-3 text-sm"
              >
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${
                    step.done || step.completed
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/30"
                  }`}
                />
                <div>
                  <p className="font-medium">{step.label || step.title || step.key}</p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Document info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-muted-foreground">
            <p>
              DN:{" "}
              <span className="text-foreground">
                {invoice.deliveryNoteNumber || "—"}
              </span>
            </p>
            <p>
              Quotation:{" "}
              <span className="text-foreground">
                {invoice.quotationNumber || "—"}
              </span>
            </p>
            <p>
              Created:{" "}
              <span className="text-foreground">
                {invoice.createdAt
                  ? new Date(invoice.createdAt).toLocaleString("en-KE")
                  : "—"}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">eTIMS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-muted-foreground">
            <p className="capitalize">
              Status:{" "}
              <span className="text-foreground">
                {(invoice.etims?.status || "not_posted").replaceAll("_", " ")}
              </span>
            </p>
            {invoice.etims?.responseMessage && (
              <p className="text-xs">{invoice.etims.responseMessage}</p>
            )}
            <Button asChild variant="outline" size="sm" className="mt-2">
              <Link href="/admin/accounts/posts">Open OSCU posts</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
