"use client"

import React, { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { getUser, logout, getToken } from "@/lib/auth"
import API_URL from "@/lib/apiBase"
import { fetchNoStore } from "@/lib/apiFetch"
import { parseResponse } from "@/lib/fetchUtils"
import { companyApi } from "@/lib/api"
import { getFavoriteHrefs } from "@/lib/admin-personalization"
import { resolveAdminAllowedSections } from "@/lib/admin-sections"
import { isProcurementEnabled } from "@/lib/module-flags"
import { isInterBranchNavHref, useCompanyBranches } from "@/lib/company-branches"
import { isOnTheGoNavHref, useOnTheGo } from "@/lib/on-the-go"
import {
  getAccountsSidebarModules,
  resolveAccountsPageFromPathname,
} from "@/lib/accounts-nav"
import {
  ADMIN_SECTION_LABELS,
  ADMIN_SECTION_ORDER,
  accountsNavIcon,
  navIcon,
} from "@/lib/nav-icons"
import {
  SidebarBrand,
  SidebarCount,
  SidebarFolder,
  SidebarFooter,
  SidebarFrame,
  SidebarNavLink,
  SidebarReveal,
  SidebarSectionLabel,
  isExactOrNestedPath,
} from "@/components/nav/sidebar-chrome"

interface SidebarProps {
  isOpen: boolean
  isCollapsed: boolean
  onToggle: () => void
  onCollapseToggle: () => void
}

const COLLAPSED_SECTIONS_KEY = "admin_sidebar_collapsed_sections_v2"

type AdminMenuItem = {
  label: string
  href: string
  section: string
  folder?: string
}

const adminMenuItems: AdminMenuItem[] = [
  { label: "Dashboard", href: "/admin", section: "CORE" },
  { label: "Manage Users", href: "/admin/users", section: "CORE" },
  { label: "Projects", href: "/admin/projects", section: "PROJECT MANAGEMENT" },
  { label: "Vendors & Suppliers", href: "/admin/procurement/suppliers", section: "PROCUREMENT (P2P)" },
  { label: "Budgets", href: "/admin/procurement/budgets", section: "PROCUREMENT (P2P)" },
  { label: "Purchase Requests", href: "/admin/procurement/requests", section: "PROCUREMENT (P2P)" },
  { label: "RFQs & Tenders", href: "/admin/procurement/rfq", section: "PROCUREMENT (P2P)" },
  { label: "Purchase Orders", href: "/admin/procurement/orders", section: "PROCUREMENT (P2P)" },
  { label: "Goods Receipt Note", href: "/admin/procurement/grns", section: "PROCUREMENT (P2P)" },
  { label: "Purchase Returns", href: "/admin/procurement/returns", section: "PROCUREMENT (P2P)" },
  { label: "Supplier Bills (AP)", href: "/admin/procurement/invoices", section: "PROCUREMENT (P2P)" },
  { label: "Payments", href: "/admin/procurement/payments", section: "PROCUREMENT (P2P)" },
  { label: "Contracts", href: "/admin/procurement/contracts", section: "PROCUREMENT (P2P)" },
  { label: "Job Postings", href: "/admin/jobs", section: "RECRUITMENT" },
  { label: "Applications", href: "/admin/applications", section: "RECRUITMENT" },
  { label: "Job Analytics", href: "/admin/analytics", section: "RECRUITMENT" },
  { label: "Communications", href: "/admin/communications", section: "RECRUITMENT" },
  { label: "Employees", href: "/admin/employees", section: "EMPLOYEE MANAGEMENT" },
  { label: "Staff Transfers", href: "/admin/stock/transfers?type=employee", section: "EMPLOYEE MANAGEMENT" },
  { label: "Onboarding", href: "/admin/onboarding", section: "EMPLOYEE MANAGEMENT" },
  { label: "Leave Requests", href: "/admin/leave", section: "EMPLOYEE MANAGEMENT" },
  { label: "Attendance Tracker", href: "/admin/attendance", section: "EMPLOYEE MANAGEMENT" },
  { label: "Allocations", href: "/admin/allocations", section: "EMPLOYEE MANAGEMENT" },
  { label: "Payroll Management", href: "/admin/payroll", section: "EMPLOYEE MANAGEMENT" },
  { label: "Meetings", href: "/admin/meetings", section: "EMPLOYEE MANAGEMENT" },
  { label: "Add Inventory", href: "/admin/stock/add-inventory", section: "INVENTORY MANAGER" },
  { label: "Warehouse Management", href: "/admin/stock/wms", section: "INVENTORY MANAGER" },
  { label: "Inter-branch Transfers", href: "/admin/stock/transfers", section: "INVENTORY MANAGER" },
  { label: "Stock Checks", href: "/admin/stock/stock-check", section: "INVENTORY MANAGER" },
  { label: "Sales", href: "/admin/stock/sales", section: "INVENTORY MANAGER" },
  { label: "Quotations", href: "/admin/stock/quotations", section: "INVENTORY MANAGER" },
  { label: "Sales Orders", href: "/admin/stock/sales-orders", section: "INVENTORY MANAGER" },
  { label: "Tender", href: "/admin/stock/tender", section: "INVENTORY MANAGER" },
  { label: "Services", href: "/admin/stock/services", section: "INVENTORY MANAGER" },
  { label: "Invoices", href: "/admin/stock/invoices", section: "INVENTORY MANAGER" },
  { label: "Credit Notes", href: "/admin/stock/credit-notes", section: "INVENTORY MANAGER" },
  { label: "Debit Notes", href: "/admin/accounts/receivables/debit-notes", section: "INVENTORY MANAGER" },
  { label: "Dispatch", href: "/admin/stock/dispatch", section: "INVENTORY MANAGER" },
  { label: "Website orders", href: "/admin/stock/website-orders", section: "INVENTORY MANAGER" },
  { label: "Inventory Status", href: "/admin/stock/status", section: "INVENTORY MANAGER" },
  { label: "Analytics", href: "/admin/stock/analytics", section: "INVENTORY MANAGER" },
  { label: "Outsourced Analytics", href: "/admin/stock/outsourced", section: "INVENTORY MANAGER" },
  { label: "IMPORTANTION", href: "/admin/stock/importation", section: "IMPORTATION" },
  { label: "Inventory History", href: "/admin/stock/history", section: "INVENTORY MANAGER" },
  { label: "Clients Hub", href: "/admin/clients", section: "CLIENTS" },
  { label: "Telesales Activity", href: "/admin/clients/telesales-activity", section: "CLIENTS" },
  { label: "Email Marketing", href: "/admin/clients/email-marketing", section: "CLIENTS" },
  { label: "Bulk SMS", href: "/admin/clients/bulk-sms", section: "CLIENTS" },
  { label: "Client Complaints", href: "/admin/clients/complaints", section: "CLIENTS" },
  { label: "Delivery Feedback", href: "/admin/clients/delivery-feedback", section: "CLIENTS" },
  { label: "Exhibitions & Events", href: "/admin/clients/exhibitions", section: "CLIENTS" },
  { label: "Clients list", href: "/admin/clients/clients-list", section: "CLIENTS" },
  { label: "Field", href: "/admin/field-management", section: "FIELD MANAGEMENT" },
  { label: "Sales", href: "/admin/field-management/sales", section: "FIELD MANAGEMENT", folder: "Sales" },
  { label: "Planner", href: "/admin/field-management/planner", section: "FIELD MANAGEMENT", folder: "Sales" },
  { label: "Visit reports", href: "/admin/field-management/reports", section: "FIELD MANAGEMENT", folder: "Sales" },
  { label: "Performance", href: "/admin/field-management/performance", section: "FIELD MANAGEMENT", folder: "Sales" },
  { label: "Sales reports", href: "/admin/sales-reports", section: "FIELD MANAGEMENT", folder: "Sales" },
  { label: "Technical Service", href: "/admin/field-management/technical-service", section: "FIELD MANAGEMENT", folder: "Technical Service" },
  { label: "Activity", href: "/admin/field-management/technical-service/activity", section: "FIELD MANAGEMENT", folder: "Technical Service" },
  { label: "QR codes", href: "/admin/field-management/technical-service/qr-codes", section: "FIELD MANAGEMENT", folder: "Technical Service" },
  { label: "Client reports", href: "/admin/field-management/technical-service/reports", section: "FIELD MANAGEMENT", folder: "Technical Service" },
  { label: "Tool requests", href: "/admin/field-management/technical-service/tools", section: "FIELD MANAGEMENT", folder: "Technical Service" },
  { label: "Expenses", href: "/admin/field-management/technical-service/expenses", section: "FIELD MANAGEMENT", folder: "Technical Service" },
  { label: "Installations", href: "/admin/field-management/technical-service/installations", section: "FIELD MANAGEMENT", folder: "Technical Service" },
  { label: "Installed machines", href: "/admin/clients/installed-machines", section: "FIELD MANAGEMENT", folder: "Technical Service" },
  { label: "Fleet Tracker", href: "/admin/fleet", section: "FLEET" },
  { label: "Resource Booking", href: "/admin/bookings", section: "EMPLOYEE MANAGEMENT" },
  { label: "Suggestions", href: "/admin/suggestions", section: "EMPLOYEE MANAGEMENT" },
  { label: "Badges & Awards", href: "/admin/badges", section: "EMPLOYEE MANAGEMENT" },
  { label: "Polls & Voting", href: "/admin/polls", section: "EMPLOYEE MANAGEMENT" },
  { label: "Contracts", href: "/admin/contracts", section: "EMPLOYEE MANAGEMENT" },
  { label: "Alerts", href: "/admin/alerts", section: "EMPLOYEE MANAGEMENT" },
  { label: "KPI Configuration", href: "/admin/kpis", section: "PERFORMANCE" },
  { label: "360° Feedback", href: "/admin/feedback-360", section: "PERFORMANCE" },
  { label: "Analytics & Reports", href: "/admin/reports", section: "PERFORMANCE" },
  { label: "Stamps", href: "/admin/stamps", section: "SYSTEM" },
  { label: "Company Settings", href: "/admin/settings/company", section: "SYSTEM" },
  { label: "User Settings", href: "/admin/settings/users", section: "SYSTEM" },
  { label: "System Settings", href: "/admin/settings/system", section: "SYSTEM" },
  { label: "Email Settings", href: "/admin/settings/system/email", section: "SYSTEM" },
  { label: "Page Access Control", href: "/admin/settings/system/page-access", section: "SYSTEM" },
]

const DISPATCH_HREFS = [
  "/admin/stock/add-inventory",
  "/admin/stock/wms",
  "/admin/stock/stock-check",
  "/admin/stock/dispatch",
  "/admin/stock/website-orders",
  "/admin/stock/status",
  "/admin/stock/history",
]

function useCompanyName() {
  const [name, setName] = useState("Admin")
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("elevate_branding")
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (parsed?.name) setName(parsed.name)
    } catch {
      // ignore
    }
  }, [])
  return name
}

export default function AdminSidebar({
  isOpen,
  isCollapsed,
  onToggle,
  onCollapseToggle,
}: SidebarProps) {
  const pathname = usePathname()
  const [allowedSections, setAllowedSections] = useState<Set<string> | null>(null)
  const [pendingQuotationCount, setPendingQuotationCount] = useState(0)
  const [pendingInvoiceCount, setPendingInvoiceCount] = useState(0)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [favoriteHrefs, setFavoriteHrefs] = useState<string[]>([])

  const currentUser = useMemo(() => getUser(), [])
  const { hasBranches } = useCompanyBranches()
  const { onTheGo } = useOnTheGo()
  const companyName = useCompanyName()

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_SECTIONS_KEY)
      if (saved) setCollapsedSections(new Set(JSON.parse(saved)))
    } catch {
      setCollapsedSections(new Set())
    }
  }, [])

  useEffect(() => {
    const expandForTour = () => {
      if (document.body.dataset.walkthrough === "open") {
        setCollapsedSections(new Set())
      }
    }
    expandForTour()
    const observer = new MutationObserver(expandForTour)
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-walkthrough"] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const loadSectionAccess = async () => {
      const role = currentUser?.role
      if (!role || role === "super_admin") {
        setAllowedSections(null)
        return
      }
      try {
        const response = await companyApi.getPageAccess()
        if (!response?.success) {
          setAllowedSections(null)
          return
        }
        const userId = currentUser?._id || (currentUser as { userId?: string })?.userId
        setAllowedSections(
          resolveAdminAllowedSections({
            role,
            userId,
            pageAccess: response.data,
          }),
        )
      } catch {
        setAllowedSections(null)
      }
    }
    loadSectionAccess()
  }, [currentUser?.role, currentUser?._id])

  useEffect(() => {
    const role = currentUser?.role
    if (!role || !["company_admin", "admin", "hr"].includes(role)) {
      setPendingQuotationCount(0)
      setPendingInvoiceCount(0)
      return
    }

    let mounted = true
    const loadPendingCount = async () => {
      try {
        const token = getToken()
        if (!token) return
        const headers = { Authorization: `Bearer ${token}` }
        const [quotesResponse, invoicesResponse] = await Promise.all([
          fetchNoStore(`${API_URL}/api/stock/quotations?status=pending_approval&count=1`, { headers }),
          fetchNoStore(`${API_URL}/api/stock/invoices?status=pending_approval&count=1`, { headers }),
        ])
        const quotesParsed = await parseResponse(quotesResponse)
        const invoicesParsed = await parseResponse(invoicesResponse)
        if (!mounted) return
        setPendingQuotationCount(
          quotesParsed.response.ok ? Number(quotesParsed.data?.data?.count || 0) : 0,
        )
        setPendingInvoiceCount(
          invoicesParsed.response.ok ? Number(invoicesParsed.data?.data?.count || 0) : 0,
        )
      } catch {}
    }

    loadPendingCount()
    const interval = setInterval(loadPendingCount, 30000)
    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [currentUser?.role])

  useEffect(() => {
    setFavoriteHrefs(getFavoriteHrefs())
    const onStorage = () => setFavoriteHrefs(getFavoriteHrefs())
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [pathname])

  const itemVisible = (item: (typeof adminMenuItems)[number]) => {
    if (item.section === "PROCUREMENT (P2P)" && !isProcurementEnabled()) return false
    if (isInterBranchNavHref(item.href) && !hasBranches) return false
    if (onTheGo && !isOnTheGoNavHref(item.href)) return false
    if (currentUser?.role === "dispatch" && !DISPATCH_HREFS.includes(item.href)) return false
    if (allowedSections && !allowedSections.has(item.section)) return false
    return true
  }

  const sections: Record<string, typeof adminMenuItems> = {}
  adminMenuItems.forEach((item) => {
    if (!itemVisible(item)) return
    if (!sections[item.section]) sections[item.section] = []
    sections[item.section].push(item)
  })

  const favoriteItems = useMemo(
    () => adminMenuItems.filter((item) => favoriteHrefs.includes(item.href) && itemVisible(item)),
    [favoriteHrefs, allowedSections, currentUser?.role, hasBranches, onTheGo],
  )

  const showAccountsSection =
    !onTheGo &&
    (!allowedSections || allowedSections.has("ACCOUNTS")) &&
    currentUser?.role !== "dispatch"

  const toggleSection = (sectionName: string) => {
    setCollapsedSections((current) => {
      const next = new Set(current)
      if (next.has(sectionName)) next.delete(sectionName)
      else next.add(sectionName)
      try {
        localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(Array.from(next)))
      } catch {}
      return next
    })
  }

  const badgeFor = (href: string) => {
    if (href === "/admin/stock/quotations") return <SidebarCount value={pendingQuotationCount} />
    if (href === "/admin/stock/invoices") return <SidebarCount value={pendingInvoiceCount} />
    return null
  }

  const renderItem = (item: (typeof adminMenuItems)[number], keyPrefix = "") => (
    <SidebarNavLink
      key={`${keyPrefix}${item.href}`}
      href={item.href}
      label={item.label}
      icon={navIcon(item.href)}
      isActive={isExactOrNestedPath(pathname, item.href, [
        "/admin",
        "/admin/clients",
        "/admin/field-management",
        "/admin/field-management/sales",
        "/admin/field-management/technical-service",
      ])}
      isCollapsed={isCollapsed}
      dataTour={keyPrefix ? undefined : `wt-nav-${item.href}`}
      badge={badgeFor(item.href)}
    />
  )

  const renderAccountsSection = () => {
    const modules = getAccountsSidebarModules()
    const activeAccountsPage = resolveAccountsPageFromPathname(pathname || "")
    const collapsed = collapsedSections.has("ACCOUNTS")

    return (
      <div key="ACCOUNTS" data-tour="wt-section-ACCOUNTS">
        <SidebarSectionLabel
          label={ADMIN_SECTION_LABELS.ACCOUNTS}
          isCollapsed={isCollapsed}
          collapsed={collapsed}
          onToggle={() => toggleSection("ACCOUNTS")}
        />
        <SidebarReveal open={isCollapsed || !collapsed} className="space-y-0.5">
          {modules.map((mod) => {
            const isActive =
              activeAccountsPage?.groupId === mod.groupId ||
              pathname === mod.href ||
              (pathname || "").startsWith(`${mod.href}/`)
            return (
              <SidebarNavLink
                key={mod.groupId}
                href={mod.href}
                label={mod.label}
                icon={accountsNavIcon(mod.groupId)}
                isActive={isActive}
                isCollapsed={isCollapsed}
                title={mod.description}
              />
            )
          })}
        </SidebarReveal>
      </div>
    )
  }

  const orderedSections = ADMIN_SECTION_ORDER.filter((sectionName) => {
    if (sectionName === "ACCOUNTS") return showAccountsSection
    return Boolean(sections[sectionName]?.length)
  })

  const userName = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ")

  return (
    <SidebarFrame isOpen={isOpen} isCollapsed={isCollapsed} onToggle={onToggle}>
      <SidebarBrand
        href="/admin"
        title={onTheGo ? "On the Go" : companyName}
        subtitle={onTheGo ? companyName : "Admin"}
        isCollapsed={isCollapsed}
        onMobileClose={onToggle}
      />

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3" aria-label="Admin pages">
        {favoriteItems.length > 0 ? (
          <div>
            <SidebarSectionLabel label="Favorites" isCollapsed={isCollapsed} />
            <div className="space-y-0.5">{favoriteItems.map((item) => renderItem(item, "fav-"))}</div>
          </div>
        ) : null}

        {orderedSections.map((sectionName) => {
          if (sectionName === "ACCOUNTS") return renderAccountsSection()
          const items = sections[sectionName] || []
          const collapsed = collapsedSections.has(sectionName)
          const folders = Array.from(
            new Set(items.map((item) => item.folder).filter((folder): folder is string => Boolean(folder))),
          )
          const ungrouped = items.filter((item) => !item.folder)
          return (
            <div key={sectionName} data-tour={`wt-section-${sectionName}`}>
              <SidebarSectionLabel
                label={ADMIN_SECTION_LABELS[sectionName] || sectionName}
                isCollapsed={isCollapsed}
                collapsed={collapsed}
                onToggle={() => toggleSection(sectionName)}
              />
              <SidebarReveal open={isCollapsed || !collapsed} className="space-y-0.5">
                {ungrouped.map((item) => renderItem(item))}
                {folders.map((folder) => {
                  const folderItems = items.filter((item) => item.folder === folder)
                  const folderKey = `${sectionName}:${folder}`
                  const folderCollapsed = collapsedSections.has(folderKey)
                  const folderActive = folderItems.some((item) =>
                    isExactOrNestedPath(pathname, item.href, ["/admin"]),
                  )
                  return (
                    <SidebarFolder
                      key={folderKey}
                      label={folder}
                      isCollapsed={isCollapsed}
                      collapsed={folderCollapsed && !folderActive}
                      onToggle={() => toggleSection(folderKey)}
                    >
                      {folderItems.map((item) => renderItem(item))}
                    </SidebarFolder>
                  )
                })}
              </SidebarReveal>
            </div>
          )
        })}
      </nav>

      <SidebarFooter
        isCollapsed={isCollapsed}
        onCollapseToggle={onCollapseToggle}
        onLogout={() => logout()}
        userName={userName}
        userRole={currentUser?.role}
      />
    </SidebarFrame>
  )
}
