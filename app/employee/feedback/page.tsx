"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Star, MessageSquare, User } from "lucide-react"
import Link from "next/link"

interface Feedback {
  id: string
  from: string
  role: string
  rating: number
  feedback: string
  date: string
  type: "peer" | "manager"
}

export default function FeedbackPage() {
  const feedbackList: Feedback[] = [
    {
      id: "1",
      from: "Sarah Johnson",
      role: "Direct Manager",
      rating: 5,
      feedback:
        "Excellent performance this quarter. Your communication skills have improved significantly. Keep maintaining this level of excellence.",
      date: "2024-06-15",
      type: "manager",
    },
    {
      id: "2",
      from: "Michael Chen",
      role: "Peer - Engineering",
      rating: 4,
      feedback: "Great collaboration on the Q2 project. Your technical insights were really valuable to the team.",
      date: "2024-06-10",
      type: "peer",
    },
    {
      id: "3",
      from: "Emma Rodriguez",
      role: "Peer - Marketing",
      rating: 5,
      feedback:
        "Always willing to help and provide support. Your positive attitude makes a big difference in the team.",
      date: "2024-06-05",
      type: "peer",
    },
    {
      id: "4",
      from: "David Kim",
      role: "Direct Manager",
      rating: 4,
      feedback: "Good progress on the leadership development plan. Consider working on delegation skills.",
      date: "2024-05-20",
      type: "manager",
    },
  ]

  const averageRating = (feedbackList.reduce((sum, f) => sum + f.rating, 0) / feedbackList.length).toFixed(1)

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">E</span>
              </div>
              <span className="font-bold hidden sm:inline">Elevate</span>
            </Link>
            <Link href="/employee" className="text-foreground hover:text-primary transition">
              Dashboard
            </Link>
            <span className="text-foreground">Feedback</span>
          </div>
          <button className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition">
            <span className="text-primary font-semibold">SJ</span>
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">360 Degree Feedback</h1>
            <p className="text-muted-foreground">Feedback from managers and peers</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <MessageSquare size={18} className="mr-2" />
            Request Feedback
          </Button>
        </div>

        {/* Summary Card */}
        <Card className="p-6 border-border bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-sm text-muted-foreground">Average Rating</p>
              <p className="text-4xl font-bold mt-2">{averageRating}/5</p>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={24}
                  className={
                    i < Math.round(Number.parseFloat(averageRating)) ? "fill-accent text-accent" : "text-border"
                  }
                />
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Based on {feedbackList.length} feedback entries</p>
              <p>From 3 managers and peers</p>
            </div>
          </div>
        </Card>

        {/* Feedback List */}
        <div className="space-y-4">
          {feedbackList.map((feedback) => (
            <Card key={feedback.id} className="p-6 border-border hover:border-primary/50 transition">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <User size={24} className="text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{feedback.from}</h3>
                      <p className="text-sm text-muted-foreground">{feedback.role}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-1 justify-end mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={i < feedback.rating ? "fill-accent text-accent" : "text-border"}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{feedback.date}</p>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-foreground leading-relaxed">{feedback.feedback}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
