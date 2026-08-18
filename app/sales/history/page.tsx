"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { salesApi } from "@/lib/api"

export default function SalesHistoryPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    void salesApi.getHistory().then((res) => setData(res.data)).catch(() => setData({ reports: [], visits: [], quotes: [] }))
  }, [])

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-semibold">My activity history</h1>
        <p className="text-sm text-muted-foreground">Your own visits and quotes only.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.reports || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No reports yet.</p>
            ) : (
              data.reports.map((report: any) => (
                <div key={report._id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>{report.date}</span>
                  <Badge variant="outline">{report.status.replace("_", " ")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quotes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.quotes || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No quotes yet.</p>
            ) : (
              data.quotes.map((quote: any) => (
                <div key={quote._id} className="rounded-lg border p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{quote.quotationNumber || quote.quoteNumber}</span>
                    <Badge variant="outline">{quote.status?.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {quote.client?.name || quote.clientName} · KES {Number(quote.grandTotal || 0).toLocaleString("en-KE")}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data?.visits || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No visits yet.</p>
          ) : (
            data.visits.map((visit: any) => (
              <div key={visit._id} className="rounded-lg border p-3 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{visit.clientName}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(visit.checkInAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {visit.personMet
                    ? `${visit.personMet}${visit.personRole ? ` · ${visit.personRole}` : ""}`
                    : `${visit.visitType} · ${visit.outcome || "—"}`}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
