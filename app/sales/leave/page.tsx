"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { CalendarDays, Palmtree } from "lucide-react"
import { LeaveApplicationForm } from "@/components/leave/leave-application-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useSalesBranding } from "@/hooks/use-sales-branding"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"
import { SalesEmpty, SalesHeader, SalesPage, SalesStatusBadge } from "@/components/sales/sales-ui"

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

export default function SalesLeavePage() {
  const branding = useSalesBranding()
  const [balance, setBalance] = useState<any>(null)
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, requestsRes] = await Promise.all([
        api.leave.getBalance(),
        api.leave.getMyRequests(),
      ])
      if (balanceRes.success) setBalance(balanceRes.data)
      if (requestsRes.success) setRequests(requestsRes.data || [])
    } catch (error) {
      console.error("Failed to fetch leave data", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const pendingCount = requests.filter((item) => item.status === "pending").length

  return (
    <SalesPage>
      <SalesHeader
        color={branding.primaryColor}
        title="Leave tracker"
        description="Check your balance, apply for leave, and follow requests until HR or your manager responds."
      />

      {loading ? (
        <PageLoadingSkeleton title="Loading leave" rows={4} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                {
                  label: "Annual",
                  value: remaining(balance?.annual_total, balance?.annual_used),
                  total: balance?.annual_total,
                },
                {
                  label: "Sick",
                  value: remaining(balance?.sick_total, balance?.sick_used),
                  total: balance?.sick_total,
                },
                {
                  label: "Maternity",
                  value: remaining(balance?.maternity_total, balance?.maternity_used),
                  total: balance?.maternity_total,
                },
                {
                  label: "Paternity",
                  value: remaining(balance?.paternity_total, balance?.paternity_used),
                  total: balance?.paternity_total,
                },
                {
                  label: "Unpaid used",
                  value: Number(balance?.unpaid_used || 0),
                },
                {
                  label: "Pending requests",
                  value: pendingCount,
                },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-medium text-slate-500">{item.label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                    {item.value}
                    {item.total != null ? (
                      <span className="ml-1 text-xs font-normal text-slate-500">/ {item.total}</span>
                    ) : null}
                  </p>
                  {item.total != null ? <p className="text-[11px] text-slate-500">days left</p> : null}
                </div>
              ))}
            </div>

            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4" />
                  Request history
                </CardTitle>
              </CardHeader>
              <CardContent>
                {requests.length === 0 ? (
                  <SalesEmpty
                    title="No leave requests yet"
                    description="Apply on the right. Your manager or HR will review it."
                  />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {requests.map((req) => (
                      <div key={req._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-slate-900">{req.type} leave</p>
                            <SalesStatusBadge
                              status={
                                req.status === "approved"
                                  ? "completed"
                                  : req.status === "rejected"
                                    ? "cancelled"
                                    : "pending"
                              }
                              label={req.status}
                            />
                          </div>
                          <p className="text-sm text-slate-600">
                            {format(new Date(req.startDate), "MMM d, yyyy")} – {format(new Date(req.endDate), "MMM d, yyyy")}
                          </p>
                          {req.reason ? <p className="mt-1 text-xs text-slate-500">“{req.reason}”</p> : null}
                          {req.manager_comment ? (
                            <p className="mt-1 text-xs text-slate-600">Review note: {req.manager_comment}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-xs text-slate-500">
                          Applied {format(new Date(req.createdAt), "MMM d")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Palmtree className="h-4 w-4" style={{ color: branding.primaryColor }} />
              Submit a request. Visit reports still need an approved planner on working days.
            </p>
            <LeaveApplicationForm onSuccess={() => void fetchData()} />
          </div>
        </div>
      )}
    </SalesPage>
  )
}
