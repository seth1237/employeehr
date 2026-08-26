"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getToken, getUser } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Users } from "lucide-react"

export default function SalesExhibitionHistoryPage() {
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
          // Filter to only show leads collected by the current user
          const currentUser = getUser()
          const myLeads = leadsData.data.filter((lead: any) => 
            lead.collectedBy === currentUser?._id || lead.collectedBy === (currentUser as any)?.userId
          )
          setLeads(myLeads)
        }
      } catch (err: any) {
        setError(err.message || "Network error")
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading history...</div>
  }

  if (error || !exhibition) {
    return (
      <div className="mx-auto w-full max-w-6xl p-6">
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-red-600">{error || "Not found"}</div>
        <Link href={`/sales/exhibitions/${id}/collect`}><Button variant="outline">Back</Button></Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/sales/exhibitions/${id}/collect`}>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Collected Leads</h1>
            <p className="text-sm text-slate-500">{exhibition.name}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-500" />
            Lead History ({leads.length})
          </CardTitle>
          <CardDescription>All leads you have personally collected at this exhibition.</CardDescription>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              You haven't collected any leads yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="p-3 font-medium text-slate-600">Name</th>
                    <th className="p-3 font-medium text-slate-600">Facility / Company</th>
                    <th className="p-3 font-medium text-slate-600">Phone</th>
                    <th className="p-3 font-medium text-slate-600">Product of Interest</th>
                    <th className="p-3 font-medium text-slate-600">Date Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map((lead) => (
                    <tr key={lead._id} className="hover:bg-slate-50">
                      <td className="p-3 font-medium">{lead.name}</td>
                      <td className="p-3">{lead.facility}</td>
                      <td className="p-3">{lead.phoneNumber}</td>
                      <td className="p-3">{lead.productOfInterest}</td>
                      <td className="p-3 text-slate-500">
                        {new Date(lead.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
