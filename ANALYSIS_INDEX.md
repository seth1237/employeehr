# Sales Reporting Tool — Requirements & Design Reference

**Context:** You already have a CRM/ERP. This document is scoped to a *reporting layer* that sits on top of it — not a replacement system. It pulls identity, customer, product, and deal data from your existing CRM/ERP and adds the daily-reporting, KPI, and management-visibility layer that most CRMs handle poorly out of the box.

---

## 1. The market, in short

There are two dominant patterns for "sales reporting" tools, and most real deployments are a blend of both. Knowing which one your reps' day-to-day work looks like will shape almost every field you collect.


| Pattern                                                                                                | Who uses it                                                                       | What a "report" is                                                                    |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **B2B / opportunity-based reporting** (Salesforce, HubSpot, Zendesk Sell, Kickscale, Explo, DealHub)   | Inside/outside B2B sales teams working deals through a pipeline                   | Calls made, meetings booked, deals moved, pipeline value, forecast accuracy           |
| **Field sales / SFA reporting** (FieldAssist, Bizom, SPOTIO, Proxima SFA, SalesMagna, Delta Sales App) | Field reps visiting outlets/clients daily (FMCG, distribution, pharma, van sales) | Outlet visits, GPS-verified check-ins, orders booked, stock/shelf checks, collections |
| **Blended (most common in practice)**                                                                  | Any company with reps who visit or call people daily and also carry targets/quota | Daily activity log + orders/deals + KPI attainment, rolled up to manager dashboards   |


Common thread across both: **daily reports capture leading indicators (effort — visits, calls, follow-ups), while weekly/monthly reports capture lagging indicators (outcomes — revenue, conversion, quota attainment).** A good system automates the daily leading-indicator capture so reps aren't hand-typing reports, and reserves human judgment for the weekly/monthly review.

---

## 2. What a daily sales rep report should capture

Structure each daily report as **one record per rep per day**, made up of activity entries (one per visit/call/interaction) plus a short end-of-day summary. Avoid free-text-only reports — they don't roll up into dashboards.

### 2.1 Rep & context fields (auto-filled, not typed)

- Rep name / ID, team, territory or route/beat
- Date, shift/day type (working day, leave, holiday)
- Login/logout or "day start / day end" timestamp
- Device GPS trail (optional, for field teams)

### 2.2 Per-visit / per-interaction fields

- Customer/client/outlet name (linked to CRM record — never free text if avoidable)
- Visit type: scheduled / unscheduled / follow-up / cold call / service call
- Check-in time and GPS geo-tag
- Purpose of visit / call objective
- Outcome: quote requested / follow-up needed / no interest / complaint / information only
- **Quote request details** (see Section 3 for the full workflow): products selected from live stock, quantities, unit price, resulting quote total, quote status
- Competitor activity or stock/shelf notes (if relevant — retail/FMCG)
- Photo evidence (shelf photo, signed document, etc.) — optional but strongly recommended for accountability
- Next action / follow-up date and owner
- Free-text notes (kept short, structured fields should carry most of the weight)

### 2.3 End-of-day summary (can be auto-computed, rep just confirms)

- Visits/calls planned vs. completed
- New leads/prospects added
- Orders booked (count and value)
- Follow-ups completed vs. scheduled
- Expenses/mileage (if you reimburse field travel)
- Blockers or escalations for the manager

**Design principle:** every field should either (a) feed a KPI on the manager dashboard, or (b) be needed for an operational reason (compliance, payment, delivery). If a field doesn't do either, cut it — bloated forms are the #1 reason field reps stop filling in reports honestly.

---

## 3. The quote workflow (core of the daily activity)

Since reps' core action per visit is requesting a quote from live stock, this workflow deserves its own model rather than being buried inside a generic "order" field. Treat it as its own object with a status lifecycle, linked back to the visit and the customer.

### 3.1 Product/stock browsing (rep-facing)

- Rep sees a **live stock view** pulled from the ERP inventory (product name, SKU, available quantity, price/price list applicable to that customer).
- Search/filter by category, availability (in-stock only by default), or customer's past purchases.
- Out-of-stock items are either hidden or clearly greyed out — don't let a rep build a quote around stock that isn't there.
- Rep selects products + quantities → system computes a draft quote (subtotal, tax, any applicable discount tier) before submission.

### 3.2 Quote status lifecycle

```
Draft → Submitted (pending approval) → Approved → Downloaded/Sent
                                     ↘ Rejected / Sent back for revision
```

- **Draft**: rep is still building the quote; not visible to approver yet.
- **Submitted**: locked for editing, routed to the approver (manager, pricing desk, or rule-based e.g. auto-approve under a discount/value threshold, manual approval above it).
- **Approved**: quote is finalized; a PDF (or your standard quote document) becomes available.
- **Rejected/Revision requested**: goes back to the rep with a reason, re-enters Draft.
- **Downloaded**: rep (or customer, if you allow customer-facing download) retrieves the approved PDF. Track *when* and *by whom* it was downloaded — useful for follow-up timing (see 3.3).

### 3.3 Why this matters for reporting

- **Approval turnaround time** (submitted → approved) is a KPI in its own right — slow approvals stall reps in the field.
- **Quote-to-order conversion** (approved quotes that actually turn into a sale) tells you if pricing/approval is a bottleneck or if it's a follow-up problem.
- A quote that's approved but **not downloaded within X days**, or downloaded but with **no follow-up logged**, should trigger the reminder described in Section 4.2 — this is exactly the kind of thing reps forget and managers only find out about too late.
- Stock availability at quote time should be recorded (a snapshot), since stock may change between quote and order — this avoids disputes later.

---

## 4. Key information that matters to the company

Group KPIs into four buckets. A report/dashboard that mixes all of these into one flat list is the most common design mistake.

### A. Activity / effort (leading indicators — daily)

- Visits or calls planned vs. completed
- Coverage rate (% of assigned customers/outlets visited on schedule)
- Follow-up completion rate (scheduled vs. actually done — this is the metric most teams fail to track and it's often the earliest warning sign)
- New contacts/leads created
- Time in field vs. admin time

### B. Pipeline / sales outcomes (mid-frequency — daily roll-up, weekly review)

- Quotes requested (count, value)
- Quote approval rate and average approval turnaround time
- Quotes pending approval (aging — how long they've sat)
- Quote-to-order conversion rate (approved quotes that convert to a sale)
- Average quote value
- Quotes approved but not yet downloaded / not followed up on

### C. Financial / revenue (lagging indicators — daily total, monthly trend)

- Revenue vs. target (individual, team, region)
- Collections / outstanding receivables (if reps handle payments)
- Discount/scheme leakage — orders with abnormal discounting
- Revenue by product line, customer segment, territory

### D. Compliance / quality (field-specific, if relevant)

- GPS-verified visit vs. claimed visit (flags "ghost visits")
- Photo/shelf compliance score
- Beat-plan adherence (scheduled outlets actually visited, in order)
- Complaint or issue resolution time

**Rule of thumb from the research:** dashboards with more than ~8–12 visible KPIs on one screen see materially lower usage. Pick 5–9 headline metrics per role and push everything else behind a drill-down.

---

## 5. How this should show up on the admin/manager side

### 5.1 Structure by role, not one dashboard for everyone

**Rep view — personal only, no peer comparison or ranking.** Reps should see their own numbers and how they compare to their *own* target/history, never to other reps. The rep home screen should be built around "what do I need to do" more than "how am I scoring," structured as:

1. **My reminders / pending actions** (top of screen, always visible):
  - Follow-ups due today or overdue (pulled straight from the "next action" field logged during visits)
  - Quotes awaiting the customer's decision (approved but not yet downloaded, or downloaded but no follow-up logged after N days)
  - Quotes sent back for revision that need rework
  - Customers not visited within their expected visit frequency
  - Today's planned visits/route
2. **My performance** (own trend only): visits completed vs. plan, quotes requested/approved this week/month, quote-to-order conversion, revenue vs. personal target — each shown against *their own* target or *their own* prior period, never against teammates.
3. **My activity history**: a simple log of past visits/quotes for their own reference.

- **Manager/supervisor view:** team roll-up, exception list (who missed visits, who's behind target, whose quotes are stuck in approval), drill-down to any individual rep or customer.
- **Admin/ops view:** data quality, system usage, approvals (quote approvals, discount overrides), and cross-team comparisons.
- **Leadership view:** revenue vs. target, trend over time, regional/segment breakdown — fewer, bigger numbers, no operational noise.

Peer comparison and leaderboards, if you ever want them, belong strictly in the **manager/admin views** — never surfaced to reps themselves.

### 5.2 Visual hierarchy (top to bottom)

1. **Headline KPI cards** (5–9 max): today's/MTD revenue vs. target, visits completed vs. planned, quotes requested/approved, follow-up completion rate — each with a trend arrow and comparison to target or prior period.
2. **Exception/alert row**: reps who haven't checked in today, missed scheduled visits, quotes stuck in approval past SLA, customers not visited in X days. This is the single highest-value section for a manager checking each morning — it turns the dashboard from "a report" into "a to-do list."
3. **Trend charts**: revenue/quotes over time (line chart), performance by rep or territory (bar chart — for manager/admin eyes only, not shared with reps as a ranking), quote pipeline stage breakdown (funnel or stacked bar: requested → submitted → approved → downloaded).
4. **Detail table**: the underlying daily report entries and quotes, filterable and exportable, for anyone who needs to dig in.

Note: since reps shouldn't see peer ranking, any rep-level comparison chart in the manager view should be treated as manager-only data — don't build it as a shared widget that's simply hidden by a toggle, since that's easy to misconfigure. Enforce the access boundary at the API/query level (see Section 5.4).

### 5.3 Interaction patterns

- **Drill-down everywhere**: clicking any KPI card should filter the whole dashboard to that dimension (e.g., click "orders" → see which reps/customers make up that number).
- **Filters**: date range, region/territory, team, rep, product line — as a persistent filter bar, not repeated per chart.
- **Color convention**: green = on/above target, amber = at risk, red = below target or overdue — kept consistent everywhere in the tool.
- **"Last updated" timestamp** visible at all times, so managers trust what they're looking at.
- **Automated delivery**: daily digest (email/WhatsApp/Slack) with the headline numbers and the exception list, so managers don't have to log in to know something's wrong.

### 5.4 Data governance

- Every number on the dashboard should trace back to a single source of truth (your CRM/ERP + the new reporting layer), not a spreadsheet compiled by hand.
- Define each KPI once (e.g., what counts as a "visit," what counts as "revenue recognized") and reuse that definition everywhere — mismatched definitions between teams is the most common reason people stop trusting dashboards.
- Role-based access: reps see their own data, managers see their team's, admins/leadership see everything — enforced at the query level, not just hidden in the UI.

---

## 6. How this fits with your existing CRM/ERP

Since you already have a CRM/ERP, the reporting tool's job is narrow and specific:

1. **Daily report capture** — a lightweight form/app (mobile-friendly, works offline if reps are in the field) that writes directly into your CRM/ERP's customer/order/activity tables via API, rather than creating a second database of customers.
2. **Aggregation & KPI computation layer** — a service that periodically (or in real time) computes the KPIs in Section 3 from CRM/ERP data plus the daily reports.
3. **Dashboard/visualization layer** — the admin UI described in Section 4, reading from the aggregation layer.

This keeps your CRM/ERP as the single source of truth for customers, orders, and deals, and avoids the classic failure mode of "the reporting tool has different numbers than the CRM."

### Suggested build approach

Given you're building a React-based admin UI, the pattern from the earlier discussion still applies well here: a **shadcn/ui + Recharts (or similar) dashboard shell**, populated by an API layer that reads from your CRM/ERP plus a new `daily_reports` (and `report_entries`) table. You don't need a full open-source CRM clone (like Atomic CRM) since you already have the CRM — a lighter dashboard-focused starting point (e.g., a shadcn/Refine-style admin dashboard) is a better fit, restyled around the KPI groups in Section 3 and the layout in Section 4.

---

## 7. MVP scope (suggested phasing)

**Phase 1 — Core daily reporting + quote workflow**

- Daily report form (per-visit entries + end-of-day summary), GPS check-in
- Live stock browsing tied to ERP inventory, quote builder
- Quote status lifecycle: Draft → Submitted → Approved/Rejected → Downloaded
- Rep dashboard: reminders/pending-actions panel, today's plan, own KPIs
- Manager dashboard: team roll-up, exception list, quote approval queue

**Phase 2 — KPI depth & automation**

- Full KPI set (Section 4), trend charts, drill-down
- Automated daily/weekly digest to managers
- Auto-approval rules for quotes under a threshold; manual routing above it
- Reminder automation: nudges for stale follow-ups and un-downloaded/un-followed-up quotes

**Phase 3 — Intelligence layer**

- Coaching flags for managers (e.g., reps below quota 2 weeks running) — manager-facing only
- Forecast accuracy tracking
- Anomaly/exception detection (ghost visits, discount leakage, quote approval bottlenecks)

---

## 8. Key sources consulted

- Salesforce — [What Is Sales Reporting](https://www.salesforce.com/sales/analytics/sales-report/)
- SPOTIO — [Sales Activity Reporting](https://spotio.com/blog/sales-activity-reporting/), [Sales Reports for Field Teams](https://spotio.com/blog/sales-reports/)
- Kickscale — [Sales Reporting: KPIs, Process, Template](https://www.kickscale.com/en/blog/sales-reporting)
- DealHub — [What is Sales Reporting](https://dealhub.io/glossary/sales-reporting/)
- FieldAssist — [SFA Software for FMCG](https://www.fieldassist.com/industry/sfa-software-for-fmcg)
- Proxima SFA — [Field Sales Management](https://proximasfa.com/field-sales-management/)
- SalesMagna — [Field Force Automation for FMCG](https://salesmagna.com/best-field-force-automation-software-fmcg-salesmagn/)
- Geckoboard — [Sales Dashboards: Examples, KPIs](https://www.geckoboard.com/dashboard-examples/sales/)
- Klipfolio — [Sales Performance Dashboard](https://www.klipfolio.com/resources/dashboard-examples/sales/sales-performance)
- Improvado — [Sales Dashboard Guide](https://improvado.io/blog/sales-dashboard), [Dashboard Design Guide](https://improvado.io/blog/dashboard-design-guide)
- ClearPoint Strategy — [KPI Dashboard Best Practices](https://www.clearpointstrategy.com/blog/kpi-dashboard-best-practices)
- UXPin — [Dashboard Design Principles](https://www.uxpin.com/studio/blog/dashboard-design-principles/)

