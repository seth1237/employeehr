"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { Trophy, Award, Star, Medal } from "lucide-react"


interface BadgeData {
  _id: string
  name: string
  description: string
  icon: string
  color: string
  category: string
  criteria: string
  points: number
}

interface UserBadge {
  _id: string
  badge_id: BadgeData
  awarded_at: string
  reason?: string
}

interface LeaderboardEntry {
  _id: string
  total_points: number
  badge_count: number
}

export default function BadgesPage() {
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = getToken()

      const [badgesRes, leaderboardRes] = await Promise.all([
        fetch(`${API_URL}/api/badges/user`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/badges/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const badgesData = await badgesRes.json()
      const leaderboardData = await leaderboardRes.json()

      if (badgesData.success) {
        setUserBadges(badgesData.data)
      }
      if (leaderboardData.success) {
        setLeaderboard(leaderboardData.data)
      }
    } catch (error) {
      console.error("Error fetching badges:", error)
    } finally {
      setLoading(false)
    }
  }

  const getBadgeIcon = (icon: string) => {
    switch (icon) {
      case "trophy":
        return <Trophy className="h-8 w-8" />
      case "award":
        return <Award className="h-8 w-8" />
      case "star":
        return <Star className="h-8 w-8" />
      case "medal":
        return <Medal className="h-8 w-8" />
      default:
        return <Trophy className="h-8 w-8" />
    }
  }

  if (loading) {
    return <div className="p-6">Loading...</div>
  }

  const totalPoints = userBadges.reduce((sum, ub) => sum + (ub.badge_id?.points || 0), 0)

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Your Badges</h1>
        <p className="text-muted-foreground mt-1">
          Earn badges for your achievements and contributions
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{userBadges.length}</p>
              <p className="text-sm text-muted-foreground">Total Badges</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Star className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPoints}</p>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Medal className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                #{leaderboard.findIndex((l) => l._id === userBadges[0]?.badge_id?._id) + 1 || "-"}
              </p>
              <p className="text-sm text-muted-foreground">Leaderboard Rank</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-bold mb-4">Your Badges</h2>
          <div className="space-y-4">
            {userBadges.length === 0 ? (
              <Card className="p-8 text-center">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No badges yet. Keep up the great work to earn your first badge!
                </p>
              </Card>
            ) : (
              userBadges.map((userBadge) => (
                <Card key={userBadge._id} className="p-6">
                  <div className="flex items-start gap-4">
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: `${userBadge.badge_id.color}20` }}
                    >
                      {getBadgeIcon(userBadge.badge_id.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{userBadge.badge_id.name}</h3>
                        <Badge>{userBadge.badge_id.points} pts</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {userBadge.badge_id.description}
                      </p>
                      {userBadge.reason && (
                        <p className="text-sm italic">Awarded for: {userBadge.reason}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Earned on {new Date(userBadge.awarded_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-bold mb-4">Leaderboard</h2>
          <Card className="p-6">
            <div className="space-y-4">
              {leaderboard.map((entry, index) => (
                <div key={entry._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0
                          ? "bg-yellow-100 text-yellow-600"
                          : index === 1
                          ? "bg-gray-100 text-gray-600"
                          : index === 2
                          ? "bg-orange-100 text-orange-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">User {entry._id.slice(-6)}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.badge_count} badges
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">{entry.total_points} pts</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
