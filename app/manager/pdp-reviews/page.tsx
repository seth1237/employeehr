"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface PDPReview {
  id: string
  employeeName: string
  pdpTitle: string
  submittedDate: string
  completion: number
  status: "pending" | "approved" | "rejected"
}

export default function PDPReviewsPage() {
  const [selectedPDP, setSelectedPDP] = useState<PDPReview | null>(null)
  const [comment, setComment] = useState("")

  const pdps: PDPReview[] = [
    {
      id: "1",
      employeeName: "Michael Chen",
      pdpTitle: "Leadership Skills Development",
      submittedDate: "Jun 10, 2024",
      completion: 75,
      status: "pending",
    },
    {
      id: "2",
      employeeName: "Emma Rodriguez",
      pdpTitle: "Technical Skills Upgrade",
      submittedDate: "Jun 08, 2024",
      completion: 60,
      status: "pending",
    },
    {
      id: "3",
      employeeName: "David Kim",
      pdpTitle: "Customer Communication",
      submittedDate: "Jun 05, 2024",
      completion: 85,
      status: "approved",
    },
    {
      id: "4",
      employeeName: "Sarah Johnson",
      pdpTitle: "Advanced Analytics",
      submittedDate: "May 30, 2024",
      completion: 45,
      status: "rejected",
    },
  ]

  const handleApprove = () => {
    console.log("PDP approved")
    setSelectedPDP(null)
  }

  const handleReject = () => {
    console.log("PDP rejected with comment:", comment)
    setSelectedPDP(null)
  }

  if (selectedPDP) {
    return (
      <div className="min-h-screen bg-background">
        <nav className="border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
            <button
              onClick={() => setSelectedPDP(null)}
              className="flex items-center gap-2 text-primary hover:text-primary/80"
            >
              <ArrowLeft size={18} />
              Back to PDP Reviews
            </button>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Review PDP</h1>
            <p className="text-muted-foreground">
              {selectedPDP.employeeName} - {selectedPDP.pdpTitle}
            </p>
          </div>

          <Card className="p-8 border-border">
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Completion Status</p>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-secondary rounded-full h-3">
                    <div
                      className="bg-primary h-3 rounded-full transition-all"
                      style={{ width: `${selectedPDP.completion}%` }}
                    ></div>
                  </div>
                  <span className="font-bold">{selectedPDP.completion}%</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Milestones</h3>
                <div className="space-y-2">
                  {["Complete training", "Apply skills to project", "Document progress"].map((milestone, i) => (
                    <div key={i} className="flex gap-3 p-3 bg-secondary rounded-lg">
                      <CheckCircle2 size={20} className="text-accent" />
                      <span>{milestone}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Manager Comments</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Provide feedback on the PDP..."
                  className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={4}
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPDP(null)
                    setComment("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive hover:bg-destructive/10 bg-transparent"
                  onClick={handleReject}
                >
                  <XCircle size={18} className="mr-2" />
                  Reject
                </Button>
                <Button onClick={handleApprove} className="bg-primary hover:bg-primary/90">
                  <CheckCircle2 size={18} className="mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
          <Link href="/manager" className="flex items-center gap-2 text-primary hover:text-primary/80">
            <ArrowLeft size={18} />
            Back to Manager Hub
          </Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">PDP Reviews</h1>
          <p className="text-muted-foreground">Review and approve personal development plans from your team</p>
        </div>

        <div className="space-y-3">
          {pdps.map((pdp) => (
            <Card
              key={pdp.id}
              className="p-6 border-border hover:border-primary/50 cursor-pointer transition"
              onClick={() => setSelectedPDP(pdp)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{pdp.employeeName}</h3>
                  <p className="text-sm text-muted-foreground">{pdp.pdpTitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">Submitted: {pdp.submittedDate}</p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    pdp.status === "approved"
                      ? "bg-accent/20 text-accent"
                      : pdp.status === "rejected"
                        ? "bg-destructive/20 text-destructive"
                        : "bg-primary/20 text-primary"
                  }`}
                >
                  {pdp.status.charAt(0).toUpperCase() + pdp.status.slice(1)}
                </span>
              </div>
              <div className="bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${pdp.completion}%` }}
                ></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
