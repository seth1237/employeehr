"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Users,
  MessageSquare,
  Mail,
  Zap,
} from "lucide-react"

export default function ClientsHubPage() {
  const sections = [
    {
      title: "Client CRM",
      description:
        "Main CRM centre — directory, contacts, groups, call logs, quote requests, activities, and statements",
      href: "/admin/clients/clients-list",
      icon: Users,
      color: "bg-blue-100 text-blue-700",
    },
    {
      title: "Installed Machines",
      description:
        "Track machines, services, and tickets. Client CRM is in the Client CRM centre.",
      href: "/admin/clients/installed-machines",
      icon: Zap,
      color: "bg-purple-100 text-purple-700",
    },
    {
      title: "Telesales",
      description: "Manage remote sales conversations, lead pipelines, and follow-ups",
      href: "/admin/clients/telesales",
      icon: MessageSquare,
      color: "bg-green-100 text-green-700",
    },
    {
      title: "Bulk SMS",
      description: "Send SMS campaigns to selected client groups",
      href: "/admin/clients/bulk-sms",
      icon: Mail,
      color: "bg-orange-100 text-orange-700",
    },
  ]

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Clients Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage all client-related operations including sales, installations, and communications
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle>{section.title}</CardTitle>
                    <div className={`p-2 rounded-lg ${section.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
