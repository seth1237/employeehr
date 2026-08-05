"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BarChart3, FileText, Download } from "lucide-react"

const reports = [
  { id: 1, name: "Attendance Report", desc: "Team attendance and lateness summary", icon: BarChart3 },
  { id: 2, name: "Performance Report", desc: "Department KPI and rating summary", icon: FileText },
  { id: 3, name: "Leave Report", desc: "Approved, pending, and used leave", icon: FileText },
  { id: 4, name: "Compliance Report", desc: "Policy and operational compliance overview", icon: FileText },
]

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Reports</CardTitle>
          <p className="text-sm text-muted-foreground">Generate company-style departmental reports for your team and operations.</p>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Card key={report.id} className="border-border/70 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-slate-700" />
                      <h3 className="font-semibold text-slate-900">{report.name}</h3>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{report.desc}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="w-full gap-2">
                    <Download className="h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
