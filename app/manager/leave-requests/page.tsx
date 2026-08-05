"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { Loader2, Check, X } from "lucide-react"

export default function ManagerLeaveRequestsPage() {
    const { toast } = useToast()
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)

    const fetchRequests = async () => {
        try {
            const res = await api.leave.getTeamRequests()
            if (res.success) {
                setRequests(res.data)
            }
        } catch (error) {
            console.error("Failed to fetch requests", error)
        } finally {
            setLoading(false)
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
            fetchRequests() // Refresh list
        } catch (error: any) {
            toast({
                variant: "destructive",
                description: error.message || "Failed to update status"
            })
        } finally {
            setProcessing(null)
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold">Leave Requests</h1>
            <p className="text-muted-foreground">Manage leave requests from your team members.</p>

            <div className="grid gap-4">
                {requests.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            No pending leave requests.
                        </CardContent>
                    </Card>
                ) : (
                    requests.map((req) => (
                        <Card key={req._id}>
                            <CardContent className="p-6 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                                <div className="space-y-1">
                                    {/* Assuming user details populated manually or simple ID for now if populate failed */}
                                    <h3 className="font-semibold text-lg">
                                        {typeof req.user_id === 'object' ? `${req.user_id.firstName} ${req.user_id.lastName}` : 'Employee Request'}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span className="font-medium text-black px-2 py-0.5 bg-gray-100 rounded">{req.type}</span>
                                        <span>•</span>
                                        <span>{format(new Date(req.startDate), 'MMM d')} - {format(new Date(req.endDate), 'MMM d, yyyy')}</span>
                                    </div>
                                    <p className="text-sm italic mt-2">"{req.reason}"</p>
                                </div>

                                <div className="flex gap-2 w-full md:w-auto">
                                    <Button
                                        variant="outline"
                                        className="flex-1 md:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => handleAction(req._id, 'rejected')}
                                        disabled={processing === req._id}
                                    >
                                        <X className="w-4 h-4 mr-2" />
                                        Reject
                                    </Button>
                                    <Button
                                        className="flex-1 md:flex-none bg-green-600 hover:bg-green-700"
                                        onClick={() => handleAction(req._id, 'approved')}
                                        disabled={processing === req._id}
                                    >
                                        <Check className="w-4 h-4 mr-2" />
                                        Approve
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
