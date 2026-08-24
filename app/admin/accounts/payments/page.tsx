"use client"

import { useEffect, useMemo, useState } from "react"
import { stockApi } from "@/lib/api"
import { runDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface InvoicePayment {
  _id: string
  amount: number
  paymentMethod: string
  reference?: string
  note?: string
  paidAt: string
  createdAt: string
}

interface PaymentInvoiceRow {
  _id: string
  invoiceNumber: string
  createdAt: string
  subTotal: number
  status: "issued" | "paid" | "cancelled"
  client: { name: string; number: string; location: string }
  paidAmount: number
  balanceRemaining: number
  paymentCount: number
  lastPayment: InvoicePayment | null
  payments: InvoicePayment[]
  nextPaymentDate?: string
}

const PAYMENT_METHODS = ["cash", "mpesa", "bank", "cheque", "card", "other"]

export default function AccountsPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<PaymentInvoiceRow[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("")
  const [form, setForm] = useState({
    amount: "",
    paymentMethod: "mpesa",
    reference: "",
    note: "",
    paidAt: "",
  })

  const loadData = async (opts?: SilentLoadOptions) => {
    try {
      await runDataLoad(
        setLoading,
        async () => {
          const response = await stockApi.getAccountsPayments()
          const data = response.data || []
          setRows(data)
          if (!selectedInvoiceId && data.length > 0) setSelectedInvoiceId(data[0]._id)
        },
        opts,
        setRefreshing,
      )
    } catch (error: any) {
      window.alert(error?.message || "Failed to load payment management")
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) =>
      [
        row.invoiceNumber,
        row.client?.name,
        row.client?.number,
        row.client?.location,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    )
  }, [rows, search])

  const selectedInvoice = useMemo(
    () => rows.find((row) => row._id === selectedInvoiceId) || null,
    [rows, selectedInvoiceId],
  )

  const stats = useMemo(() => ({
    count: rows.length,
    outstanding: rows.reduce((s, r) => s + Number(r.balanceRemaining || 0), 0),
    collected: rows.reduce((s, r) => s + Number(r.paidAmount || 0), 0),
  }), [rows])

  const submitPayment = async () => {
    if (!selectedInvoice) return

    const amountValue = Number(form.amount)
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      window.alert("Enter a valid payment amount")
      return
    }

    try {
      setSaving(true)
      const response = await stockApi.addInvoicePayment(selectedInvoice._id, {
        amount: amountValue,
        paymentMethod: form.paymentMethod,
        reference: form.reference.trim() || undefined,
        note: form.note.trim() || undefined,
        paidAt: form.paidAt ? new Date(form.paidAt).toISOString() : undefined,
      })

      setForm({ amount: "", paymentMethod: "mpesa", reference: "", note: "", paidAt: "" })
      await loadData({ silent: true })
      window.alert(response.message || "Payment recorded")
    } catch (error: any) {
      window.alert(error?.message || "Failed to save payment")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading payment management" rows={8} />

  return (
    <FinanceDocumentShell
      eyebrow="Sales & Receivables"
      title="Customer Payments"
      description="Record payments against outstanding sales invoices with full payment history."
      backHref="/admin/accounts/receivables"
      onRefresh={() => loadData({ silent: true })}
      refreshing={refreshing}
      kpis={[
        { label: "Open Invoices", value: stats.count },
        { label: "Outstanding", value: stats.outstanding, prefix: "KES", accent: "danger" },
        { label: "Collected (open set)", value: stats.collected, prefix: "KES", accent: "success" },
        { label: "Selected Balance", value: selectedInvoice?.balanceRemaining || 0, prefix: "KES" },
      ]}
      toolbar={
        <Input
          placeholder="Search by invoice, client, number..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="h-9 max-w-md"
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <FinanceTableCard title="Sales Invoices">
          <div className="max-h-[560px] overflow-auto space-y-2 p-3">
              {filteredRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices found.</p>
              ) : (
                filteredRows.map((row) => (
                  <button
                    key={row._id}
                    onClick={() => setSelectedInvoiceId(row._id)}
                    className={`w-full rounded border p-3 text-left transition hover:bg-muted/50 ${
                      selectedInvoiceId === row._id ? "border-primary bg-muted/40" : "border-border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{row.invoiceNumber}</div>
                      <div className="text-xs text-muted-foreground capitalize">{row.status}</div>
                    </div>
                    <div className="text-sm mt-1">{row.client?.name}</div>
                    <div className="text-xs text-muted-foreground">Total: {row.subTotal.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">Paid: {row.paidAmount.toFixed(2)}</div>
                    <div className="text-xs font-medium text-primary">Balance: {row.balanceRemaining.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Latest: {row.lastPayment ? `${new Date(row.lastPayment.paidAt).toLocaleString()} · ${row.lastPayment.amount.toFixed(2)}` : "No payments yet"}
                    </div>
                  </button>
                ))
              )}
            </div>
        </FinanceTableCard>

        <FinanceTableCard title="Record Payment">
          <div className="space-y-4 p-4">
            {!selectedInvoice ? (
              <p className="text-sm text-muted-foreground">Select an invoice to continue.</p>
            ) : (
              <>
                <div className="rounded border p-3 bg-muted/30 text-sm space-y-1">
                  <p><span className="font-medium">Invoice:</span> {selectedInvoice.invoiceNumber}</p>
                  <p><span className="font-medium">Client:</span> {selectedInvoice.client?.name}</p>
                  <p><span className="font-medium">Total:</span> {selectedInvoice.subTotal.toFixed(2)}</p>
                  <p><span className="font-medium">Paid:</span> {selectedInvoice.paidAmount.toFixed(2)}</p>
                  <p><span className="font-medium">Balance:</span> {selectedInvoice.balanceRemaining.toFixed(2)}</p>
                  {selectedInvoice.balanceRemaining > 0 && (
                    <p>
                      <span className="font-medium">Next payment date:</span>{' '}
                      {selectedInvoice.nextPaymentDate ? new Date(selectedInvoice.nextPaymentDate).toLocaleString() : 'Not scheduled'}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                      placeholder="1000"
                    />
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <select
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.paymentMethod}
                      onChange={(event) => setForm((prev) => ({ ...prev, paymentMethod: event.target.value }))}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>{method.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Reference (optional)</Label>
                    <Input
                      value={form.reference}
                      onChange={(event) => setForm((prev) => ({ ...prev, reference: event.target.value }))}
                      placeholder="MPE123ABC"
                    />
                  </div>
                  <div>
                    <Label>Paid At (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={form.paidAt}
                      onChange={(event) => setForm((prev) => ({ ...prev, paidAt: event.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <Label>Note (optional)</Label>
                  <Textarea
                    rows={3}
                    value={form.note}
                    onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                    placeholder="Payment notes"
                  />
                </div>

                <Button onClick={submitPayment} disabled={saving || selectedInvoice.balanceRemaining <= 0}>
                  {saving ? "Saving..." : selectedInvoice.balanceRemaining <= 0 ? "Invoice Fully Paid" : "Save Payment"}
                </Button>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Payment History</h3>
                  <div className="max-h-56 overflow-auto rounded border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 px-2">Date</th>
                          <th className="py-2 px-2">Method</th>
                          <th className="py-2 px-2">Amount</th>
                          <th className="py-2 px-2">Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedInvoice.payments || []).length === 0 ? (
                          <tr>
                            <td className="py-2 px-2" colSpan={4}>No payments yet.</td>
                          </tr>
                        ) : (
                          selectedInvoice.payments.map((payment) => (
                            <tr key={payment._id} className="border-b">
                              <td className="py-2 px-2">{new Date(payment.paidAt || payment.createdAt).toLocaleString()}</td>
                              <td className="py-2 px-2 uppercase">{payment.paymentMethod}</td>
                              <td className="py-2 px-2">{Number(payment.amount || 0).toFixed(2)}</td>
                              <td className="py-2 px-2">{payment.reference || "-"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </FinanceTableCard>
      </div>
    </FinanceDocumentShell>
  )
}
