"use client"

import { Menu, Bell, User } from "lucide-react"

interface TopNavProps {
  onMenuClick: () => void
}

export default function TopNav({ onMenuClick }: TopNavProps) {
  return (
    <div className="h-16 border-b border-border bg-card flex items-center justify-between px-3 sm:px-6">
      <button onClick={onMenuClick} className="lg:hidden p-2 hover:bg-secondary rounded-lg">
        <Menu size={20} />
      </button>

      <div className="flex-1"></div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button className="p-2 hover:bg-secondary rounded-lg transition relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
        </button>

        <button className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center hover:bg-primary/30 transition">
          <User size={20} className="text-primary" />
        </button>
      </div>
    </div>
  )
}
