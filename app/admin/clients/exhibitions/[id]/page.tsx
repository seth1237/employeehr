"use client"

import { useEffect, useState, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, MapPin, Download, Users, Upload, FileDown, Edit, Loader2, Trash2, CheckSquare } from "lucide-react"
import * as XLSX from "xlsx"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function ExhibitionDetailsPage() {
  const { id } = useParams()
  const [exhibition, setExhibition] = useState<any>(null)
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  
  const [editingLead, setEditingLead] = useState<any>(null)
  const [isUpdatingLead, setIsUpdatingLead] = useState(false)
  
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const reloadLeads = async () => {
    try {
      const leadsRes = await fetch(`${API_URL}/api/exhibitions/${id}/leads`, { headers: { Authorization: `Bearer ${getToken()}` } })
      const leadsData = await leadsRes.json()
      if (leadsData?.success) setLeads(leadsData.data)
    } catch (e) {
      console.error(e)
    }
  }

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

        if (exData?.success) {
          setExhibition(exData.data)
        } else {
          setError(exData.message || "Failed to load exhibition")
        }

        if (leadsData?.success) {
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

  const handleDownloadTemplate = () => {
    const headers = [
      "Name",
      "Facility",
      "Role",
      "Location",
      "Phone",
      "Email",
      "Product of Interest",
      "Notes"
    ]
    
    const csvContent = [headers.join(",")].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leads-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) {
        throw new Error("The uploaded file is empty.")
      }

      const res = await fetch(`${API_URL}/api/exhibitions/${id}/import-leads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ leads: jsonData }),
      })

      const result = await res.json()
      if (!result?.success) throw new Error(result.message)

      toast({
        title: "Import Successful",
        description: result.message || `Successfully imported leads.`,
      })
      
      await reloadLeads()
    } catch (err: any) {
      toast({ title: "Import Failed", description: err.message, variant: "destructive" })
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingLead) return
    setIsUpdatingLead(true)
    try {
      const res = await fetch(`${API_URL}/api/exhibitions/${id}/leads/${editingLead._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(editingLead),
      })
      const data = await res.json()
      if (!data?.success) throw new Error(data.message)
      
      toast({ title: "Success", description: "Lead updated successfully." })
      setEditingLead(null)
      await reloadLeads()
    } catch (err: any) {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" })
    } finally {
      setIsUpdatingLead(false)
    }
  }

  const toggleLeadSelection = (leadId: string) => {
    const next = new Set(selectedLeads)
    if (next.has(leadId)) {
      next.delete(leadId)
    } else {
      next.add(leadId)
    }
    setSelectedLeads(next)
  }

  const toggleAllLeads = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(leads.map(l => l._id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedLeads.size === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedLeads.size} lead(s)?`)) return

    setIsDeleting(true)
    try {
      const res = await fetch(`${API_URL}/api/exhibitions/${id}/leads/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ leadIds: Array.from(selectedLeads) }),
      })
      const data = await res.json()
      if (!data?.success) throw new Error(data.message)

      toast({ title: "Deleted", description: data.message })
      setSelectedLeads(new Set())
      await reloadLeads()
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
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
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            accept=".csv, .xlsx, .xls" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
            <FileDown className="mr-2 h-4 w-4" />
            Template
          </Button>
          <Button onClick={() => fileInputRef.current?.click()} variant="secondary" size="sm" disabled={isImporting}>
            <Upload className="mr-2 h-4 w-4" />
            {isImporting ? "Importing..." : "Import Leads"}
          </Button>
          <Button onClick={handleExportCSV} variant="outline" size="sm" disabled={leads.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <Card className="md:row-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Collected Leads ({leads.length})</CardTitle>
              <CardDescription>Data collected by sales reps in the field.</CardDescription>
            </div>
            {selectedLeads.size > 0 && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDeleteSelected}
                disabled={isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : `Delete ${selectedLeads.size}`}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">No leads collected yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-slate-50">
                    <tr>
                      <th className="p-3 w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-slate-300"
                          checked={selectedLeads.size === leads.length && leads.length > 0}
                          onChange={toggleAllLeads}
                        />
                      </th>
                      <th className="p-3 font-medium text-slate-600">Name</th>
                      <th className="p-3 font-medium text-slate-600">Facility / Company</th>
                      <th className="p-3 font-medium text-slate-600">Phone</th>
                      <th className="p-3 font-medium text-slate-600">Product of Interest</th>
                      <th className="p-3 font-medium text-slate-600">Rep</th>
                      <th className="p-3 font-medium text-slate-600 w-16 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.map((lead) => (
                      <tr key={lead._id} className={`hover:bg-slate-50 ${selectedLeads.has(lead._id) ? "bg-slate-50" : ""}`}>
                        <td className="p-3">
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300"
                            checked={selectedLeads.has(lead._id)}
                            onChange={() => toggleLeadSelection(lead._id)}
                          />
                        </td>
                        <td className="p-3 font-medium">{lead.name}</td>
                        <td className="p-3">{lead.facility}</td>
                        <td className="p-3">{lead.phoneNumber}</td>
                        <td className="p-3">{lead.productOfInterest}</td>
                        <td className="p-3 text-slate-500 text-sm">
                          {lead.collectedByData ? `${lead.collectedByData.firstName} ${lead.collectedByData.lastName}` : lead.collectedBy}
                        </td>
                        <td className="p-3 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-2 text-slate-500 hover:text-slate-900"
                            onClick={() => setEditingLead(lead)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
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

      <Dialog open={!!editingLead} onOpenChange={(o) => !o && setEditingLead(null)}>
        <DialogContent className="max-w-xl">
          <form onSubmit={handleUpdateLead}>
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input 
                  value={editingLead?.name || ""} 
                  onChange={(e) => setEditingLead((prev: any) => ({ ...prev, name: e.target.value }))}
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label>Facility / Company</Label>
                <Input 
                  value={editingLead?.facility || ""} 
                  onChange={(e) => setEditingLead((prev: any) => ({ ...prev, facility: e.target.value }))}
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label>Role / Job Title</Label>
                <Input 
                  value={editingLead?.role || ""} 
                  onChange={(e) => setEditingLead((prev: any) => ({ ...prev, role: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Phone Number</Label>
                <Input 
                  value={editingLead?.phoneNumber || ""} 
                  onChange={(e) => setEditingLead((prev: any) => ({ ...prev, phoneNumber: e.target.value }))}
                  required 
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={editingLead?.email || ""} 
                  onChange={(e) => setEditingLead((prev: any) => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Location / Region</Label>
                <Input 
                  value={editingLead?.location || ""} 
                  onChange={(e) => setEditingLead((prev: any) => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Product of Interest</Label>
                <Input 
                  value={editingLead?.productOfInterest || ""} 
                  onChange={(e) => setEditingLead((prev: any) => ({ ...prev, productOfInterest: e.target.value }))}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea 
                  value={editingLead?.notes || ""} 
                  onChange={(e) => setEditingLead((prev: any) => ({ ...prev, notes: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingLead(null)}>Cancel</Button>
              <Button type="submit" disabled={isUpdatingLead}>
                {isUpdatingLead && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
