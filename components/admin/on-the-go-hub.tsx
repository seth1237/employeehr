"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { FileText, Receipt, Users, Package, Settings, Plus, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { stockApi } from "@/lib/api"
import { getUser } from "@/lib/auth"

type QuoteRow = {
  _id: string
  quotationNumber?: string
  status?: string
  client?: { name?: string }
  subTotal?: number
  createdAt?: string
}

type InvoiceRow = {
  _id: string
  invoiceNumber?: string
  status?: string
  client?: { name?: string }
  subTotal?: number
  createdAt?: string
}

const actions = [
  {
    href: "/admin/stock/quotations/new",
    title: "New quote",
    description: "Client, lines, price, PDF, then invoice.",
    icon: Plus,
    primary: true,
  },
  {
    href: "/admin/stock/quotations",
    title: "Quotes",
    description: "Open, edit, or convert existing quotations.",
    icon: FileText,
  },
  {
    href: "/admin/stock/invoices",
    title: "Invoices",
    description: "Issue and follow up on invoices.",
    icon: Receipt,
  },
  {
    href: "/admin/clients/clients-list",
    title: "Clients",
    description: "Keep the people you bill in one list.",
    icon: Users,
  },
  {
    href: "/admin/stock/add-inventory",
    title: "Products",
    description: "Add items and services you quote.",
    icon: Package,
  },
  {
    href: "/admin/settings/company",
    title: "Settings",
    description: "Logo, contacts, and document details.",
    icon: Settings,
  },
]

export function OnTheGoHub() {
  const user = getUser()
  const firstName = String(user?.firstName || "there").trim()
  const [quotes, setQuotes] = useState<QuoteRow[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [quoteRes, invoiceRes] = await Promise.all([
          stockApi.getQuotations(1, 6),
          stockApi.getInvoices(),
        ])
        if (cancelled) return
        const quoteList = Array.isArray(quoteRes?.data)
          ? quoteRes.data
          : Array.isArray((quoteRes as any)?.data?.data)
            ? (quoteRes as any).data.data
            : []
        const invoiceList = Array.isArray(invoiceRes?.data)
          ? invoiceRes.data
          : Array.isArray((invoiceRes as any)?.data?.data)
            ? (invoiceRes as any).data.data
            : []
        setQuotes(quoteList.slice(0, 6))
        setInvoices(invoiceList.slice(0, 6))
      } catch {
        if (!cancelled) {
          setQuotes([])
          setInvoices([])
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-5 sm:p-6 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-sky-700">
            On the Go
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Hi {firstName}, keep it simple.
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Create a quote in a few minutes: pick a client, add lines, send the
            PDF, and convert it to an invoice.
          </p>
          <Button asChild className="mt-4">
            <Link href="/admin/stock/quotations/new">
              <Plus className="h-4 w-4" />
              Create quotation
            </Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`rounded-xl border bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow ${
                  action.primary ? "border-sky-200" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{action.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                  </div>
                  <Icon className="h-5 w-5 text-sky-700" />
                </div>
              </Link>
            )
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Recent quotes</CardTitle>
              <Link
                href="/admin/stock/quotations"
                className="inline-flex items-center gap-1 text-xs text-sky-700"
              >
                All quotes <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {quotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No quotes yet. Create one to get started.
                </p>
              ) : (
                quotes.map((quote) => (
                  <Link
                    key={quote._id}
                    href={`/admin/stock/quotations/${quote._id}`}
                    className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <span className="truncate">
                      {quote.quotationNumber || "Quote"} · {quote.client?.name || "Client"}
                    </span>
                    <span className="ml-3 shrink-0 text-[11px] uppercase text-slate-500">
                      {quote.status || "draft"}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Recent invoices</CardTitle>
              <Link
                href="/admin/stock/invoices"
                className="inline-flex items-center gap-1 text-xs text-sky-700"
              >
                All invoices <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Convert a quote to create the first invoice.
                </p>
              ) : (
                invoices.map((invoice) => (
                  <Link
                    key={invoice._id}
                    href={`/admin/stock/invoices/${invoice._id}`}
                    className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <span className="truncate">
                      {invoice.invoiceNumber || "Invoice"} · {invoice.client?.name || "Client"}
                    </span>
                    <span className="ml-3 shrink-0 text-[11px] uppercase text-slate-500">
                      {invoice.status || "draft"}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
