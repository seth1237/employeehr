"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import type { EmployeePayslipDownload } from "@/lib/payslip-download"
import { PayslipDocument } from "@/components/payroll/payslip-document"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

export default function PayslipDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [detail, setDetail] = useState<EmployeePayslipDownload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const id = String(params.id || "")
    if (!id) return
    api.payroll
      .getPayslipDetails(id)
      .then((response) => {
        if (response?.success) setDetail(response.data)
      })
      .catch((error) => console.error("Failed to fetch payslip details", error))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return <PageLoadingSkeleton title="Loading payslip" rows={3} />

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Button variant="ghost" className="h-8 px-2 no-print" onClick={() => router.push("/employee/payslip")}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to payroll
      </Button>
      {detail ? (
        <PayslipDocument detail={detail} />
      ) : (
        <p className="text-center text-sm text-muted-foreground">Payslip not found.</p>
      )}
    </div>
  )
}
