"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Settings, Users, Target, ChevronLeft, LogOut, Video } from "lucide-react"

interface SidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/team", label: "Team Members", icon: Users },
  { href: "/dashboard/kpis", label: "Performance KPIs", icon: Target },
  { href: "/dashboard/meetings", label: "Meetings", icon: Video },
  { href: "/dashboard/organization", label: "Organization", icon: Settings },
]

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onToggle}></div>}

      <aside
        className={`
        fixed lg:static top-0 left-0 h-screen bg-card border-r border-border z-50
        transition-transform duration-300 w-64
        ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="p-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground">E</span>
            </div>
            <span>Elevate</span>
          </Link>
          <button onClick={onToggle} className="lg:hidden p-1 hover:bg-secondary rounded">
            <ChevronLeft size={20} />
          </button>
        </div>

        <nav className="px-4 py-6 space-y-2 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition
                  ${isActive ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-secondary"}
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <button className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition">
            <LogOut size={20} />
            <span className="font-medium">Log Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
