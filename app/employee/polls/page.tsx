"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { Vote, BarChart3, CheckCircle } from "lucide-react"

// API base URL handled by lib/apiBase

interface PollOption {
  _id: string
  text: string
  votes: number
}

interface Poll {
  _id: string
  title: string
  description?: string
  poll_type: string
  options: PollOption[]
  total_votes: number
  status: "active" | "closed"
  end_date: string
  show_results_before_voting: boolean
}

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPolls()
  }, [])

  const fetchPolls = async () => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/polls`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()
      if (data.success) {
        setPolls(data.data)
        if (data.votedPollIds && Array.isArray(data.votedPollIds)) {
          setVotedPolls(new Set(data.votedPollIds))
        }
      }
    } catch (error) {
      console.error("Error fetching polls:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const token = getToken()
      const response = await fetch(`${API_URL}/api/polls/${pollId}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ option_ids: [optionId] }),
      })

      const data = await response.json()
      if (data.success) {
        setVotedPolls(new Set([...votedPolls, pollId]))
        setPolls(polls.map((p) => (p._id === pollId ? data.data : p)))
      } else {
        console.error("Vote failed:", data.message)
        alert(`Failed to vote: ${data.message || "Unknown error"}`)
      }
    } catch (error) {
      console.error("Error voting:", error)
      alert("Failed to vote. Please try again.")
    }
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      employee_of_month: "bg-yellow-100 text-yellow-800",
      policy_change: "bg-blue-100 text-blue-800",
      event_date: "bg-green-100 text-green-800",
      general: "bg-purple-100 text-purple-800",
      department: "bg-pink-100 text-pink-800",
    }
    return colors[type] || "bg-gray-100 text-gray-800"
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Voting & Polls</h1>
        <p className="text-muted-foreground mt-1">
          Have your say on company decisions and initiatives
        </p>
      </div>

      <div className="grid gap-6">
        {polls.length === 0 ? (
          <Card className="p-8 text-center">
            <Vote className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No active polls at the moment</p>
          </Card>
        ) : (
          polls.map((poll) => {
            const hasVoted = votedPolls.has(poll._id)
            const showResults = hasVoted || poll.show_results_before_voting || poll.status === "closed"

            return (
              <Card key={poll._id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{poll.title}</h3>
                      <Badge className={getTypeColor(poll.poll_type)}>
                        {poll.poll_type.replace("_", " ")}
                      </Badge>
                      {poll.status === "closed" && (
                        <Badge variant="outline" className="border-red-200 text-red-600">
                          Closed
                        </Badge>
                      )}
                    </div>
                    {poll.description && (
                      <p className="text-muted-foreground mb-4">{poll.description}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {poll.options.map((option) => {
                    const percentage =
                      poll.total_votes > 0
                        ? ((option.votes / poll.total_votes) * 100).toFixed(1)
                        : "0"

                    return (
                      <div key={option._id} className="space-y-2">
                        {showResults ? (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{option.text}</span>
                              <span className="text-sm text-muted-foreground">
                                {option.votes} votes ({percentage}%)
                              </span>
                            </div>
                            <Progress value={Number(percentage)} className="h-2" />
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => handleVote(poll._id, option._id)}
                            disabled={poll.status === "closed"}
                          >
                            {option.text}
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t text-sm text-muted-foreground">
                  <div className="flex items-center gap-4">
                    {hasVoted && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>You voted</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      <span>{poll.total_votes} total votes</span>
                    </div>
                  </div>
                  {poll.end_date && (
                    <span>Ends: {new Date(poll.end_date).toLocaleDateString()}</span>
                  )}
                </div>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
