"use client"

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { getToken, getUser } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { stockApi } from "@/lib/api"
import { finishDataLoad, startDataLoad } from "@/lib/silent-load"
import { useToast } from "@/hooks/use-toast"
import {
  ErrorState,
  PageLoadingSkeleton,
} from "@/components/admin/ui/page-states"
import { StockDocumentActions } from "@/components/admin/stock/document-actions"
import type { StockDocumentData } from "@/components/admin/stock/document-preview"

type Quotation = {
  _id: string
  quotationNumber: string
  client: {
    name: string
    number?: string
    location?: string
    contactPerson?: string
  }
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
  createdByName?: string
  ownerUserName?: string
  branchName?: string
}

type FollowUp = {
  _id: string
  note: string
  callMade?: boolean
  outcome?: string
  createdAt?: string
}

export default function QuotationDetailPage({
  params,
}: {
  params: Promise<{ quotationId: string }>
}) {
  const { quotationId } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const user = getUser()
  const canApprove = ["company_admin", "hr", "admin", "super_admin"].includes(String(user?.role || ""))

  const [quotation, setQuotation] = useState<Quotation | null>(null)
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = startDataLoad(opts, setLoading, setRefreshing)
    if (!silent) setError(null)
    try {
      const [qtRes, fuRes] = await Promise.all([
        stockApi.getQuotationById(quotationId),
        stockApi.getQuotationFollowUps(quotationId).catch(() => ({ data: [] })),
      ])
      if (!qtRes.success || !qtRes.data) {
        if (!silent) {
          setError(qtRes.message || "Quotation not found")
          setQuotation(null)
        }
        return
      }
      setQuotation(qtRes.data as Quotation)
      setFollowUps((fuRes?.data as FollowUp[]) || [])
    } catch (e) {
      if (!silent) {
        setError(e instanceof Error ? e.message : "Failed to load quotation")
      }
    } finally {
      finishDataLoad(silent, setLoading, setRefreshing)
    }
  }, [quotationId])

  useEffect(() => {
    load()
  }, [load])

  const authHeaders = () => {
    const token = getToken()
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    }
  }

  const approveOrReject = async (action: "approve" | "reject") => {
    setBusy(true)
    try {
      const res = await fetch(
        `${API_URL}/api/stock/quotations/${quotationId}/${action}`,
        { method: "POST", headers: authHeaders() },
      )
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || `${action} failed`)
      }
      toast({ title: action === "approve" ? "Approved" : "Rejected" })
      load({ silent: true })
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Action failed",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  const addFollowUp = async () => {
    if (!note.trim()) return
    setBusy(true)
    try {
      await stockApi.addQuotationFollowUp(quotationId, {
        note: note.trim(),
        callMade: true,
      })
      setNote("")
      toast({ title: "Follow-up saved" })
      load({ silent: true })
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to save",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <PageLoadingSkeleton title="Loading quotation" rows={4} />
  }

  if (error || !quotation) {
    return (
      <ErrorState
        title="We couldn't load this quotation"
        message={error || "Quotation not found"}
        onRetry={() => load()}
        backHref="/admin/stock/quotations"
        backLabel="Back to quotations"
      />
    )
  }

  const documentData: StockDocumentData = {
    kind: "quotation",
    number: quotation.quotationNumber,
    createdAt: quotation.createdAt,
    client: {
      name: quotation.client.name,
      number: quotation.client.number || "",
      location: quotation.client.location || "",
    },
    items: (quotation.items || []).map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      description: item.description,
    })),
    subTotal: quotation.subTotal,
    status: quotation.status,
    preparedBy: quotation.createdByName || quotation.ownerUserName,
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
            <Link href="/admin/stock/quotations">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Quotations
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {quotation.quotationNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {quotation.client.name}
            {quotation.client.number ? ` · ${quotation.client.number}` : ""}
            {quotation.client.location ? ` · ${quotation.client.location}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-start">
          <Badge variant="outline" className="capitalize">
            {quotation.status.replaceAll("_", " ")}
          </Badge>
          <StockDocumentActions
            kind="quotation"
            documentId={quotation._id}
            document={documentData}
            onConverted={(invoiceId) =>
              router.push(`/admin/stock/invoices/${invoiceId}`)
            }
          />
          {quotation.status === "draft" && (
            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <Link href={`/admin/stock/quotations?edit=${quotation._id}`}>
                Edit on list
              </Link>
            </Button>
          )}
          {quotation.status === "pending_approval" && canApprove && (
            <>
              <Button
                size="sm"
                onClick={() => approveOrReject("approve")}
                disabled={busy}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => approveOrReject("reject")}
                disabled={busy}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">
              KES{" "}
              {Number(
                quotation.grandTotal ??
                  Number(quotation.subTotal || 0) + Number(quotation.taxTotal || 0),
              ).toLocaleString("en-KE", {
                minimumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Subtotal{" "}
              {Number(quotation.subTotal || 0).toLocaleString("en-KE", {
                minimumFractionDigits: 2,
              })}{" "}
              · Tax{" "}
              {Number(quotation.taxTotal || 0).toLocaleString("en-KE", {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {quotation.ownerUserName || quotation.createdByName || "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {quotation.branchName || "No branch"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {quotation.createdAt
                ? new Date(quotation.createdAt).toLocaleString("en-KE")
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Line items
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">#</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 font-medium">Qty</th>
                  <th className="px-4 py-2 font-medium">Unit price</th>
                  <th className="px-4 py-2 font-medium">Tax</th>
                  <th className="px-4 py-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {(quotation.items || []).map((item: any, idx: number) => {
                  const taxAmount = Number(item.taxAmount || 0);
                  const total = Number(
                    item.totalAfterTax !== undefined
                      ? item.totalAfterTax
                      : Number(item.lineTotal || 0) + taxAmount,
                  );
                  return (
                  <tr key={`${item.productName}-${idx}`} className="border-t">
                    <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
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
                    <td className="px-4 py-2">
                      KES {taxAmount.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      KES {total.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Follow-ups</CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder="Log a call or follow-up note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <Button size="sm" onClick={addFollowUp} disabled={busy || !note.trim()}>
              Save follow-up
            </Button>
          </div>
          <div className="divide-y border rounded-md">
            {followUps.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No follow-ups yet.</p>
            )}
            {followUps.map((fu) => (
              <div key={fu._id} className="p-3 text-sm">
                <p>{fu.note}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {fu.createdAt
                    ? new Date(fu.createdAt).toLocaleString("en-KE")
                    : ""}
                  {fu.outcome ? ` · ${fu.outcome}` : ""}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
