"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUser, isAdmin } from "@/lib/auth";
import { api } from "@/lib/api";
import Sidebar from "@/components/admin/sidebar";
import TopNav from "@/components/admin/top-nav";
import { AiAssistantChat } from "@/components/ai/ai-assistant-chat";
import { RecentPagesTracker } from "@/components/admin/recent-pages-tracker";
import {
  getAdminSectionForPath,
  resolveAdminAllowedSections,
} from "@/lib/admin-sections";

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

    // company_admin, admin, and hr can access the admin area
    if (!isAdmin()) {
      if (user.role === "manager") {
        router.push("/manager");
      } else if (user.role === "super_admin") {
        router.push("/owner");
      } else if (user.role === "sales_rep") {
        router.push("/sales");
      } else {
        router.push("/employee");
      }
      return;
    }

    checkSetupStatus();
  }, [router]);

  const checkSetupStatus = async () => {
    try {
      const response = await api.setup.getProgress();

      if (response.success && response.data) {
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
      if (!user || !isAdmin()) return;
      if (user.role === "company_admin" || user.role === "super_admin") return;

      const currentSection = getAdminSectionForPath(pathname);
      if (!currentSection || currentSection === "CORE") return;

      try {
        const response = await api.company.getPageAccess();
        if (!response.success) return;

        const allowed = resolveAdminAllowedSections({
          role: user.role,
          userId: user._id || user.userId,
          pageAccess: response.data,
        });

        if (!allowed) return;

        if (!allowed.has(currentSection)) {
          router.push("/admin");
        }
      } catch {
        // fail open when settings API is unavailable
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
