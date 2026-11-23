"use client"

import { useEffect, useState } from "react"
import { ChevronLeft, Download, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { api } from "@/lib/api"
import type { EmployeePayslipDownload } from "@/lib/payslip-download"
import {
  downloadEmployeePayslip,
  payrollPeriodLabel,
} from "@/lib/payslip-download"
import { PayslipDocument } from "@/components/payroll/payslip-document"

type PayslipRow = {
  _id: string
  month: string
  base_salary: number
  bonus: number
  total_deductions: number
  net_pay: number
  status: string
  generated_at?: string
}

function useIsPhone() {
  const [phone, setPhone] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)")
    const apply = () => setPhone(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])
  return phone
}

export function PayslipWorkspace({
  primaryColor = "#0f766e",
}: {
  primaryColor?: string
}) {
  const phone = useIsPhone()
  const [payslips, setPayslips] = useState<PayslipRow[]>([])
  const [openId, setOpenId] = useState("")
  const [detail, setDetail] = useState<EmployeePayslipDownload | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [downloadingId, setDownloadingId] = useState("")

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.payroll
      .getMyPayslips()
      .then((response) => {
        if (!cancelled) setPayslips((response?.data || []) as PayslipRow[])
      })
      .catch((error) => console.error("Failed to load payslips", error))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!openId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setLoadingDetail(true)
    api.payroll
      .getPayslipDetails(openId)
      .then((response) => {
        if (!cancelled && response?.success) setDetail(response.data)
      })
      .catch((error) => console.error("Failed to load payslip", error))
      .finally(() => {
        if (!cancelled) setLoadingDetail(false)
      })
    return () => {
      cancelled = true
    }
  }, [openId])

  const downloadById = async (id: string) => {
    setDownloadingId(id)
    try {
      let payload = openId === id && detail ? detail : null
      if (!payload) {
        const response = await api.payroll.getPayslipDetails(id)
        if (response?.success) payload = response.data
      }
      if (payload) await downloadEmployeePayslip(payload, primaryColor)
    } catch (error) {
      console.error("Failed to download payslip", error)
    } finally {
      setDownloadingId("")
    }
  }

  if (loading) return <PageLoadingSkeleton title="Loading payroll" rows={4} />

  if (!payslips.length) {
    return (
      <div className="rounded-2xl border bg-white px-4 py-12 text-center">
        <FileText className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-800">No payslips yet</p>
        <p className="mt-1 text-sm text-slate-500">They appear here after HR processes payroll for your account.</p>
      </div>
    )
  }

  const openRow = payslips.find((row) => row._id === openId)
  const openLabel = openRow ? payrollPeriodLabel(openRow.month) : "Payslip"

  return (
    <>
      <div className="overflow-hidden rounded-2xl border bg-white">
        {payslips.map((row) => {
          const busy = downloadingId === row._id
          return (
            <div key={row._id} className="flex items-stretch border-b last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenId(row._id)}
                className="min-w-0 flex-1 px-4 py-3.5 text-left hover:bg-slate-50"
              >
                <p className="truncate text-sm font-medium text-slate-900">{payrollPeriodLabel(row.month)}</p>
              </button>
              <button
                type="button"
                onClick={() => void downloadById(row._id)}
                disabled={busy}
                aria-label={`Download ${payrollPeriodLabel(row.month)}`}
                className="flex w-12 shrink-0 items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </button>
            </div>
          )
        })}
      </div>

      <Sheet open={Boolean(openId)} onOpenChange={(open) => !open && setOpenId("")}>
        <SheetContent
          side={phone ? "bottom" : "right"}
          className={
            phone
              ? "h-[92dvh] max-h-[92dvh] gap-0 rounded-t-3xl p-0 sm:max-w-none [&>button]:hidden"
              : "w-full gap-0 p-0 sm:max-w-xl [&>button]:hidden"
          }
        >
          <SheetHeader className="flex flex-row items-center gap-2 space-y-0 border-b px-4 py-3 text-left">
            <button
              type="button"
              onClick={() => setOpenId("")}
              aria-label="Close payslip"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <SheetTitle className="min-w-0 flex-1 truncate text-base">{openLabel}</SheetTitle>
            <Button
              size="sm"
              className="shrink-0"
              onClick={() => openId && void downloadById(openId)}
              disabled={!detail || downloadingId === openId}
            >
              {downloadingId === openId ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-3.5 w-3.5" />
              )}
              Download
            </Button>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {loadingDetail && !detail ? (
              <p className="px-4 py-16 text-center text-sm text-slate-500">Opening payslip…</p>
            ) : detail ? (
              <PayslipDocument detail={detail} primaryColor={primaryColor} actions={false} framed={false} />
            ) : (
              <p className="px-4 py-16 text-center text-sm text-slate-500">Could not open this payslip.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
