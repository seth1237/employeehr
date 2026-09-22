"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { engineeringApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { ExternalLink, Wrench } from "lucide-react"
import { FinanceTableCard } from "@/components/accounts/finance-document-shell"

function monthStart() {
  const date = new Date()
  date.setDate(1)
  return date.toISOString().slice(0, 10)
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function money(value?: number) {
  return Number(value || 0).toLocaleString()
}

export function EngineerFieldCostsCard({
  from,
  to,
  employeeId,
}: {
  from?: string
  to?: string
  employeeId?: string
}) {
  const [data, setData] = useState<any>(null)
  const periodFrom = from || monthStart()
  const periodTo = to || todayIso()

  useEffect(() => {
    engineeringApi
      .getReport({
        from: periodFrom,
        to: periodTo,
        engineerId: employeeId || undefined,
      })
      .then((res) => setData(res.data || res))
      .catch(() => setData(null))
  }, [periodFrom, periodTo, employeeId])

  const finance = data?.finance || {}
  const rows = (finance.byEngineer || []).filter(
    (row: any) => Number(row.jobCost || 0) > 0 || Number(row.expenses || 0) > 0,
  )
  const claimsHref = employeeId
    ? `/admin/accounts/expenses/claims?source=engineer&employeeId=${employeeId}`
    : "/admin/accounts/expenses/claims?source=engineer"

  return (
    <FinanceTableCard
      title="Engineer field costs"
      headerRight={
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/clients/technical-service/expenses">
              <Wrench className="mr-1.5 h-3.5 w-3.5" />
              Technical Service
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={claimsHref}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              Engineer claims
            </Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 px-4 py-3 sm:grid-cols-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Job cost</p>
          <p className="text-lg font-semibold tabular-nums">KES {money(finance.jobCost)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Field claims</p>
          <p className="text-lg font-semibold tabular-nums">KES {money(finance.expenses)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total spend</p>
          <p className="text-lg font-semibold tabular-nums">KES {money(finance.totalSpend)}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/80">
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 px-3">Engineer</th>
              <th className="py-2 px-3 text-right">Job cost</th>
              <th className="py-2 px-3 text-right">Expenses</th>
              <th className="py-2 px-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted-foreground">
                  No engineer costings in this period.
                </td>
              </tr>
            ) : (
              rows.map((row: any) => (
                <tr key={row._id} className="border-b">
                  <td className="py-2 px-3">{row.name}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{money(row.jobCost)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{money(row.expenses)}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium">{money(row.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </FinanceTableCard>
  )
}
