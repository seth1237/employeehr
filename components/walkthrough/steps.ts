import type { WalkthroughPortal } from "@/lib/walkthrough"

export type WalkthroughStep = {
  id: string
  title: string
  description: string
  target?: string
  bullets?: string[]
  actions?: Array<{ label: string; href: string }>
}

export function getWalkthroughSteps(
  portal: WalkthroughPortal,
  role?: string,
): WalkthroughStep[] {
  if (portal === "sales") {
    return [
      {
        id: "welcome",
        title: "Welcome to Elevate ERP",
        description: "This is your field sales workspace for visits, quotations, and customer follow-up.",
        bullets: ["Plan today’s visits", "Create quotations", "Log outcomes before you leave the site"],
      },
      {
        id: "dashboard",
        title: "Your day at a glance",
        description: "Use this home screen for today’s calls, overdue follow-ups, and open quotes.",
        target: "wt-dashboard",
      },
      {
        id: "sidebar",
        title: "Your sales menu",
        description: "Planner, clients, quotes, and history stay in this sidebar. You only see sales tools.",
        target: "wt-sidebar",
      },
      {
        id: "department",
        title: "Your sales path",
        description: "Work in this order: find the client → plan the visit → send a quote → follow up.",
        target: "wt-section-sales-quotes",
      },
      {
        id: "ready",
        title: "You’re all set",
        description: "Start with today’s planner, then create a quotation when the customer is ready.",
        actions: [
          { label: "Plan a visit", href: "/sales/planner" },
          { label: "Open quotes", href: "/sales/quotes" },
        ],
      },
    ]
  }

  if (portal === "engineer") {
    return [
      {
        id: "welcome",
        title: "Welcome to Elevate ERP",
        description: "This is the technical service desk for work orders, machines, and field jobs.",
        bullets: ["See assigned jobs", "Update machine history", "Submit expenses after a visit"],
      },
      {
        id: "dashboard",
        title: "Your job board",
        description: "Open jobs, overdue visits, and machine counts live here so you know what to do first.",
        target: "wt-dashboard",
      },
      {
        id: "sidebar",
        title: "Engineering navigation",
        description: "Work orders, requests, machines, calendar, and expenses are all in this sidebar.",
        target: "wt-sidebar",
      },
      {
        id: "department",
        title: "Your service path",
        description: "Open a work order, complete the visit, then update the machine history.",
        target: "wt-section-engineering",
      },
      {
        id: "ready",
        title: "You’re all set",
        description: "Start with today’s work orders. Replay this tour anytime from Help.",
        actions: [
          { label: "Open work orders", href: "/engineer/work-orders" },
          { label: "View machines", href: "/engineer/machines" },
        ],
      },
    ]
  }

  const departmentTarget =
    role === "dispatch"
      ? "wt-nav-/admin/stock/dispatch"
      : role === "hr"
        ? "wt-section-EMPLOYEE MANAGEMENT"
        : "wt-section-CLIENTS"

  const departmentCopy =
    role === "dispatch"
      ? "Dispatch is your home. Pack, assign, and mark deliveries from the dispatch board."
      : role === "hr"
        ? "People operations live under Employee Management: staff, leave, attendance, and payroll."
        : "Most commercial work follows CRM → quotation → invoice → dispatch. Start in Clients when you need a hospital or clinic."

  return [
    {
      id: "welcome",
      title: "Welcome to Elevate ERP",
      description:
        "Manage sales, laboratory equipment, engineering services, inventory, finance, and support from one workspace.",
      bullets: ["Secure company workspace", "Role-based access", "Real-time notifications"],
    },
    {
      id: "dashboard",
      title: "Your dashboard",
      description:
        "These widgets show live work: quotations, invoices, inventory risk, and upcoming activity.",
      target: "wt-dashboard",
    },
    {
      id: "sidebar",
      title: "Navigation sidebar",
      description:
        "Departments are grouped here. You only see modules your role is allowed to open.",
      target: "wt-sidebar",
    },
    {
      id: "search",
      title: "Search anything",
      description: "Press Ctrl + K to find customers, invoices, machines, and inventory without hunting menus.",
      target: "wt-search",
    },
    {
      id: "notifications",
      title: "Notifications and tasks",
      description:
        "The bell holds pending approvals, tickets, quotations, and reminders. Red is urgent, amber needs action.",
      target: "wt-notifications",
    },
    {
      id: "department",
      title: "Your department",
      description: departmentCopy,
      target: departmentTarget,
    },
    {
      id: "profile",
      title: "Complete your profile",
      description:
        "Add a photo, phone number, and signature so quotations, tickets, and approvals show the right person.",
      target: "wt-profile",
    },
    {
      id: "ready",
      title: "You’re all set",
      description: "Use these shortcuts to start real work. Replay the tour anytime from Help → Product tour.",
      actions: [
        { label: "Create quotation", href: "/admin/stock/quotations?action=new" },
        { label: "Open inventory", href: "/admin/stock/add-inventory" },
        { label: "View reports", href: "/admin/reports" },
      ],
    },
  ]
}
