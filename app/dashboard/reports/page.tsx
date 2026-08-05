"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, BarChart3, Calendar } from "lucide-react"

interface Report {
  id: string
  name: string
  type: string
  description: string
  lastGenerated: string
  frequency: string
}

export default function ReportsPage() {
  const reports: Report[] = [
    {
      id: "1",
      name: "Monthly Performance Summary",
      type: "Performance",
      description: "Organization-wide performance metrics and trends",
      lastGenerated: "2024-06-30",
      frequency: "Monthly",
    },
    {
      id: "2",
      name: "PDP Completion Report",
      type: "Development",
      description: "Personal development plan progress and completion rates",
      lastGenerated: "2024-06-28",
      frequency: "Bi-weekly",
    },
    {
      id: "3",
      name: "Department Analytics",
      type: "Analytics",
      description: "Detailed performance breakdown by department",
      lastGenerated: "2024-06-29",
      frequency: "Monthly",
    },
    {
      id: "4",
      name: "Skill Gap Analysis",
      type: "Development",
      description: "Organization-wide skill gaps and training needs",
      lastGenerated: "2024-06-15",
      frequency: "Quarterly",
    },
    {
      id: "5",
      name: "Award Winners Report",
      type: "Recognition",
      description: "Summary of awards and recognitions issued",
      lastGenerated: "2024-06-30",
      frequency: "Monthly",
    },
    {
      id: "6",
      name: "Executive Summary",
      type: "Executive",
      description: "High-level overview for leadership and stakeholders",
      lastGenerated: "2024-06-30",
      frequency: "Monthly",
    },
  ]

  const handleDownload = (reportId: string) => {
    console.log("Downloading report:", reportId)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Performance":
        return "bg-primary/10 text-primary"
      case "Development":
        return "bg-accent/10 text-accent"
      case "Analytics":
        return "bg-blue-500/10 text-blue-500"
      case "Recognition":
        return "bg-purple-500/10 text-purple-500"
      case "Executive":
        return "bg-orange-500/10 text-orange-500"
      default:
        return "bg-muted"
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Generate and download organizational reports</p>
      </div>

      <div className="space-y-4">
        {reports.map((report) => (
          <Card key={report.id} className="p-6 border-border hover:border-primary/50 transition">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center mt-1">
                  <BarChart3 size={24} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{report.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                  <div className="flex gap-3 mt-3">
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${getTypeColor(report.type)}`}>
                      {report.type}
                    </span>
                    <span className="text-xs px-3 py-1 bg-secondary rounded-full font-medium text-muted-foreground">
                      <Calendar size={12} className="inline mr-1" />
                      {report.frequency}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-3">Last generated</p>
                <p className="text-sm font-medium mb-3">{report.lastGenerated}</p>
                <Button size="sm" onClick={() => handleDownload(report.id)} className="bg-primary hover:bg-primary/90">
                  <Download size={16} className="mr-1" />
                  Download
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Custom Report Section */}
      <Card className="p-8 border-border bg-gradient-to-br from-primary/5 to-accent/5">
        <h2 className="text-2xl font-bold mb-3">Need a Custom Report?</h2>
        <p className="text-muted-foreground mb-6">
          Create a custom report tailored to your specific needs and metrics.
        </p>
        <Button className="bg-primary hover:bg-primary/90">
          <FileText size={18} className="mr-2" />
          Build Custom Report
        </Button>
      </Card>
    </div>
  )
}
