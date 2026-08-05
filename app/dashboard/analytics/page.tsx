"use client"

import { Card } from "@/components/ui/card"
import {
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { TrendingUp, Users, Award, Target, ArrowUp, ArrowDown } from "lucide-react"

const performanceTrend = [
  { month: "Jan", avgScore: 6.8, target: 7.5 },
  { month: "Feb", avgScore: 7.0, target: 7.5 },
  { month: "Mar", avgScore: 7.2, target: 7.5 },
  { month: "Apr", avgScore: 7.5, target: 7.5 },
  { month: "May", avgScore: 7.8, target: 7.5 },
  { month: "Jun", avgScore: 8.1, target: 7.5 },
]

const departmentPerformance = [
  { name: "Sales", score: 8.2, employees: 12 },
  { name: "Engineering", score: 7.9, employees: 18 },
  { name: "Marketing", score: 7.5, employees: 8 },
  { name: "HR", score: 8.0, employees: 4 },
  { name: "Operations", score: 7.3, employees: 6 },
]

const pdpCompletion = [
  { name: "Completed", value: 45, fill: "#059669" },
  { name: "In Progress", value: 89, fill: "#2563eb" },
  { name: "Not Started", value: 13, fill: "#e5e7eb" },
]

const skillGaps = [
  { skill: "Leadership", gap: 35 },
  { skill: "Technical Skills", gap: 28 },
  { skill: "Communication", gap: 22 },
  { skill: "Project Mgmt", gap: 18 },
  { skill: "Data Analysis", gap: 15 },
]

const topPerformers = [
  { name: "Sarah Johnson", score: 9.2, trend: "up" },
  { name: "Michael Chen", score: 8.9, trend: "up" },
  { name: "Emma Rodriguez", score: 8.7, trend: "stable" },
  { name: "Lisa Wang", score: 8.5, trend: "up" },
  { name: "John Davis", score: 8.3, trend: "down" },
]

export default function AnalyticsDashboard() {
  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive insights into your organization's performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Org Avg Score</p>
              <p className="text-3xl font-bold mt-1">8.1/10</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUp size={16} className="text-accent" />
            <p className="text-xs text-accent">+0.3 from last month</p>
          </div>
        </Card>

        <Card className="p-6 border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Active Employees</p>
              <p className="text-3xl font-bold mt-1">147</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Across 5 departments</p>
        </Card>

        <Card className="p-6 border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">PDP Completion</p>
              <p className="text-3xl font-bold mt-1">61%</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-accent">45 completed, 89 in progress</p>
        </Card>

        <Card className="p-6 border-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Awards Issued</p>
              <p className="text-3xl font-bold mt-1">34</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
              <Award className="w-6 h-6 text-accent" />
            </div>
          </div>
          <p className="text-xs text-accent">This year</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Performance Trend */}
        <Card className="p-6 border-border">
          <h2 className="text-xl font-bold mb-6">Performance Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={performanceTrend}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" domain={[6, 9]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="avgScore"
                stroke="var(--primary)"
                fillOpacity={1}
                fill="url(#colorScore)"
                name="Avg Score"
              />
              <Line type="monotone" dataKey="target" stroke="var(--border)" strokeDasharray="5 5" name="Target" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Department Performance */}
        <Card className="p-6 border-border">
          <h2 className="text-xl font-bold mb-6">By Department</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={departmentPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="score" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* PDP Completion Status */}
        <Card className="p-6 border-border">
          <h2 className="text-xl font-bold mb-6">PDP Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pdpCompletion}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pdpCompletion.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Skill Gaps */}
        <Card className="p-6 border-border">
          <h2 className="text-xl font-bold mb-6">Top Skill Gaps</h2>
          <div className="space-y-4">
            {skillGaps.map((skill, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-medium">{skill.skill}</p>
                  <p className="text-sm text-muted-foreground">{skill.gap}%</p>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-destructive h-2 rounded-full transition-all"
                    style={{ width: `${skill.gap}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top Performers */}
      <Card className="p-6 border-border">
        <h2 className="text-xl font-bold mb-6">Top Performers</h2>
        <div className="space-y-3">
          {topPerformers.map((performer, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="font-bold text-primary">#{index + 1}</span>
                </div>
                <div>
                  <p className="font-semibold">{performer.name}</p>
                  <p className="text-sm text-muted-foreground">Score: {performer.score}</p>
                </div>
              </div>
              <div className="text-right">
                {performer.trend === "up" && <ArrowUp size={20} className="text-accent" />}
                {performer.trend === "down" && <ArrowDown size={20} className="text-destructive" />}
                {performer.trend === "stable" && <div className="w-5 h-5 bg-muted rounded"></div>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
