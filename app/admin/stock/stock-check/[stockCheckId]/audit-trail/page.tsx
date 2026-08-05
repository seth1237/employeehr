"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import API_URL from "@/lib/apiBase"
import { getToken } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { PageLoadingSkeleton } from "@/components/admin/ui/page-states"

interface StockCheckEvent {
  type: string
  when?: string
  actor: string
}

export default function StockCheckAuditTrailPage() {
  const params = useParams() as { stockCheckId: string }
  const stockCheckId = String(params.stockCheckId || "")
  const [events, setEvents] = useState<StockCheckEvent[]>([])
  const [loading, setLoading] = useState(true)

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    }),
    [],
  )

  useEffect(() => {
    const loadAuditTrail = async () => {
      setLoading(true)
      try {
        const response = await fetch(
          `${API_URL}/api/stock/stock-checks/${stockCheckId}/audit-trail`,
          { headers },
        )
        const json = await response.json()
        if (!response.ok) {
          window.alert(json.message || "Unable to load audit trail")
          return
        }
        setEvents(
          (json.data || []).map((event: any) => ({
            type: event.type,
            when: event.when ? new Date(event.when).toLocaleString() : undefined,
            actor: event.actor || "Unknown",
          })),
        )
      } catch {
        window.alert("Unable to load audit trail")
      } finally {
        setLoading(false)
      }
    }

    loadAuditTrail()
  }, [headers, stockCheckId])

  if (loading) return <PageLoadingSkeleton title="Loading audit trail" rows={4} />

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Audit trail</h1>
            <p className="text-sm text-muted-foreground">
              View the timeline of actions recorded for this stock check.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/admin/stock/stock-check/${stockCheckId}`}>Back to details</Link>
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Activity log</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-muted-foreground">
              No audit events recorded for this stock check yet.
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={index} className="rounded-xl border p-4">
                  <div className="font-semibold">{event.type}</div>
                  <div className="text-sm text-muted-foreground">{event.when || "Unknown time"}</div>
                  <div className="text-sm mt-1">Performed by: {event.actor}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
