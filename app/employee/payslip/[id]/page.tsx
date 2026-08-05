"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { api } from "@/lib/api"
import { Loader2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Payslip from "@/components/employee/payslip"
import { getUser } from "@/lib/auth"

export default function PayslipDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [payslip, setPayslip] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [employee, setEmployee] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPayslipDetails = async () => {
      try {
        const user = getUser()
        if (!user) {
          router.push("/auth/login")
          return
        }

        // Fetch payslip details (includes payslip, company, and user data)
        const payslipRes = await api.payroll.getPayslipDetails(params.id as string)
        if (payslipRes.success && payslipRes.data) {
          setPayslip(payslipRes.data.payslip)
          setCompany(payslipRes.data.company)
          
          // Use user data from response or fallback to auth user
          const userData = payslipRes.data.user || user
          setEmployee({
            first_name: userData.firstName || userData.first_name,
            last_name: userData.lastName || userData.last_name,
            email: userData.email,
            employee_id: userData.employee_id,
            department: userData.department,
            position: userData.position,
          })
        }
      } catch (error) {
        console.error("Failed to fetch payslip details", error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchPayslipDetails()
    }
  }, [params.id, router])

  const handleDownload = async () => {
    try {
      // For now, use browser print
      // In future, can implement PDF generation on backend
      window.print()
    } catch (error) {
      console.error("Failed to download payslip", error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!payslip || !company || !employee) {
    return (
      <div className="p-6">
        <p className="text-center text-muted-foreground">Payslip not found</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 no-print">
        <ArrowLeft className="w-4 h-4" />
        Back to Payroll
      </Button>

      {/* Payslip Component */}
      <Payslip payslip={payslip} company={company} employee={employee} onDownload={handleDownload} />
    </div>
  )
}
