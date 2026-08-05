"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Save, Building2, Mail, Phone } from "lucide-react"

export default function OrganizationSettings() {
  const [settings, setSettings] = useState({
    name: "Tech Corp",
    email: "admin@techcorp.com",
    phone: "+1 (555) 123-4567",
    industry: "Technology",
    website: "https://techcorp.com",
    employees: "150-200",
    timezone: "America/New_York",
    currency: "USD",
  })

  const [isSaving, setIsSaving] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground">Manage your company profile and preferences</p>
      </div>

      <Card className="p-8 border-border">
        <h2 className="text-xl font-bold mb-6">Company Information</h2>

        <div className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Company Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input type="text" name="name" value={settings.name} onChange={handleChange} className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Industry</label>
              <select
                name="industry"
                value={settings.industry}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Technology">Technology</option>
                <option value="Finance">Finance</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Retail">Retail</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input type="email" name="email" value={settings.email} onChange={handleChange} className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                <Input type="tel" name="phone" value={settings.phone} onChange={handleChange} className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Website</label>
              <Input type="url" name="website" value={settings.website} onChange={handleChange} />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Number of Employees</label>
              <select
                name="employees"
                value={settings.employees}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="1-50">1-50</option>
                <option value="51-150">51-150</option>
                <option value="150-200">150-200</option>
                <option value="200+">200+</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Timezone</label>
              <select
                name="timezone"
                value={settings.timezone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Currency</label>
              <select
                name="currency"
                value={settings.currency}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-primary hover:bg-primary/90" disabled={isSaving}>
              <Save size={18} className="mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
