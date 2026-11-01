"use client"

import { useState } from "react"
import { glApi } from "@/lib/api"
import { FinanceDocumentShell, FinanceTableCard } from "@/components/accounts/finance-document-shell"
import { Button } from "@/components/ui/button"

export default function FinancialExtractionPage() {
  const [data, setData] = useState<any>(null)

  return (
    <FinanceDocumentShell
      eyebrow="Reports"
      title="Financial Extraction"
      description="One pack: trial balance, profit and loss, balance sheet, and cash flow"
      actions={<Button onClick={async () => {
        const res = await glApi.getFinancialPack()
        setData(res.data)
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `financial-pack-${new Date().toISOString().slice(0, 10)}.json`
        link.click()
        URL.revokeObjectURL(url)
      }}>Extract pack</Button>}
    >
      <FinanceTableCard title="Latest pack">
        <div className="p-4 text-sm space-y-2">
          <p>P&L net income: {data?.profitAndLoss?.netIncome ?? "—"}</p>
          <p>Balance sheet balanced: {data?.balanceSheet ? String(data.balanceSheet.isBalanced) : "—"}</p>
          <p>Cash flow net: {data?.cashFlow?.net ?? "—"}</p>
        </div>
      </FinanceTableCard>
    </FinanceDocumentShell>
  )
}
