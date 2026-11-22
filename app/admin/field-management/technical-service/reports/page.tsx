"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { engineeringApi } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import {
  DesktopTableShell,
  MobileCard,
  MobileCardList,
  StatusBadge,
  TechnicalServiceHeader,
  TechnicalServicePage,
  whenLabel,
} from "@/components/admin/technical-service-ui"

type QrReport = {
  _id: string
  type: string
  status: string
  contactName: string
  contactPhone: string
  message: string
  productName?: string
  quantity?: number
  urgency?: string
  createdAt: string
  machineId?: string
  ticketId?: string
  machineSnapshot?: {
    productName?: string
    serialNumber?: string
    clientName?: string
    location?: string
  }
}

const TYPE_FILTERS = [
  { id: "", label: "All" },
  { id: "service", label: "Service" },
  { id: "breakdown", label: "Breakdown" },
  { id: "product_order", label: "Product order" },
]

function typeLabel(type?: string) {
  if (type === "breakdown") return "Breakdown"
  if (type === "product_order") return "Product order"
  return "Service"
}

export default function TechnicalServiceReportsPage() {
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState("")
  const [type, setType] = useState("")
  const [status, setStatus] = useState("")
  const [rows, setRows] = useState<QrReport[]>([])
  const [openCount, setOpenCount] = useState(0)

  const load = () => {
    setLoading(true)
    engineeringApi
      .listQrReports({ type: type || undefined, status: status || undefined, limit: 150 })
      .then((res) => {
        setRows(res.data || [])
        setOpenCount(res.meta?.openCount ?? 0)
      })
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [type, status])

  const updateStatus = async (id: string, next: string) => {
    setSavingId(id)
    try {
      await engineeringApi.updateQrReport(id, next)
      load()
    } catch (error: any) {
      window.alert(error?.message || "Could not update this report.")
    } finally {
      setSavingId("")
    }
  }

  if (loading && rows.length === 0) return <PageLoadingSkeleton title="Client reports" />

  return (
    <TechnicalServicePage>
      <TechnicalServiceHeader
        title="Client reports"
        description="Requests submitted when an attendant scans a machine QR. Service and breakdowns also appear as tickets."
        actions={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Open reports</p>
            <p className="text-2xl font-semibold">{openCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Showing</p>
            <p className="text-2xl font-semibold">{rows.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((item) => (
          <Button
            key={item.id || "all"}
            size="sm"
            variant={type === item.id ? "default" : "outline"}
            onClick={() => setType(item.id)}
          >
            {item.label}
          </Button>
        ))}
        <Button size="sm" variant={status === "open" ? "default" : "outline"} onClick={() => setStatus(status === "open" ? "" : "open")}>
          Open only
        </Button>
      </div>

      <DesktopTableShell>
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Machine</th>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No client QR reports yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row._id} className="border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{whenLabel(row.createdAt)}</td>
                  <td className="px-4 py-3">{typeLabel(row.type)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/clients/installed-machines?machineId=${row.machineId}`}
                      className="font-medium hover:underline"
                    >
                      {row.machineSnapshot?.productName || row.productName || "Machine"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {row.machineSnapshot?.clientName || ""}
                      {row.machineSnapshot?.serialNumber ? ` · SN ${row.machineSnapshot.serialNumber}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{row.contactName}</p>
                    <p className="text-xs text-muted-foreground">{row.contactPhone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{row.message}</p>
                    {row.type === "product_order" ? (
                      <p className="text-xs text-muted-foreground">
                        {row.quantity || 1} × {row.productName}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                    <div className="mt-2 flex flex-wrap gap-1">
                      {row.status === "open" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingId === row._id}
                          onClick={() => updateStatus(row._id, "in_progress")}
                        >
                          In progress
                        </Button>
                      ) : null}
                      {row.status !== "closed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingId === row._id}
                          onClick={() => updateStatus(row._id, "closed")}
                        >
                          Close
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DesktopTableShell>

      <MobileCardList label="Client reports">
        {rows.map((row) => (
          <MobileCard key={row._id}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{typeLabel(row.type)}</p>
              <StatusBadge status={row.status} />
            </div>
            <p className="text-sm">{row.machineSnapshot?.productName || row.productName}</p>
            <p className="text-xs text-muted-foreground">
              {row.contactName} · {row.contactPhone} · {whenLabel(row.createdAt)}
            </p>
            <p className="mt-1 text-sm">{row.message}</p>
          </MobileCard>
        ))}
      </MobileCardList>
    </TechnicalServicePage>
  )
}
