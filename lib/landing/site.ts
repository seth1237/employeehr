import type { IconKind } from "@/components/home/landing-icons"

export const LOGIN_HREF = "/auth/login"
export const SIGNUP_HREF = "/auth/signup"

export const NAV = [
  { label: "How it Works", href: "/#how-it-works" },
  { label: "Modules", href: "/#modules" },
  { label: "Use Cases", href: "/#use-cases" },
] as const

export const MODULES: Array<{
  kind: IconKind
  title: string
  liner: string
}> = [
  { kind: "inventory", title: "Inventory", liner: "Stock that matches every document." },
  { kind: "payroll", title: "Payroll", liner: "Pay runs without a second spreadsheet." },
  { kind: "manufacturing", title: "Manufacturing", liner: "Work orders from plan to the floor." },
  { kind: "warehouse", title: "Warehouse", liner: "Receipts, bins, and dispatch in view." },
  { kind: "crm", title: "CRM", liner: "The customer book next to the work." },
  { kind: "procurement", title: "Procurement", liner: "Requests, orders, and a paper trail." },
  { kind: "shipping", title: "Shipping", liner: "Dispatch that follows the invoice." },
  { kind: "projects", title: "Projects", liner: "The work in front of the team." },
]

export const STEPS = [
  {
    n: "01",
    title: "Bring every module in",
    body: "Inventory, payroll, manufacturing, and the rest travel the same rail into Elevate.",
  },
  {
    n: "02",
    title: "Run them through one hub",
    body: "The hub is the company record — not another tool sitting beside the work.",
  },
  {
    n: "03",
    title: "Send automations out",
    body: "Stock reorders, payroll runs, and work orders leave ready for the floor.",
  },
] as const

export const CASES = [
  {
    name: "Stock Reorder",
    body: "When inventory dips, procurement and the warehouse already have the next order.",
    apps: ["inventory", "warehouse", "procurement"] as IconKind[],
  },
  {
    name: "Run Payroll",
    body: "People, hours, and pay sit in one pass — no export into a side sheet.",
    apps: ["payroll", "crm", "projects"] as IconKind[],
  },
  {
    name: "Work Order Release",
    body: "Manufacturing, projects, and shipping share the same release, not three copies.",
    apps: ["manufacturing", "projects", "shipping"] as IconKind[],
  },
] as const
