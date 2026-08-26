"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, MapPin, Users, Plus, ChevronRight } from "lucide-react"

export default function ExhibitionsPage() {
  const [exhibitions, setExhibitions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadExhibitions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/exhibitions`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
      })
      const data = await res.json()
      if (data.success) {
        setExhibitions(data.data)
      } else {
        setError(data.message || "Failed to load")
      }
    } catch (err: any) {
      setError(err.message || "Network error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExhibitions()
  }, [])

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Exhibitions & Events Data</h1>
          <p className="text-sm text-slate-500">Manage field data collection events and leads.</p>
        </div>
        <Link href="/admin/clients/exhibitions/new">
          <Button className="bg-teal-700 hover:bg-teal-800">
            <Plus className="mr-2 h-4 w-4" />
            New Exhibition
          </Button>
        </Link>
      </div>

      {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-600 border border-red-200">{error}</div>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse border-slate-200">
              <CardContent className="h-32 p-6" />
            </Card>
          ))}
        </div>
      ) : exhibitions.length === 0 ? (
        <Card className="flex h-40 flex-col items-center justify-center p-6 text-center text-slate-500 border-dashed">
          <Calendar className="mb-2 h-8 w-8 opacity-20" />
          <p>No exhibitions found. Create one to get started.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {exhibitions.map((exhibition) => (
            <Link key={exhibition._id} href={`/admin/clients/exhibitions/${exhibition._id}`}>
              <Card className="transition-all hover:bg-slate-50 hover:border-teal-200 hover:shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-800">{exhibition.name}</CardTitle>
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 text-sm text-slate-500">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400" /> {exhibition.location}
                    </span>
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" /> {new Date(exhibition.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-400" /> {exhibition.assignedReps?.length || 0} reps assigned
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
