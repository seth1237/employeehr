# Employee Management — Gap Analysis & Improvement Roadmap

**Product:** Elevate (employeehr)  
**Date:** 26 August 2026  
**Purpose:** Compare the current Employee Management / HR module with mainstream HRIS patterns (BambooHR, Zoho People, Workday/Oracle HCM lite, Sage HR, SeamlessHR / Fuzu-class Kenya-focused suites) and document what to improve.

This is a **product & architecture brief**, not an implementation ticket list. Priorities at the end suggest a practical build order.

---

## 1. Executive summary

Elevate already has **many HR-adjacent surfaces**: users, leave approve/reject, attendance, payroll (Kenya statutory), recruitment ATS, contracts, 360 feedback, PDPs, meetings, bookings, and engagement (badges/polls/suggestions).

What is weak is not “missing pages” alone — it is the **employee operating system**:

| Strength today | Weakness vs mature HRIS |
|----------------|-------------------------|
| Multi-tenant users + roles | No true **employee lifecycle** (hire → onboarding → tenure → exit) |
| Leave requests exist | Thin admin leave; no policy engine, calendar, or balance admin UX |
| Attendance tracker | Limited time/scheduling, shifts, exceptions, geo/policy |
| Payroll runs (KE) | Comp not fully driven by HR master data / benefits / deductions config |
| Recruitment ATS | Weak **offer → hire → employee record** handoff |
| KPI / Performance models | Broken admin KPI page; manager performance stub; no review cycle UX |
| Contracts & alerts | Not a full document / e-sign / policy library |
| Engagement features | Sit beside HR core instead of feeding retention analytics |

**Verdict:** Treat Employee Management as a **rebuild of the HR core around people**, then wire existing modules (leave, attendance, payroll, ATS, performance) into that core — rather than adding more disconnected admin pages.

---

## 2. Comparison baseline (what good HR systems do)

Mature HR systems usually organize around these pillars:

```
Talent acquisition → Hire / onboard → Employee master
        ↓                                    ↓
   Time & attendance ←→ Leave & holidays ←→ Org & roles
        ↓                                    ↓
   Performance & L&D ←→ Engagement ←→ Documents & compliance
        ↓
   Compensation & payroll → Offboarding / alumni
```

| Pillar | Typical capabilities (BambooHR / Zoho / Sage / SeamlessHR class) | Elevate today |
|--------|------------------------------------------------------------------|---------------|
| **Employee master / directory** | Profile, org chart, reporting line, job history, docs, emergency contacts, custom fields | `User` record only; Manage Users is account-centric |
| **Lifecycle** | Pre-boarding checklist, onboarding tasks, probation, transfer, promotion, offboarding | Invite + company setup CSV; no hire journey / exit |
| **Org structure** | Departments, cost centres, locations, positions, headcount planning | Department/branch exist; no org chart / position mgmt UX |
| **Leave** | Policies, accruals, carry-over, team calendar, blackout, approvals workflow | Request + approve; balances model exists; little policy/admin UX |
| **Time** | Shifts, timesheets, overtime rules, clock exceptions, remote/geo | Daily attendance; limited scheduling/policy |
| **Payroll / comp** | Salary history, allowances, benefits, loans, statutory packs, bank files | Strong KE calc UI; deduction prefs partly local; rem reports under Accounts |
| **Performance** | Cycles, goals/OKRs, reviews, calibration, PIP | Models + allocations; `/admin/kpis` 404; manager performance stub |
| **L&D** | Courses, requests, budgets, certifications | `LearningRequest` model orphaned; PDP exists |
| **Recruitment** | ATS → offer → employee conversion | ATS solid; handoff to employee master incomplete |
| **Documents / compliance** | Contracts, policies, e-sign, expiry, audits | Contracts + alerts; not a full doc vault |
| **Analytics** | Headcount, attrition, leave liability, payroll cost, diversity | Reports hub is mostly links; job analytics stronger than people analytics |
| **Self-service** | ESS/MSS portals with clear nav | Employee/manager portals exist; leave missing from employee sidebar |

---

## 3. Current Elevate inventory (Employee Management focus)

### Present in admin nav (EMPLOYEE MANAGEMENT + related)

| Area | Route(s) | Maturity |
|------|----------|----------|
| Manage Users | `/admin/users` | Working, but “users” ≠ “employees” |
| Leave Requests | `/admin/leave` | Thin: list + approve/reject |
| Attendance Tracker | `/admin/attendance` | Working overview |
| Allocations | `/admin/allocations` | Tasks / KPI create / PDP assign |
| Payroll | `/admin/payroll` | Strong operational UI |
| Meetings | `/admin/meetings` | Feature-rich; separate from HR core |
| Resource Booking | `/admin/bookings` | Assets/rooms; adjacent |
| Suggestions / Badges / Polls | `/admin/suggestions`, `/badges`, `/polls` | Engagement |
| Contracts / Alerts | `/admin/contracts`, `/admin/alerts` | Compliance lite |
| KPI Configuration | `/admin/kpis` | **Broken nav (no page)** |
| 360° Feedback | `/admin/feedback-360` | Working |
| Analytics & Reports | `/admin/reports` | Hub / partial |
| Recruitment | `/admin/jobs`, `/applications`, … | Strong ATS |

### Backend assets underused by UI

- `LeaveBalance`, `Holiday` (+ Nager sync) — little first-class admin UX  
- `Performance`, `KPI` — incomplete admin/manager cycle UX  
- `LearningRequest` — **no routes/UI**  
- Employee leave page exists (`/employee/leave`) but **not in employee sidebar**

### Structural issue

People are modeled as **`User`** (login + role + sparse HR fields). There is no dedicated employee profile domain for:

- Employment status beyond `active | inactive | pending`  
- Employment type (permanent / contract / intern / casual)  
- Probation end, notice period, grade/band, work location  
- Emergency contacts, next of kin, dependents  
- Document attachments, ID copies, signed policies  
- Job history / salary history  
- Offboarding reason & last working day  

That single gap explains why the section “doesn’t feel well built” compared to HR suites: **HR workflows have nowhere coherent to live**.

---

## 4. Gap analysis by module (what to improve)

### 4.1 Employee directory & master data (P0)

**Compare to:** BambooHR “employee profile”, Zoho People “employee directory”, Sage HR “personnel file”.

**Improve:**

1. Introduce an **Employee profile** experience (can still use `User` underneath, but UX must be HR-first).
2. Expand master fields: employment type, grade, cost centre, work location, probation, contract end, emergency contacts, custom fields per org.
3. **Org chart** from `manager_id` + departments.
4. **Employee timeline**: hire, promotion, transfer, salary change, leave of absence, exit.
5. Split “Manage Users” (accounts/access) from “Employees” (people ops).

**Success look:** HR opens one employee and sees identity, job, compensation snapshot, leave balance, attendance last 30 days, open PDP, contracts, documents — without jumping seven menus.

---

### 4.2 Hire → onboarding → offboarding (P0)

**Compare to:** BambooHR onboarding checklists, Workday hire events, SeamlessHR employee lifecycle.

**Improve:**

1. **ATS → hire**: from Application “hired”, create employee + invite + prefill job/dept/salary offer.
2. **Onboarding checklist** templates (IT, HR, manager tasks) with due dates and status.
3. **Probation** tracking + review reminder.
4. **Offboarding**: last day, asset return (tie to Resource Registry), access revoke, final pay flag, exit interview / reason codes.
5. Status model beyond active/inactive: `preboarding | probation | active | leave_of_absence | notice | terminated | alumni`.

---

### 4.3 Leave & time-off (P0)

**Compare to:** BambooHR time-off, Zoho leave tracker, Kenya suites with annual leave accrual.

**Current:** Approve/reject inbox; balances exist in DB; holidays sync in backend.

**Improve:**

1. Admin **Leave policies**: types, entitlements, accrual rules, carry-over, gender-specific types, unpaid rules.
2. **Balance admin UI**: view/adjust per employee/year with audit log.
3. **Team leave calendar** (manager + HR) with conflict visibility.
4. Multi-step **approval workflow** (manager → HR) with delegation.
5. Public **holiday calendar** admin page (use existing `Holiday` API).
6. Employee sidebar: add **My Leave**; show remaining days prominently.
7. Leave liability / utilization report for payroll & finance.

---

### 4.4 Attendance & time (P1)

**Compare to:** Zoho People attendance, Sage time, shift systems.

**Improve:**

1. Shifts / work schedules (Mon–Fri 8–5 vs rostered).
2. Overtime & late/absent rules feeding payroll or exceptions queue.
3. Manager exception approval (forgot clock-out, remote day).
4. Optional geo / IP policy (even if Phase 2).
5. Attendance → performance score automation (model already has `attendance_score`).
6. Monthly timesheet export for payroll.

---

### 4.5 Payroll & compensation (P1)

**Compare to:** Sage Payroll, Soft HR Kenya, SeamlessHR payroll.

**Current strength:** PAYE/NSSF/SHA style runs and employee bank/statutory fields.

**Improve:**

1. Move deduction/allowance **configuration out of `localStorage`** into org settings (server of truth).
2. **Salary history** and effective-dated changes (not a single `salary` number).
3. Recurring allowances / loans / advances linked to employee.
4. Benefits enrollment lite (medical, pension extras) if needed for KE SMEs.
5. Closer link: attendance exceptions + unpaid leave → pay run adjustments.
6. Clear HR vs Accounts ownership: HR owns people/comp inputs; Accounts owns journals (you already lean this way with remuneration reports).

---

### 4.6 Performance management (P0 for product promise)

**Compare to:** Lattice/15Five lite, BambooHR performance, Zoho appraisals.

**Current:** KPI/Performance models; Allocations can create KPIs; 360 works; **`/admin/kpis` is a dead link**; manager performance is stubbed.

**Improve:**

1. Fix or replace `/admin/kpis` with a real **Goals / KPI library** page.
2. **Review cycles**: define period → assign goals → self-score → manager review → calibrate → close.
3. Manager UI that uses live team data (kill hardcoded stub).
4. Connect PDP + LearningRequest into one L&D tab on the employee profile.
5. Implement or delete `LearningRequest` (orphan model hurts coherence).
6. Separate **Field sales Performance** (`/admin/field-management/performance`) naming from HR performance to avoid confusion.

---

### 4.7 Recruitment ↔ HR handoff (P1)

**Compare to:** Greenhouse/Lever → BambooHR; Zoho Recruit → People.

**Improve:**

1. “Mark hired” wizard: create User/Employee, set start date, send invite, seed onboarding checklist.
2. Store offer letter against employee documents.
3. Pipeline analytics already exist — add **time-to-hire → retention** join after 90 days.

---

### 4.8 Documents, contracts, compliance (P1)

**Compare to:** BambooHR files, DocuSign-ish e-sign flows in Zoho.

**Improve:**

1. Employee **document vault** (IDs, certificates, signed handbook).
2. Contract templates + renewal workflow (you have expiry alerts — extend).
3. Policy acknowledgment (employee must accept handbook version).
4. Audit trail for sensitive HR actions (salary change, termination, balance adjust).

---

### 4.9 Analytics & HR command center (P1)

**Compare to:** BambooHR reporting, Workday people analytics lite.

**Improve admin home / reports with:**

- Headcount by dept / location / employment type  
- Joiners / leavers (period)  
- Leave utilization & outstanding liability  
- Attendance exception rate  
- Payroll cost trend (link Accounts remuneration)  
- Open probation / contract renewals due  
- Performance cycle completion %  

Replace “link hub” reports with a few **opinionated HR dashboards**.

---

### 4.10 Information architecture & UX (P0)

The sidebar mixes deep HR ops with engagement and meetings as peers of Leave/Payroll. Mature systems nest differently:

**Suggested IA**

```
People
  ├── Employees (directory + profiles)
  ├── Org chart
  ├── Onboarding / Offboarding
  └── Documents

Time
  ├── Attendance
  ├── Leave & holidays
  └── Schedules (later)

Pay
  ├── Compensation
  ├── Payroll runs
  └── Statutory / bank exports

Talent
  ├── Jobs & applications (ATS)
  ├── Performance & KPIs
  ├── 360 feedback
  └── Learning / PDPs

Engage (secondary)
  ├── Meetings
  ├── Bookings
  ├── Badges / Polls / Suggestions
  └── Alerts
```

Also:

- Add Leave to **employee** sidebar.  
- Role-gate HR menus cleanly for `hr` vs `company_admin`.  
- Manager portal: leave, attendance exceptions, performance reviews as first-class — not stubs.

---

## 5. What *not* to copy blindly

| Enterprise feature | Guidance for Elevate |
|--------------------|----------------------|
| Full Workday-style position management | Overkill early; start with job title + grade + dept |
| Complex benefits carriers | Only if customers ask; KE SMEs often need statutory + simple allowances |
| Heavy LMS | Start by activating LearningRequest + PDP; don’t build Coursera |
| Biometric hardware | Abstract attendance sources; don’t hard-bind hardware first |
| Global multi-country payroll packs | Double down on **Kenya excellence**, then expand |

Elevate’s differentiator can remain: **performance + PDP + 360 + meetings** on top of a cleaned HR core — not becoming a clone of Workday.

---

## 6. Recommended roadmap

### Phase A — Make HR feel real (2–4 weeks of focused product work)

1. Employee directory + richer profile (even if still `User`-backed).  
2. Fix dead `/admin/kpis` or remove nav until ready.  
3. Leave: balances UI + holiday calendar + employee nav link.  
4. ATS “Hire” → create employee + invite.  
5. Kill/replace manager performance stub with real team scores or hide it.

### Phase B — Lifecycle & time (next)

1. Onboarding checklists + probation.  
2. Offboarding + asset return hooks.  
3. Leave policies & accruals.  
4. Attendance exceptions → payroll notes.

### Phase C — Performance & pay depth

1. Review cycles end-to-end.  
2. Server-side payroll/deduction config.  
3. Salary history + effective dating.  
4. LearningRequest UI or remove model.

### Phase D — Insights

1. HR dashboards (headcount, attrition, leave liability).  
2. Audit logs for sensitive actions.  
3. Document vault + policy acknowledgments.

---

## 7. Success criteria (definition of “well built”)

Employee Management is “well built” when:

1. An HR officer can run **hire → onboard → leave → attend → pay → review → exit** without leaving the People domain or hitting 404s/stubs.  
2. Every employee has one **profile home** that aggregates the modules you already built.  
3. Admin Leave/Attendance/Payroll/Performance are **policy-driven**, not only transactional inboxes.  
4. Manager and employee self-service surfaces match admin capabilities (no orphan pages).  
5. Engagement tools (polls, badges, meetings) are clearly **secondary**, not competing with core HR IA.

---

## 8. Related internal docs

| Doc | Path |
|-----|------|
| System overview | `DOCUMENTATIONS/SYSTEM_DOCUMENTATION.md` |
| Repo / API map | `DOCUMENTATIONS/REPO_UNDERSTANDING.md` |
| Company onboarding (not employee) | `DOCUMENTATIONS/ONBOARDING_FLOW.md` |
| ATS | `DOCUMENTATIONS/VACANCY.MD` |
| PDP | `DOCUMENTATIONS/pdp.md` |
| 360 | `DOCUMENTATIONS/FEEDBACK_360_CUSTOM_PARTICIPANTS.md` |
| Alerts | `DOCUMENTATIONS/ALERTS_SYSTEM.md` |

---

## 10. Implementation status (Aug 2026)

Phase A items from this guide have been implemented in code:

| Item | Status | Where |
|------|--------|--------|
| Employee directory + profile | Done | `/admin/employees`, `/admin/employees/[userId]` |
| Richer employment fields on User | Done | status lifecycle, employmentType, grade, workLocation, probation, emergency contact, offboarding |
| Leave balances + calendar + holidays | Done | `/admin/leave` tabs |
| Employee “My Leave” nav | Done | Employee sidebar |
| KPI Configuration page | Done | `/admin/kpis` |
| ATS Hire → employee + onboarding | Done | Applications **Hire** → `/api/job-applications/:id/hire` |
| Onboarding checklists | Done | `/admin/onboarding` + API `/api/onboarding` |
| Manager performance (live team) | Done | `/manager/performance` |

Still later (Phase B/C): full leave accrual policies, salary history, document vault, deep HR analytics, LearningRequest UI.
