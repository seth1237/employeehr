"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { companyApi } from "@/lib/api"
import { getUser } from "@/lib/auth"
import {
  LayoutDashboard,
  User,
  CheckSquare,
  Mail,
  MessageSquare,
  Calendar,
  Award,
  BarChart,
  Building2,
  Bell,
  Settings,
  LogOut,
  BookOpen,
  Car,
  FileWarning,
  Lightbulb,
  Trophy,
  Vote,
  AlertCircle,
  FileText,
  Receipt,
  Video,
  X,
  Package,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/employee", icon: LayoutDashboard },
  { name: "My Profile", href: "/employee/profile", icon: User },
  { name: "My Tasks", href: "/employee/tasks", icon: CheckSquare },
  { name: "Meetings", href: "/employee/meetings", icon: Video },
  { name: "Messages", href: "/employee/messages", icon: Mail },
  { name: "My Feedback", href: "/employee/feedback", icon: MessageSquare },
  { name: "My PDP", href: "/employee/pdp", icon: BarChart },
  { name: "My Attendance", href: "/employee/attendance", icon: Calendar },
  { name: "My Payslips", href: "/employee/payslip", icon: Receipt },
  { name: "Stock Sales", href: "/employee/stock", icon: Package },
  { name: "My Quotations", href: "/employee/stock/quotations", icon: FileText },
  { name: "My Invoices", href: "/employee/stock#my-invoices", icon: Receipt },
  { name: "My Dispatch", href: "/employee/dispatch", icon: Package },
  { name: "My Awards", href: "/employee/awards", icon: Award },
  { name: "Badges", href: "/employee/badges", icon: Trophy },
  { name: "Resource Booking", href: "/employee/bookings", icon: Car },
  { name: "Suggestions Box", href: "/employee/suggestions", icon: Lightbulb },
  { name: "Voting & Polls", href: "/employee/polls", icon: Vote },
  { name: "Contract Alerts", href: "/employee/contracts", icon: FileWarning },
  { name: "Alerts & Notifications", href: "/employee/alerts", icon: AlertCircle },
  { name: "Reports", href: "/employee/reports", icon: FileText },
  { name: "Company Info", href: "/employee/company", icon: Building2 },
  { name: "Notifications", href: "/employee/notifications", icon: Bell },
  { name: "Settings", href: "/employee/settings", icon: Settings },
]

interface EmployeeSidebarProps {
  isOpen?: boolean
  onToggle?: () => void
}

type SectionKey = "CORE" | "EMPLOYEE MANAGEMENT" | "INVENTORY MANAGER" | "ACCOUNTS" | "PERFORMANCE" | "SYSTEM"

export function EmployeeSidebar({ isOpen = false, onToggle }: EmployeeSidebarProps) {
  const pathname = usePathname()
  const [allowedSections, setAllowedSections] = useState<Set<string> | null>(null)

  useEffect(() => {
    const loadSectionAccess = async () => {
      const user = getUser()
      const role = user?.role

      if (!role || role === "company_admin") {
        setAllowedSections(null)
        return
      }

      try {
        const response = await companyApi.getPageAccess()
        if (response.success) {
          const userId = user?._id || (user as any)?.userId
          const userSections = userId ? response.data?.adminSectionsByUser?.[userId] : undefined
          const roleSections = response.data?.adminSectionsByRole?.[role] || []
          const effectiveSections = Array.from(new Set([...(roleSections || []), ...(userSections || [])]))
          setAllowedSections(new Set(effectiveSections))
        }
      } catch {
        setAllowedSections(null)
      }
    }

    loadSectionAccess()
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = "/employee-login"
  }

  const navigation = [
    { name: "Dashboard", href: "/employee", icon: LayoutDashboard, section: "CORE" as SectionKey },
    { name: "My Profile", href: "/employee/profile", icon: User, section: "CORE" as SectionKey },
    { name: "My Tasks", href: "/employee/tasks", icon: CheckSquare, section: "CORE" as SectionKey },
    { name: "Meetings", href: "/employee/meetings", icon: Video, section: "EMPLOYEE MANAGEMENT" as SectionKey },
    { name: "Messages", href: "/employee/messages", icon: Mail, section: "CORE" as SectionKey },
    { name: "My Feedback", href: "/employee/feedback", icon: MessageSquare, section: "PERFORMANCE" as SectionKey },
    { name: "My PDP", href: "/employee/pdp", icon: BarChart, section: "PERFORMANCE" as SectionKey },
    { name: "My Attendance", href: "/employee/attendance", icon: Calendar, section: "EMPLOYEE MANAGEMENT" as SectionKey },
    { name: "My Payslips", href: "/employee/payslip", icon: Receipt, section: "ACCOUNTS" as SectionKey },
    { name: "Stock Sales", href: "/employee/stock", icon: Package, section: "INVENTORY MANAGER" as SectionKey },
    { name: "My Quotations", href: "/employee/stock/quotations", icon: FileText, section: "INVENTORY MANAGER" as SectionKey },
    { name: "My Invoices", href: "/employee/stock#my-invoices", icon: Receipt, section: "INVENTORY MANAGER" as SectionKey },
    { name: "My Dispatch", href: "/employee/dispatch", icon: Package, section: "INVENTORY MANAGER" as SectionKey },
    { name: "My Awards", href: "/employee/awards", icon: Award, section: "PERFORMANCE" as SectionKey },
    { name: "Badges", href: "/employee/badges", icon: Trophy, section: "PERFORMANCE" as SectionKey },
    { name: "Resource Booking", href: "/employee/bookings", icon: Car, section: "EMPLOYEE MANAGEMENT" as SectionKey },
    { name: "Suggestions Box", href: "/employee/suggestions", icon: Lightbulb, section: "EMPLOYEE MANAGEMENT" as SectionKey },
    { name: "Voting & Polls", href: "/employee/polls", icon: Vote, section: "EMPLOYEE MANAGEMENT" as SectionKey },
    { name: "Contract Alerts", href: "/employee/contracts", icon: FileWarning, section: "SYSTEM" as SectionKey },
    { name: "Alerts & Notifications", href: "/employee/alerts", icon: AlertCircle, section: "SYSTEM" as SectionKey },
    { name: "Reports", href: "/employee/reports", icon: FileText, section: "PERFORMANCE" as SectionKey },
    { name: "Company Info", href: "/employee/company", icon: Building2, section: "SYSTEM" as SectionKey },
    { name: "Notifications", href: "/employee/notifications", icon: Bell, section: "SYSTEM" as SectionKey },
    { name: "Settings", href: "/employee/settings", icon: Settings, section: "SYSTEM" as SectionKey },
  ]

  const sectionOrder: SectionKey[] = ["CORE", "EMPLOYEE MANAGEMENT", "INVENTORY MANAGER", "PERFORMANCE", "ACCOUNTS", "SYSTEM"]

  const sectionLabels: Record<SectionKey, string> = {
    CORE: "Core",
    "EMPLOYEE MANAGEMENT": "Employee Management",
    "INVENTORY MANAGER": "Inventory Manager",
    PERFORMANCE: "Performance",
    ACCOUNTS: "Accounts",
    SYSTEM: "System",
  }

  const visibleNavigation = allowedSections
    ? navigation.filter((item) => allowedSections.has(item.section))
    : navigation

  const groupedNavigation = sectionOrder
    .map((section) => ({
      section,
      items: visibleNavigation.filter((item) => item.section === section),
    }))
    .filter((group) => group.items.length > 0)

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <div
        className={cn(
          "fixed lg:static top-0 left-0 z-50 flex h-screen w-64 flex-col border-r bg-white dark:bg-gray-950 transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b px-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-center bg-no-repeat bg-contain" style={{ backgroundImage: 'var(--company-logo-url)' }}></div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--brand-primary)' }}>Employee Portal</h1>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onToggle}
            className="lg:hidden p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto p-4">
          {groupedNavigation.map(({ section, items }) => (
            <div key={section} className="space-y-2">
              <div className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {sectionLabels[section]}
              </div>
              <div className="space-y-1">
                {items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={onToggle}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </div>
    </>
  )
}
