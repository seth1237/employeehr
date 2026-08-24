"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Download } from "lucide-react"
import { generateRemunerationReport, exportToExcel, calculateReportSummaries, getReportColumns } from "@/lib/remuneration-reports"
import { TableSkeleton } from "@/components/admin/ui/page-states"
import { AccountsModuleNav } from "@/components/accounts/accounts-module-nav"

export default function RemunerationReportsPage() {
    const { toast } = useToast()
    const [payrolls, setPayrolls] = useState<any[]>([])
    const [employees, setEmployees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
    const [activeTab, setActiveTab] = useState<'net' | 'sha' | 'tax' | 'nssf' | 'helb'>('net')
    const [branding, setBranding] = useState<{ primaryColor?: string; textColor?: string; accentColor?: string }>({})

    // Helper: determine if a hex color is dark so we can pick readable text
    function hexToRgb(hex?: string) {
        if (!hex) return null
        try {
            let h = hex.replace('#', '').trim()
            if (h.length === 3) h = h.split('').map((c) => c + c).join('')
            const int = parseInt(h, 16)
            if (Number.isNaN(int)) return null
            return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
        } catch (e) {
            return null
        }
    }

    function isColorDark(hex?: string) {
        const rgb = hexToRgb(hex)
        if (!rgb) return false
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
        return brightness < 128
    }

    function contrastText(primary?: string, explicit?: string) {
        if (explicit) return explicit
        return isColorDark(primary) ? '#ffffff' : '#0f172a'
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                const [payrollRes, employeesRes] = await Promise.all([
                    api.payroll.getAll(selectedMonth),
                    api.users.getAll(),
                ])

                if (payrollRes.success) {
                    setPayrolls(payrollRes.data || [])
                }

                if (employeesRes.success) {
                    setEmployees((employeesRes.data || []).filter((user: any) => user.role === "employee"))
                }
            } catch (error) {
                console.error("Failed to fetch data:", error)
                toast({ description: "Failed to load report data", variant: "destructive" })
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [selectedMonth, toast])

    useEffect(() => {
        const fetchBranding = async () => {
            try {
                const res = await api.company.getBranding()
                if (res && res.success) {
                    setBranding(res.data || {})
                }
            } catch (error) {
                // non-blocking
                console.error('Failed to fetch branding', error)
            }
        }

        fetchBranding()
    }, [])

    const reportData = useMemo(() => generateRemunerationReport(payrolls, employees, activeTab), [payrolls, employees, activeTab])
    const reportColumns = useMemo(() => getReportColumns(activeTab), [activeTab])
    const summaries = calculateReportSummaries(payrolls)

    const getReportTitle = () => {
        switch (activeTab) {
            case 'net':
                return 'Net Salaries'
            case 'sha':
                return 'SHA Payments'
            case 'tax':
                return 'Tax (PAYE) Deductions'
            case 'nssf':
                return 'NSSF Deductions'
            case 'helb':
                return 'HELB Deductions'
            default:
                return 'Report'
        }
    }

    const handleExport = () => {
        const data = reportData
        if (data.length === 0) {
            toast({ description: "No data to export", variant: "destructive" })
            return
        }
        exportToExcel(data, `${activeTab}-report-${selectedMonth}`, getReportTitle())
        toast({ description: "Report exported successfully" })
    }

    return (
        <div className="space-y-8 p-6">
            <AccountsModuleNav groupId="payroll" />
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Remuneration Reports</h1>
                <p className="text-muted-foreground mt-2">View and export detailed payroll breakdowns by deduction type</p>
            </div>

            <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Select Month</label>
                <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="px-3 py-2 border rounded-md"
                />
            </div>

            {loading ? (
                <TableSkeleton rows={8} />
            ) : payrolls.length === 0 ? (
                <Card>
                    <CardContent className="p-12 text-center text-muted-foreground">
                        <p>No payroll records found for {selectedMonth}</p>
                    </CardContent>
                </Card>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
                        <Card className="overflow-hidden" style={{ borderColor: (branding.primaryColor || 'var(--brand-primary)') + '20' }}>
                            <CardContent className="p-4 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Total Employees</p>
                                <p className="text-2xl font-bold">{summaries.totalEmployees}</p>
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden" style={{ borderColor: (branding.primaryColor || 'var(--brand-primary)') + '20' }}>
                            <CardContent className="p-4 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Net Salaries</p>
                                <p className="text-lg font-bold">KES {summaries.netSalaries.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden" style={{ borderColor: (branding.primaryColor || 'var(--brand-primary)') + '20' }}>
                            <CardContent className="p-4 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Total Tax</p>
                                <p className="text-lg font-bold">KES {summaries.totalTax.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden" style={{ borderColor: (branding.primaryColor || 'var(--brand-primary)') + '20' }}>
                            <CardContent className="p-4 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Total SHA</p>
                                <p className="text-lg font-bold">KES {summaries.totalSHA.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden" style={{ borderColor: (branding.primaryColor || 'var(--brand-primary)') + '20' }}>
                            <CardContent className="p-4 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Total NSSF</p>
                                <p className="text-lg font-bold">KES {summaries.totalNSSF.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card className="overflow-hidden" style={{ borderColor: (branding.primaryColor || 'var(--brand-primary)') + '20' }}>
                            <CardContent className="p-4 space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Total HELB</p>
                                <p className="text-lg font-bold">KES {summaries.totalHELB.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader className="border-b space-y-4">
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>{getReportTitle()} Report - {selectedMonth}</CardTitle>
                                <Button
                                    onClick={handleExport}
                                    size="sm"
                                    variant="outline"
                                    className="gap-2"
                                    style={{
                                        backgroundColor: branding.primaryColor || undefined,
                                        color: '#ffffff',
                                        borderColor: (branding.primaryColor || 'var(--brand-primary)') + 'dd',
                                    }}
                                >
                                    <Download className="w-4 h-4" />
                                    Export Excel
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(['net', 'sha', 'tax', 'nssf', 'helb'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 py-2 text-sm font-medium rounded-md border transition-colors`}
                                        style={
                                            activeTab === tab
                                                ? {
                                                      backgroundColor: branding.primaryColor || '#2563eb',
                                                      color: '#ffffff',
                                                      borderColor: (branding.primaryColor || '#2563eb') + 'dd',
                                                  }
                                                : undefined
                                        }
                                    >
                                        {tab === 'net' && 'Net Salaries'}
                                        {tab === 'sha' && 'SHA'}
                                        {tab === 'tax' && 'Tax'}
                                        {tab === 'nssf' && 'NSSF'}
                                        {tab === 'helb' && 'HELB'}
                                    </button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            {reportColumns.map((column) => (
                                                <th key={column.key} className="px-6 py-3 font-semibold text-slate-700 whitespace-nowrap">
                                                    {column.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {reportData.length > 0 ? (
                                            reportData.map((row: any, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    {reportColumns.map((column) => (
                                                        <td key={column.key} className="px-6 py-3 text-slate-900 whitespace-nowrap">
                                                            {(() => {
                                                                const value = row[String(column.key)]
                                                                return typeof value === 'number' ? value.toLocaleString() : value
                                                            })()}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={10} className="px-6 py-8 text-center text-muted-foreground">
                                                    No data available for this report
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}