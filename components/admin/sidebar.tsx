"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Target,
  Award,
  BarChart3,
  Settings,
  Building2,
  FileText,
  ChevronLeft,
  LogOut,
  Shield,
  Calendar,
  Lightbulb,
  Vote,
  FileCheck,
  AlertCircle,
  Bell,
  ChevronDown,
  Briefcase,
  UserCheck,
  TrendingUp,
  Mail,
  Banknote,
  Video,
  Package,
  Stamp,
  ShieldCheck,
  Clock3,
  Truck,
  PhoneCall,
  Star,
} from "lucide-react";
import { getUser, logout } from "@/lib/auth";
import { getToken } from "@/lib/auth";
import API_URL from "@/lib/apiBase";
import { parseResponse } from "@/lib/fetchUtils";
import { companyApi } from "@/lib/api";
import { getFavoriteHrefs } from "@/lib/admin-personalization";
import { useEffect, useMemo, useState } from "react";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onToggle: () => void;
  onCollapseToggle: () => void;
}

const COLLAPSED_SECTIONS_KEY = "admin_sidebar_collapsed_sections";

const adminMenuItems = [
  // Core Management
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin",
    section: "CORE",
  },
  {
    label: "Manage Users",
    icon: Users,
    href: "/admin/users",
    section: "CORE",
  },

  // Recruitment & Jobs
  {
    label: "Job Postings",
    icon: Briefcase,
    href: "/admin/jobs",
    section: "RECRUITMENT",
  },
  {
    label: "Applications",
    icon: UserCheck,
    href: "/admin/applications",
    section: "RECRUITMENT",
  },
  {
    label: "Job Analytics",
    icon: TrendingUp,
    href: "/admin/analytics",
    section: "RECRUITMENT",
  },
  {
    label: "Communications",
    icon: Mail,
    href: "/admin/communications",
    section: "RECRUITMENT",
  },

  // Employee Management
  {
    label: "Leave Requests",
    icon: Calendar,
    href: "/admin/leave",
    section: "EMPLOYEE MANAGEMENT",
  },
  {
    label: "Attendance Tracker",
    icon: Clock3,
    href: "/admin/attendance",
    section: "EMPLOYEE MANAGEMENT",
  },
  {
    label: "Allocations",
    icon: Target,
    href: "/admin/allocations",
    section: "EMPLOYEE MANAGEMENT",
  },
  {
    label: "Payroll Management",
    icon: Banknote,
    href: "/admin/payroll",
    section: "EMPLOYEE MANAGEMENT",
  },
  {
    label: "Meetings",
    icon: Video,
    href: "/admin/meetings",
    section: "EMPLOYEE MANAGEMENT",
  },
  {
    label: "Add Inventory",
    icon: Package,
    href: "/admin/stock/add-inventory",
    section: "INVENTORY MANAGER",
  },
  {
    label: "Warehouse Management",
    icon: Package,
    href: "/admin/stock/wms",
    section: "INVENTORY MANAGER",
  },
  {
    label: "Stock Checks",
    icon: FileCheck,
    href: "/admin/stock/stock-check",
    section: "INVENTORY MANAGER",
  },
  {
    label: "Sales",
    icon: Package,
    href: "/admin/stock/sales",
    section: "INVENTORY MANAGER",
  },
  {
    label: "Quotations",
    icon: FileText,
    href: "/admin/stock/quotations",
    section: "INVENTORY MANAGER",
  },
  {
    label: "Tender",
    icon: FileCheck,
    href: "/admin/stock/tender",
    section: "INVENTORY MANAGER",
  },
  {
    label: "Services",
    icon: Stamp,
    href: "/admin/stock/services",
    section: "INVENTORY MANAGER",
  },
  {
    label: "Telesales",
    icon: PhoneCall,
    href: "/admin/clients/telesales",
    section: "CLIENTS",
  },
  {
    label: "Bulk SMS",
    icon: Mail,
    href: "/admin/clients/bulk-sms",
    section: "CLIENTS",
  },
  {
    label: "Installed Machines",
    icon: Package,
    href: "/admin/clients/installed-machines",
    section: "CLIENTS",
  },
  {
    label: "Client Complaints",
    icon: AlertCircle,
    href: "/admin/clients/complaints",
    section: "CLIENTS",
  },
  {
    label: "Fleet Tracker",
    icon: Truck,
    href: "/admin/fleet",
    section: "FLEET",
  },
  {
    label: "Invoices",
    icon: FileCheck,
    href: "/admin/stock/invoices",
    section: "INVENTORY MANAGER",
  },
  {
    label: "Credit Notes",
    icon: FileText,
    href: "/admin/stock/credit-notes",
    section: "INVENTORY MANAGER",
  },
  {
    label: "Dispatch",
    icon: Package,
    href: "/admin/stock/dispatch",
    section: "INVENTORY MANAGER",
  },
  {
    label: "Inventory Status",
    icon: Package,
    href: "/admin/stock/status",
    section: "INVENTORY MANAGER",
  },
  {
    label: "Analytics",
    icon: Package,
    href: "/admin/stock/analytics",
    section: "INVENTORY MANAGER",
  },
  {
    label: "Outsourced Analytics",
    icon: Package,
    href: "/admin/stock/outsourced",
    section: "INVENTORY MANAGER",
  },
  {
    label: "IMPORTANTION",
    icon: Package,
    href: "/admin/stock/importation",
    section: "IMPORTATION",
  },
  {
    label: "Inventory History",
    icon: Package,
    href: "/admin/stock/history",
    section: "INVENTORY MANAGER",
  },
  {
    label: "eTIMS posts",
    icon: FileText,
    href: "/admin/accounts/posts",
    section: "ACCOUNTS",
  },
  {
    label: "Clients list",
    icon: Users,
    href: "/admin/clients/clients-list",
    section: "CLIENTS",
  },
  {
    label: "Payments",
    icon: Banknote,
    href: "/admin/accounts/payments",
    section: "ACCOUNTS",
  },
  {
    label: "Debts",
    icon: FileCheck,
    href: "/admin/accounts/debts",
    section: "ACCOUNTS",
  },
  {
    label: "Expenses",
    icon: Banknote,
    href: "/admin/accounts/expenses",
    section: "ACCOUNTS",
  },
  {
    label: "Remuneration reports",
    icon: BarChart3,
    href: "/admin/accounts/remuneration-reports",
    section: "ACCOUNTS",
  },
  {
    label: "Financial breakdown",
    icon: TrendingUp,
    href: "/admin/accounts/financial-breakdown",
    section: "ACCOUNTS",
  },
  {
    label: "Stamps",
    icon: Stamp,
    href: "/admin/stamps",
    section: "SYSTEM",
  },
  {
    label: "Resource Booking",
    icon: Calendar,
    href: "/admin/bookings",
    section: "EMPLOYEE MANAGEMENT",
  },
  {
    label: "Suggestions",
    icon: Lightbulb,
    href: "/admin/suggestions",
    section: "EMPLOYEE MANAGEMENT",
  },
  {
    label: "Badges & Awards",
    icon: Award,
    href: "/admin/badges",
    section: "EMPLOYEE MANAGEMENT",
  },
  {
    label: "Polls & Voting",
    icon: Vote,
    href: "/admin/polls",
    section: "EMPLOYEE MANAGEMENT",
  },
  {
    label: "Contracts",
    icon: FileCheck,
    href: "/admin/contracts",
    section: "EMPLOYEE MANAGEMENT",
  },
  {
    label: "Alerts",
    icon: AlertCircle,
    href: "/admin/alerts",
    section: "EMPLOYEE MANAGEMENT",
  },

  // Performance & Configuration
  {
    label: "KPI Configuration",
    icon: Target,
    href: "/admin/kpis",
    section: "PERFORMANCE",
  },
  {
    label: "360° Feedback",
    icon: Users,
    href: "/admin/feedback-360",
    section: "PERFORMANCE",
  },
  {
    label: "Analytics & Reports",
    icon: BarChart3,
    href: "/admin/reports",
    section: "PERFORMANCE",
  },

  // System Configuration
  {
    label: "Company Settings",
    icon: Building2,
    href: "/admin/settings/company",
    section: "SYSTEM",
  },
  {
    label: "User Settings",
    icon: Users,
    href: "/admin/settings/users",
    section: "SYSTEM",
  },
  {
    label: "System Settings",
    icon: Settings,
    href: "/admin/settings/system",
    section: "SYSTEM",
  },
  {
    label: "Email Settings",
    icon: Mail,
    href: "/admin/settings/system/email",
    section: "SYSTEM",
  },
  {
    label: "Page Access Control",
    icon: ShieldCheck,
    href: "/admin/settings/system/page-access",
    section: "SYSTEM",
  },
];

export default function AdminSidebar({
  isOpen,
  isCollapsed,
  onToggle,
  onCollapseToggle,
}: SidebarProps) {
  const pathname = usePathname();
  const [allowedSections, setAllowedSections] = useState<Set<string> | null>(
    null,
  );
  const [pendingQuotationCount, setPendingQuotationCount] = useState(0);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(),
  );

  const currentUser = useMemo(() => getUser(), []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
      if (saved) {
        setCollapsedSections(new Set(JSON.parse(saved)));
      }
    } catch {
      setCollapsedSections(new Set());
    }
  }, []);

  useEffect(() => {
    const loadSectionAccess = async () => {
      const role = currentUser?.role;
      if (!role || role === "company_admin") {
        setAllowedSections(null);
        return;
      }

      try {
        const response = await companyApi.getPageAccess();
        if (response.success) {
          const userId = currentUser?._id || (currentUser as any)?.userId;
          const userSections = userId
            ? response.data?.adminSectionsByUser?.[userId]
            : undefined;
          const roleSections = response.data?.adminSectionsByRole?.[role] || [];
          const effectiveSections = Array.from(
            new Set([...(roleSections || []), ...(userSections || [])]),
          );

          // If current user is a manager, respect department-level sidebar allocations.
          if (role === "manager") {
            try {
              const deptsRes = await companyApi.getDepartments();
              if (deptsRes?.success && Array.isArray(deptsRes.data)) {
                // collect sections for departments where this user is manager
                const deptSections = new Set<string>();
                const uid = userId;
                deptsRes.data.forEach((d: any) => {
                  if (
                    d?.managerId &&
                    uid &&
                    String(d.managerId) === String(uid) &&
                    Array.isArray(d.sidebarSections)
                  ) {
                    d.sidebarSections.forEach((s: string) =>
                      deptSections.add(s),
                    );
                  }
                });
                // If department-level allocations exist, only allow those sections
                if (deptSections.size > 0) {
                  setAllowedSections(deptSections);
                  return;
                }
              }
            } catch (e) {
              // fallback to role/user based sections if fetching departments fails
            }
          }

          setAllowedSections(new Set(effectiveSections));
        }
      } catch {
        setAllowedSections(null);
      }
    };

    loadSectionAccess();
  }, [currentUser?.role]);

  useEffect(() => {
    const role = currentUser?.role;
    if (!role || !["company_admin", "hr"].includes(role)) {
      setPendingQuotationCount(0);
      return;
    }

    let mounted = true;
    const loadPendingCount = async () => {
      try {
        const token = getToken();
        if (!token) return;
        const response = await fetch(`${API_URL}/api/stock/quotations`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const parsed = await parseResponse(response);
        if (!parsed.response.ok) return;
        const pending = (parsed.data?.data || []).filter(
          (quotation: any) => quotation.status === "pending_approval",
        ).length;
        if (mounted) setPendingQuotationCount(pending);
      } catch {}
    };

    loadPendingCount();
    const interval = setInterval(loadPendingCount, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [currentUser?.role]);

  const handleLogout = () => {
    logout();
  };

  const toggleSection = (sectionName: string) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }

      try {
        localStorage.setItem(
          COLLAPSED_SECTIONS_KEY,
          JSON.stringify(Array.from(next)),
        );
      } catch {}

      return next;
    });
  };

  // Group menu items by section
  const sections: { [key: string]: typeof adminMenuItems } = {};
  adminMenuItems.forEach((item) => {
    const section = item.section || "OTHER";
    if (!sections[section]) {
      sections[section] = [];
    }
    sections[section].push(item);
  });

  const sectionEntries = Object.entries(sections).filter(([sectionName]) => {
    if (!allowedSections) return true;
    return allowedSections.has(sectionName);
  });

  const [favoriteHrefs, setFavoriteHrefs] = useState<string[]>([]);

  useEffect(() => {
    setFavoriteHrefs(getFavoriteHrefs());
    const onStorage = () => setFavoriteHrefs(getFavoriteHrefs());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [pathname]);

  const favoriteItems = useMemo(
    () => adminMenuItems.filter((item) => favoriteHrefs.includes(item.href)),
    [favoriteHrefs],
  );

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        ></div>
      )}

      <aside
        className={`
        fixed lg:static top-0 left-0 h-screen bg-card border-r border-border z-50 flex flex-col
        transition-all duration-300 ${isCollapsed ? "lg:w-20" : "lg:w-64"} w-64
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div
          className={`p-4 flex items-center border-b border-border ${isCollapsed ? "justify-center" : "justify-between"}`}
        >
          <Link
            href="/admin"
            className={`flex items-center font-bold text-lg ${isCollapsed ? "justify-center" : "gap-3"}`}
          >
            <div
              className="w-8 h-8 bg-center bg-no-repeat bg-contain"
              style={{ backgroundImage: "var(--company-logo-url)" }}
            ></div>
            {!isCollapsed && (
              <span className="" style={{ color: "var(--brand-primary)" }}>
                Admin Panel
              </span>
            )}
          </Link>
          {!isCollapsed && (
            <button
              onClick={onToggle}
              className="lg:hidden p-1 hover:bg-secondary rounded"
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>

        <nav
          className={`px-3 py-4 space-y-4 flex-1 min-h-0 overflow-y-auto ${isCollapsed ? "" : ""}`}
        >
          {favoriteItems.length > 0 && (
            <div>
              {!isCollapsed ? (
                <p className="mb-1 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Favorites
                </p>
              ) : null}
              <div className="space-y-2">
                {favoriteItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={`fav-${item.href}`}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`
                        flex items-center rounded-lg transition text-sm
                        ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2.5"}
                        ${
                          isActive
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-foreground hover:bg-secondary"
                        }
                      `}
                    >
                      <Star
                        size={16}
                        className={isActive ? "fill-current" : "text-amber-500"}
                      />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          {sectionEntries.map(([sectionName, items]) => (
            <div key={sectionName}>
              {!isCollapsed ? (
                <button
                  type="button"
                  onClick={() => toggleSection(sectionName)}
                  className="mb-1 flex w-full items-center justify-between rounded-md px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  aria-expanded={!collapsedSections.has(sectionName)}
                >
                  <span>{sectionName}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${collapsedSections.has(sectionName) ? "-rotate-90" : "rotate-0"}`}
                  />
                </button>
              ) : null}
              <div
                className={`space-y-2 ${!isCollapsed && collapsedSections.has(sectionName) ? "hidden" : ""}`}
              >
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`
                        flex items-center rounded-lg transition text-sm
                        ${isCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2.5"}
                        ${
                          isActive
                            ? "bg-primary text-primary-foreground font-medium"
                            : "text-foreground hover:bg-secondary"
                        }
                      `}
                    >
                      <div className="relative">
                        <Icon size={18} />
                        {item.href === "/admin/stock/quotations" &&
                        pendingQuotationCount > 0 &&
                        isCollapsed ? (
                          <span className="absolute -right-2 -top-2 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground text-center">
                            {pendingQuotationCount > 99
                              ? "99+"
                              : pendingQuotationCount}
                          </span>
                        ) : null}
                      </div>
                      {!isCollapsed && (
                        <span className="flex items-center gap-2">
                          {item.label}
                          {item.href === "/admin/stock/quotations" &&
                          pendingQuotationCount > 0 ? (
                            <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">
                              {pendingQuotationCount > 99
                                ? "99+"
                                : pendingQuotationCount}
                            </span>
                          ) : null}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <button
            onClick={onCollapseToggle}
            className={`w-full flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition ${isCollapsed ? "justify-center" : "gap-3"}`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft
              size={18}
              className={isCollapsed ? "rotate-180" : ""}
            />
            {!isCollapsed && <span className="font-medium">Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-destructive/10 rounded-lg transition ${isCollapsed ? "justify-center" : "gap-3"}`}
            title={isCollapsed ? "Log Out" : undefined}
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="font-medium">Log Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
