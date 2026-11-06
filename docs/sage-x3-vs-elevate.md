# Elevate vs Sage X3

Source: *Sage X3 Overview (1).pptx* (47 slides), compared to the Elevate HR ERP codebase on 31 Oct 2026.

Sage X3 is a global mid-market ERP for purchasing, sales, inventory, manufacturing, fixed assets, and accounting. Elevate is a Kenya-first operations suite for people, field sales, service, stock, POS, and accounts. Do not clone Sage. Close the finance and stock gaps that block a real month-end, and keep the Kenya / field advantages.

## Coverage at a glance

| Sage module | Elevate status | Verdict |
|---|---|---|
| Common data / org / multi-site | Partial | Companies + branches. Not multi-ledger or multi-legislation. |
| Purchasing (PR → PO → GRN → invoice) | Partial / flagged | Full P2P UI exists. Production flag is still off. |
| Sales (quote → order → delivery → invoice) | Live | Quote → sales order with reserved stock → invoice → dispatch. Picking lists stay light. |
| Manufacturing / MRP / BOM | Missing | Out of scope unless you start making products. |
| Stock / WMS | Partial | Qty, warehouses, locations, stock checks, moving-average/FIFO cost layers, COGS on issue. Inter-branch transfer is live. |
| HR / payroll / people | Stronger than Sage | The Sage deck barely covers this. Elevate is built around it. |
| Fixed assets + depreciation | Planned | Accounts nav lists it. No live asset register. |
| Accounting & finance | Live | COA with customer/vendor/bank/cash control types, multi-currency, journals with Sage types/natures, period lock, budgets, AP/AR, account inquiry, bank statement import + auto-match, financial extraction, fixed assets/depreciation, fiscal periods. |

---

## What Elevate already has

### People and HR
- Roles: company_admin, HR, manager, employee, sales_rep, engineer, dispatch, pos_cashier, portal_client
- Recruitment: jobs, public career pages, application forms, analytics
- Employee file: onboarding, leave, attendance, allocations, contracts
- Payroll: draft / processed / paid, Kenya PAYE + SHIF + NSSF + Housing Levy, bulk generate
- Performance: KPIs, 360 feedback, PDP, badges, polls
- Meetings, tasks, resource booking, alerts

### Sell, stock, and cash
- Products, warehouses, locations, barcodes, stock checks, min alerts, expiry
- Moving-average or FIFO valuation, reserved qty on sales orders, COGS journals on issue
- Quotations, sales orders, invoices, credit/debit notes, dispatch, website orders, tenders
- POS till: holds, cash / card / M-Pesa STK, 80mm slip
- CRM, telesales, exhibitions, complaints, delivery feedback
- Field planner, GPS visits, follow-ups, sales reports
- Cash / bank / M-Pesa books and a reconciliation screen

### Service, fleet, projects
- Installed machines, serials, attendants, engineer work orders
- Fleet vehicles and trips
- Projects, phases, tasks, time logs

### Accounts and procurement
- GL pages: chart of accounts, journals, trial balance, P&L, balance sheet, cash flow, VAT
- Receivables / payables hubs, aging, statements
- Invoice VAT and eTIMS
- Procurement UI: suppliers, budgets, PR, RFQ, PO, GRN, returns, bills, payments, contracts — **off in production** until staging sign-off

---

## Where Elevate is better

1. **Kenya statutory payroll** — PAYE bands with relief, SHIF 2.75%, NSSF 6% cap, Housing Levy 1.5%. Sage needs a local pack or a second system.
2. **M-Pesa and eTIMS** — STK, receipt lookup, cashbook after confirmation, KRA item codes. Sage has generic banking, not Safaricom or KRA.
3. **People system** — recruitment through reviews and self-service. The Sage deck is factories and finance.
4. **Field and service** — planner, GPS, exhibitions, installed base, engineer app, fleet. That is the real business of a medical equipment company.
5. **Counter sales** — a cashier till, not only quote-order-delivery.
6. **Speed and cost** — multi-tenant SaaS already in daily use. Sage X3 is a long partner implementation.

Keep these. Finance integration should sit under them, not replace them.

---

## What Sage has that we lack

### Foundation
- Multi-legislation, multi-language, multi-currency, multi-ledger
- Gadget-style landing pages and 400+ Crystal reports
- Analytical dimensions on every posting

### Purchasing
- MRP / replenishment planning
- Inter-site, inter-company, and subcontract purchase orders
- Supplier price-list engine, prepayments, back-to-back orders from sales

### Manufacturing (entire module)
- BOM, work centers, routings, standard cost, demand forecasts, production orders and tracking

### Stock
- LIFO costing (Elevate has moving average and FIFO)
- Units of measure with conversions
- Lot / serial / QC stock statuses
- Assembly / disassembly
- Formal cycle-count calendar

### Sales
- Preparation lists and picking tickets
- Customer/item price lists

### Assets and finance
- Fixed asset register and depreciation
- Recurring / reversing / template journals
- GL budget vs actual
- Bank statement import and automatic match
- Period lock and statutory financial extract

---

## What to integrate

### Now — finish what is started
1. Enable procurement after staging PR → PO → GRN → bill → payment with GL postings.
2. ~~Add a sales order between quotation and invoice, with stock reservation.~~ Done: quote → `SO-` with reserved qty → draft invoice → post issues stock and posts COGS.
3. Inter-branch stock transfer (ship + receive, in-transit qty). Live.
4. ~~Weighted-average stock valuation and COGS journals.~~ Done: company setting average|FIFO; issues post Dr 5000 / Cr 1300.
5. Bank statement CSV import on the existing reconciliation page.
6. Fiscal periods and period lock.

### Next — Sage ideas that matter for a trader
7. Units of measure (piece / pack / carton).
8. Lot / batch / expiry and a QC hold location.
9. Customer and supplier price lists.
10. Multi-currency with KES as the functional currency.
11. Fixed asset register + monthly depreciation.
12. Light reorder proposals (min stock + open POs + sales velocity).

### Later — only if the business needs them
- BOM / production / standard cost
- Multi-ledger, multi-legislation, multi-language
- Back-to-back and inter-company POs
- A 400-report BI suite (replace with the 15–25 reports finance actually files)

## What not to copy

Do not rebuild Sage gadgets, Crystal Reports, or a manufacturing MES. Elevate already has role dashboards. Add the reports finance files: VAT, PAYE, P&L, stock valuation, debtor and creditor aging.
