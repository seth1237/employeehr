"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUser, isAdmin, logout } from "@/lib/auth";
import { api } from "@/lib/api";
import Sidebar from "@/components/admin/sidebar";
import TopNav from "@/components/admin/top-nav";
import { AiAssistantChat } from "@/components/ai/ai-assistant-chat";
import { RecentPagesTracker } from "@/components/admin/recent-pages-tracker";

const ADMIN_SECTION_PATHS: Array<{
  section: string;
  match: (path: string) => boolean;
}> = [
  {
    section: "CORE",
    match: (path) => path === "/admin" || path.startsWith("/admin/users"),
  },
  {
    section: "RECRUITMENT",
    match: (path) =>
      [
        "/admin/jobs",
        "/admin/applications",
        "/admin/analytics",
        "/admin/communications",
      ].some((prefix) => path.startsWith(prefix)),
  },
  {
    section: "EMPLOYEE MANAGEMENT",
    match: (path) =>
      [
        "/admin/leave",
        "/admin/payroll",
        "/admin/meetings",
        "/admin/bookings",
        "/admin/suggestions",
        "/admin/badges",
        "/admin/polls",
        "/admin/contracts",
        "/admin/alerts",
        "/admin/allocations",
      ].some((prefix) => path.startsWith(prefix)),
  },
  {
    section: "INVENTORY MANAGER",
    match: (path) => path.startsWith("/admin/stock"),
  },
  { section: "CLIENTS", match: (path) => path.startsWith("/admin/clients") },
  { section: "FLEET", match: (path) => path.startsWith("/admin/fleet") },
  { section: "ACCOUNTS", match: (path) => path.startsWith("/admin/accounts") },
  {
    section: "PERFORMANCE",
    match: (path) =>
      ["/admin/kpis", "/admin/feedback-360", "/admin/reports"].some((prefix) =>
        path.startsWith(prefix),
      ),
  },
  {
    section: "SYSTEM",
    match: (path) =>
      ["/admin/settings", "/admin/stamps"].some((prefix) =>
        path.startsWith(prefix),
      ),
  },
];

const getSectionForPath = (path: string): string | null => {
  const rule = ADMIN_SECTION_PATHS.find((entry) => entry.match(path));
  return rule?.section || null;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem("admin_sidebar_collapsed")
        : null;
    if (saved === "1") setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, []);

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("admin_sidebar_collapsed", next ? "1" : "0");
      }
      return next;
    });
  };

  useEffect(() => {
    const user = getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Only company_admin and hr can access admin panel
    if (!isAdmin()) {
      // Redirect to appropriate dashboard based on role
      if (user.role === "manager") {
        router.push("/manager");
      } else {
        router.push("/employee");
      }
      return;
    }

    // Check setup completion
    checkSetupStatus();
  }, [router]);

  const checkSetupStatus = async () => {
    try {
      const response = await api.setup.getProgress();

      if (response.success && response.data) {
        // If setup is not completed, redirect to setup page
        if (!response.data.setupProgress?.completed) {
          router.push("/setup");
          return;
        }
      }
    } catch (error) {
      console.error("Failed to check setup status:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const enforcePageAccess = async () => {
      const user = getUser();
      if (!user || user.role === "company_admin") return;

      if (!isAdmin()) return;

      const currentSection = getSectionForPath(pathname);
      if (!currentSection) return;

      try {
        const response = await api.company.getPageAccess();
        if (!response.success) return;

        const userId = user._id || user.userId;
        const userSections: string[] | undefined = userId
          ? response.data?.adminSectionsByUser?.[userId]
          : undefined;
        const roleSections: string[] =
          response.data?.adminSectionsByRole?.[user.role] || [];
        const allowedSections: string[] = response.data?.effectiveSections
          ?.length
          ? response.data.effectiveSections
          : Array.from(
              new Set([...(roleSections || []), ...(userSections || [])]),
            );
        if (!allowedSections.includes(currentSection)) {
          router.push("/admin");
        }
      } catch {
        // fail open to avoid blocking admin area when settings API is unavailable
      }
    };

    enforcePageAccess();
  }, [pathname, router]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  }, [pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to main content
      </a>
      <RecentPagesTracker />
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onCollapseToggle={toggleSidebarCollapsed}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNav
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onSidebarCollapseToggle={toggleSidebarCollapsed}
          isSidebarCollapsed={sidebarCollapsed}
        />
        <main
          id="admin-main"
          tabIndex={-1}
          className="flex-1 overflow-auto outline-none"
        >
          {children}
        </main>
      </div>
      <AiAssistantChat />
    </div>
  );
}
