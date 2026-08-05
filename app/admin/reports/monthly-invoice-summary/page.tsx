"use client"
import React, { useState } from "react"
import { API_URL } from "@/lib/apiBase"
import { Download, Calendar, FileText, Package, Receipt, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

function formatDateISO(d: Date | string) {
  const dt = new Date(d)
  return dt.toISOString()
}

function toCSV(rows: Array<{ date: string; type: string; reference: string }>) {
  const header = ["date", "type", "reference"]
  const lines = [header.join(",")]
  rows.forEach((r) => {
    const line = ["\"" + r.date + "\"", r.type, "\"" + (r.reference || "") + "\""]
    lines.push(line.join(","))
  })
  return lines.join("\n")
}

export default function Page() {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [includeQuotations, setIncludeQuotations] = useState(true)
  const [includeInvoices, setIncludeInvoices] = useState(true)
  const [includeStock, setIncludeStock] = useState(true)
  const [loading, setLoading] = useState(false)

  const fetchRows = async () => {
    setLoading(true)
    try {
      const [year, mon] = month.split("-")
      const start = new Date(Number(year), Number(mon) - 1, 1).toISOString()
      const end = new Date(Number(year), Number(mon), 1).toISOString()
      const includeParts = []
      if (includeQuotations) includeParts.push("quotations")
      if (includeInvoices) includeParts.push("invoices")
      if (includeStock) includeParts.push("stock")

      const res = await fetch(`${API_URL}/api/reports/admin/monthly-invoice-summary?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&include=${includeParts.join(",")}`)
      const payload = await res.json()
      if (!payload.success) throw new Error(payload.message || "Failed to fetch")
      return payload.data.map((r: any) => ({ date: formatDateISO(r.date), type: r.type, reference: r.reference }))
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (asExcel = false) => {
    setLoading(true)
    try {
      const [year, mon] = month.split("-")
      const start = new Date(Number(year), Number(mon) - 1, 1).toISOString()
      const end = new Date(Number(year), Number(mon), 1).toISOString()
      const includeParts = []
      if (includeQuotations) includeParts.push("quotations")
      if (includeInvoices) includeParts.push("invoices")
      if (includeStock) includeParts.push("stock")

      const url = `${API_URL}/api/reports/admin/monthly-invoice-summary/download?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}&include=${includeParts.join(",")}`
      // navigate to URL to trigger download (keeps auth cookies)
      const filename = `monthly-summary-${month}` + (asExcel ? ".xlsx" : ".csv")
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
    } finally {
      setLoading(false)
    }
  }

  const getMonthName = (monthString: string) => {
    const [year, month] = monthString.split("-")
    const date = new Date(Number(year), Number(month) - 1)
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Receipt className="w-8 h-8 text-blue-600" />
          Monthly Report Summary
        </h1>
        <p className="text-gray-600 mt-2">Generate and download monthly invoices, quotations, and stock movement reports</p>
      </div>

      {/* Main Card */}
      <Card className="border border-gray-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Select the month and data types you want to include in your report</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {/* Month Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Select Month
            </label>
            <input 
              type="month" 
              value={month} 
              onChange={(e) => setMonth(e.target.value)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
            <p className="text-sm text-gray-500">Currently viewing: <span className="font-semibold text-gray-700">{getMonthName(month)}</span></p>
          </div>

          {/* Data Types Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Data Types to Include
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quotations */}
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition">
                <input 
                  type="checkbox" 
                  checked={includeQuotations} 
                  onChange={(e) => setIncludeQuotations(e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Quotations</p>
                  <p className="text-xs text-gray-500">Sales quotes generated</p>
                </div>
              </label>

              {/* Invoices */}
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-green-50 hover:border-green-300 transition">
                <input 
                  type="checkbox" 
                  checked={includeInvoices} 
                  onChange={(e) => setIncludeInvoices(e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Invoices</p>
                  <p className="text-xs text-gray-500">Issued invoices</p>
                </div>
              </label>

              {/* Stock Movements */}
              <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition">
                <input 
                  type="checkbox" 
                  checked={includeStock} 
                  onChange={(e) => setIncludeStock(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded border-gray-300 cursor-pointer"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">Stock Movements</p>
                  <p className="text-xs text-gray-500">Inventory changes</p>
                </div>
              </label>
            </div>
          </div>

          {/* Selected Items Preview */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Selected Data Types
            </label>
            <div className="flex flex-wrap gap-2">
              {includeQuotations && <Badge variant="default" className="bg-blue-100 text-blue-800 border border-blue-300">Quotations</Badge>}
              {includeInvoices && <Badge variant="default" className="bg-green-100 text-green-800 border border-green-300">Invoices</Badge>}
              {includeStock && <Badge variant="default" className="bg-purple-100 text-purple-800 border border-purple-300">Stock Movements</Badge>}
              {!includeQuotations && !includeInvoices && !includeStock && (
                <span className="text-sm text-gray-500 italic">No data types selected</span>
              )}
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-4 border-t border-gray-200">
            <Button 
              onClick={() => handleDownload(false)} 
              disabled={loading || (!includeQuotations && !includeInvoices && !includeStock)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              {loading ? "Generating..." : "Download CSV"}
            </Button>
            <Button 
              onClick={() => handleDownload(true)} 
              disabled={loading || (!includeQuotations && !includeInvoices && !includeStock)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {loading ? "Generating..." : "Download Excel"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">📌 Note:</span> Reports are generated based on your selected filters and month. Only quotation and invoice numbers are included (delivery notes excluded).
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
