"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { api, glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getDeductionAmountByAliases } from "@/lib/payroll-calculator"

export default function PayrollJournalPage() {
  const searchParams = useSearchParams()
  const [month, setMonth] = useState(searchParams.get("month") || new Date().toISOString().slice(0, 7))
  const [payrolls, setPayrolls] = useState<any[]>([])
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const load = async (value = month) => {
    setLoading(true)
    try {
      const res = await api.payroll.getAll(value)
      setPayrolls(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(month)
  }, [month])

  const summary = useMemo(() => {
    const paid = payrolls.filter((row) => row.status === "paid" || row.status === "processed")
    return {
      employees: paid.length,
      gross: paid.reduce((sum, row) => sum + Number(row.base_salary || 0) + Number(row.bonus || 0), 0),
      net: paid.reduce((sum, row) => sum + Number(row.net_pay || 0), 0),
      paye: paid.reduce((sum, row) => sum + getDeductionAmountByAliases(row, ["PAYE"]), 0),
      shif: paid.reduce((sum, row) => sum + getDeductionAmountByAliases(row, ["SHIF", "SHA", "NHIF"]), 0),
      nssf: paid.reduce((sum, row) => sum + getDeductionAmountByAliases(row, ["NSSF"]), 0),
      housing: paid.reduce((sum, row) => sum + getDeductionAmountByAliases(row, ["Housing Levy"]), 0),
    }
  }, [payrolls])

  return (
    <FinanceDocumentShell
      eyebrow="Payroll"
      title="Payroll Journal"
      description="One journal and one bank payment for the whole month — net salaries plus statutory liabilities"
      kpis={[
        { label: "Employees", value: summary.employees },
        { label: "Bank payment", value: summary.net, prefix: "KES" },
        { label: "PAYE", value: summary.paye, prefix: "KES" },
        { label: "SHIF", value: summary.shif, prefix: "KES" },
      ]}
    >
      <FinanceTableCard title={`Month ${month}`}>
        <div className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <Label>Month</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <Button onClick={async () => {
            try {
              const res = await glApi.postPayrollJournal({ month })
              setResult(res.data)
            } catch (error: any) {
              window.alert(error.message)
            }
          }}>Post month journal</Button>
        </div>
        <div className="grid gap-3 px-4 pb-4 md:grid-cols-4 text-sm">
          <div className="rounded-lg border p-3"><p className="text-muted-foreground">Bank payment (whole month)</p><p className="text-lg font-semibold">KES {summary.net.toLocaleString()}</p></div>
          <div className="rounded-lg border p-3"><p className="text-muted-foreground">PAYE</p><p className="text-lg font-semibold">KES {summary.paye.toLocaleString()}</p></div>
          <div className="rounded-lg border p-3"><p className="text-muted-foreground">SHIF / SHA</p><p className="text-lg font-semibold">KES {summary.shif.toLocaleString()}</p></div>
          <div className="rounded-lg border p-3"><p className="text-muted-foreground">NSSF + Housing</p><p className="text-lg font-semibold">KES {(summary.nssf + summary.housing).toLocaleString()}</p></div>
        </div>
        {result ? <p className="px-4 pb-4 text-sm">Posted {result.entryNumber || result.summary?.month}. Bank line is the month net of KES {(result.summary?.net ?? summary.net).toLocaleString()}.</p> : null}
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
