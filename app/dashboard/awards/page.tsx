"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trophy, Plus } from "lucide-react"

interface Award {
  id: string
  employeeName: string
  awardType: string
  month: string
  score: number
  reason: string
  announcementStatus: "draft" | "announced" | "archived"
}

export default function AwardsManagement() {
  const [awards, setAwards] = useState<Award[]>([
    {
      id: "1",
      employeeName: "Sarah Johnson",
      awardType: "Employee of the Month",
      month: "June 2024",
      score: 9.2,
      reason: "Outstanding sales performance and leadership",
      announcementStatus: "announced",
    },
    {
      id: "2",
      employeeName: "Michael Chen",
      awardType: "Employee of the Month",
      month: "May 2024",
      score: 8.9,
      reason: "Exceptional technical contributions",
      announcementStatus: "announced",
    },
    {
      id: "3",
      employeeName: "Emma Rodriguez",
      awardType: "Top Innovator",
      month: "June 2024",
      score: 8.7,
      reason: "Developed new process optimization",
      announcementStatus: "draft",
    },
    {
      id: "4",
      employeeName: "David Kim",
      awardType: "Excellence in Customer Service",
      month: "May 2024",
      score: 8.5,
      reason: "Consistently highest customer satisfaction",
      announcementStatus: "announced",
    },
  ])

  const [showForm, setShowForm] = useState(false)
  const [newAward, setNewAward] = useState({
    employeeName: "",
    awardType: "",
    reason: "",
    month: new Date().toISOString().split("T")[0],
  })

  const handleAddAward = () => {
    if (newAward.employeeName && newAward.awardType) {
      setAwards([
        ...awards,
        {
          id: Date.now().toString(),
          ...newAward,
          score: Math.random() * 2 + 7.5,
          announcementStatus: "draft",
        },
      ])
      setNewAward({ employeeName: "", awardType: "", reason: "", month: new Date().toISOString().split("T")[0] })
      setShowForm(false)
    }
  }

  const handleAnnounce = (id: string) => {
    setAwards(awards.map((a) => (a.id === id ? { ...a, announcementStatus: "announced" } : a)))
  }

  const handleArchive = (id: string) => {
    setAwards(awards.map((a) => (a.id === id ? { ...a, announcementStatus: "archived" } : a)))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "announced":
        return "bg-accent/10 text-accent"
      case "draft":
        return "bg-primary/10 text-primary"
      case "archived":
        return "bg-muted text-muted-foreground"
      default:
        return "bg-border"
    }
  }

  const currentMonthAwards = awards.filter((a) => a.announcementStatus === "announced").length
  const draftAwards = awards.filter((a) => a.announcementStatus === "draft").length

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Awards Management</h1>
          <p className="text-muted-foreground">Manage and announce employee recognition awards</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-primary hover:bg-primary/90">
          <Plus size={18} className="mr-2" />
          Create Award
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Awards</p>
              <p className="text-3xl font-bold mt-1">{awards.length}</p>
            </div>
            <Trophy className="w-12 h-12 text-accent/20" />
          </div>
        </Card>
        <Card className="p-6 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-3xl font-bold mt-1">{currentMonthAwards}</p>
            </div>
            <Trophy className="w-12 h-12 text-accent/20" />
          </div>
        </Card>
        <Card className="p-6 border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Announcement</p>
              <p className="text-3xl font-bold mt-1">{draftAwards}</p>
            </div>
            <Trophy className="w-12 h-12 text-primary/20" />
          </div>
        </Card>
      </div>

      {/* Create Award Form */}
      {showForm && (
        <Card className="p-6 border-border">
          <h2 className="text-xl font-bold mb-6">Create New Award</h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Input
                placeholder="Employee Name"
                value={newAward.employeeName}
                onChange={(e) => setNewAward({ ...newAward, employeeName: e.target.value })}
              />
              <select
                value={newAward.awardType}
                onChange={(e) => setNewAward({ ...newAward, awardType: e.target.value })}
                className="px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Award Type</option>
                <option value="Employee of the Month">Employee of the Month</option>
                <option value="Employee of the Year">Employee of the Year</option>
                <option value="Top Innovator">Top Innovator</option>
                <option value="Excellence in Customer Service">Excellence in Customer Service</option>
                <option value="Team Player">Team Player</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Month</label>
              <Input
                type="date"
                value={newAward.month}
                onChange={(e) => setNewAward({ ...newAward, month: e.target.value })}
              />
            </div>
            <textarea
              placeholder="Reason for award"
              value={newAward.reason}
              onChange={(e) => setNewAward({ ...newAward, reason: e.target.value })}
              className="w-full px-4 py-3 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
            <div className="flex gap-3">
              <Button onClick={handleAddAward} className="flex-1 bg-accent hover:bg-accent/90">
                Create Award
              </Button>
              <Button onClick={() => setShowForm(false)} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Awards List */}
      <div className="space-y-3">
        {awards.map((award) => (
          <Card key={award.id} className="p-6 border-border hover:border-primary/50 transition">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="text-4xl">🏆</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{award.awardType}</h3>
                  <p className="text-foreground">{award.employeeName}</p>
                  <p className="text-sm text-muted-foreground mt-1">{award.reason}</p>
                  <div className="flex gap-2 mt-3">
                    <span className="text-xs px-3 py-1 bg-secondary rounded">Score: {award.score.toFixed(1)}/10</span>
                    <span className="text-xs px-3 py-1 bg-secondary rounded">{award.month}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block text-xs px-3 py-1 rounded font-medium mb-3 ${getStatusColor(award.announcementStatus)}`}
                >
                  {award.announcementStatus.charAt(0).toUpperCase() + award.announcementStatus.slice(1)}
                </span>
                <div className="flex gap-2 justify-end">
                  {award.announcementStatus === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => handleAnnounce(award.id)}
                      className="bg-accent hover:bg-accent/90 text-xs"
                    >
                      Announce
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleArchive(award.id)} className="text-xs">
                    {award.announcementStatus === "archived" ? "Archived" : "Archive"}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
