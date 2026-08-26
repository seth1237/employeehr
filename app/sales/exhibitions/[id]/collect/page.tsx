"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

export default function CollectExhibitionDataPage() {
  const { id } = useParams()
  const router = useRouter()
  const [exhibition, setExhibition] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    facility: "",
    role: "",
    location: "",
    phoneNumber: "",
    email: "",
    productOfInterest: "",
    customData: {} as Record<string, any>,
    notes: ""
  })

  useEffect(() => {
    const fetchExhibition = async () => {
      try {
        const res = await fetch(`${API_URL}/api/exhibitions/${id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        })
        const data = await res.json()
        if (data.success) {
          setExhibition(data.data)
        } else {
          setError(data.message || "Failed to load exhibition")
        }
      } catch (err: any) {
        setError(err.message || "Network error")
      } finally {
        setLoading(false)
      }
    }
    fetchExhibition()
  }, [id])

  const handleCustomDataChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customData: {
        ...prev.customData,
        [name]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch(`${API_URL}/api/exhibitions/${id}/collect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(true)
        // Reset form for next entry
        setFormData({
          name: "",
          facility: "",
          role: "",
          location: "",
          phoneNumber: "",
          email: "",
          productOfInterest: "",
          customData: {},
          notes: ""
        })
        window.scrollTo({ top: 0, behavior: "smooth" })
      } else {
        setError(data.message || "Failed to submit lead")
      }
    } catch (err: any) {
      setError(err.message || "Network error")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading form...</div>
  }

  if (error && !exhibition) {
    return (
      <div className="mx-auto w-full max-w-2xl p-6">
        <div className="mb-4 rounded bg-red-50 p-4 text-red-600">{error}</div>
        <Link href="/sales/exhibitions"><Button variant="outline">Back to Exhibitions</Button></Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-6 pb-20">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sales/exhibitions">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{exhibition.name}</h1>
            <p className="text-sm text-slate-500">Data Collection Form</p>
          </div>
        </div>
        <Link href={`/sales/exhibitions/${id}/history`}>
          <Button variant="outline" className="w-full sm:w-auto">
            View My Collected Leads
          </Button>
        </Link>
      </div>

      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="font-medium">Lead captured successfully!</p>
            <p className="text-sm opacity-90">The form has been reset for the next entry.</p>
          </div>
        </div>
      )}

      {error && <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600 border border-red-200">{error}</div>}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name <span className="text-red-500">*</span></Label>
              <Input
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Facility of Association <span className="text-red-500">*</span></Label>
              <Input
                required
                value={formData.facility}
                onChange={e => setFormData({ ...formData, facility: e.target.value })}
                placeholder="e.g. Nairobi Hospital / Tech Corp"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Role <span className="text-red-500">*</span></Label>
                <Input
                  required
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  placeholder="e.g. Lab Manager"
                />
              </div>
              <div className="space-y-2">
                <Label>Location <span className="text-red-500">*</span></Label>
                <Input
                  required
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Westlands, Nairobi"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Phone Number <span className="text-red-500">*</span></Label>
                <Input
                  required
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder="e.g. 0712345678"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Product of Interest <span className="text-red-500">*</span></Label>
              <Input
                required
                value={formData.productOfInterest}
                onChange={e => setFormData({ ...formData, productOfInterest: e.target.value })}
                placeholder="e.g. Hematology Analyzer"
              />
            </div>
          </CardContent>
        </Card>

        {exhibition.customFields?.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {exhibition.customFields.map((field: any, index: number) => (
                <div key={index} className="space-y-2">
                  <Label>
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </Label>
                  {field.type === "boolean" ? (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300"
                        required={field.required}
                        checked={formData.customData[field.name] || false}
                        onChange={e => handleCustomDataChange(field.name, e.target.checked)}
                      />
                      <span className="text-sm text-slate-600">Yes</span>
                    </div>
                  ) : (
                    <Input
                      type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                      required={field.required}
                      value={formData.customData[field.name] || ""}
                      onChange={e => handleCustomDataChange(field.name, e.target.value)}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="sticky bottom-4 z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end rounded-xl border bg-white p-4 shadow-lg shadow-slate-200/50">
          <Button 
            type="button" 
            variant="outline" 
            className="w-full sm:w-auto"
            onClick={() => router.push("/sales/exhibitions")}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="w-full sm:w-auto bg-teal-700 hover:bg-teal-800"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save Lead Data"}
          </Button>
        </div>
      </form>
    </div>
  )
}
