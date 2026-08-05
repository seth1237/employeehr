"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, User, Menu } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface UserData {
  firstName: string
  lastName: string
  email: string
  employee_id?: string
  position?: string
  role: string
}

interface CompanyData {
  name: string
  logo?: string
  primaryColor?: string
}

interface EmployeeTopNavProps {
  onMenuClick?: () => void
}

export function EmployeeTopNav({ onMenuClick }: EmployeeTopNavProps) {
  const [user, setUser] = useState<UserData | null>(null)
  const [company, setCompany] = useState<CompanyData | null>(null)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    const companyData = localStorage.getItem("company")
    
    if (userData) setUser(JSON.parse(userData))
    if (companyData) setCompany(JSON.parse(companyData))
  }, [])

  if (!user || !company) return null

  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white dark:bg-gray-950 px-4 lg:px-6">
      {/* Left side - Menu button + Company Info */}
      <div className="flex items-center gap-3">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Company Info */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-center bg-no-repeat bg-contain" style={{ backgroundImage: 'var(--company-logo-url)' }}></div>
          <div className="hidden sm:block">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{company.name}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Employee Portal</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
        </Button>

        {/* User Avatar */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {user.employee_id || user.position || "Employee"}
            </p>
          </div>
          <Avatar>
            <AvatarFallback className="bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
