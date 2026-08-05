"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { format } from "date-fns"
import { Loader2, Download, DollarSign, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function EmployeePayrollPage() {
    const router = useRouter()
    const [payslips, setPayslips] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPayslips = async () => {
            try {
                const res = await api.payroll.getMyPayslips()
                if (res.success) {
                    setPayslips(res.data)
                }
            } catch (error) {
                console.error("Failed to fetch payslips", error)
            } finally {
                setLoading(false)
            }
        }
        fetchPayslips()
    }, [])

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
        }).format(amount)
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">My Payslips</h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <DollarSign className="w-5 h-5" />
                    <span className="text-sm">Total Records: {payslips.length}</span>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                    {payslips.length === 0 ? (
                        <div className="text-center py-12">
                            <DollarSign className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">No payslips available yet.</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Your payslips will appear here once HR processes payroll.
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Month</TableHead>
                                    <TableHead>Base Salary</TableHead>
                                    <TableHead>Bonus</TableHead>
                                    <TableHead>Deductions</TableHead>
                                    <TableHead className="font-bold">Net Pay</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payslips.map((slip) => (
                                    <TableRow key={slip._id}>
                                        <TableCell className="font-medium">{slip.month}</TableCell>
                                        <TableCell>{formatCurrency(slip.base_salary)}</TableCell>
                                        <TableCell className="text-green-600">
                                            {slip.bonus > 0 ? `+ ${formatCurrency(slip.bonus)}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-red-600">
                                            {slip.total_deductions > 0 ? `- ${formatCurrency(slip.total_deductions)}` : "-"}
                                        </TableCell>
                                        <TableCell className="font-bold text-lg">
                                            {formatCurrency(slip.net_pay)}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${
                                                    slip.status === "paid"
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-yellow-100 text-yellow-700"
                                                }`}
                                            >
                                                {slip.status.toUpperCase()}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.push(`/employee/payslip/${slip._id}`)}
                                                className="gap-2"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View & Download
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
