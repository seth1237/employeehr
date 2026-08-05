"use client"

import { useEffect, useMemo, useState } from "react"
import { stockApi } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

interface DebtPayment {
  _id: string
  amount: number
  paymentMethod: string
  reference?: string
  paidAt: string
  createdAt: string
}

interface DebtRow {
  _id: string
  invoiceNumber: string
  createdAt: string
  subTotal: number
  status: "issued" | "paid" | "cancelled"
  client: { name: string; number: string; location: string }
  paidAmount: number
  balanceRemaining: number
  paymentCount: number
  lastPayment: DebtPayment | null
}

export default function AccountsDebtManagementPage() {
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [rows, setRows] = useState<DebtRow[]>([])

  const loadData = async () => {
    try {
      setLoading(true)
      const response = await stockApi.getDebtManagement()
      setRows(response.data || [])
    } catch (error: any) {
      window.alert(error?.message || "Failed to load debt management")
    } finally {
      setLoading(false)
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

  if (loading) return <PageLoadingSkeleton title="Loading debt management" rows={8} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Accounts · Debt Management</h1>
        <p className="text-sm text-muted-foreground">
          View all unsettled sales invoices with latest payment details and remaining balance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unsettled Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Search by invoice, client, number..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Invoice</th>
                  <th className="py-2">Client</th>
                  <th className="py-2">Total</th>
                  <th className="py-2">Paid</th>
                  <th className="py-2">Balance</th>
                  <th className="py-2">Latest Payment</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td className="py-2" colSpan={7}>No unsettled invoices.</td>
                  </tr>
                ) : (
                  filteredRows.map((row) => (
                    <tr key={row._id} className="border-b">
                      <td className="py-2">
                        <div className="font-medium">{row.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(row.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-2">
                        <div>{row.client?.name}</div>
                        <div className="text-xs text-muted-foreground">{row.client?.number}</div>
                        <div className="text-xs text-muted-foreground">{row.client?.location}</div>
                      </td>
                      <td className="py-2">{row.subTotal.toFixed(2)}</td>
                      <td className="py-2">{row.paidAmount.toFixed(2)}</td>
                      <td className="py-2 font-medium text-primary">{row.balanceRemaining.toFixed(2)}</td>
                      <td className="py-2">
                        {row.lastPayment
                          ? `${new Date(row.lastPayment.paidAt || row.lastPayment.createdAt).toLocaleString()} · ${Number(row.lastPayment.amount || 0).toFixed(2)} (${String(row.lastPayment.paymentMethod || "").toUpperCase()})`
                          : "No payments yet"}
                      </td>
                      <td className="py-2 capitalize">{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
