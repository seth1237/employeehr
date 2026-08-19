"use client"

import { useCallback, useEffect, useState } from "react"
import { BarChart3, RefreshCw, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { api } from "@/lib/api"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

type PeriodKey = "weekly" | "monthly" | "quarterly"

type SalesSlice = {
  label: string
  actual: number
  target: number
  count: number
  percent: number | null
}

type ExpenseSlice = {
  label: string
  transport: number
  nightOuts: number
  visitCount: number
}

type RepRow = {
  userId: string
  name: string
  email: string
  status: string
  weeklyAmount: number
  monthlyAmount: number
  quarterlyAmount: number
  sales: Record<PeriodKey, SalesSlice>
  expenses: Record<PeriodKey, ExpenseSlice>
}

type Draft = {
  weeklyAmount: string
  monthlyAmount: string
  quarterlyAmount: string
}

function kes(value: number) {
  return `KES ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`
}

function toDraft(rep: RepRow): Draft {
  return {
    weeklyAmount: String(rep.weeklyAmount || 0),
    monthlyAmount: String(rep.monthlyAmount || 0),
    quarterlyAmount: String(rep.quarterlyAmount || 0),
  }
}

export default function FieldPerformancePage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState("")
  const [period, setPeriod] = useState<PeriodKey>("monthly")
  const [periods, setPeriods] = useState<Record<PeriodKey, string>>({
    weekly: "This week",
    monthly: "This month",
    quarterly: "This quarter",
  })
  const [reps, setReps] = useState<RepRow[]>([])
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.sales.adminGetPerformance()
      const list: RepRow[] = res.data?.reps || []
      setPeriods({
        weekly: res.data?.periods?.weekly || "This week",
        monthly: res.data?.periods?.monthly || "This month",
        quarterly: res.data?.periods?.quarterly || "This quarter",
      })
      setReps(list)
      setDrafts(Object.fromEntries(list.map((rep) => [rep.userId, toDraft(rep)])))
    } catch (error: any) {
      toast({
        title: "Could not load performance",
        description: error?.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (rep: RepRow) => {
    const draft = drafts[rep.userId] || toDraft(rep)
    setSavingId(rep.userId)
    try {
      await api.sales.adminSetTarget(rep.userId, {
        weeklyAmount: Number(draft.weeklyAmount || 0),
        monthlyAmount: Number(draft.monthlyAmount || 0),
        quarterlyAmount: Number(draft.quarterlyAmount || 0),
      })
      toast({ title: `Targets saved for ${rep.name}` })
      await load()
    } catch (error: any) {
      toast({
        title: "Could not save targets",
        description: error?.message,
        variant: "destructive",
      })
    } finally {
      setSavingId("")
    }
  }

  const updateDraft = (userId: string, field: keyof Draft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] || { weeklyAmount: "0", monthlyAmount: "0", quarterlyAmount: "0" }),
        [field]: value,
      },
    }))
  }

  if (loading && reps.length === 0) {
    return <PageLoadingSkeleton title="Loading sales performance" rows={6} />
  }

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sales performance</h1>
          <p className="text-sm text-muted-foreground">
            Set weekly, monthly, and quarterly sales targets for each rep. History compares invoices they generated against these targets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            {([
              ["weekly", "Weekly"],
              ["monthly", "Monthly"],
              ["quarterly", "Quarterly"],
            ] as const).map(([key, label]) => (
              <Button key={key} size="sm" variant={period === key ? "secondary" : "ghost"} onClick={() => setPeriod(key)}>
                {label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{periods[period]}</p>

      {reps.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <BarChart3 className="h-8 w-8 opacity-40" />
            <p>No sales reps yet. Add a user with the sales_rep role first.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {reps.map((rep) => {
            const sales = rep.sales[period]
            const expenses = rep.expenses[period]
            const draft = drafts[rep.userId] || toDraft(rep)
            const percent = sales?.percent
            const bar = Math.min(percent || 0, 100)
            return (
              <Card key={rep.userId}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                    <span>{rep.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{rep.email}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Invoices generated</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums">{kes(sales?.actual || 0)}</p>
                      <p className="text-xs text-muted-foreground">{sales?.count || 0} invoice{(sales?.count || 0) === 1 ? "" : "s"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vs target</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums">
                        {percent == null ? "No target" : `${percent}%`}
                      </p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-teal-700" style={{ width: `${bar}%` }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Approved plan expenses</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums">{kes(expenses?.transport || 0)}</p>
                      <p className="text-xs text-muted-foreground">{expenses?.nightOuts || 0} night out{(expenses?.nightOuts || 0) === 1 ? "" : "s"}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${rep.userId}-weekly`}>Weekly target (KES)</Label>
                      <Input
                        id={`${rep.userId}-weekly`}
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={draft.weeklyAmount}
                        onChange={(event) => updateDraft(rep.userId, "weeklyAmount", event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${rep.userId}-monthly`}>Monthly target (KES)</Label>
                      <Input
                        id={`${rep.userId}-monthly`}
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={draft.monthlyAmount}
                        onChange={(event) => updateDraft(rep.userId, "monthlyAmount", event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${rep.userId}-quarterly`}>Quarterly target (KES)</Label>
                      <Input
                        id={`${rep.userId}-quarterly`}
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={draft.quarterlyAmount}
                        onChange={(event) => updateDraft(rep.userId, "quarterlyAmount", event.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => void save(rep)} disabled={savingId === rep.userId}>
                      <Save className="mr-1.5 h-4 w-4" />
                      {savingId === rep.userId ? "Saving…" : "Save targets"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
