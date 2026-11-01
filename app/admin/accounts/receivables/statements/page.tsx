"use client"

import { useEffect, useMemo, useState } from "react"
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

function currentYearRange() {
  const year = new Date().getFullYear()
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  }
}

function isDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function formatStatementDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString()
}

export default function CustomerStatementsPage() {
  const yearRange = currentYearRange()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<any[]>([])
  const [selectedKey, setSelectedKey] = useState("")
  const [fromDate, setFromDate] = useState(yearRange.from)
  const [toDate, setToDate] = useState(yearRange.to)
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
        from: isDateInput(fromDate) ? fromDate : yearRange.from,
        to: isDateInput(toDate) ? toDate : yearRange.to,
      })
      setStatement(res.data || null)
    } catch (error: any) {
      window.alert(error?.message || "Failed to load statement")
    } finally {
      setLoadingStatement(false)
    }
  }

  useEffect(() => {
    if (selectedClient) void loadStatement()
  }, [selectedKey])

  const downloadStatement = () => {
    if (!selectedClient || !statement) {
      window.alert("Load a statement first")
      return
    }
    const rows = [
      ["Customer", selectedClient.name, selectedClient.number],
      ["Period", fromDate, toDate],
      ["Opening", statement.openingBalance],
      ["Closing", statement.closingBalance],
      [],
      ["Date", "Reference", "Description", "Type", "Debit", "Credit", "Balance"],
      ...(statement.lines || []).map((line: any) => [
        formatStatementDate(line.date),
        line.reference,
        line.description,
        String(line.type || "").replace("_", " "),
        line.debit || 0,
        line.credit || 0,
        line.balance || 0,
      ]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `statement-${selectedClient.name.replace(/\s+/g, "-")}-${fromDate}-to-${toDate}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  if (loading) return <PageLoadingSkeleton title="Loading customers" rows={6} />

  return (
    <FinanceDocumentShell
      eyebrow="Sales & Receivables"
      title="Customer Statements"
      description="View customer account activity — invoices, payments, credit notes, and running balance. Dates default to the current calendar year."
      moduleNavGroupId="receivables"
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
        <div className="grid gap-3 md:grid-cols-[1.2fr_160px_160px_auto_auto] items-end">
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
          <Button onClick={() => void loadStatement()} disabled={loadingStatement} className="h-9">
            {loadingStatement ? "Loading…" : "Apply dates"}
          </Button>
          <Button variant="outline" onClick={downloadStatement} disabled={!statement || loadingStatement} className="h-9">
            <Download className="h-3.5 w-3.5 mr-1" /> Download
          </Button>
        </div>
      }
    >
      {selectedClient ? (
        <FinanceTableCard
          title={`${selectedClient.name} — ${selectedClient.number}`}
          headerRight={
            <Button size="sm" onClick={downloadStatement} disabled={!statement || loadingStatement}>
              <Download className="h-3.5 w-3.5 mr-1" /> Download statement
            </Button>
          }
        >
          <div className="px-4 py-3 border-b bg-muted/20 text-sm flex flex-wrap gap-4">
            <span><strong>Period:</strong> {fromDate} to {toDate}</span>
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
                      <td className="py-2 px-3">{formatStatementDate(line.date)}</td>
                      <td className="py-2 px-3 font-medium">{line.reference}</td>
                      <td className="py-2 px-3">{line.description}</td>
                      <td className="py-2 px-3"><Badge variant="outline">{String(line.type || "").replace("_", " ")}</Badge></td>
                      <td className="py-2 px-3 text-right tabular-nums">{line.debit ? Number(line.debit).toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{line.credit ? Number(line.credit).toFixed(2) : "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-medium">{Number(line.balance || 0).toFixed(2)}</td>
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
