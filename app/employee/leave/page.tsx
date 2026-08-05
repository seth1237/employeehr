"use client"

import { useEffect, useState } from "react"
import { LeaveApplicationForm } from "@/components/leave/leave-application-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"

export default function EmployeeLeavePage() {
    const [balance, setBalance] = useState<any>(null)
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        try {
            const [balanceRes, requestsRes] = await Promise.all([
                api.leave.getBalance(),
                api.leave.getMyRequests()
            ])

            if (balanceRes.success) setBalance(balanceRes.data)
            if (requestsRes.success) setRequests(requestsRes.data)
        } catch (error) {
            console.error("Failed to fetch leave data", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Leave Management</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance Cards */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Your Leave Balance ({new Date().getFullYear()})</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg text-center">
                            <p className="text-sm text-blue-600 font-medium">Annual</p>
                            <p className="text-2xl font-bold text-blue-700">
                                {balance ? balance.annual_total - balance.annual_used : "-"}
                                <span className="text-xs text-blue-500 font-normal ml-1">/ {balance?.annual_total}</span>
                            </p>
                        </div>
                        <div className="p-4 bg-orange-50 rounded-lg text-center">
                            <p className="text-sm text-orange-600 font-medium">Sick</p>
                            <p className="text-2xl font-bold text-orange-700">
                                {balance ? balance.sick_total - balance.sick_used : "-"}
                                <span className="text-xs text-orange-500 font-normal ml-1">/ {balance?.sick_total}</span>
                            </p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg text-center">
                            <p className="text-sm text-purple-600 font-medium">Maternity</p>
                            <p className="text-2xl font-bold text-purple-700">
                                {balance ? balance.maternity_total - balance.maternity_used : "-"}
                                <span className="text-xs text-purple-500 font-normal ml-1">/ {balance?.maternity_total}</span>
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                            <p className="text-sm text-gray-600 font-medium">Unpaid</p>
                            <p className="text-2xl font-bold text-gray-700">
                                {balance ? balance.unpaid_used : "-"}
                                <span className="text-xs text-gray-500 font-normal ml-1"> days used</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Application Form */}
                <div className="md:col-span-1 md:row-span-2">
                    <LeaveApplicationForm onSuccess={fetchData} />
                </div>

                {/* Request History */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Request History</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {requests.length === 0 ? (
                                <p className="text-muted-foreground text-center py-4">No leave requests found.</p>
                            ) : (
                                requests.map((req) => (
                                    <div key={req._id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold">{req.type} Leave</p>
                                                <Badge variant={
                                                    req.status === 'approved' ? 'default' :
                                                        req.status === 'rejected' ? 'destructive' : 'secondary'
                                                }>
                                                    {req.status}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {format(new Date(req.startDate), 'MMM d, yyyy')} - {format(new Date(req.endDate), 'MMM d, yyyy')}
                                            </p>
                                            {req.reason && <p className="text-xs text-gray-500 mt-1 line-clamp-1">"{req.reason}"</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Applied on</p>
                                            <p className="text-sm">{format(new Date(req.createdAt), 'MMM d')}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
