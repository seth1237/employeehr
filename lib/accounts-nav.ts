export type AccountsPageStatus = "live" | "linked" | "planned"

export type AccountsNavGroup = {
  id: string
  label: string
  phase: number
  description: string
}

export type AccountsNavPage = {
  id: string
  label: string
  /** Canonical path under /admin/accounts (or exact live path) */
  href: string
  groupId: string
  status: AccountsPageStatus
  phase: number
  description: string
  /** Redirect target for linked modules living elsewhere */
  redirectTo?: string
  keywords?: string[]
}

export const ACCOUNTS_NAV_GROUPS: AccountsNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    phase: 0,
    description: "Accounts dashboard and quick access",
  },
  {
    id: "general-ledger",
    label: "General Ledger",
    phase: 1,
    description: "Double-entry core: chart of accounts, journals, ledger, trial balance",
  },
  {
    id: "receivables",
    label: "Sales & Receivables",
    phase: 2,
    description: "Invoices, customer payments, credit notes, debtors, aging",
  },
  {
    id: "payables",
    label: "Purchases & Payables",
    phase: 3,
    description: "Suppliers, bills, creditor payments and aging",
  },
  {
    id: "cash-banking",
    label: "Cashflow & Banking",
    phase: 4,
    description: "Track cash, bank, and M-Pesa — linked to invoices, expenses, and salaries",
  },
  {
    id: "expenses",
    label: "Expenses",
    phase: 5,
    description: "Expense recording, recurring bills, claims, and approvals",
  },
  {
    id: "tax",
    label: "Tax",
    phase: 6,
    description: "eTIMS, VAT, PAYE, NSSF, SHA, withholding tax, tax reports",
  },
  {
    id: "payroll",
    label: "Payroll & Statutory Deductions",
    phase: 7,
    description: "Payroll summary, statutory deductions, payroll journal",
  },
  {
    id: "assets",
    label: "Assets",
    phase: 8,
    description: "Fixed assets, depreciation, disposal, transfers",
  },
  {
    id: "inventory-accounting",
    label: "Inventory Accounting",
    phase: 9,
    description: "Stock valuation, COGS, adjustments, reconciliation",
  },
  {
    id: "reports",
    label: "Reports",
    phase: 10,
    description: "P&L, balance sheet, cash flow, management reports",
  },
  {
    id: "settings",
    label: "Settings",
    phase: 11,
    description: "Fiscal periods, accounting settings, approvals, audit logs",
  },
]

const ACCOUNTS_BASE = "/admin/accounts"

export const ACCOUNTS_NAV_PAGES: AccountsNavPage[] = [
  // General Ledger — Phase 1 (planned)
  {
    id: "chart-of-accounts",
    label: "Chart of Accounts",
    href: `${ACCOUNTS_BASE}/general-ledger/chart-of-accounts`,
    groupId: "general-ledger",
    status: "planned",
    phase: 1,
    description: "Configurable tenant chart of accounts (assets, liabilities, equity, revenue, expenses)",
    keywords: ["coa", "accounts", "ledger"],
  },
  {
    id: "journal-entries",
    label: "Journal Entries",
    href: `${ACCOUNTS_BASE}/general-ledger/journal-entries`,
    groupId: "general-ledger",
    status: "planned",
    phase: 1,
    description: "Create, approve, post, and reverse manual journal entries",
    keywords: ["journal", "je"],
  },
  {
    id: "general-ledger",
    label: "General Ledger",
    href: `${ACCOUNTS_BASE}/general-ledger/ledger`,
    groupId: "general-ledger",
    status: "planned",
    phase: 1,
    description: "Account-level transaction history with running balances",
  },
  {
    id: "trial-balance",
    label: "Trial Balance",
    href: `${ACCOUNTS_BASE}/general-ledger/trial-balance`,
    groupId: "general-ledger",
    status: "planned",
    phase: 1,
    description: "Debit/credit trial balance — debits must equal credits",
  },
  {
    id: "account-reconciliation",
    label: "Account Reconciliation",
    href: `${ACCOUNTS_BASE}/general-ledger/reconciliation`,
    groupId: "general-ledger",
    status: "planned",
    phase: 1,
    description: "Reconcile GL balances with subledgers",
  },

  // Sales & Receivables (one hub + sibling pages via top module nav)
  {
    id: "receivables-hub",
    label: "Overview",
    href: `${ACCOUNTS_BASE}/receivables`,
    groupId: "receivables",
    status: "live",
    phase: 2,
    description: "Sales & receivables hub — payments, debtors, aging, and notes",
    keywords: ["receivables", "ar", "sales"],
  },
  {
    id: "customer-payments",
    label: "Payments",
    href: `${ACCOUNTS_BASE}/payments`,
    groupId: "receivables",
    status: "live",
    phase: 2,
    description: "Record partial or full payments against sales invoices",
    keywords: ["payment", "mpesa", "receipt"],
  },
  {
    id: "credit-notes",
    label: "Credit Notes",
    href: `${ACCOUNTS_BASE}/receivables/credit-notes`,
    groupId: "receivables",
    status: "linked",
    phase: 2,
    description: "Issue credit notes for returns, adjustments, and cancellations",
    redirectTo: "/admin/stock/credit-notes",
    keywords: ["credit", "refund"],
  },
  {
    id: "debit-notes",
    label: "Debit Notes",
    href: `${ACCOUNTS_BASE}/receivables/debit-notes`,
    groupId: "receivables",
    status: "live",
    phase: 2,
    description: "Additional charges and price corrections on customer invoices",
    keywords: ["debit", "additional charge"],
  },
  {
    id: "customer-statements",
    label: "Statements",
    href: `${ACCOUNTS_BASE}/receivables/statements`,
    groupId: "receivables",
    status: "live",
    phase: 2,
    description: "Opening balance, invoices, payments, credit notes, closing balance",
  },
  {
    id: "debtors",
    label: "Debtors",
    href: `${ACCOUNTS_BASE}/debts`,
    groupId: "receivables",
    status: "live",
    phase: 2,
    description: "Unsettled sales invoices with paid/balance and latest payment",
    keywords: ["debt", "receivable", "outstanding"],
  },
  {
    id: "aging-report",
    label: "Aging",
    href: `${ACCOUNTS_BASE}/receivables/aging`,
    groupId: "receivables",
    status: "live",
    phase: 2,
    description: "Receivables aging by 0–30, 31–60, 61–90, and 90+ day buckets",
    keywords: ["aging", "overdue"],
  },

  // Purchases & Payables — Phase 3
  {
    id: "supplier-bills",
    label: "Supplier Bills",
    href: `${ACCOUNTS_BASE}/payables/bills`,
    groupId: "payables",
    status: "live",
    phase: 3,
    description: "Record supplier bills with VAT, due dates, and attachments",
  },
  {
    id: "supplier-payments",
    label: "Supplier Payments",
    href: `${ACCOUNTS_BASE}/payables/payments`,
    groupId: "payables",
    status: "live",
    phase: 3,
    description: "Pay supplier bills via bank, M-Pesa, or cash",
  },
  {
    id: "purchase-credit-notes",
    label: "Credit Notes",
    href: `${ACCOUNTS_BASE}/payables/credit-notes`,
    groupId: "payables",
    status: "live",
    phase: 3,
    description: "Supplier credit notes and purchase adjustments",
  },
  {
    id: "supplier-statements",
    label: "Supplier Statements",
    href: `${ACCOUNTS_BASE}/payables/statements`,
    groupId: "payables",
    status: "live",
    phase: 3,
    description: "Supplier account statements with opening and closing balances",
  },
  {
    id: "creditors",
    label: "Creditors",
    href: `${ACCOUNTS_BASE}/payables/creditors`,
    groupId: "payables",
    status: "live",
    phase: 3,
    description: "Outstanding supplier balances and payment status",
  },
  {
    id: "payables-aging",
    label: "Aging Report",
    href: `${ACCOUNTS_BASE}/payables/aging`,
    groupId: "payables",
    status: "live",
    phase: 3,
    description: "Payables aging by due-date buckets",
  },
  {
    id: "suppliers",
    label: "Suppliers",
    href: `${ACCOUNTS_BASE}/payables/suppliers`,
    groupId: "payables",
    status: "linked",
    phase: 3,
    description: "Importer and local supplier directory (sourcing module)",
    redirectTo: "/admin/stock/importation",
    keywords: ["vendor", "supplier"],
  },

  // Cash & Banking — Phase 4 (live)
  {
    id: "cash-banking-hub",
    label: "Overview",
    href: `${ACCOUNTS_BASE}/cash-banking`,
    groupId: "cash-banking",
    status: "live",
    phase: 4,
    description: "Cashflow hub — balances and movements from invoices, expenses, and salaries",
    keywords: ["cash", "banking", "liquidity", "cashflow"],
  },
  {
    id: "cash-accounts",
    label: "Cash",
    href: `${ACCOUNTS_BASE}/cash-banking/cash`,
    groupId: "cash-banking",
    status: "live",
    phase: 4,
    description: "Petty cash and branch cash accounts",
  },
  {
    id: "bank-accounts",
    label: "Banks",
    href: `${ACCOUNTS_BASE}/cash-banking/bank`,
    groupId: "cash-banking",
    status: "live",
    phase: 4,
    description: "Bank account register with live balances",
  },
  {
    id: "mpesa-accounts",
    label: "M-Pesa",
    href: `${ACCOUNTS_BASE}/cash-banking/mpesa`,
    groupId: "cash-banking",
    status: "live",
    phase: 4,
    description: "M-Pesa till, paybill, and phone accounts",
  },
  {
    id: "cashbook",
    label: "Cashbook",
    href: `${ACCOUNTS_BASE}/cash-banking/cashbook`,
    groupId: "cash-banking",
    status: "live",
    phase: 4,
    description: "Every cash in/out across all accounts",
  },
  {
    id: "transfers",
    label: "Transfers",
    href: `${ACCOUNTS_BASE}/cash-banking/transfers`,
    groupId: "cash-banking",
    status: "live",
    phase: 4,
    description: "Move money between cash, bank, and M-Pesa",
  },
  {
    id: "bank-reconciliation",
    label: "Reconcile",
    href: `${ACCOUNTS_BASE}/cash-banking/reconciliation`,
    groupId: "cash-banking",
    status: "live",
    phase: 4,
    description: "Mark bank and M-Pesa lines as reconciled",
  },

  // Expenses
  {
    id: "expenses",
    label: "Summary",
    href: `${ACCOUNTS_BASE}/expenses`,
    groupId: "expenses",
    status: "live",
    phase: 5,
    description: "Company expense summary by category, including transport from invoices",
    keywords: ["expense", "mpesa", "transport", "summary"],
  },
  {
    id: "expenses-export",
    label: "Export",
    href: `${ACCOUNTS_BASE}/expenses/export`,
    groupId: "expenses",
    status: "live",
    phase: 5,
    description: "Export company expenses PDF for a selected period",
  },
  {
    id: "expenses-new",
    label: "Add Expense",
    href: `${ACCOUNTS_BASE}/expenses/new`,
    groupId: "expenses",
    status: "live",
    phase: 5,
    description: "Record a company expense with optional recurrence",
  },
  {
    id: "expense-categories",
    label: "Categories",
    href: `${ACCOUNTS_BASE}/expenses/categories`,
    groupId: "expenses",
    status: "live",
    phase: 5,
    description: "Create and manage expense categories",
  },
  {
    id: "expense-claims",
    label: "Claims",
    href: `${ACCOUNTS_BASE}/expenses/claims`,
    groupId: "expenses",
    status: "live",
    phase: 5,
    description: "Employee expense claims with approval and reimbursement",
  },

  // Tax
  {
    id: "etims",
    label: "eTIMS",
    href: `${ACCOUNTS_BASE}/posts`,
    groupId: "tax",
    status: "live",
    phase: 6,
    description: "KRA eTIMS OSCU integration — post invoices, device init, config",
    keywords: ["kra", "etims", "tax", "oscu"],
  },
  {
    id: "vat",
    label: "VAT",
    href: `${ACCOUNTS_BASE}/tax/vat`,
    groupId: "tax",
    status: "planned",
    phase: 6,
    description: "Output VAT, input VAT, VAT payable, and returns",
  },
  {
    id: "paye-tax",
    label: "PAYE",
    href: `${ACCOUNTS_BASE}/tax/paye`,
    groupId: "tax",
    status: "linked",
    phase: 6,
    description: "PAYE deductions from payroll runs",
    redirectTo: `${ACCOUNTS_BASE}/remuneration-reports`,
    keywords: ["paye", "tax"],
  },
  {
    id: "nssf-tax",
    label: "NSSF",
    href: `${ACCOUNTS_BASE}/tax/nssf`,
    groupId: "tax",
    status: "linked",
    phase: 6,
    description: "NSSF statutory deductions report",
    redirectTo: `${ACCOUNTS_BASE}/remuneration-reports`,
  },
  {
    id: "sha-tax",
    label: "SHA",
    href: `${ACCOUNTS_BASE}/tax/sha`,
    groupId: "tax",
    status: "linked",
    phase: 6,
    description: "SHA statutory deductions report",
    redirectTo: `${ACCOUNTS_BASE}/remuneration-reports`,
  },
  {
    id: "withholding-tax",
    label: "Withholding Tax",
    href: `${ACCOUNTS_BASE}/tax/withholding`,
    groupId: "tax",
    status: "planned",
    phase: 6,
    description: "WHT tracking, certificates, and payments",
  },
  {
    id: "tax-reports",
    label: "Tax Reports",
    href: `${ACCOUNTS_BASE}/tax/reports`,
    groupId: "tax",
    status: "planned",
    phase: 6,
    description: "Consolidated tax liability and filing reports",
  },

  // Payroll
  {
    id: "payroll-summary",
    label: "Payroll Summary",
    href: `${ACCOUNTS_BASE}/payroll/summary`,
    groupId: "payroll",
    status: "linked",
    phase: 7,
    description: "Generate and manage monthly payroll with optional tax deduction disable",
    redirectTo: "/admin/payroll",
    keywords: ["payroll", "salary"],
  },
  {
    id: "statutory-deductions",
    label: "Statutory Deductions",
    href: `${ACCOUNTS_BASE}/remuneration-reports`,
    groupId: "payroll",
    status: "live",
    phase: 7,
    description: "Net, SHA, tax, NSSF, HELB reports with Excel export",
    keywords: ["remuneration", "nssf", "helb"],
  },
  {
    id: "payroll-journal",
    label: "Payroll Journal",
    href: `${ACCOUNTS_BASE}/payroll/journal`,
    groupId: "payroll",
    status: "planned",
    phase: 7,
    description: "Post approved payroll to the general ledger",
  },

  // Assets
  {
    id: "fixed-assets",
    label: "Fixed Assets",
    href: `${ACCOUNTS_BASE}/assets/fixed`,
    groupId: "assets",
    status: "planned",
    phase: 8,
    description: "Asset categories, purchase cost, useful life, depreciation",
  },
  {
    id: "asset-register",
    label: "Asset Register",
    href: `${ACCOUNTS_BASE}/assets/register`,
    groupId: "assets",
    status: "linked",
    phase: 8,
    description: "Resource registry — products, assets, allocations, bookings",
    redirectTo: "/admin/bookings",
    keywords: ["asset", "resource", "equipment"],
  },
  {
    id: "depreciation",
    label: "Depreciation",
    href: `${ACCOUNTS_BASE}/assets/depreciation`,
    groupId: "assets",
    status: "planned",
    phase: 8,
    description: "Run depreciation schedules and post journal entries",
  },
  {
    id: "asset-disposal",
    label: "Asset Disposal",
    href: `${ACCOUNTS_BASE}/assets/disposal`,
    groupId: "assets",
    status: "planned",
    phase: 8,
    description: "Dispose assets and recognize gain/loss",
  },
  {
    id: "asset-transfers",
    label: "Asset Transfers",
    href: `${ACCOUNTS_BASE}/assets/transfers`,
    groupId: "assets",
    status: "planned",
    phase: 8,
    description: "Transfer assets between branches and departments",
  },

  // Inventory Accounting
  {
    id: "stock-valuation",
    label: "Stock Valuation",
    href: `${ACCOUNTS_BASE}/inventory/valuation`,
    groupId: "inventory-accounting",
    status: "linked",
    phase: 9,
    description: "Inventory value, COGS, and product profitability",
    redirectTo: `${ACCOUNTS_BASE}/financial-breakdown`,
    keywords: ["inventory", "valuation", "cogs"],
  },
  {
    id: "cogs",
    label: "COGS",
    href: `${ACCOUNTS_BASE}/inventory/cogs`,
    groupId: "inventory-accounting",
    status: "planned",
    phase: 9,
    description: "Cost of goods sold posting and analysis",
  },
  {
    id: "stock-adjustments",
    label: "Stock Adjustments",
    href: `${ACCOUNTS_BASE}/inventory/adjustments`,
    groupId: "inventory-accounting",
    status: "planned",
    phase: 9,
    description: "Inventory write-offs and adjustment journals",
  },
  {
    id: "inventory-reconciliation",
    label: "Inventory Reconciliation",
    href: `${ACCOUNTS_BASE}/inventory/reconciliation`,
    groupId: "inventory-accounting",
    status: "planned",
    phase: 9,
    description: "Reconcile physical stock counts with ledger inventory",
  },

  // Reports
  {
    id: "financial-breakdown",
    label: "Management Analytics",
    href: `${ACCOUNTS_BASE}/financial-breakdown`,
    groupId: "reports",
    status: "live",
    phase: 10,
    description: "Revenue, profit, cash flow, category and product profitability",
    keywords: ["analytics", "profit", "revenue"],
  },
  {
    id: "profit-loss",
    label: "Profit & Loss",
    href: `${ACCOUNTS_BASE}/reports/profit-loss`,
    groupId: "reports",
    status: "live",
    phase: 10,
    description: "Formal P&L from the general ledger",
  },
  {
    id: "balance-sheet",
    label: "Balance Sheet",
    href: `${ACCOUNTS_BASE}/reports/balance-sheet`,
    groupId: "reports",
    status: "live",
    phase: 10,
    description: "Assets, liabilities, and equity statement",
  },
  {
    id: "cash-flow-report",
    label: "Cash Flow",
    href: `${ACCOUNTS_BASE}/reports/cash-flow`,
    groupId: "reports",
    status: "live",
    phase: 10,
    description: "Operating, investing, and financing cash flows",
  },
  {
    id: "reports-trial-balance",
    label: "Trial Balance",
    href: `${ACCOUNTS_BASE}/reports/trial-balance`,
    groupId: "reports",
    status: "live",
    phase: 10,
    description: "Period trial balance report",
  },
  {
    id: "reports-general-ledger",
    label: "General Ledger Report",
    href: `${ACCOUNTS_BASE}/reports/general-ledger`,
    groupId: "reports",
    status: "live",
    phase: 10,
    description: "Exportable general ledger by account and period",
  },
  {
    id: "reports-debtors",
    label: "Debtors Report",
    href: `${ACCOUNTS_BASE}/reports/debtors`,
    groupId: "reports",
    status: "linked",
    phase: 10,
    description: "Outstanding customer balances",
    redirectTo: `${ACCOUNTS_BASE}/debts`,
  },
  {
    id: "reports-creditors",
    label: "Creditors Report",
    href: `${ACCOUNTS_BASE}/reports/creditors`,
    groupId: "reports",
    status: "live",
    phase: 10,
    description: "Outstanding supplier balances",
  },
  {
    id: "reports-vat",
    label: "VAT Report",
    href: `${ACCOUNTS_BASE}/reports/vat`,
    groupId: "reports",
    status: "live",
    phase: 10,
    description: "VAT summary for filing periods",
  },
  {
    id: "reports-tax",
    label: "Tax Report",
    href: `${ACCOUNTS_BASE}/reports/tax`,
    groupId: "reports",
    status: "planned",
    phase: 10,
    description: "Combined statutory tax liabilities",
  },
  {
    id: "management-reports",
    label: "Management Reports",
    href: `${ACCOUNTS_BASE}/reports/management`,
    groupId: "reports",
    status: "linked",
    phase: 10,
    description: "Reports hub — finance, fleet, HR, and operations",
    redirectTo: "/admin/reports",
  },
  {
    id: "monthly-invoice-summary",
    label: "Monthly Invoice Summary",
    href: `${ACCOUNTS_BASE}/reports/monthly-invoices`,
    groupId: "reports",
    status: "linked",
    phase: 10,
    description: "Monthly invoice export summary",
    redirectTo: "/admin/reports/monthly-invoice-summary",
  },

  // Settings
  {
    id: "fiscal-periods",
    label: "Fiscal Periods",
    href: `${ACCOUNTS_BASE}/settings/fiscal-periods`,
    groupId: "settings",
    status: "planned",
    phase: 11,
    description: "Fiscal years, open/closed periods, period locking",
  },
  {
    id: "accounting-settings",
    label: "Accounting Settings",
    href: `${ACCOUNTS_BASE}/settings/accounting`,
    groupId: "settings",
    status: "planned",
    phase: 11,
    description: "Default accounts, numbering, rounding, base currency",
  },
  {
    id: "tax-settings",
    label: "Tax Settings",
    href: `${ACCOUNTS_BASE}/settings/tax`,
    groupId: "settings",
    status: "linked",
    phase: 11,
    description: "Invoice VAT and eTIMS configuration",
    redirectTo: "/admin/settings/system/invoice-generation",
  },
  {
    id: "payment-methods",
    label: "Payment Methods",
    href: `${ACCOUNTS_BASE}/settings/payment-methods`,
    groupId: "settings",
    status: "planned",
    phase: 11,
    description: "Configure cash, bank, M-Pesa, and card methods",
  },
  {
    id: "approval-rules",
    label: "Approval Rules",
    href: `${ACCOUNTS_BASE}/settings/approval-rules`,
    groupId: "settings",
    status: "planned",
    phase: 11,
    description: "Configurable approval thresholds by amount",
  },
  {
    id: "audit-logs",
    label: "Audit Logs",
    href: `${ACCOUNTS_BASE}/settings/audit-logs`,
    groupId: "settings",
    status: "planned",
    phase: 11,
    description: "Immutable financial transaction audit trail",
  },
]

/** Paths with dedicated page.tsx files — catch-all must not handle these */
export const ACCOUNTS_EXPLICIT_PATHS = new Set([
  "/admin/accounts",
  "/admin/accounts/posts",
  "/admin/accounts/payments",
  "/admin/accounts/debts",
  "/admin/accounts/expenses",
  "/admin/accounts/expenses/export",
  "/admin/accounts/expenses/new",
  "/admin/accounts/expenses/categories",
  "/admin/accounts/expenses/claims",
  "/admin/accounts/remuneration-reports",
  "/admin/accounts/financial-breakdown",
  "/admin/accounts/receivables/aging",
  "/admin/accounts/receivables",
  "/admin/accounts/receivables/statements",
  "/admin/accounts/receivables/debit-notes",
  "/admin/accounts/receivables/credit-notes",
  "/admin/accounts/cash-banking",
  "/admin/accounts/cash-banking/cash",
  "/admin/accounts/cash-banking/bank",
  "/admin/accounts/cash-banking/mpesa",
  "/admin/accounts/cash-banking/cashbook",
  "/admin/accounts/cash-banking/transfers",
  "/admin/accounts/cash-banking/reconciliation",
  // Legacy client redirects
  "/admin/accounts/clients",
  "/admin/accounts/bulk-sms",
  "/admin/accounts/clients/installed-machines",
  "/admin/accounts/complaints",
])

export function getAccountsPageBySlug(slug: string[]): AccountsNavPage | undefined {
  const path = `${ACCOUNTS_BASE}/${slug.join("/")}`
  return ACCOUNTS_NAV_PAGES.find((page) => page.href === path)
}

export function getAccountsGroup(groupId: string): AccountsNavGroup | undefined {
  return ACCOUNTS_NAV_GROUPS.find((group) => group.id === groupId)
}

export function getAccountsPagesByGroup(groupId: string): AccountsNavPage[] {
  return ACCOUNTS_NAV_PAGES.filter((page) => page.groupId === groupId)
}

export function getAccountsNavStats() {
  const live = ACCOUNTS_NAV_PAGES.filter((p) => p.status === "live").length
  const linked = ACCOUNTS_NAV_PAGES.filter((p) => p.status === "linked").length
  const planned = ACCOUNTS_NAV_PAGES.filter((p) => p.status === "planned").length
  return { live, linked, planned, total: ACCOUNTS_NAV_PAGES.length }
}

/** Resolve which accounts nav page matches the current path (longest href wins). */
export function resolveAccountsPageFromPathname(
  pathname: string,
): AccountsNavPage | undefined {
  const normalized = pathname.replace(/\/$/, "") || pathname
  let best: AccountsNavPage | undefined
  let bestLen = -1

  for (const page of ACCOUNTS_NAV_PAGES) {
    const candidates = [page.href, page.redirectTo].filter(Boolean) as string[]
    for (const candidate of candidates) {
      const base = candidate.replace(/\/$/, "")
      if (
        normalized === base ||
        normalized.startsWith(`${base}/`) ||
        // category detail under expenses/categories
        (base.endsWith("/categories") &&
          normalized.startsWith(`${ACCOUNTS_BASE}/expenses/categories/`))
      ) {
        if (base.length > bestLen) {
          best = page
          bestLen = base.length
        }
      }
    }
  }

  return best
}

/** Pages shown as top buttons within a module (definition order; planned last). */
export function getAccountsModuleNavPages(groupId: string): AccountsNavPage[] {
  const pages = getAccountsPagesByGroup(groupId).filter(
    (page) => page.id !== "dashboard",
  )
  const active = pages.filter((page) => page.status !== "planned")
  const planned = pages.filter((page) => page.status === "planned")
  return [...active, ...planned]
}

/** Sidebar / hub entry for a module group. */
export function getAccountsModuleEntryHref(groupId: string): string {
  const pages = getAccountsPagesByGroup(groupId)
  if (groupId === "receivables") {
    return `${ACCOUNTS_BASE}/receivables`
  }
  if (groupId === "expenses") {
    return `${ACCOUNTS_BASE}/expenses`
  }
  if (groupId === "cash-banking") {
    return `${ACCOUNTS_BASE}/cash-banking`
  }
  if (groupId === "payroll") {
    return `${ACCOUNTS_BASE}/remuneration-reports`
  }
  if (groupId === "inventory-accounting") {
    return `${ACCOUNTS_BASE}/financial-breakdown`
  }
  if (groupId === "payables") {
    return `${ACCOUNTS_BASE}/payables/bills`
  }
  const preferred =
    pages.find((p) => p.status === "live" && !p.redirectTo) ||
    pages.find((p) => p.status === "live") ||
    pages.find((p) => p.status === "linked") ||
    pages[0]
  return preferred?.redirectTo || preferred?.href || ACCOUNTS_BASE
}

export type AccountsSidebarModule = {
  groupId: string
  label: string
  href: string
  description: string
}

/** Sidebar modules — keep this list short and intentional. */
const ACCOUNTS_SIDEBAR_MODULE_IDS = [
  "expenses",
  "receivables",
  "cash-banking",
  "payroll",
  "inventory-accounting",
  "payables",
] as const

const ACCOUNTS_SIDEBAR_LABELS: Record<string, string> = {
  expenses: "Expenses",
  receivables: "Sales & Receivables",
  "cash-banking": "Cashflow & Banking",
  payroll: "Payroll & Statutory Deductions",
  "inventory-accounting": "Inventory Accounting",
  payables: "Purchases & Payables",
}

/** Flat module list for the Accounts sidebar (one row per allowed module). */
export function getAccountsSidebarModules(): AccountsSidebarModule[] {
  return ACCOUNTS_SIDEBAR_MODULE_IDS.map((groupId) => {
    const group = getAccountsGroup(groupId)
    return {
      groupId,
      label: ACCOUNTS_SIDEBAR_LABELS[groupId] || group?.label || groupId,
      href: getAccountsModuleEntryHref(groupId),
      description: group?.description || "",
    }
  })
}

/**
 * Back target for nested accounts pages (module hub).
 * On a module hub, return Accounts home. On deeper pages, return the module hub.
 */
export function getAccountsNestedBackTarget(pathname: string): {
  href: string
  label: string
  groupId: string
} | null {
  const normalized = (pathname || "").replace(/\/$/, "") || pathname
  if (normalized === ACCOUNTS_BASE) return null

  const page = resolveAccountsPageFromPathname(pathname)
  if (!page || page.groupId === "overview") {
    return {
      href: ACCOUNTS_BASE,
      label: "Back to Accounts",
      groupId: "overview",
    }
  }

  const hub = getAccountsModuleEntryHref(page.groupId)
  const hubNorm = hub.replace(/\/$/, "")
  if (normalized === hubNorm) {
    return {
      href: ACCOUNTS_BASE,
      label: "Back to Accounts",
      groupId: page.groupId,
    }
  }

  const group = getAccountsGroup(page.groupId)
  const label = ACCOUNTS_SIDEBAR_LABELS[page.groupId] || group?.label || "module"
  return {
    href: hub,
    label: `Back to ${label}`,
    groupId: page.groupId,
  }
}
