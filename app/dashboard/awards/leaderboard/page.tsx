"use client"

import { Card } from "@/components/ui/card"
import { Award } from "lucide-react"

interface LeaderboardEntry {
  rank: number
  name: string
  department: string
  score: number
  awards: number
  trend: "up" | "down" | "stable"
}

export default function LeaderboardPage() {
  const leaderboard: LeaderboardEntry[] = [
    { rank: 1, name: "Sarah Johnson", department: "Sales", score: 9.2, awards: 3, trend: "up" },
    { rank: 2, name: "Michael Chen", department: "Engineering", score: 8.9, awards: 2, trend: "up" },
    { rank: 3, name: "Emma Rodriguez", department: "Design", score: 8.7, awards: 2, trend: "stable" },
    { rank: 4, name: "Lisa Wang", department: "Operations", score: 8.5, awards: 1, trend: "up" },
    { rank: 5, name: "John Davis", department: "HR", score: 8.3, awards: 1, trend: "down" },
    { rank: 6, name: "Maria Garcia", department: "Marketing", score: 8.1, awards: 1, trend: "stable" },
    { rank: 7, name: "David Kim", department: "Sales", score: 7.8, awards: 0, trend: "up" },
    { rank: 8, name: "James Wilson", department: "Engineering", score: 7.6, awards: 0, trend: "down" },
  ]

  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return "🥇"
      case 2:
        return "🥈"
      case 3:
        return "🥉"
      default:
        return null
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Performance Leaderboard</h1>
        <p className="text-muted-foreground">Top performers across your organization</p>
      </div>

      {/* Top 3 Featured */}
      <div className="grid md:grid-cols-3 gap-6">
        {leaderboard.slice(0, 3).map((entry) => (
          <Card
            key={entry.rank}
            className={`p-6 border-border relative overflow-hidden ${entry.rank === 1 ? "ring-2 ring-accent" : ""}`}
          >
            <div className="absolute top-0 right-0 text-6xl opacity-10">{getMedalIcon(entry.rank)}</div>
            <div className="relative">
              <div className="text-4xl mb-3">{getMedalIcon(entry.rank)}</div>
              <p className="text-sm text-muted-foreground mb-1">Rank #{entry.rank}</p>
              <h3 className="text-2xl font-bold">{entry.name}</h3>
              <p className="text-sm text-muted-foreground">{entry.department}</p>
              <div className="mt-4 pt-4 border-t border-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Performance Score</span>
                  <span className="text-lg font-bold text-primary">{entry.score}/10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Awards</span>
                  <span className="text-lg font-bold text-accent">{entry.awards}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Full Leaderboard */}
      <Card className="p-6 border-border">
        <h2 className="text-xl font-bold mb-6">Complete Rankings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Rank</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Employee</th>
                <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Department</th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Score</th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Awards</th>
                <th className="text-center py-3 px-4 font-semibold text-muted-foreground">Trend</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry.rank} className="border-b border-border hover:bg-secondary transition">
                  <td className="py-4 px-4 font-bold">{entry.rank}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="font-semibold text-primary">{entry.name.charAt(0)}</span>
                      </div>
                      <span className="font-medium">{entry.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-muted-foreground">{entry.department}</td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full font-semibold">
                      {entry.score}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {Array.from({ length: entry.awards }).map((_, i) => (
                        <Award key={i} size={16} className="fill-accent text-accent" />
                      ))}
                      {entry.awards === 0 && <span className="text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    {entry.trend === "up" && <span className="text-accent font-bold">↑</span>}
                    {entry.trend === "down" && <span className="text-destructive font-bold">↓</span>}
                    {entry.trend === "stable" && <span className="text-muted-foreground">→</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
