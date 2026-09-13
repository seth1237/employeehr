# Elevate — Product & Landing Page

Source of truth for the public homepage (`/`) and for what the product actually does.

This replaces the previous HR-only marketing page and brief. Do not restore pricing, testimonials, fake trial claims, or extra CTAs.

---

## 1. What Elevate is

**Elevate** is a multi-tenant company workspace for teams that sell, stock, buy, collect money, pay people, and run the field — in one branded system.

Tagline already on the mark: **Manage Everything. Grow Anything.**

It is not an HR-only product. After signup, a company gets an isolated workspace (`org_id`) with role-based portals and modules that can be turned on or restricted per role.

---

## 2. How a visitor becomes a customer

1. **Try it for free now** → `/auth/signup`  
   Company admin creates the organisation. No credit card is collected on signup. Default subscription on the company record is `starter`.
2. **Setup wizard** → `/setup`  
   Company profile, branding, email (optional), first employees, KPIs (optional).
3. **Work** → `/admin` (and other role portals after invite).

Existing tenants use **Login to your system** → `/auth/login`. After auth they land by role:

| Role | Portal |
|------|--------|
| `company_admin`, `admin`, `hr` | `/admin` |
| `dispatch` | `/admin/stock/dispatch` |
| `manager` | `/manager` |
| `sales_rep` | `/sales` |
| `technical_service_engineer` | `/engineer` |
| `employee` (default) | `/employee` |
| `super_admin` | `/owner` |

Employees can also sign in with employee ID at `/employee-login`. That is **not** a landing CTA.

---

## 3. System functionality (what exists in the product)

Use this catalogue on the landing as short labels, not as a software manual.

### Company & access

- Multi-tenant company workspace, slug, branches/departments
- Users, roles, page-access by section
- Branding (logo, colours) on the UI and documents
- Company email, stamps, invoice/document settings
- Onboarding wizard after first signup

### Sales & inventory

- Products, stock entries, warehouse layouts
- Quotations → approval → invoice
- Sales invoices, delivery notes, PDFs
- Credit notes, debit notes
- Dispatch / fulfillment
- Stock checks and inventory history
- Services jobs, tenders
- Importation / sourcing
- Product and sales analytics

### Procurement (purchase-to-pay)

- Vendors & suppliers
- Department budgets
- Purchase requests (submit / approve)
- RFQs, supplier quotations, award
- Purchase orders
- Goods receipt notes
- Purchase returns
- Supplier bills (AP)
- Supplier payments
- Supplier contracts

### Accounts & cash

- Expenses, claims, categories
- Sales & receivables: payments, debtors, aging, statements
- Cash, bank, and M-Pesa cashbook; transfers
- Payroll summary and statutory-style reports (PAYE / NSSF / SHA / HELB where configured)
- eTIMS / KRA electronic tax invoice posting where configured
- General ledger pages exist in the accounts nav (chart, journals, trial balance) — do not market them as a finished full ERP GL unless the tenant has them in daily use

**Money thread (true in the product, worth saying once):**

Invoice paid → cashbook in. Expense paid → cashbook out. Salary marked paid → cashbook out. Lines can later be reconciled against bank / M-Pesa.

### Clients & field

- Client directory and groups
- Installed machines / after-sales
- Telesales activity
- Complaints and delivery feedback
- Bulk SMS
- Exhibitions & events
- Field planner, reports, performance
- Sales reports

### People & HR

- Employee records and onboarding
- Attendance and leave
- Payroll and employee payslips
- Allocations, resource booking
- Meetings (including video/WebRTC where enabled; transcript → summary → tasks)
- Contracts and alerts
- Suggestions, badges/awards, polls

### Performance & recruitment

- KPI configuration, PDPs, evaluations
- 360° feedback pools and public survey links
- Job postings, careers pages, applications, hiring communications, job analytics

### Other operations

- Projects
- Fleet tracker / vehicles
- Public careers and feedback links (no login)

### Portals (who uses what)

- **Admin** — full company control
- **Manager** — team, approvals, leave, performance, messages
- **Sales** — planner, clients, quotes, exhibitions, visit reports
- **Engineer** — machines, services, duties, planner, expenses
- **Employee** — profile, tasks, leave, attendance, payslips, quotes/invoices/dispatch where allowed

---

## 4. What the landing page must be

**Minimal.** One scroll. Quiet type. Real product, not “Next-Gen HR”.

### Allowed CTAs (only these two, exact labels)

| Label | Route |
|-------|--------|
| **Try it for free now** | `/auth/signup` |
| **Login to your system** | `/auth/login` |

Same two buttons in the header, the hero, and the closing strip. Nowhere else. No “Learn more”, “See pricing”, “Book a demo”, “Explore modules”.

### Do not put on the page

- Pricing tables
- Testimonials / fake social proof
- “14-day free trial” (not implemented as a clock)
- Extra nav links (Features, How it works, Pricing)
- Purple SaaS decoration, stat counters, fake dashboards
- Claims of a complete audited general ledger or manufacturing

### Page structure

1. **Header** — logo + the two CTAs  
2. **Hero** — brand line, one sentence of promise, the two CTAs  
3. **What you can run** — compact module list (labels + one line each)  
4. **Who it is for** — role names only  
5. **Close** — one line + the two CTAs again  
6. **Footer** — logo mark, © Elevate. No extra buttons.

### Copy (locked)

- **Headline:** Manage everything. Grow anything.
- **Support:** One workspace for sales, stock, procurement, cash, and people.
- **Module cards (landing only):**

  1. **Inventory & sales** — Quotes, invoices, stock, dispatch, and documents.  
  2. **Accounts & cash** — Expenses, receivables, cashbook, M-Pesa, and payroll.  
  3. **Procurement** — Requests, RFQs, orders, receipts, supplier bills, and payments.  
  4. **People & performance** — Attendance, leave, payslips, KPIs, and 360° feedback.  
  5. **Clients & field** — Client books, machines, telesales, complaints, and SMS.  
  6. **Recruitment** — Jobs, applications, and careers pages.

### Visual

- Light page regardless of app theme.
- Wordmark: `/elevateemail.png` (black on white).
- Lots of whitespace. Thin borders. No gradients, no mock charts.
- Primary button = filled (Try it for free now). Secondary = outline (Login to your system).
- Mobile: stack CTAs full-width; module list stacks to one column.

### SEO

- Title: `Elevate — Manage everything. Grow anything.`
- Description: `One workspace for sales, stock, procurement, cash, and people. Try it free or log in to your company system.`

---

## 5. Implementation notes

- Public route is `/` (`app/page.tsx`). It must **not** redirect to login.
- Signup and login stay on `/auth/signup` and `/auth/login`.
- After signup, existing product flow (setup wizard) is unchanged.
- Keep this document in sync if modules are added or removed from the admin sidebar.

*Written 2026-09-11 against the current Elevate / employeehr codebase.*
