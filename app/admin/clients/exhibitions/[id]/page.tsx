"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, MapPin, Download, Users } from "lucide-react"

export default function ExhibitionDetailsPage() {
  const { id } = useParams()
  const [exhibition, setExhibition] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${getToken()}` }
        const [exRes, leadsRes] = await Promise.all([
          fetch(`${API_URL}/api/exhibitions/${id}`, { headers }),
          fetch(`${API_URL}/api/exhibitions/${id}/leads`, { headers }),
        ])

        const exData = await exRes.json()
        const leadsData = await leadsRes.json()

        if (exData.success) {
          setExhibition(exData.data)
        } else {
          setError(exData.message || "Failed to load exhibition")
        }

        if (leadsData.success) {
          setLeads(leadsData.data)
        }
      } catch (err: any) {
        setError(err.message || "Network error")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const handleExportCSV = () => {
    if (leads.length === 0) return
    const baseHeaders = [
      "Name",
      "Facility",
      "Role",
      "Location",
      "Phone",
      "Email",
      "Product of Interest",
      "Collected By",
      "Date Collected"
    ]
    const customHeaders = exhibition.customFields?.map((f: any) => f.label) || []
    const headers = [...baseHeaders, ...customHeaders].join(",")

    const rows = leads.map(lead => {
      const baseValues = [
        lead.name,
        lead.facility,
        lead.role,
        lead.location,
        lead.phoneNumber,
        lead.email || "",
        lead.productOfInterest,
        lead.collectedByData ? `${lead.collectedByData.firstName} ${lead.collectedByData.lastName}` : lead.collectedBy,
        new Date(lead.createdAt).toLocaleDateString()
      ].map(v => `"${String(v).replace(/"/g, '""')}"`)

      const customValues = exhibition.customFields?.map((f: any) => {
        const val = lead.customData?.[f.name]
        return `"${val !== undefined ? String(val).replace(/"/g, '""') : ""}"`
      }) || []

      return [...baseValues, ...customValues].join(",")
    })

    const csvContent = [headers, ...rows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leads-${exhibition.name.toLowerCase().replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading exhibition data...</div>
  }

  if (error || !exhibition) {
    return (
      <div className="mx-auto w-full max-w-6xl p-6">
        <div className="mb-4 rounded bg-red-50 p-4 text-red-600">{error || "Not found"}</div>
        <Link href="/admin/clients/exhibitions"><Button variant="outline">Back</Button></Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/clients/exhibitions">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{exhibition.name}</h1>
            <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {exhibition.location}</span>
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(exhibition.date).toLocaleDateString()}</span>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-slate-800">
                {exhibition.status}
              </span>
            </div>
          </div>
        </div>
        <Button onClick={handleExportCSV} variant="outline" disabled={leads.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export Leads (CSV)
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <Card className="md:row-span-2">
          <CardHeader>
            <CardTitle>Collected Leads ({leads.length})</CardTitle>
            <CardDescription>Data collected by sales reps in the field.</CardDescription>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No leads collected yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="p-3 font-medium text-slate-600">Name</th>
                      <th className="p-3 font-medium text-slate-600">Facility / Company</th>
                      <th className="p-3 font-medium text-slate-600">Phone</th>
                      <th className="p-3 font-medium text-slate-600">Product of Interest</th>
                      <th className="p-3 font-medium text-slate-600">Rep</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-slate-50">
                        <td className="p-3 font-medium">{lead.name}</td>
                        <td className="p-3">{lead.facility}</td>
                        <td className="p-3">{lead.phoneNumber}</td>
                        <td className="p-3">{lead.productOfInterest}</td>
                        <td className="p-3">
                          {lead.collectedByData ? `${lead.collectedByData.firstName} ${lead.collectedByData.lastName}` : lead.collectedBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Assigned Reps
            </CardTitle>
          </CardHeader>
          <CardContent>
            {exhibition.assignedRepsData?.length === 0 ? (
              <p className="text-sm text-slate-500">No sales reps assigned.</p>
            ) : (
              <ul className="space-y-2">
                {exhibition.assignedRepsData?.map((rep: any) => (
                  <li key={rep._id} className="flex flex-col text-sm">
                    <span className="font-medium">{rep.firstName} {rep.lastName}</span>
                    <span className="text-xs text-slate-500">{rep.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Custom Form Fields</CardTitle>
          </CardHeader>
          <CardContent>
            {exhibition.customFields?.length === 0 ? (
              <p className="text-sm text-slate-500">No custom fields defined.</p>
            ) : (
              <ul className="space-y-2 text-sm text-slate-600">
                {exhibition.customFields?.map((f: any, i: number) => (
                  <li key={i} className="flex justify-between rounded bg-slate-50 p-2">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-xs text-slate-400 capitalize">{f.type} {f.required && "(Req)"}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
