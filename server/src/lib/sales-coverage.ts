import Alert from "../models/Alert"
import { inPeriod, type PeriodKind, type PeriodWindow } from "./sales-periods"

export type CoverageStop = {
  date: string
  clientName: string
  reason?: string
}

export type CoverageSummary = {
  planned: number
  completed: number
  missed: number
  remaining: number
  rate: number | null
  missedStops: CoverageStop[]
}

function visitKey(date: string, clientName: string) {
  return `${String(date || "").slice(0, 10)}|${String(clientName || "").trim().toLowerCase()}`
}

export function missedVisitRelatedId(userId: string, date: string, clientName: string) {
  return `${userId}:${String(date || "").slice(0, 10)}:${String(clientName || "").trim().toLowerCase()}`
}

export function computeCoverage(
  planners: Array<{ date?: string; status?: string; visits?: Array<{ clientName?: string; reason?: string }> }>,
  visits: Array<{ clientName?: string; visitDate?: string; checkInAt?: Date | string }>,
  window: PeriodWindow,
  todayKey: string,
): CoverageSummary {
  const done = new Set(
    visits
      .map((visit) => {
        const date = String(visit.visitDate || "").slice(0, 10) || String(visit.checkInAt || "").slice(0, 10)
        if (!date) return ""
        return visitKey(date, String(visit.clientName || ""))
      })
      .filter(Boolean),
  )

  const planned: CoverageStop[] = []
  for (const plan of planners) {
    if (plan.status && plan.status !== "approved") continue
    if (!inPeriod(plan.date, window)) continue
    for (const stop of plan.visits || []) {
      const clientName = String(stop.clientName || "").trim()
      if (!clientName) continue
      planned.push({
        date: String(plan.date || "").slice(0, 10),
        clientName,
        reason: String(stop.reason || "").trim() || undefined,
      })
    }
  }

  let completed = 0
  let missed = 0
  let remaining = 0
  const missedStops: CoverageStop[] = []
  for (const stop of planned) {
    const logged = done.has(visitKey(stop.date, stop.clientName))
    if (logged) {
      completed += 1
      continue
    }
    if (stop.date < todayKey) {
      missed += 1
      missedStops.push(stop)
    } else {
      remaining += 1
    }
  }

  return {
    planned: planned.length,
    completed,
    missed,
    remaining,
    rate: planned.length > 0 ? Math.round((completed / planned.length) * 100) : null,
    missedStops,
  }
}

export function coverageByPeriod(
  planners: any[],
  visits: any[],
  periods: Record<PeriodKind, PeriodWindow>,
  todayKey: string,
) {
  return {
    weekly: computeCoverage(planners, visits, periods.weekly, todayKey),
    monthly: computeCoverage(planners, visits, periods.monthly, todayKey),
    quarterly: computeCoverage(planners, visits, periods.quarterly, todayKey),
  }
}

export async function upsertMissedVisitAlerts(params: {
  org_id: string
  userId: string
  missedStops: CoverageStop[]
}) {
  const { org_id, userId, missedStops } = params
  if (!missedStops.length) return
  const relatedIds = missedStops.map((stop) => missedVisitRelatedId(userId, stop.date, stop.clientName))
  const existing = await Alert.find({
    org_id,
    user_id: userId,
    alert_type: "missed_visit",
    related_id: { $in: relatedIds },
    is_dismissed: false,
  })
    .select("related_id")
    .lean()
  const have = new Set(existing.map((row) => String(row.related_id || "")))
  const toCreate = missedStops.filter(
    (stop) => !have.has(missedVisitRelatedId(userId, stop.date, stop.clientName)),
  )
  if (!toCreate.length) return
  await Alert.insertMany(
    toCreate.map((stop) => ({
      org_id,
      user_id: userId,
      alert_type: "missed_visit",
      severity: "high",
      title: `Missed visit: ${stop.clientName}`,
      message: `The approved plan for ${stop.date} included ${stop.clientName}, and no visit report was logged.`,
      related_id: missedVisitRelatedId(userId, stop.date, stop.clientName),
      related_type: "sales_visit",
      action_url: "/sales/report",
      action_label: "Open visit reports",
      metadata: {
        date: stop.date,
        clientName: stop.clientName,
        reason: stop.reason,
      },
    })),
  )
}

export async function dismissMissedVisitAlert(org_id: string, userId: string, date: string, clientName: string) {
  await Alert.updateMany(
    {
      org_id,
      alert_type: "missed_visit",
      related_id: missedVisitRelatedId(userId, date, clientName),
    },
    { is_dismissed: true, is_read: true },
  )
}
