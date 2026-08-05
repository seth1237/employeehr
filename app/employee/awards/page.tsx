"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Trophy, Medal, Star, Calendar } from "lucide-react"
import { getUser } from "@/lib/auth"
import API_URL from "@/lib/apiBase"

interface AwardType {
  _id: string
  title: string
  description: string
  category: string
  badge_icon: string
  points: number
  received_date: string
  awarded_by: {
    firstName: string
    lastName: string
  }
}

export default function AwardsPage() {
  const [awards, setAwards] = useState<AwardType[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAwards: 0,
    totalPoints: 0,
    recentAwards: 0,
  })

  useEffect(() => {
    fetchAwards()
  }, [])

  const fetchAwards = async () => {
    try {
      const user = getUser()
      if (!user) return

      const response = await fetch(`${API_URL}/api/awards/my-awards`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAwards(data.data || [])
        calculateStats(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch awards:", error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (awardsData: AwardType[]) => {
    const totalPoints = awardsData.reduce((sum, award) => sum + award.points, 0)
    const recentAwards = awardsData.filter((award) => {
      const awardDate = new Date(award.received_date)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return awardDate >= thirtyDaysAgo
    }).length

    setStats({
      totalAwards: awardsData.length,
      totalPoints,
      recentAwards,
    })
  }

  const getAwardIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "excellence":
        return <Trophy className="h-8 w-8 text-yellow-500" />
      case "innovation":
        return <Star className="h-8 w-8 text-purple-500" />
      case "leadership":
        return <Medal className="h-8 w-8 text-blue-500" />
      default:
        return <Award className="h-8 w-8 text-green-500" />
    }
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      excellence: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      innovation: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      leadership: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      teamwork: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      performance: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    }
    return colors[category.toLowerCase()] || "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">My Awards</h1>
        <p className="text-muted-foreground">Your achievements and recognitions</p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Awards</CardTitle>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAwards}</div>
            <p className="text-xs text-muted-foreground">All time achievements</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Star className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPoints}</div>
            <p className="text-xs text-muted-foreground">Recognition points earned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Awards</CardTitle>
            <Medal className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentAwards}</div>
            <p className="text-xs text-muted-foreground">In the last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Awards Grid */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">All Awards</h2>
        {awards.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Award className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No Awards Yet</h3>
              <p className="text-center text-muted-foreground">
                Keep up the great work! Awards will appear here when you receive them.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {awards.map((award) => (
              <Card key={award._id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {getAwardIcon(award.category)}
                      <div>
                        <CardTitle className="text-lg">{award.title}</CardTitle>
                        <Badge className={`mt-1 ${getCategoryColor(award.category)}`}>{award.category}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <CardDescription>{award.description}</CardDescription>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(award.received_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-purple-600">
                      <Star className="h-4 w-4" />
                      <span>{award.points} pts</span>
                    </div>
                  </div>
                  {award.awarded_by && (
                    <p className="text-xs text-muted-foreground">
                      Awarded by: {award.awarded_by.firstName} {award.awarded_by.lastName}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard Hint */}
      <Card>
        <CardHeader>
          <CardTitle>Keep Going!</CardTitle>
          <CardDescription>Continue your excellent performance to earn more awards and recognition</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Trophy className="h-12 w-12 text-yellow-500" />
            <div>
              <p className="font-semibold">You&apos;re doing great!</p>
              <p className="text-sm text-muted-foreground">
                Your hard work is recognized and appreciated by the team.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
