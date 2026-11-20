"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { LeaveApplicationForm } from "@/components/leave/leave-application-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import {
  EngineerHeader,
  EngineerPage,
  EngineerStatusBadge,
} from "@/components/engineer/engineer-ui"

type LeaveRequest = {
  _id: string
  type: string
  status: "pending" | "approved" | "rejected"
  startDate: string
  endDate: string
  reason?: string
  manager_comment?: string
  createdAt: string
}

function remaining(total?: number, used?: number) {
  return Math.max(0, Number(total || 0) - Number(used || 0))
}

export default function EngineerLeavePage() {
  const [balance, setBalance] = useState<any>(null)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, requestsRes] = await Promise.all([
        api.leave.getBalance(),
        api.leave.getMyRequests(),
      ])
      if (balanceRes?.success) setBalance(balanceRes.data)
      if (requestsRes?.success) setRequests(requestsRes.data || [])
    } catch (error) {
      console.error("Failed to fetch leave data", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  if (loading) return <PageLoadingSkeleton title="Leave" />

  return (
    <EngineerPage>
      <EngineerHeader
        title="Leave"
        description="Request leave and follow the status of each request."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {[
              { label: "Annual", value: remaining(balance?.annual_total, balance?.annual_used), total: balance?.annual_total },
              { label: "Sick", value: remaining(balance?.sick_total, balance?.sick_used), total: balance?.sick_total },
              { label: "Pending", value: requests.filter((item) => item.status === "pending").length },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs font-medium text-slate-500">{item.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                  {item.value}
                  {item.total != null ? (
                    <span className="ml-1 text-xs font-normal text-slate-500">/ {item.total}</span>
                  ) : null}
                </p>
              </div>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Your leave</CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">No leave requests yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {requests.map((req) => (
                    <div key={req._id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-slate-900">{req.type} leave</p>
                          <EngineerStatusBadge
                            status={
                              req.status === "approved"
                                ? "completed"
                                : req.status === "rejected"
                                  ? "cancelled"
                                  : "assigned"
                            }
                            label={req.status}
                          />
                        </div>
                        <p className="text-sm text-slate-600">
                          {format(new Date(req.startDate), "MMM d, yyyy")} – {format(new Date(req.endDate), "MMM d, yyyy")}
                        </p>
                        {req.reason ? <p className="mt-1 text-xs text-slate-500">{req.reason}</p> : null}
                        {req.manager_comment ? (
                          <p className="mt-1 text-xs text-slate-600">Note: {req.manager_comment}</p>
                        ) : null}
                      </div>
                      <p className="shrink-0 text-xs text-slate-500">
                        {format(new Date(req.createdAt), "MMM d")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <LeaveApplicationForm onSuccess={() => void fetchData()} />
      </div>
    </EngineerPage>
  )
}
