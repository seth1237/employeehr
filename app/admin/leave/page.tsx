"use client"

import { useEffect, useState } from "react"
import { finishDataLoad, startDataLoad, type SilentLoadOptions } from "@/lib/silent-load"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Loader2, Check, X, Calendar, Filter } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TableSkeleton } from "@/components/admin/ui/page-states"

export default function AdminLeavePage() {
    const { toast } = useToast()
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [processing, setProcessing] = useState<string | null>(null)
    const [statusFilter, setStatusFilter] = useState("all")

    const fetchRequests = async (opts?: SilentLoadOptions) => {
        const silent = startDataLoad(opts, setLoading, setRefreshing)
        try {
            const res = await api.leave.getAllRequests()
            if (res.success) {
                setRequests(res.data || [])
            }
        } catch (error) {
            console.error("Failed to fetch requests", error)
        } finally {
            finishDataLoad(silent, setLoading, setRefreshing)
        }
    }

    useEffect(() => {
        fetchRequests()
    }, [])

    const handleAction = async (id: string, status: 'approved' | 'rejected') => {
        setProcessing(id)
        try {
            await api.leave.updateStatus(id, { status })
            toast({ description: `Request ${status} successfully` })
            fetchRequests({ silent: true })
        } catch (error: any) {
            toast({
                variant: "destructive",
                description: error.message || "Failed to update status"
            })
        } finally {
            setProcessing(null)
        }
    }

    const filteredRequests = requests.filter(req => {
        if (statusFilter === 'all') return true
        return req.status === statusFilter
    })

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Leave Management</h1>
                    <p className="text-muted-foreground">Monitor and manage all employee leave requests.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Filter Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    {loading && requests.length === 0 ? (
                        <TableSkeleton rows={8} />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 text-gray-700 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Employee</th>
                                        <th className="px-6 py-4">Leave Type</th>
                                        <th className="px-6 py-4">Duration</th>
                                        <th className="px-6 py-4">Reason</th>
                                        <th className="px-6 py-4">Applied On</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredRequests.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-8 text-muted-foreground">
                                                No requests found matching filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRequests.map((req) => (
                                            <tr key={req._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-medium">
                                                    {req.user ? (
                                                        <div>
                                                            <p>{req.user.firstName} {req.user.lastName}</p>
                                                            <p className="text-xs text-muted-foreground">{req.user.email}</p>
                                                        </div>
                                                    ) : 'Unknown User'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant="outline" className="bg-white">{req.type}</Badge>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col text-xs">
                                                        <span>{format(new Date(req.startDate), 'MMM d, yyyy')}</span>
                                                        <span className="text-center text-muted-foreground">to</span>
                                                        <span>{format(new Date(req.endDate), 'MMM d, yyyy')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-xs truncate" title={req.reason}>
                                                    {req.reason}
                                                </td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {format(new Date(req.createdAt), 'MMM d')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge variant={
                                                        req.status === 'approved' ? 'default' :
                                                            req.status === 'rejected' ? 'destructive' : 'secondary'
                                                    }>
                                                        {req.status.toUpperCase()}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {req.status === 'pending' && (
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                                                onClick={() => handleAction(req._id, 'rejected')}
                                                                disabled={processing === req._id}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="text-green-600 hover:text-green-700 hover:bg-green-50 h-8 w-8 p-0"
                                                                onClick={() => handleAction(req._id, 'approved')}
                                                                disabled={processing === req._id}
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
