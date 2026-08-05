"use client"

import { useRef } from "react"
import { format } from "date-fns"
import { Download, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PayslipProps {
  payslip: {
    _id: string
    month: string
    base_salary: number
    bonus: number
    deduction_items: { name: string; amount: number }[]
    total_deductions: number
    net_pay: number
    status: string
    generated_at: string
  }
  company: {
    name: string
    email: string
    phone?: string
    address?: string
    city?: string
    state?: string
    country?: string
    logo?: string
  }
  employee: {
    first_name: string
    last_name: string
    email: string
    employee_id?: string
    department?: string
    position?: string
  }
  onDownload?: () => void
}

export default function Payslip({ payslip, company, employee, onDownload }: PayslipProps) {
  const payslipRef = useRef<HTMLDivElement>(null)

  const handleDownload = () => {
    if (onDownload) {
      onDownload()
    } else {
      // Fallback: print the payslip
      window.print()
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const grossPay = payslip.base_salary + payslip.bonus

  return (
    <div className="space-y-4">
      {/* Download Button */}
      <div className="flex justify-end no-print">
        <Button onClick={handleDownload} className="gap-2">
          <Download className="w-4 h-4" />
          Download Payslip
        </Button>
      </div>

      {/* Payslip Document */}
      <div
        ref={payslipRef}
        className="bg-white border-2 border-gray-300 rounded-lg shadow-lg p-8 max-w-4xl mx-auto payslip-document"
        style={{ minHeight: "297mm" }}
      >
        {/* Header */}
        <div className="flex justify-between items-start pb-6 border-b-2 border-gray-800">
          <div className="flex items-start gap-4">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="w-16 h-16 object-contain" />
            ) : (
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
              <p className="text-sm text-gray-600">{company.email}</p>
              {company.phone && <p className="text-sm text-gray-600">{company.phone}</p>}
              {company.address && (
                <p className="text-sm text-gray-600 mt-1">
                  {company.address}
                  {company.city && `, ${company.city}`}
                  {company.state && `, ${company.state}`}
                  {company.country && `, ${company.country}`}
                </p>
              )}
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-xl font-bold text-gray-900 uppercase">Payslip</h2>
            <p className="text-sm text-gray-600 mt-2">
              Period: <span className="font-semibold">{payslip.month}</span>
            </p>
            <p className="text-sm text-gray-600">
              Generated: {format(new Date(payslip.generated_at), "MMM dd, yyyy")}
            </p>
            <p className="text-sm text-gray-600">
              Status:{" "}
              <span
                className={`font-semibold ${
                  payslip.status === "paid" ? "text-green-600" : "text-yellow-600"
                }`}
              >
                {payslip.status.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        {/* Employee Information */}
        <div className="mt-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Employee Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Name</p>
              <p className="text-sm font-medium text-gray-900">
                {employee.first_name} {employee.last_name}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Employee ID</p>
              <p className="text-sm font-medium text-gray-900">{employee.employee_id || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{employee.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Department</p>
              <p className="text-sm font-medium text-gray-900">{employee.department || "N/A"}</p>
            </div>
            {employee.position && (
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Position</p>
                <p className="text-sm font-medium text-gray-900">{employee.position}</p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Details */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3">Payment Details</h3>

          {/* Earnings */}
          <div className="border-t border-gray-300">
            <div className="flex justify-between py-3 px-2 bg-gray-50">
              <span className="font-semibold text-sm text-gray-700">Earnings</span>
              <span className="font-semibold text-sm text-gray-700">Amount</span>
            </div>
            <div className="flex justify-between py-2 px-2">
              <span className="text-sm text-gray-900">Base Salary</span>
              <span className="text-sm font-medium text-gray-900">{formatCurrency(payslip.base_salary)}</span>
            </div>
            {payslip.bonus > 0 && (
              <div className="flex justify-between py-2 px-2 bg-green-50">
                <span className="text-sm text-green-700">Bonus</span>
                <span className="text-sm font-medium text-green-700">{formatCurrency(payslip.bonus)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 px-2 bg-gray-100 border-t border-gray-300">
              <span className="text-sm font-semibold text-gray-900">Gross Pay</span>
              <span className="text-sm font-semibold text-gray-900">{formatCurrency(grossPay)}</span>
            </div>
          </div>

          {/* Deductions */}
          {payslip.deduction_items && payslip.deduction_items.length > 0 && (
            <div className="border-t border-gray-300 mt-4">
              <div className="flex justify-between py-3 px-2 bg-gray-50">
                <span className="font-semibold text-sm text-gray-700">Deductions</span>
                <span className="font-semibold text-sm text-gray-700">Amount</span>
              </div>
              {payslip.deduction_items.map((item, index) => (
                <div key={index} className="flex justify-between py-2 px-2 bg-red-50">
                  <span className="text-sm text-red-700">{item.name}</span>
                  <span className="text-sm font-medium text-red-700">-{formatCurrency(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 px-2 bg-gray-100 border-t border-gray-300">
                <span className="text-sm font-semibold text-gray-900">Total Deductions</span>
                <span className="text-sm font-semibold text-red-700">
                  -{formatCurrency(payslip.total_deductions)}
                </span>
              </div>
            </div>
          )}

          {/* Net Pay */}
          <div className="mt-4 border-2 border-green-600 bg-green-50 rounded-lg">
            <div className="flex justify-between py-4 px-4">
              <span className="text-lg font-bold text-green-800">NET PAY</span>
              <span className="text-2xl font-bold text-green-800">{formatCurrency(payslip.net_pay)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-600 rounded">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> This is a computer-generated payslip and does not require a signature. Please
            contact HR if you have any questions or discrepancies.
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-300 text-center">
          <p className="text-xs text-gray-500">
            This document is confidential and intended solely for the use of the individual named above.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Generated on {format(new Date(), "MMMM dd, yyyy 'at' HH:mm")}
          </p>
          <p className="text-xs text-gray-400 mt-4 font-semibold">Powered by Elevate</p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .payslip-document,
          .payslip-document * {
            visibility: visible;
          }
          .payslip-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            box-shadow: none;
            border: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
