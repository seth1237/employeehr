"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { Loader2, Calendar } from "lucide-react"

interface LeaveApplicationFormProps {
    onSuccess?: () => void
}

export function LeaveApplicationForm({ onSuccess }: LeaveApplicationFormProps) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)
    const [type, setType] = useState("Annual")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const [reason, setReason] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (!startDate || !endDate) {
                throw new Error("Please select start and end dates")
            }

            await api.leave.apply({
                type,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason
            })

            toast({
                description: "Leave application submitted successfully",
            })

            setType("Annual")
            setStartDate("")
            setEndDate("")
            setReason("")
            onSuccess?.()
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error",
                description: error.message || "Failed to submit leave application",
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Apply for Leave
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Leave Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Annual">Annual Leave</SelectItem>
                                <SelectItem value="Sick">Sick Leave</SelectItem>
                                <SelectItem value="Maternity">Maternity Leave</SelectItem>
                                <SelectItem value="Paternity">Paternity Leave</SelectItem>
                                <SelectItem value="Unpaid">Unpaid Leave</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Start Date</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>End Date</Label>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Reason</Label>
                        <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Briefly explain why you are taking leave..."
                            required
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit Request
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
