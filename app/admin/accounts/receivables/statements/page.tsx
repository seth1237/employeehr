"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { stockApi } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

export default function CustomerStatementsPage() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<any[]>([])
  const [selectedKey, setSelectedKey] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [statement, setStatement] = useState<any>(null)
  const [loadingStatement, setLoadingStatement] = useState(false)

  useEffect(() => {
    stockApi
      .getReceivablesClients()
      .then((res) => {
        const rows = res.data || []
        setClients(rows)
        if (rows.length > 0) {
          const first = rows[0]
          setSelectedKey(`${first.client.name}|${first.client.number}|${first.client.location || ""}`)
        }
      })
      .finally(() => setLoading(false))
  }, [])

  const selectedClient = useMemo(() => {
    return clients.find(
      (row) => `${row.client.name}|${row.client.number}|${row.client.location || ""}` === selectedKey,
    )?.client
  }, [clients, selectedKey])

  const loadStatement = async () => {
    if (!selectedClient) return
    try {
      setLoadingStatement(true)
      const res = await stockApi.getCustomerStatement({
        clientName: selectedClient.name,
        clientNumber: selectedClient.number,
        clientLocation: selectedClient.location || "",
        from: fromDate || undefined,
        to: toDate || undefined,
      })
      setStatement(res.data || null)
    } catch (error: any) {
      window.alert(error?.message || "Failed to load statement")
    } finally {
      setLoadingStatement(false)
    }
  }

  useEffect(() => {
    if (selectedClient) loadStatement()
  }, [selectedKey])

  if (loading) return <PageLoadingSkeleton title="Loading customers" rows={6} />

  return (
    <FinanceDocumentShell
      eyebrow="Sales & Receivables"
      title="Customer Statements"
      description="View customer account activity — invoices, payments, credit notes, and running balance."

      kpis={[
        { label: "Customers", value: clients.length },
        {
          label: "Selected Balance",
          value: clients.find((c) => `${c.client.name}|${c.client.number}|${c.client.location || ""}` === selectedKey)?.balanceRemaining || 0,
          prefix: "KES",
          accent: "danger",
        },
        { label: "Statement Lines", value: statement?.lines?.length || 0 },
        { label: "Closing Balance", value: statement?.closingBalance || 0, prefix: "KES" },
      ]}
      toolbar={
        <div className="grid gap-3 md:grid-cols-[1.2fr_160px_160px_auto] items-end">
          <div>
            <Label className="text-xs">Customer</Label>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((row) => {
                  const key = `${row.client.name}|${row.client.number}|${row.client.location || ""}`
                  return (
                    <SelectItem key={key} value={key}>
                      {row.client.name} · {row.client.number}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
          </div>
          <Button onClick={loadStatement} disabled={loadingStatement} className="h-9">
            Refresh Statement
          </Button>
        </div>
      }
    >
      {selectedClient ? (
        <FinanceTableCard
          title={`${selectedClient.name} — ${selectedClient.number}`}
          headerRight={
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/accounts/payments">
                <Download className="h-3.5 w-3.5 mr-1" /> Record Payment
              </Link>
            </Button>
          }
        >
          <div className="px-4 py-3 border-b bg-muted/20 text-sm flex flex-wrap gap-4">
            <span><strong>Opening:</strong> KES {(statement?.openingBalance || 0).toLocaleString()}</span>
            <span><strong>Debits:</strong> KES {(statement?.totalDebit || 0).toLocaleString()}</span>
            <span><strong>Credits:</strong> KES {(statement?.totalCredit || 0).toLocaleString()}</span>
            <span><strong>Closing:</strong> KES {(statement?.closingBalance || 0).toLocaleString()}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/80 sticky top-0">
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Reference</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3 text-right">Debit</th>
                  <th className="py-2 px-3 text-right">Credit</th>
                  <th className="py-2 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(statement?.lines || []).length === 0 ? (
                  <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No transactions in this period.</td></tr>
                ) : (
                  statement.lines.map((line: any, idx: number) => (
                    <tr key={`${line.reference}-${idx}`} className={`border-b ${idx % 2 ? "bg-muted/15" : ""}`}>
                      <td className="py-2 px-3">{new Date(line.date).toLocaleDateString()}</td>
                      <td className="py-2 px-3 font-medium">{line.reference}</td>
                      <td className="py-2 px-3">{line.description}</td>
                      <td className="py-2 px-3"><Badge variant="outline">{line.type.replace("_", " ")}</Badge></td>
                      <td className="py-2 px-3 text-right tabular-nums">{line.debit ? line.debit.toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{line.credit ? line.credit.toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium">{line.balance.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </FinanceTableCard>
      ) : null}
    </FinanceDocumentShell>
  )
}
