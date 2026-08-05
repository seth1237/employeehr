"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Lock,
  Unlock,
  Search,
  Settings,
  Activity,
  Globe,
  ShieldCheck,
  Clock,
  LayoutGrid,
  Users,
  Building2,
  ChevronRight,
  ChevronDown,
  Folder,
  X,
  HardDrive,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  BarChart3,
  MapPin,
  RefreshCw,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getToken, getUser } from "@/lib/auth"
import API_URL from "@/lib/apiBase"

interface Company {
  _id: string
  name: string
  email: string
  slug: string
  phone?: string
  industry?: string
  status: string
  subscription: string
  isFrozen?: boolean
  frozenReason?: string
  frozenAt?: Date
  enabledPages?: string[]
  maxEmployees?: number
  employeeCount?: number
  createdAt?: string
}

interface UserActivity {
  _id: string
  firstName: string
  lastName: string
  email: string
  role: string
  lastLoginAt?: string
  lastActiveAt?: string
  isOnline: boolean
  mostVisitedSection: string
  org_id: string
  companyName: string
}

interface PlatformInsights {
  generatedAt: string
  kpis: {
    totalCompanies: number
    activeCompanies: number
    frozenCompanies: number
    activeTodayCompanies: number
    activeTodayPercent: number
    monthlyActiveCompanies: number
    totalUsers: number
    onlineSessions: number
    monthlyActiveUsers: number
    estimatedStorageBytes: number
    estimatedStorage: string
    invoicesThisMonth: number
    invoiceGrowth: number
    newCompaniesThisMonth: number
    companyGrowth: number
  }
  executiveSummary: string[]
  healthDistribution: { healthy: number; watch: number; atRisk: number }
  topStorage: Array<{
    name: string
    bytes: number
    label: string
    percent: number
    breakdown: { invoices: number; products: number; users: number; clients: number; audit: number }
  }>
  tenantUsage: Array<{
    orgId: string
    name: string
    industry: string
    estimatedStorage: string
    estimatedBytes: number
    healthScore: number
    maturityScore: number
    risk: "low" | "medium" | "high"
    daysSinceActive: number
    counts: Record<string, number>
  }>
  growingCompanies: Array<{ name: string; userGrowth: number; users: number; healthScore: number }>
  churnRisk: Array<{ name: string; daysSinceActive: number; healthScore: number; industry: string }>
  moduleAdoption: Array<{ module: string; companies: number; percent: number }>
  featureUsage: Array<{ resource: string; views: number }>
  industries: Array<{ name: string; companies: number; users: number; invoices: number; avgUsers: number; storage: string }>
  geography: Array<{ name: string; companies: number }>
  journey: Array<{ stage: string; count: number; percent: number }>
  activityFeed: Array<{ time: string; companyName: string; action: string; resource: string; details: string }>
  lowestMaturity: Array<{ name: string; maturityScore: number; healthScore: number }>
}

const FEATURE_SECTIONS = {
  "Human Resources": [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "attendance", label: "Attendance Tracking", icon: "📍" },
    { id: "leave", label: "Leave Management", icon: "🏖️" },
    { id: "payroll", label: "Payroll", icon: "💰" },
  ],
  "Performance & Development": [
    { id: "performance", label: "Performance Reviews", icon: "⭐" },
    { id: "kpis", label: "KPIs & Goals", icon: "🎯" },
    { id: "feedback", label: "360° Feedback", icon: "💬" },
  ],
  Operations: [
    { id: "meetings", label: "Meetings", icon: "📅" },
    { id: "communications", label: "Communications", icon: "📢" },
    { id: "stock", label: "Stock Management", icon: "📦" },
  ],
  Analytics: [
    { id: "reports", label: "Reports", icon: "📈" },
    { id: "recruitment", label: "Recruitment", icon: "👥" },
  ],
}

const OWNER_EMAIL = "bellarinseth@gmail.com"

function growthLabel(n: number) {
  if (n > 0) return `+${n}%`
  if (n < 0) return `${n}%`
  return "0%"
}

function riskBadge(risk: string) {
  if (risk === "high") return "bg-red-50 text-red-700 border-red-100"
  if (risk === "medium") return "bg-amber-50 text-amber-700 border-amber-100"
  return "bg-emerald-50 text-emerald-700 border-emerald-100"
}

function BarRow({ label, percent, right }: { label: string; percent: number; right?: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700 truncate pr-2">{label}</span>
        <span className="text-slate-500 shrink-0">{right || `${percent}%`}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-slate-800 transition-all"
          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
        />
      </div>
    </div>
  )
}

export default function OwnerPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"insights" | "companies" | "activity">("insights")
  const [companies, setCompanies] = useState<Company[]>([])
  const [userActivities, setUserActivities] = useState<UserActivity[]>([])
  const [insights, setInsights] = useState<PlatformInsights | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())
  const [freezeReason, setFreezeReason] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const user = getUser()
  const token = getToken()

  useEffect(() => {
    if (!user || !token || user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
      router.push("/auth/login")
      return
    }
    loadData()
  }, [activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      if (activeTab === "insights") {
        const res = await fetch(`${API_URL}/api/owner/insights`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await res.json()
        if (result.success) setInsights(result.data)
        else toast({ description: result.message || "Failed to load insights", variant: "destructive" })
      } else if (activeTab === "companies") {
        const res = await fetch(`${API_URL}/api/owner/companies`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await res.json()
        setCompanies(result.data || [])
      } else {
        const res = await fetch(`${API_URL}/api/owner/user-activity`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const result = await res.json()
        setUserActivities(result.data || [])
      }
    } catch {
      toast({ description: "Failed to load system data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePages = async (companyId: string, enabledPages: string[]) => {
    try {
      const res = await fetch(`${API_URL}/api/owner/companies/${companyId}/pages`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabledPages }),
      })
      if (res.ok) {
        toast({ description: "Permissions synchronized" })
        loadData()
      }
    } catch {
      toast({ description: "Update failed", variant: "destructive" })
    }
  }

  const handleAccountStatus = async (companyId: string, action: "freeze" | "unfreeze") => {
    try {
      const res = await fetch(`${API_URL}/api/owner/companies/${companyId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: action === "freeze" ? JSON.stringify({ reason: freezeReason }) : undefined,
      })
      if (res.ok) {
        toast({ description: `Account ${action}d successfully` })
        setFreezeReason("")
        setSelectedCompany(null)
        loadData()
      }
    } catch {
      toast({ description: "Action failed", variant: "destructive" })
    }
  }

  const toggleCompany = (orgId: string) => {
    const next = new Set(expandedCompanies)
    if (next.has(orgId)) next.delete(orgId)
    else next.add(orgId)
    setExpandedCompanies(next)
  }

  const groupActivitiesByCompany = () => {
    const groups: Record<string, { name: string; users: UserActivity[] }> = {}
    userActivities.forEach((a) => {
      if (!groups[a.org_id]) groups[a.org_id] = { name: a.companyName, users: [] }
      if (
        a.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.companyName.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        groups[a.org_id].users.push(a)
      }
    })
    return groups
  }

  const filteredCompanies = companies.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.slug.toLowerCase().includes(searchTerm.toLowerCase()),
  )
  const activityGroups = groupActivitiesByCompany()
  const kpis = insights?.kpis

  return (
    <div className="min-h-screen bg-[#f4f5f7] p-4 md:p-8 font-sans">
      <div className="max-w-[1440px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-slate-800" />
              SaaS Command Center
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Platform-wide health, tenant usage, and marketing intelligence
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-md shadow-sm">
              {(
                [
                  ["insights", "Insights"],
                  ["companies", "Companies"],
                  ["activity", "Activity"],
                ] as const
              ).map(([id, label]) => (
                <Button
                  key={id}
                  variant={activeTab === id ? "default" : "ghost"}
                  onClick={() => setActiveTab(id)}
                  size="sm"
                  className="h-8 text-xs font-semibold px-3"
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={loadData} className="h-9 gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-24 text-center text-slate-400 text-sm animate-pulse">
            Building platform intelligence...
          </div>
        ) : activeTab === "insights" && insights && kpis ? (
          <div className="space-y-6">
            {/* Executive Summary */}
            <Card className="border-slate-200 shadow-sm overflow-hidden">
              <CardHeader className="pb-2 bg-slate-900 text-white">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  Today&apos;s Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <ul className="space-y-2.5">
                  {insights.executiveSummary.map((line, i) => (
                    <li key={i} className="text-sm text-slate-700 flex gap-2">
                      <span className="text-slate-400 shrink-0">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 gap-3">
              {[
                {
                  label: "Total Companies",
                  value: kpis.totalCompanies,
                  sub: `${growthLabel(kpis.companyGrowth)} MoM`,
                  icon: Building2,
                },
                {
                  label: "Active Today",
                  value: kpis.activeTodayCompanies,
                  sub: `${kpis.activeTodayPercent}% of base`,
                  icon: Globe,
                },
                {
                  label: "Monthly Active Cos",
                  value: kpis.monthlyActiveCompanies,
                  sub: `${kpis.activeCompanies} operational`,
                  icon: Activity,
                },
                {
                  label: "Total Users",
                  value: kpis.totalUsers,
                  sub: `${kpis.monthlyActiveUsers} MAU`,
                  icon: Users,
                },
                {
                  label: "Live Sessions",
                  value: kpis.onlineSessions,
                  sub: "Active last 5 min",
                  icon: Activity,
                },
                {
                  label: "Est. Storage Used",
                  value: kpis.estimatedStorage,
                  sub: "Across all tenants",
                  icon: HardDrive,
                },
                {
                  label: "Invoices This Month",
                  value: kpis.invoicesThisMonth,
                  sub: `${growthLabel(kpis.invoiceGrowth)} vs prior`,
                  icon: BarChart3,
                },
                {
                  label: "New Signups",
                  value: kpis.newCompaniesThisMonth,
                  sub: "Last 30 days",
                  icon: TrendingUp,
                },
              ].map((card) => (
                <Card key={card.label} className="border-slate-200 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {card.label}
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 mt-1">{card.value}</h3>
                        <p className="text-[11px] text-slate-500 mt-1">{card.sub}</p>
                      </div>
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <card.icon className="h-4 w-4 text-slate-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Storage / Memory usage */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <HardDrive className="h-4 w-4" />
                    Tenant Data Footprint
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    Estimated document storage by company (DB records proxy)
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights.topStorage.length === 0 && (
                    <p className="text-sm text-slate-400 italic">No tenant data yet</p>
                  )}
                  {insights.topStorage.map((t) => (
                    <div key={t.name} className="space-y-1">
                      <BarRow label={t.name} percent={t.percent} right={`${t.label} · ${t.percent}%`} />
                      <p className="text-[10px] text-slate-400 pl-0.5">
                        {t.breakdown.invoices} invoices · {t.breakdown.products} products ·{" "}
                        {t.breakdown.users} users · {t.breakdown.clients} clients
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Health + churn */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Company Health & Churn Risk
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-center">
                      <p className="text-xl font-bold text-emerald-700">
                        {insights.healthDistribution.healthy}
                      </p>
                      <p className="text-[10px] uppercase font-bold text-emerald-600">Healthy</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 p-3 text-center">
                      <p className="text-xl font-bold text-amber-700">{insights.healthDistribution.watch}</p>
                      <p className="text-[10px] uppercase font-bold text-amber-600">Watch</p>
                    </div>
                    <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-center">
                      <p className="text-xl font-bold text-red-700">{insights.healthDistribution.atRisk}</p>
                      <p className="text-[10px] uppercase font-bold text-red-600">At Risk</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-wider">
                      No login in 14+ days
                    </p>
                    <div className="space-y-2 max-h-56 overflow-y-auto">
                      {insights.churnRisk.length === 0 && (
                        <p className="text-sm text-slate-400">No churn signals right now</p>
                      )}
                      {insights.churnRisk.map((c) => (
                        <div
                          key={c.name}
                          className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {c.industry} · {c.daysSinceActive}d inactive
                            </p>
                          </div>
                          <Badge className="bg-red-50 text-red-700 border-red-100 text-[9px] uppercase">
                            Potential churn
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Module adoption */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Module Adoption
                  </CardTitle>
                  <p className="text-xs text-slate-500">What tenants actually use — guides product focus</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights.moduleAdoption.map((m) => (
                    <BarRow
                      key={m.module}
                      label={m.module}
                      percent={m.percent}
                      right={`${m.percent}% · ${m.companies} cos`}
                    />
                  ))}
                </CardContent>
              </Card>

              {/* Feature usage heatmap */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Feature Discovery (30d views)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights.featureUsage.length === 0 && (
                    <p className="text-sm text-slate-400 italic">
                      No page-view telemetry yet — activity tracking will fill this.
                    </p>
                  )}
                  {(() => {
                    const max = Math.max(1, ...insights.featureUsage.map((f) => f.views))
                    return insights.featureUsage.map((f) => (
                      <BarRow
                        key={f.resource}
                        label={String(f.resource).replace(/^\/?(admin|employee)\//, "")}
                        percent={Math.round((f.views / max) * 100)}
                        right={`${f.views} views`}
                      />
                    ))
                  })()}
                </CardContent>
              </Card>

              {/* Growing + low maturity */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Growth & Onboarding Gaps
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-wider">
                      Top growing (new users / 30d)
                    </p>
                    <div className="space-y-2">
                      {insights.growingCompanies.length === 0 && (
                        <p className="text-xs text-slate-400">No recent user growth</p>
                      )}
                      {insights.growingCompanies.map((g) => (
                        <div key={g.name} className="flex justify-between text-sm border-b border-slate-100 pb-1.5">
                          <span className="font-medium text-slate-800 truncate pr-2">{g.name}</span>
                          <span className="text-emerald-600 font-semibold shrink-0">+{g.userGrowth}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-wider">
                      Lowest maturity (need onboarding)
                    </p>
                    <div className="space-y-2">
                      {insights.lowestMaturity.map((t) => (
                        <div key={t.name} className="flex justify-between text-sm border-b border-slate-100 pb-1.5">
                          <span className="font-medium text-slate-800 truncate pr-2">{t.name}</span>
                          <span className="text-slate-500 shrink-0">{t.maturityScore}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Customer journey */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Activation Funnel</CardTitle>
                  <p className="text-xs text-slate-500">Where tenants drop off after signup</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights.journey.map((j) => (
                    <BarRow key={j.stage} label={j.stage} percent={j.percent} right={`${j.count} · ${j.percent}%`} />
                  ))}
                </CardContent>
              </Card>

              {/* Marketing: industries */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Industry Intelligence</CardTitle>
                  <p className="text-xs text-slate-500">Where to focus GTM and packaging</p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase text-slate-400 tracking-wider border-b">
                          <th className="py-2 font-bold">Industry</th>
                          <th className="py-2 font-bold text-right">Cos</th>
                          <th className="py-2 font-bold text-right">Avg Users</th>
                          <th className="py-2 font-bold text-right">Invoices</th>
                          <th className="py-2 font-bold text-right">Storage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {insights.industries.map((ind) => (
                          <tr key={ind.name}>
                            <td className="py-2.5 font-medium text-slate-800">{ind.name}</td>
                            <td className="py-2.5 text-right text-slate-600">{ind.companies}</td>
                            <td className="py-2.5 text-right text-slate-600">{ind.avgUsers}</td>
                            <td className="py-2.5 text-right text-slate-600">{ind.invoices}</td>
                            <td className="py-2.5 text-right text-slate-600">{ind.storage}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Geography + feed */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Geographic Spread
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {insights.geography.map((g) => {
                    const max = Math.max(1, ...insights.geography.map((x) => x.companies))
                    return (
                      <BarRow
                        key={g.name}
                        label={g.name}
                        percent={Math.round((g.companies / max) * 100)}
                        right={`${g.companies} companies`}
                      />
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Tenant usage table */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">All Tenants · Usage & Health</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-y border-slate-100">
                    <tr className="text-[10px] uppercase text-slate-400 tracking-wider">
                      <th className="p-3 font-bold">Company</th>
                      <th className="p-3 font-bold">Industry</th>
                      <th className="p-3 font-bold text-right">Users</th>
                      <th className="p-3 font-bold text-right">Invoices</th>
                      <th className="p-3 font-bold text-right">Products</th>
                      <th className="p-3 font-bold text-right">Storage</th>
                      <th className="p-3 font-bold text-center">Health</th>
                      <th className="p-3 font-bold text-center">Maturity</th>
                      <th className="p-3 font-bold text-center">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {insights.tenantUsage.map((t) => (
                      <tr key={t.orgId} className="hover:bg-slate-50/80">
                        <td className="p-3 font-semibold text-slate-900">{t.name}</td>
                        <td className="p-3 text-slate-600">{t.industry}</td>
                        <td className="p-3 text-right">{t.counts.users}</td>
                        <td className="p-3 text-right">{t.counts.invoices}</td>
                        <td className="p-3 text-right">{t.counts.products}</td>
                        <td className="p-3 text-right text-slate-600">{t.estimatedStorage}</td>
                        <td className="p-3 text-center font-semibold">{t.healthScore}</td>
                        <td className="p-3 text-center">{t.maturityScore}%</td>
                        <td className="p-3 text-center">
                          <Badge className={`${riskBadge(t.risk)} text-[9px] uppercase`}>{t.risk}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Live activity feed */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Live Activity Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 divide-y divide-slate-100 max-h-80 overflow-y-auto">
                {insights.activityFeed.length === 0 && (
                  <p className="text-sm text-slate-400 py-6 text-center">No recent activity</p>
                )}
                {insights.activityFeed.map((a, i) => (
                  <div key={`${a.time}-${i}`} className="flex gap-3 py-3">
                    <div className="text-[11px] text-slate-400 w-16 shrink-0 pt-0.5">
                      {a.time ? new Date(a.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </div>
                    <div>
                      <p className="text-sm text-slate-800">
                        <span className="font-semibold">{a.companyName}</span>{" "}
                        <span className="text-slate-600">{a.details}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase mt-0.5">
                        {a.action} · {a.resource}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {activeTab !== "insights" && (
              <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={`Search ${activeTab === "companies" ? "companies" : "users"}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9"
                  />
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
              {activeTab === "companies" ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#fcfcfc] border-b border-slate-200">
                      <tr>
                        <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[30%]">
                          Organization
                        </th>
                        <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
                          Status
                        </th>
                        <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plan</th>
                        <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          Resources
                        </th>
                        <th className="p-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">
                          Settings
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredCompanies.map((company) => (
                        <tr key={company._id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-9 w-9 rounded-md flex items-center justify-center font-bold text-sm ${
                                  company.isFrozen
                                    ? "bg-red-50 text-red-600"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {company.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-slate-900">{company.name}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  /{company.slug} · {company.email}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <Badge
                              className={`${
                                company.isFrozen
                                  ? "bg-red-50 text-red-700 border-red-100"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-100"
                              } uppercase text-[9px] px-2 py-0.5 font-bold`}
                            >
                              {company.isFrozen ? "Restricted" : "Operational"}
                            </Badge>
                          </td>
                          <td className="p-4 capitalize text-xs font-semibold text-slate-700">
                            {company.subscription}
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1 w-32">
                              <span className="text-xs font-medium text-slate-900">
                                {company.employeeCount || 0} / {company.maxEmployees || "∞"}
                              </span>
                              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-slate-700"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      ((company.employeeCount || 0) / (company.maxEmployees || 100)) * 100,
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => setSelectedCompany(company)}
                            >
                              <Settings className="h-4 w-4 text-slate-400 group-hover:text-slate-800" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : activeTab === "activity" ? (
                <div className="divide-y divide-slate-100">
                  {Object.entries(activityGroups)
                    .filter(([, group]) => group.users.length > 0)
                    .map(([orgId, group]) => (
                      <div key={orgId}>
                        <button
                          onClick={() => toggleCompany(orgId)}
                          className="w-full flex items-center justify-between p-4 hover:bg-slate-50/80 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                              <Folder className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900">{group.name}</h4>
                              <p className="text-[11px] text-slate-500">
                                {group.users.length} personnel tracked
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              {group.users.filter((u) => u.isOnline).length} Online
                            </span>
                            {expandedCompanies.has(orgId) ? (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                        </button>
                        {expandedCompanies.has(orgId) && (
                          <div className="bg-slate-50/40 border-t border-slate-100 overflow-x-auto">
                            <table className="w-full text-left">
                              <thead className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b">
                                <tr>
                                  <th className="p-4 pl-16">Personnel</th>
                                  <th className="p-4">Role</th>
                                  <th className="p-4">Last Active</th>
                                  <th className="p-4 text-center">Top Sector</th>
                                  <th className="p-4 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {group.users
                                  .sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0))
                                  .map((activity) => (
                                    <tr key={activity._id} className="hover:bg-white/60">
                                      <td className="p-4 pl-16">
                                        <div className="flex items-center gap-3">
                                          <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                                            {activity.firstName.charAt(0)}
                                            {activity.lastName.charAt(0)}
                                          </div>
                                          <div>
                                            <p className="font-semibold text-sm text-slate-900">
                                              {activity.firstName} {activity.lastName}
                                            </p>
                                            <p className="text-[10px] text-slate-500">{activity.email}</p>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="p-4">
                                        <Badge variant="outline" className="text-[9px] uppercase">
                                          {activity.role.replace("_", " ")}
                                        </Badge>
                                      </td>
                                      <td className="p-4">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                          <Clock className="h-3 w-3 text-slate-400" />
                                          {activity.lastActiveAt
                                            ? new Date(activity.lastActiveAt).toLocaleString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                                month: "short",
                                                day: "numeric",
                                              })
                                            : "Never"}
                                        </div>
                                      </td>
                                      <td className="p-4 text-center">
                                        <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-100 uppercase">
                                          {activity.mostVisitedSection
                                            .replace("/admin/", "")
                                            .replace("/employee/", "") || "—"}
                                        </span>
                                      </td>
                                      <td className="p-4 text-right">
                                        {activity.isOnline ? (
                                          <span className="text-[10px] font-bold text-emerald-700 uppercase">
                                            Live
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                                            Offline
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>

      {selectedCompany && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white shadow-2xl border-none overflow-hidden rounded-lg">
            <div className="flex items-center justify-between p-4 bg-slate-50 border-b">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-800 text-white flex items-center justify-center font-bold text-xl rounded">
                  {selectedCompany.name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedCompany.name}</h2>
                  <p className="text-[11px] font-medium text-slate-500 uppercase tracking-widest">
                    {selectedCompany.subscription} plan
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedCompany(null)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
                  <LayoutGrid className="h-4 w-4 text-slate-700" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                    Global Module Rights
                  </h3>
                </div>
                <div className="space-y-6">
                  {Object.entries(FEATURE_SECTIONS).map(([section, features]) => (
                    <div key={section} className="space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {section}
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {features.map((f) => (
                          <label
                            key={f.id}
                            className="flex items-center justify-between p-3 border border-slate-100 rounded-md bg-slate-50/30 hover:border-slate-300 cursor-pointer"
                          >
                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-2">
                              <span>{f.icon}</span> {f.label}
                            </span>
                            <Checkbox
                              checked={selectedCompany.enabledPages?.includes(f.id) ?? true}
                              onCheckedChange={(checked) => {
                                const pages = selectedCompany.enabledPages || []
                                const next = checked
                                  ? [...pages, f.id]
                                  : pages.filter((p) => p !== f.id)
                                handleUpdatePages(selectedCompany._id, next)
                              }}
                              className="h-4 w-4"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={`p-5 rounded-lg border-l-4 ${
                  selectedCompany.isFrozen
                    ? "bg-red-50 border-red-500"
                    : "bg-amber-50 border-amber-500"
                }`}
              >
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-4">
                  {selectedCompany.isFrozen ? (
                    <Lock className="h-4 w-4 text-red-600" />
                  ) : (
                    <Unlock className="h-4 w-4 text-amber-600" />
                  )}
                  Governance Enforcement
                </h3>
                {selectedCompany.isFrozen ? (
                  <div className="space-y-3">
                    <p className="text-[11px] text-red-800 font-medium bg-red-100/50 p-3 rounded border border-red-200">
                      <strong>Enforced Policy:</strong>{" "}
                      {selectedCompany.frozenReason || "Account restricted by platform owner."}
                    </p>
                    <Button
                      className="w-full bg-emerald-600 hover:bg-emerald-700 h-9 text-xs font-bold"
                      onClick={() => handleAccountStatus(selectedCompany._id, "unfreeze")}
                    >
                      Resume Service
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Input
                      placeholder="State reason for restriction..."
                      value={freezeReason}
                      onChange={(e) => setFreezeReason(e.target.value)}
                      className="h-9 text-sm"
                    />
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 h-9 text-xs font-bold"
                      onClick={() => handleAccountStatus(selectedCompany._id, "freeze")}
                    >
                      Freeze Account
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedCompany(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
