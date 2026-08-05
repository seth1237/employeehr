"use client"

import type React from "react"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Building2, Globe, Phone } from "lucide-react"

interface CompanySetupProps {
  onNext: (data: any) => void
}

export default function CompanySetup({ onNext }: CompanySetupProps) {
  const [formData, setFormData] = useState({
    companyName: "",
    website: "",
    phone: "",
    industry: "",
    description: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Don't pass localhost - let backend derive tenant domain
    onNext(formData)
  }

  return (
    <Card className="p-8 border-border">
      <h2 className="text-2xl font-bold mb-2">Tell Us About Your Company</h2>
      <p className="text-muted-foreground mb-8">This information helps us customize Elevate for your organization.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Company Name</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              name="companyName"
              placeholder="Your Company Name"
              value={formData.companyName}
              onChange={handleChange}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Website (Optional)</label>
          <div className="relative">
            <Globe className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              type="url"
              name="website"
              placeholder="https://company.com"
              value={formData.website}
              onChange={handleChange}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Phone Number (Optional)</label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
            <Input
              type="tel"
              name="phone"
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={handleChange}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Industry</label>
            <select
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select an industry</option>
              <option value="tech">Technology</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="retail">Retail</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Number of Employees</label>
            <select
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select size</option>
              <option value="1-50">1-50</option>
              <option value="51-200">51-200</option>
              <option value="201-500">201-500</option>
              <option value="500+">500+</option>
            </select>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90">
          Continue to Invite Team
        </Button>
      </form>
    </Card>
  )
}
