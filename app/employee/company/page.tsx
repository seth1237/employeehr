"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Mail, Phone, Globe, Users, Calendar } from "lucide-react"
import { EmployeeSidebar } from "@/components/employee/sidebar"
import { EmployeeTopNav } from "@/components/employee/top-nav"
import { Badge } from "@/components/ui/badge"

interface CompanyData {
  name: string
  email: string
  phone: string
  website?: string
  industry: string
  employeeCount: number
  logo?: string
  primaryColor?: string
  secondaryColor?: string
  subscription: string
  status: string
  createdAt: string
}

interface UserData {
  firstName: string
  lastName: string
  email: string
  employee_id?: string
  position?: string
  department?: string
  role: string
  dateOfJoining?: string
}

export default function EmployeeCompanyPage() {
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [user, setUser] = useState<UserData | null>(null)

  useEffect(() => {
    const companyData = localStorage.getItem("company")
    const userData = localStorage.getItem("user")
    
    if (companyData) setCompany(JSON.parse(companyData))
    if (userData) setUser(JSON.parse(userData))
  }, [])

  if (!company || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      <EmployeeSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <EmployeeTopNav />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Company Information</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Learn more about your organization
              </p>
            </div>

            {/* Company Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div
                    className="h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                    style={{
                      background: company.primaryColor 
                        ? `linear-gradient(135deg, ${company.primaryColor}, ${company.secondaryColor || company.primaryColor})` 
                        : "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                    }}
                  >
                    {company.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{company.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant={company.status === "active" ? "default" : "secondary"}>
                        {company.status.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{company.subscription.toUpperCase()}</Badge>
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Mail className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium">{company.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="font-medium">{company.phone}</p>
                    </div>
                  </div>
                  {company.website && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Globe className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Website</p>
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                          {company.website}
                        </a>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Building2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Industry</p>
                      <p className="font-medium">{company.industry}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Employees</p>
                      <p className="font-medium">{company.employeeCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Established</p>
                      <p className="font-medium">{new Date(company.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Your Information */}
            <Card>
              <CardHeader>
                <CardTitle>Your Information</CardTitle>
                <CardDescription>Your employee details at {company.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Full Name</p>
                    <p className="font-medium">{user.firstName} {user.lastName}</p>
                  </div>
                  {user.employee_id && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Employee ID</p>
                      <p className="font-medium">{user.employee_id}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  {user.position && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Position</p>
                      <p className="font-medium">{user.position}</p>
                    </div>
                  )}
                  {user.department && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Department</p>
                      <p className="font-medium">{user.department}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Role</p>
                    <Badge>{user.role.replace("_", " ").toUpperCase()}</Badge>
                  </div>
                  {user.dateOfJoining && (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Date of Joining</p>
                      <p className="font-medium">{new Date(user.dateOfJoining).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
