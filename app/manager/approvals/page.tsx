"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle2, Clock, XCircle } from "lucide-react"

const approvals = [
  { id: 1, type: "Leave Request", name: "Jane Doe", detail: "3 days annual leave", status: "pending", date: "2026-05-18" },
  { id: 2, type: "Task Change", name: "John Smith", detail: "Shift allocation update", status: "pending", date: "2026-05-19" },
  { id: 3, type: "Expense Claim", name: "Mary Wanjiku", detail: "KSh 5,500 reimbursement", status: "pending", date: "2026-05-17" },
]

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-white shadow-sm">
        <CardHeader>
          <Badge className="w-fit bg-slate-100 text-slate-800 hover:bg-slate-200">Approvals</Badge>
          <CardTitle className="text-2xl">Manager Approval Queue</CardTitle>
          <p className="text-sm text-muted-foreground">Review requests from your department and act on them quickly.</p>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {approvals.map((approval) => (
          <Card key={approval.id} className="border-border/70 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-900">{approval.name}</h3>
                    <Badge variant="outline">{approval.type}</Badge>
                    <Badge variant="secondary" className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{approval.detail}</p>
                  <p className="text-xs text-muted-foreground">Submitted: {new Date(approval.date).toLocaleDateString()}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Approve
                  </Button>
                  <Button variant="outline" className="gap-2 text-red-700">
                    <XCircle className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
