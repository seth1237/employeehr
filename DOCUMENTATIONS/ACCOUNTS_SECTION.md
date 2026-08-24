# Accounts Section Documentation

## Overview

The **Accounts** section in the admin portal covers finance and compliance workflows: KRA eTIMS posting, invoice payments, receivables, M-Pesa expenses, payroll remuneration reports, and financial analytics. It lives under `/admin/accounts/*`.

Client CRM features (clients list, bulk SMS, complaints, installed machines) **used to live under Accounts** but were moved to the **Clients** hub. Legacy URLs under `/admin/accounts/` still redirect to their Clients equivalents.

There is **no landing page** at `/admin/accounts` — users reach Accounts pages via the sidebar or Cmd-K search.

**Update (Aug 2026):** `/admin/accounts` is now the **Accounts Dashboard** — a branded hub with KPIs, alerts, and the full module map from `ANALYSIS_INDEX.md`. Navigation is driven by `lib/accounts-nav.ts`. Existing modules are **linked** under canonical Accounts paths; missing modules show branded **Phase N — Coming soon** placeholders.

---

## Navigation

### Sidebar (`components/admin/sidebar.tsx`)

| Label | Route | Section |
|-------|-------|---------|
| eTIMS posts | `/admin/accounts/posts` | ACCOUNTS |
| Payments | `/admin/accounts/payments` | ACCOUNTS |
| Debts | `/admin/accounts/debts` | ACCOUNTS |
| Expenses | `/admin/accounts/expenses` | ACCOUNTS |
| Remuneration reports | `/admin/accounts/remuneration-reports` | ACCOUNTS |
| Financial breakdown | `/admin/accounts/financial-breakdown` | ACCOUNTS |

### Cmd-K quick nav (`lib/admin-nav.ts`)

Only four Accounts entries are indexed for search:

- eTIMS Posts (`/admin/accounts/posts`) — keywords: kra, tax
- Payments
- Debts
- Expenses

**Remuneration reports** and **Financial breakdown** are sidebar-only (not in Cmd-K).

### Section detection (`lib/admin-sections.ts`)

Any path starting with `/admin/accounts` is classified as the **ACCOUNTS** section for layout and highlighting.

### Permissions

Page access settings define:

- `accounts:read` — View accounts
- `accounts:write` — Manage accounts

Defined in `app/admin/settings/system/page-access/page.tsx` and `server/src/controllers/companyController.ts`.

---

## Legacy redirects (Accounts → Clients)

These routes exist only to preserve old bookmarks. They immediately redirect:

| Old path | Redirects to |
|----------|--------------|
| `/admin/accounts/clients` | `/admin/clients/clients-list` |
| `/admin/accounts/bulk-sms` | `/admin/clients/bulk-sms` |
| `/admin/accounts/clients/installed-machines` | `/admin/clients/installed-machines` |
| `/admin/accounts/complaints` | `/admin/clients/complaints` |
| `/admin/accounts/complaints/new` | `/admin/clients/complaints/new` |
| `/admin/accounts/complaints/[complaintId]` | `/admin/clients/complaints/[complaintId]` |

---

## Active pages

### 1. eTIMS Posts — `/admin/accounts/posts`

**Purpose:** Post sales invoices to Kenya Revenue Authority (KRA) via **eTIMS OSCU** (Online Sales Control Unit).

**Page:** `app/admin/accounts/posts/page.tsx`

#### Dashboard KPIs

- **Connection status** — Connected / Disconnected (from eTIMS stats)
- **Submitted invoices** — count + last success time
- **Pending** — invoices awaiting submission
- **Failed** — count + last error message/time

#### Invoice posts queue

- Lists sales invoices eligible for eTIMS posting
- Search by invoice number, client name, or client number
- Per-invoice badges:
  - **KRA Saved** / **KRA Missing** (client tax profile on file)
  - **Posted** / **Failed** / **Not Posted** (eTIMS submission status)

#### Client KRA details & posting

When an invoice is selected:

- Edit and save client tax profile:
  - Legal name
  - KRA PIN
  - Email (optional)
  - Branch ID (optional)
- **Post Sale to eTIMS** — submits invoice after KRA details are saved
- Shows KRA Invoice ID when posted successfully

#### OSCU configuration dialog

Tenant-level eTIMS setup:

- Company name
- KRA PIN (TIN)
- Branch ID
- Device serial number
- Environment (Sandbox / Production)
- API endpoint base URL
- Communication key (read-only; filled by device init)
- Enable / disable integration toggle
- **Initialize Device** — registers device with KRA and retrieves communication key
- **Save Configuration**

#### APIs

| Action | Method | Endpoint |
|--------|--------|----------|
| List invoices for posting | GET | `/api/stock/accounts/posts` |
| Save client KRA profile | PUT | `/api/stock/accounts/posts/:invoiceId/client` |
| Post invoice (legacy route) | POST | `/api/stock/accounts/posts/:invoiceId/post-etims` |
| Get eTIMS config | GET | `/api/etims/config` |
| Save eTIMS config | POST | `/api/etims/config` |
| Initialize device | POST | `/api/etims/init-device` |
| Dashboard stats | GET | `/api/etims/stats` |
| Submit invoice | POST | `/api/etims/submit-invoice` |
| Validate customer | POST | `/api/etims/validate-customer` |
| Logs | GET | `/api/etims/logs` |

eTIMS routes require auth, org context, tenant isolation, and roles: `company_admin`, `admin`, `hr`, or `manager`.

---

### 2. Payments — `/admin/accounts/payments`

**Purpose:** Record partial or full payments against outstanding sales invoices.

**Page:** `app/admin/accounts/payments/page.tsx`

#### Features

- **Sales invoices list** (left panel)
  - Search by invoice, client name, or number
  - Shows total, paid amount, balance, latest payment, status
  - Select invoice to record payment

- **Record payment** (right panel)
  - Amount
  - Payment method: cash, mpesa, bank, cheque, card, other
  - Reference (optional)
  - Paid at datetime (optional)
  - Note (optional)
  - Disabled when invoice is fully paid

- **Payment history** table for selected invoice (date, method, amount, reference)

- Silent refresh after saving; supports background reload without full-page skeleton

#### APIs

| Action | Method | Endpoint |
|--------|--------|----------|
| List invoices with payment summary | GET | `/api/stock/accounts/payments` |
| Add payment | POST | `/api/stock/accounts/payments/:invoiceId` |

Payment payload: `amount`, `paymentMethod`, `reference`, `note`, `paidAt`.

---

### 3. Debts — `/admin/accounts/debts`

**Purpose:** Read-only view of **unsettled** sales invoices (outstanding receivables).

**Page:** `app/admin/accounts/debts/page.tsx`

#### Features

- Table of invoices with remaining balance
- Columns: invoice, client, total, paid, balance, latest payment, status
- Search by invoice, client name, number, or location
- No inline payment recording (use **Payments** page for that)

#### APIs

| Action | Method | Endpoint |
|--------|--------|----------|
| Unsettled invoices | GET | `/api/stock/accounts/debts` |
| Aging report (API only) | GET | `/api/stock/accounts/debts/aging` |

**Note:** The aging report endpoint exists on the backend and buckets balances into 0–30, 31–60, 61–90, and 90+ day buckets, but **there is no UI page** for it yet. `stockApi.getAgingDebtReport()` is available in `lib/api.ts` for future use.

---

### 4. Expenses — `/admin/accounts/expenses`

**Purpose:** Initiate and track **M-Pesa STK/prompt-based** business expenses, plus manage recurring bills.

**Page:** `app/admin/accounts/expenses/page.tsx`

#### Initiate expense

- **Payer phone** — accountant / company M-Pesa line (datalist from history)
- **Payee phone** — recipient (datalist from history)
- **Amount**
- **Purpose** — free text with suggestions from past expenses
- **Prompt M-Pesa Payment** — triggers payment prompt flow

#### Expenses history

Table columns: date, payer, payee, amount, purpose, status, message.

Expense statuses: `pending`, `prompt_sent`, `completed`, `failed`.

#### Repeat bills (collapsible section)

- Save recurring bill templates:
  - Payer phone
  - Multiple payee numbers (comma or newline separated)
  - Amount
  - Purpose
- **Save Repeat Bill & Send** — creates template and sends prompts immediately
- List saved repeat bills with last run time and count
- **Run Now** — re-send prompts for a saved bill

#### APIs

| Action | Method | Endpoint |
|--------|--------|----------|
| List expenses | GET | `/api/stock/accounts/expenses` |
| Initiate expense | POST | `/api/stock/accounts/expenses/initiate` |
| List repeat bills | GET | `/api/stock/accounts/repeat-bills` |
| Create repeat bill | POST | `/api/stock/accounts/repeat-bills` |
| Run repeat bill | POST | `/api/stock/accounts/repeat-bills/:repeatBillId/run` |

---

### 5. Remuneration reports — `/admin/accounts/remuneration-reports`

**Purpose:** Monthly payroll breakdown and Excel export for statutory and net pay reporting.

**Page:** `app/admin/accounts/remuneration-reports/page.tsx`  
**Logic:** `lib/remuneration-reports.ts`

#### Features

- **Month picker** — loads payroll for selected month
- **Summary KPI cards:**
  - Total employees
  - Net salaries
  - Total tax (PAYE)
  - Total SHA
  - Total NSSF
  - Total HELB

- **Report tabs** (switchable breakdown):
  - Net Salaries
  - SHA Payments
  - Tax (PAYE) Deductions
  - NSSF Deductions
  - HELB Deductions

- **Export Excel** — downloads active tab as `.xlsx`

- Uses company branding colors for cards and active tab styling

#### Data sources

- `api.payroll.getAll(selectedMonth)` — payroll records
- `api.users.getAll()` — employees filtered to `role === "employee"`
- `api.company.getBranding()` — theme colors

---

### 6. Financial breakdown — `/admin/accounts/financial-breakdown`

**Purpose:** Revenue, profit, cash flow, and product/category analytics with filters and period comparison.

**Page:** `app/admin/accounts/financial-breakdown/page.tsx`

#### Filters

- **Period:** This month, Last 30 days, This year, Global history
- **Branch:** All locations or specific branch
- **Employee:** Everyone or specific staff member
- Refresh button
- **Report** button (UI present; export behavior depends on implementation)

#### Summary KPIs (with % change vs previous period)

- Gross revenue
- Net operating profit
- Actual cash inflow
- Operating outflow

#### Category analysis (left panel)

- Per-category revenue, item count, margin %
- Revenue contribution bars
- **Catalog asset valuation** — total inventory value footer

#### Catalog profitability index (right panel)

- Searchable product table
- Columns: product name/category, stock, unit sell/buy price, revenue, quantity sold, net operating profit, profit margin %
- Margin color coding (green / blue / amber / red by threshold)

#### API

| Action | Method | Endpoint |
|--------|--------|----------|
| Financial breakdown | GET | `/api/stock/analytics/financial-breakdown?period=&branch=&employee=` |

Query params are passed through `stockApi.getFinancialBreakdown()`.

---

## Relationship to other modules

| Concern | Where it lives now |
|---------|-------------------|
| Client list, contacts, phone numbers | **Clients** → `/admin/clients/clients-list` |
| Bulk SMS campaigns | **Clients** → `/admin/clients/bulk-sms` |
| Client complaints | **Clients** → `/admin/clients/complaints` |
| Installed machines | **Clients** → `/admin/clients/installed-machines` |
| Sales invoices (creation) | **Stock / sales** flows |
| Payroll processing | **Payroll** module (Accounts only reports on it) |
| eTIMS backend controller | `server/src/controllers/etimsController.ts` |
| Accounts stock endpoints | `server/src/controllers/stockController.ts` |

---

## File map

```
app/admin/accounts/
├── posts/page.tsx                 # eTIMS OSCU integration
├── payments/page.tsx              # Invoice payment recording
├── debts/page.tsx                 # Unsettled receivables
├── expenses/page.tsx              # M-Pesa expenses + repeat bills
├── remuneration-reports/page.tsx  # Payroll report exports
├── financial-breakdown/page.tsx   # Revenue/profit analytics
├── clients/page.tsx               # → redirect to Clients
├── bulk-sms/page.tsx              # → redirect to Clients
├── clients/installed-machines/      # → redirect to Clients
└── complaints/                      # → redirect to Clients

components/admin/sidebar.tsx       # ACCOUNTS nav items
lib/admin-nav.ts                   # Cmd-K entries (4 of 6)
lib/admin-sections.ts              # Section matcher
lib/api.ts                         # stockApi + etimsApi client methods
lib/remuneration-reports.ts        # Report generation & Excel export

server/src/routes/stock.routes.ts  # /accounts/* stock endpoints
server/src/routes/etims.routes.ts  # /api/etims/* endpoints
```

---

## Known gaps / notes

1. **No Accounts index page** — `/admin/accounts` has no `page.tsx`.
2. **Aging debt API without UI** — `/api/stock/accounts/debts/aging` is implemented but not exposed in the Debts page.
3. **Cmd-K incomplete** — Remuneration reports and Financial breakdown are missing from `lib/admin-nav.ts`.
4. **Client CRM split** — Finance stays in Accounts; customer relationship tools moved to Clients with redirects for old URLs.

---

*Last updated: August 2026 — reflects current codebase state.*
