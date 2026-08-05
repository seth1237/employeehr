"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, FileText, Building2, Calendar, Eye, ChevronRight } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getToken } from "@/lib/auth"
import Image from "next/image"
import API_URL from "@/lib/apiBase"

interface Payslip {
  _id: string
  month: string
  base_salary: number
  bonus: number
  deduction_items: { name: string; amount: number }[]
  total_deductions: number
  net_pay: number
  status: string
  generated_at: string
  user?: {
    firstName: string
    lastName: string
    employee_id: string
    email: string
    position?: string
    department?: string
  }
}

interface PayslipDetail {
  payslip: Payslip
  user: {
    firstName: string
    lastName: string
    employee_id: string
    email: string
    position?: string
    department?: string
  }
  company: {
    name: string
    logo?: string
    email: string
    phone?: string
    city?: string
    state?: string
    country?: string
  }
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return { r: 15, g: 118, b: 110 }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function hexToRgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function PayslipPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipDetail | null>(null)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [branding, setBranding] = useState<{ primaryColor?: string; secondaryColor?: string }>({})

  const primaryColor = branding.primaryColor || "#0f766e"
  const secondaryColor = branding.secondaryColor || "#0ea5e9"
  const primarySoftColor = hexToRgba(primaryColor, 0.08)
  const secondarySoftColor = hexToRgba(secondaryColor, 0.08)
  const primaryBorderColor = hexToRgba(primaryColor, 0.18)

  useEffect(() => {
    fetchBranding()
    fetchPayslips()
  }, [])

  const fetchBranding = async () => {
    try {
      const token = getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/api/company/branding`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success) {
        setBranding(data.data || {})
      }
    } catch {
      // Silently fail
    }
  }

  const fetchPayslips = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/payroll/my-payslips`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setPayslips(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch payslips:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPayslipDetails = async (payslipId: string) => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/payroll/payslip/${payslipId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const data = await response.json()
      if (data.success) {
        setSelectedPayslip(data.data)
        setViewDialogOpen(true)
      }
    } catch (error) {
      console.error("Failed to fetch payslip details:", error)
    }
  }

  const downloadPayslip = () => {
    if (!selectedPayslip) return

    const { payslip, user, company } = selectedPayslip
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payslip - ${payslip.month}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 30px; }
          .company-logo { max-width: 150px; margin-bottom: 10px; }
          .company-name { font-size: 24px; font-weight: bold; margin: 10px 0; color: ${primaryColor}; }
          .payslip-title { font-size: 20px; color: #666; margin-top: 20px; }
          .info-section { margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 5px 0; padding: 4px 0; }
          .info-label { font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .total-row { font-weight: bold; font-size: 16px; background-color: #f9f9f9; }
          .net-pay { font-size: 18px; color: #059669; }
          .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${company.logo ? `<img src="${company.logo}" alt="${company.name}" class="company-logo" />` : ''}
          <div class="company-name">${company.name}</div>
          <div>${company.email || ''} ${company.phone ? '• ' + company.phone : ''}</div>
          <div>${[company.city, company.state, company.country].filter(Boolean).join(', ')}</div>
          <div class="payslip-title">PAYSLIP - ${new Date(payslip.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span class="info-label">Employee Name:</span>
            <span>${user.firstName} ${user.lastName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Employee ID:</span>
            <span>${user.employee_id}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Position:</span>
            <span>${user.position || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Department:</span>
            <span>${user.department || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Date:</span>
            <span>${new Date(payslip.generated_at).toLocaleDateString()}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Base Salary</td>
              <td style="text-align: right;">KES ${payslip.base_salary.toLocaleString()}</td>
            </tr>
            ${payslip.bonus > 0 ? `
            <tr>
              <td>Bonus</td>
              <td style="text-align: right;">KES ${payslip.bonus.toLocaleString()}</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td>Gross Pay</td>
              <td style="text-align: right;">KES ${(payslip.base_salary + payslip.bonus).toLocaleString()}</td>
            </tr>
            ${payslip.deduction_items.map(item => `
            <tr>
              <td>${item.name} (Deduction)</td>
              <td style="text-align: right; color: #dc2626;">- KES ${item.amount.toLocaleString()}</td>
            </tr>
            `).join('')}
            <tr class="total-row">
              <td>Total Deductions</td>
              <td style="text-align: right; color: #dc2626;">- KES ${payslip.total_deductions.toLocaleString()}</td>
            </tr>
            <tr class="total-row net-pay">
              <td>NET PAY</td>
              <td style="text-align: right;">KES ${payslip.net_pay.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <p>This is a computer-generated document. No signature is required.</p>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  const formatMonth = (month: string) => {
    return new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2" style={{ borderColor: primaryColor }} />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Header Section */}
      <div className="rounded-2xl border px-4 py-3 shadow-sm" style={{ borderColor: primaryBorderColor, background: `linear-gradient(to right, ${primarySoftColor}, ${secondarySoftColor})` }}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium tracking-wide" style={{ color: primaryColor }}>Payroll</p>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">My Payslips</h1>
            <p className="text-sm text-muted-foreground">View and download your salary payslips</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchPayslips} className="self-start h-8 sm:h-10">
            Refresh
          </Button>
        </div>
      </div>

      {/* Payslips List */}
      {payslips.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-8 sm:py-12 text-center">
            <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">No payslips available yet</p>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Payslips will appear here once generated</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {payslips.map((payslip) => (
            <Card key={payslip._id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                    <div className="p-2 sm:p-3 rounded-lg shrink-0" style={{ backgroundColor: hexToRgba(primaryColor, 0.1) }}>
                      <Calendar className="h-4 w-4 sm:h-6 sm:w-6" style={{ color: primaryColor }} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-lg text-foreground truncate">
                        {formatMonth(payslip.month)}
                      </h3>
                      <p className="text-[10px] sm:text-sm text-muted-foreground">
                        Generated {new Date(payslip.generated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 ml-auto sm:ml-0">
                    <div className="text-right min-w-[80px] sm:min-w-[120px]">
                      <p className="text-[9px] sm:text-sm text-muted-foreground">Net Pay</p>
                      <p className="text-sm sm:text-xl font-bold" style={{ color: primaryColor }}>
                        KES {payslip.net_pay.toLocaleString()}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`rounded-full px-2 py-0.5 text-[9px] sm:text-xs font-medium capitalize ${
                        payslip.status === 'paid' 
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700' 
                          : 'border-amber-200 bg-amber-50 text-amber-700'
                      }`}
                    >
                      {payslip.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchPayslipDetails(payslip._id)}
                      className="h-7 sm:h-9 text-[10px] sm:text-xs"
                    >
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payslip Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="text-base sm:text-lg">Payslip Details</DialogTitle>
          </DialogHeader>

          {selectedPayslip && (
            <div className="space-y-4 sm:space-y-6">
              {/* Company Header */}
              <div className="text-center border-b pb-3 sm:pb-4">
                {selectedPayslip.company.logo && (
                  <div className="flex justify-center mb-2">
                    <img 
                      src={selectedPayslip.company.logo} 
                      alt={selectedPayslip.company.name}
                      className="h-12 sm:h-16 object-contain"
                    />
                  </div>
                )}
                <h2 className="text-lg sm:text-2xl font-bold" style={{ color: primaryColor }}>
                  {selectedPayslip.company.name}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {selectedPayslip.company.email}
                  {selectedPayslip.company.phone && ` • ${selectedPayslip.company.phone}`}
                </p>
                {selectedPayslip.company.city && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {[selectedPayslip.company.city, selectedPayslip.company.state, selectedPayslip.company.country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
                <h3 className="text-base sm:text-lg font-semibold mt-3 sm:mt-4">
                  PAYSLIP - {formatMonth(selectedPayslip.payslip.month)}
                </h3>
              </div>

              {/* Employee Info - Mobile optimized */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg" style={{ backgroundColor: hexToRgba(primaryColor, 0.05) }}>
                <div>
                  <p className="text-[9px] sm:text-sm text-muted-foreground">Employee</p>
                  <p className="text-xs sm:text-base font-semibold truncate">
                    {selectedPayslip.user.firstName} {selectedPayslip.user.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] sm:text-sm text-muted-foreground">ID</p>
                  <p className="text-xs sm:text-base font-semibold">{selectedPayslip.user.employee_id}</p>
                </div>
                <div>
                  <p className="text-[9px] sm:text-sm text-muted-foreground">Position</p>
                  <p className="text-xs sm:text-base font-semibold truncate">{selectedPayslip.user.position || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[9px] sm:text-sm text-muted-foreground">Department</p>
                  <p className="text-xs sm:text-base font-semibold truncate">{selectedPayslip.user.department || 'N/A'}</p>
                </div>
              </div>

              {/* Salary Breakdown - Mobile optimized */}
              <div>
                <h4 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Salary Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead style={{ backgroundColor: hexToRgba(primaryColor, 0.08) }}>
                      <tr>
                        <th className="text-left p-2 sm:p-3 font-medium">Description</th>
                        <th className="text-right p-2 sm:p-3 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-2 sm:p-3">Base Salary</td>
                        <td className="p-2 sm:p-3 text-right">KES {selectedPayslip.payslip.base_salary.toLocaleString()}</td>
                      </tr>
                      {selectedPayslip.payslip.bonus > 0 && (
                        <tr className="border-b">
                          <td className="p-2 sm:p-3">Bonus</td>
                          <td className="p-2 sm:p-3 text-right">KES {selectedPayslip.payslip.bonus.toLocaleString()}</td>
                        </tr>
                      )}
                      <tr className="border-b font-semibold" style={{ backgroundColor: hexToRgba(primaryColor, 0.05) }}>
                        <td className="p-2 sm:p-3">Gross Pay</td>
                        <td className="p-2 sm:p-3 text-right">
                          KES {(selectedPayslip.payslip.base_salary + selectedPayslip.payslip.bonus).toLocaleString()}
                        </td>
                      </tr>
                      {selectedPayslip.payslip.deduction_items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2 sm:p-3">{item.name}</td>
                          <td className="p-2 sm:p-3 text-right text-rose-600">- KES {item.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                      <tr className="border-b font-semibold" style={{ backgroundColor: hexToRgba(primaryColor, 0.05) }}>
                        <td className="p-2 sm:p-3">Total Deductions</td>
                        <td className="p-2 sm:p-3 text-right text-rose-600">
                          - KES {selectedPayslip.payslip.total_deductions.toLocaleString()}
                        </td>
                      </tr>
                      <tr className="font-bold text-sm sm:text-lg" style={{ backgroundColor: hexToRgba(primaryColor, 0.1) }}>
                        <td className="p-2 sm:p-3" style={{ color: primaryColor }}>NET PAY</td>
                        <td className="p-2 sm:p-3 text-right" style={{ color: primaryColor }}>
                          KES {selectedPayslip.payslip.net_pay.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 sm:pt-4 border-t">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)} className="w-full sm:w-auto">
                  Close
                </Button>
                <Button onClick={downloadPayslip} className="w-full sm:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Download / Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}