"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getUser } from "@/lib/auth"

type SalesCompanionProps = {
  color?: string
  started: boolean
  acting?: "start" | "end" | null
  plannedCount: number
  completedCount: number
  followUps: number
  firstVisitName?: string
  nextVisitName?: string
  quotesNeedingRevision: number
  quotesAwaitingDownload: number
  plannerStatus?: string
  onStartDay: () => void
  onEndDay: () => void
}

function firstName() {
  const user = getUser()
  return user?.first_name?.trim() || "there"
}

function weekday() {
  return new Date().toLocaleDateString("en-KE", { weekday: "long" })
}

function hello() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export function SalesCompanion({
  color,
  started,
  acting,
  plannedCount,
  completedCount,
  followUps,
  firstVisitName,
  nextVisitName,
  quotesNeedingRevision,
  quotesAwaitingDownload,
  plannerStatus,
  onStartDay,
  onEndDay,
}: SalesCompanionProps) {
  const name = firstName()
  const remaining = Math.max(plannedCount - completedCount, 0)
  const emptyPlan = plannedCount === 0
  const awaitingApproval = !emptyPlan && plannerStatus === "pending"
  const planApproved = plannerStatus === "approved"

  let title = `${hello()}, ${name}`
  let body = ""
  if (emptyPlan && !started) {
    title = `Hey ${name}`
    body = `What are you up to today? It's ${weekday()} and we haven't filled the planner yet.`
  } else if (emptyPlan && started) {
    body = "You've started the day, but the planner is still empty. Let's get your first visit in."
  } else if (awaitingApproval) {
    body = "Your plan is with admin. You'll be able to complete visits once it's approved."
  } else if (!started) {
    body = firstVisitName
      ? `You have ${plannedCount} visit${plannedCount === 1 ? "" : "s"} planned today. First up is ${firstVisitName}. Ready to start the day?`
      : `You have ${plannedCount} visits planned today. Ready to start the day?`
  } else if (remaining > 0) {
    body = nextVisitName
      ? `You're underway. ${completedCount} of ${plannedCount} visits logged. Next is ${nextVisitName}.`
      : `You're underway. ${completedCount} of ${plannedCount} visits logged.`
  } else {
    body =
      plannedCount > 0
        ? "Every planned visit is logged. Wrap the day when you're done."
        : "Nothing else on the planner. Add a visit or close the day."
  }

  const extras: string[] = []
  if (followUps > 0) {
    extras.push(
      followUps === 1
        ? "You have 1 follow-up waiting."
        : `You have ${followUps} follow-ups waiting.`,
    )
  }
  if (quotesNeedingRevision > 0) {
    extras.push(
      quotesNeedingRevision === 1
        ? "One quotation still needs a revision."
        : `${quotesNeedingRevision} quotations still need a revision.`,
    )
  }
  if (quotesAwaitingDownload > 0) {
    extras.push("An approved quote is ready to send.")
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: color || "#0f766e" }}>
        Live companion
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">{body}</p>
      {extras.length > 0 ? (
        <p className="mt-1 max-w-2xl text-sm text-slate-500">{extras.join(" ")}</p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {emptyPlan ? (
          <Button asChild className="min-h-10">
            <Link href="/sales/planner">Plan my day</Link>
          </Button>
        ) : remaining > 0 && planApproved ? (
          <Button asChild className="min-h-10">
            <Link href="/sales/report">Record visit</Link>
          </Button>
        ) : null}
        {followUps > 0 ? (
          <Button asChild variant="outline" className="min-h-10">
            <Link href="/sales/clients">Show my follow-ups</Link>
          </Button>
        ) : null}
        {!started ? (
          <Button
            variant={emptyPlan ? "outline" : "default"}
            className="min-h-10"
            onClick={onStartDay}
            disabled={acting === "start"}
          >
            {acting === "start" ? "Starting…" : "Start the day"}
          </Button>
        ) : (
          <Button variant="outline" className="min-h-10" onClick={onEndDay} disabled={acting === "end"}>
            {acting === "end" ? "Closing…" : "End day"}
          </Button>
        )}
        {quotesNeedingRevision > 0 || quotesAwaitingDownload > 0 ? (
          <Button asChild variant="outline" className="min-h-10">
            <Link href="/sales/quotes">Open quotes</Link>
          </Button>
        ) : null}
      </div>
    </section>
  )
}
