"use client"

import { Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getUser } from "@/lib/auth"
import { AdminCommandPalette } from "@/components/admin/command-palette"
import { AdminNotificationsPopover } from "@/components/admin/notifications-popover"

interface TopNavProps {
  onMenuClick: () => void
  onSidebarCollapseToggle: () => void
  isSidebarCollapsed: boolean
}

export default function AdminTopNav({ onMenuClick, onSidebarCollapseToggle, isSidebarCollapsed }: TopNavProps) {
  const user = getUser()

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-3 sm:px-6 gap-2">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu size={20} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSidebarCollapseToggle}
          className="hidden lg:inline-flex"
          title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </Button>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 bg-center bg-no-repeat bg-contain" style={{ backgroundImage: "var(--company-logo-url)" }} />
          <div className="text-sm text-muted-foreground hidden xl:block truncate">
            <span className="font-semibold text-foreground">Admin Panel</span> / Organization Management
          </div>
        </div>
      </div>

      <div className="flex-1 flex justify-center max-w-xl mx-2">
        <AdminCommandPalette />
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          aria-label="Search"
          onClick={() => {
            window.dispatchEvent(new Event("admin-open-command-palette"))
          }}
        >
          <Search size={20} />
        </Button>
        <AdminNotificationsPopover />

        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-border">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">
              {user?.first_name} {user?.last_name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-semibold">
              {user?.first_name?.charAt(0)}
              {user?.last_name?.charAt(0)}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
