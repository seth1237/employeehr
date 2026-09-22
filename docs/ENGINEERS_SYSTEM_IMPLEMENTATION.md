# Engineers System — Implementation Guide

This document is the build plan for a full engineering / CMMS layer on Elevate, starting from the current Service Engineer portal. It maps each requested module to **what already exists**, **what to extend**, and **what to add**, with suggested models, APIs, screens, and delivery order.

Do not create a second, parallel “engineering app”. The ERP already has the spine: installed machines, machine services, CRM tickets, complaints, stock inventory, service jobs, warranties, and service-contract files. The work is to turn those into one engineer-facing system with clear work orders, stock usage, calibration, and KPIs.

---

## 1. Where we left it

The engineer portal is gated to `technical_service_engineer` (`/engineer`, `middleware.ts`, `app/engineer/layout.tsx`).

| Screen | Path | Reality today |
|--------|------|----------------|
| Dashboard | `/engineer` | Counts of installed machines + pending `MachineService` rows. Thin. |
| Machine database | `/engineer/machines` | Reuses admin Installed Machines (`isEngineerView`). Register, services, tickets, service-contract upload. |
| Pending services | `/engineer/services` | Lists open `MachineService`; “Mark complete” only. |
| Assigned duties | `/engineer/duties` | Same collection, filtered by `technicianId`. |
| Planner | `/engineer/planner` | Embeds the **sales** planner. Wrong domain. |
| Calendar | `/engineer/calendar` | Exists; not in the sidebar. Sales-style meetings. |
| Expenses | `/engineer/expenses` | Placeholder. Accounts already has `StockExpenseClaim`. |

**Admin-side pieces engineers will keep using (or that we will promote into the portal):**

- `InstalledMachine` — client equipment register (serial, location, warranty, next service, photo, **service contract file**).
- `MachineService` — scheduled / completed field jobs (`serviceType`, dates, technician, cost, notes). Status is derived: pending / due / coming-soon / done.
- `Ticket` — client fault / call tickets (`assignedTechnician_id`, machine, schedule, escalate to quotation).
- `ClientComplaint` — commercial complaints, including `technical_problems` and `warranty_claims`.
- `StockProduct` + warehouse locations — sellable stock (can become spare parts).
- `StockService` / `StockServiceJob` — sellable service SKUs and recurring billed jobs (sales/ops, not technician job cards).
- Expense claims — `/admin/accounts/expenses`.

**Problem:** three overlapping “job” concepts (`MachineService`, `Ticket`, `StockServiceJob`) and no first-class work order, spare-part consumption, calibration, utilities, or engineer roster.

---

## 2. Target shape

Treat engineering as a **CMMS on top of Installed Machines**, with two asset classes:

1. **Client equipment** (already in `InstalledMachine`) — machines sold/installed at facilities. This is the primary track.
2. **Infrastructure / internal assets** (new, later) — generators, HVAC, oxygen, water, workshop tools. Same work-order engine; different asset type.

Canonical job object becomes the **Work Order** (job card). Incoming faults become **Service Requests**. Maintenance plans generate work orders. Spare parts are issued against work orders. Calibration is a maintenance plan type. Vendors/contracts hang off assets. Reports read work orders + parts + downtime.

```
Service request / PM schedule / complaint / ticket
                    │
                    ▼
              Work order (job card)
           ┌────────┼────────┐
           ▼        ▼        ▼
        Asset    Technician  Spare parts
           │
           ├── Calibration record
           ├── Service contract / AMC
           └── Downtime event
```

---

## 3. Build principles

1. **One job card.** Extend `MachineService` into a work order (or wrap it). Stop creating a fourth job model.
2. **Tickets and complaints stay intake**, not the job itself. Open ticket → create / link work order.
3. **Spare parts are stock**, not a new inventory product. Tag products `engineeringSpare: true` (or a parts category) and issue qty from WMS/locations onto the work order.
4. **Engineer portal is the field UI**; admin keeps configuration, inventory, vendors, and analytics.
5. **Reuse expense claims** for field costs instead of a new expenses module.
6. **Org-scoped** (`org_id`) like every other Elevate collection.

---

## 4. Module-by-module plan

### 1. Asset & Equipment Register — Critical

**Purpose:** Master list of equipment (and later infrastructure).

**Reuse**

- `InstalledMachine` + `/engineer/machines` + admin Installed Machines.
- Fields already useful: serial, category, client, installation location/department, status (`active` | `maintenance` | `ended` | `installation_pending`), warranty, photo, service contract, next service date.
- Search, year filter, bulk CSV, manual add.

**Add**

| Field / concept | Why |
|-----------------|-----|
| `assetTag` | Internal tag (e.g. EQ-00412), unique per org. |
| `manufacturer`, `model`, `commissionedDate` | Register completeness. |
| `assetClass` | `client_equipment` \| `infrastructure` \| `tool`. Default `client_equipment`. |
| `criticality` | A/B/C for PM priority. |
| `parentAssetId` | Generator → ATS, machine → accessories. |
| `status` expand | Add `decommissioned`, `in_workshop`, keep existing values. |
| History timeline | Install, services, tickets, parts, calibration, contract uploads. |

**Screens**

- Engineer: keep `/engineer/machines`; add asset tag search, filters (class, criticality, due PM, warranty expiry).
- Admin: same register; configuration for categories, criticality, custom fields if needed.

**API:** extend `GET/PATCH /api/stock/installed-machines`. New `GET /api/engineering/assets/:id/history`.

**Later (infrastructure):** same model with `assetClass: infrastructure`, `client` optional, `site` / `building` / `room` required. Do not split collections until volume forces it.

---

### 2. Maintenance Management — Critical

**Purpose:** Preventive (PM) and corrective maintenance.

**Reuse**

- `MachineService.scheduledDate` + `InstalledMachine.nextServiceDate`.
- Recurring *billing* already lives on `StockService.isRecurring` / `intervalDays` — that is sales, not PM.

**Add — `MaintenancePlan`**

```
org_id, assetId, name, type: preventive | inspection | calibration,
intervalDays | intervalHours | meterBased,
lastDoneAt, nextDueAt, leadTimeDays, defaultChecklistId,
defaultParts[], assignedTeam, active
```

A nightly (or on-read) job creates a **Work Order** when `nextDueAt <= today + leadTimeDays` and no open WO of that plan exists.

Corrective work is **not** a plan: it is a work order of type `corrective` created from a service request.

**Screens**

- Asset detail: “Maintenance plans” list + next due.
- Admin: plan templates by machine category (e.g. Infant Warmer → 90-day PM).
- Engineer dashboard: due / overdue PM count (already conceptually in admin “coming soon / due services”).

**API:** `/api/engineering/maintenance-plans` CRUD; scheduler in `server/src/jobs/` (same pattern as data-lake cron).

---

### 3. Work Orders / Job Cards — Critical

**Purpose:** Create, assign, track technician jobs. This is the core object.

**Reuse:** evolve `MachineService` rather than replace it.

**Extend `MachineService` (work order)**

| Field | Notes |
|-------|--------|
| `woNumber` | `WO-2026-00041`, unique per org. |
| `type` | `preventive` \| `corrective` \| `installation` \| `calibration` \| `inspection` \| `vendor` |
| `priority` | `low` \| `medium` \| `high` \| `urgent` |
| `status` | `draft` \| `open` \| `assigned` \| `in_progress` \| `on_hold` \| `waiting_parts` \| `completed` \| `cancelled` (keep deriving due/overdue from `scheduledDate` while status is open) |
| `assetId` | alias of `machineId` |
| `requestId` | originating service request / ticket |
| `planId` | originating PM plan |
| `technicianId` + helpers[] | already have technician |
| `startedAt`, `completedDate` | labour time |
| `checklist` | array of `{ item, done, note }` |
| `parts[]` | `{ productId, name, qty, storeLocationId }` |
| `downtimeMinutes` | for KPIs |
| `failureCode` / `causeCode` | optional taxonomy |
| `attachments[]` | photos, job card PDF |
| `cost` | labour + parts (already have cost) |

**Lifecycle**

1. Created from PM scheduler, service request, ticket, or engineer on site.
2. Assigned → engineer sees it on `/engineer/work-orders` (replace thin Pending Services + Duties).
3. Start (GPS/time optional), log work, consume parts, complete checklist, attach photos.
4. Complete → update asset `nextServiceDate` (already does this), decrement stock, optionally invoice (already can create a service invoice).

**Screens**

- `/engineer/work-orders` — kanban or filters: mine / unassigned / waiting parts / overdue.
- `/engineer/work-orders/[id]` — job card: asset, request, checklist, parts, time, complete.
- Admin: assignment board, SLA, reassign.

**Deprecate as separate UIs:** `/engineer/services` and `/engineer/duties` become views of the same work orders.

**API:** keep `/api/stock/machine-services` for compatibility; add `/api/engineering/work-orders` as a richer facade that reads/writes the same collection.

---

### 4. Service Requests / Helpdesk — Critical

**Purpose:** Departments / clients report faults.

**Reuse — do not invent a third intake**

| Channel | Model | Use as |
|---------|--------|--------|
| Client call / “Raise ticket” on a machine | `Ticket` | Default helpdesk for field equipment. |
| Formal complaint | `ClientComplaint` (`technical_problems`) | Escalation / quality; link a work order, do not duplicate the job. |
| Internal / facility desk | **new** `ServiceRequest` | Only if non-client departments must log jobs (workshop, HQ, hospital biomedical desk). |

**Recommended v1:** Engineer Helpdesk = tickets scoped to machines + assigned technician.

**Add**

- Engineer screen `/engineer/requests` — open tickets assigned to me / unassigned.
- Convert ticket → work order (`Ticket.serviceId` already exists for a related service; point it at the WO `_id`).
- SLA clocks: `respondBy`, `resolveBy` from priority.
- Public or staff form later: “report a fault” with asset tag / serial.

**API:** existing `/api/crm/tickets`. Add `POST /api/engineering/requests/:id/convert-to-wo`.

---

### 5. Spare Parts & Inventory — Critical

**Purpose:** Engineering stock and usage on jobs.

**Reuse**

- `StockProduct` + categories + warehouse locations (`StockProductLocation`).
- Dispatch / WMS already moves stock.

**Add**

- Product flag or category `engineering` / `spare_part`.
- `WorkOrderPartIssue`: `{ woId, productId, qty, fromLocationId, issuedBy, issuedAt }` — posting should decrement location qty through the same stock-movement path used by dispatch (do not write qty in two places).
- Min/max and reorder alerts (stock already has low-stock alerts — reuse `alertController` with a parts filter).
- Job card UI: search parts, issue qty, return unused.
- Optional: bin / van stock as a warehouse location per engineer.

**Screens**

- `/engineer/parts` — search availability, scan (later), issues on my open WOs.
- Admin inventory: existing stock screens; filter “Engineering spares”.

**Rule:** never let the engineer type a free-text part as the system of record. Allow “non-stock item” as a cost line only.

---

### 6. Calibration & Compliance — Critical

**Purpose:** Calibration schedules and certificates (medical devices).

This is a **maintenance plan type** plus a certificate store — not a separate asset list.

**Add on asset / WO**

- Plan `type: calibration` with interval (e.g. 365 days) and tolerance.
- On complete: `CalibrationRecord` `{ assetId, woId, performedAt, dueNext, result: pass|fail|adjusted, certificateUrl, vendorId, standard }`.
- Certificate upload — same pattern as **service contract upload** (`POST .../service-contract`).
- Asset badge: In cal / Due / Overdue / Failed.
- Fail → auto corrective WO + optional quarantine status `in_workshop`.

**Screens**

- Asset detail: calibration history + current cert.
- `/engineer/calibration` — due this month.
- Admin: compliance export (CSV) for audits.

---

### 7. Utilities Monitoring — Important

**Purpose:** Power, generators, oxygen, water, HVAC.

Out of scope for v1 field CMMS. Implement only after infrastructure assets exist.

**v1 (manual):** infrastructure assets + meter-reading WOs (`type: inspection`) with readings `{ metric, value, unit, takenAt }`. Alerts if outside min/max.

**v2 (optional IoT):** ingest readings via `/api/engineering/telemetry` (device id → asset). Do not start here.

**Screens:** `/admin/engineering/utilities` dashboard (last reading, runtime hours, fuel). Engineer: log reading on the job card.

---

### 8. Vendor & Service Contracts — Important

**Purpose:** AMC, warranties, vendor visits.

**Reuse**

- `InstalledMachine.warrantyUntil`.
- Per-machine **service contract file** (just added).
- Suppliers in procurement.

**Add `VendorContract`**

```
org_id, vendorId, assetIds[] | category, type: amc | warranty | rental,
startDate, endDate, slaHours, visitsIncluded, visitsUsed,
documentUrl, cost, notes
```

- Warranty expiry already displayable; add a “warranty / AMC expiring 90 days” list.
- Vendor visit = work order `type: vendor` assigned to an external contact (or internal escort).
- When a WO is created on an asset under AMC, flag “do not invoice client — bill vendor / covered”.

**Screens:** asset detail (contracts + warranty); `/admin/engineering/contracts`. Engineer: read-only coverage banner on the job card.

---

### 9. Technician Management — Important

**Purpose:** Assignments, shifts, workload.

**Reuse**

- Users with `role: technical_service_engineer`.
- `technicianId` on services; assignment dropdown on admin Installed Machines.

**Add**

- Skills / trade tags on the user or a small `EngineerProfile` (`region`, `skills[]`, `vanLocationId`).
- Workload: count of open WOs by engineer (dashboard widget).
- Shifts: optional `EngineerShift` `{ userId, date, window }`. v1 can skip shifts and use planner.
- **Replace** `/engineer/planner` (sales planner) with an engineering calendar of **work orders + PM due dates**. Keep `/engineer/calendar` only if meetings are still needed; otherwise hide it.

**Screens**

- Admin: `/admin/engineering/technicians` — roster, open jobs, skills.
- Engineer: my week (work orders on a calendar).

---

### 10. Reports & Analytics — Important

**Purpose:** Downtime, maintenance cost, KPIs.

**Reuse**

- Admin services analytics (`getServicesAnalyticsSummary`) currently reads **`StockServiceJob`**, not field `MachineService`. That is a trap — engineer KPIs must query work orders.

**v1 KPIs (from work orders + parts issues)**

| KPI | Definition |
|-----|------------|
| Open / overdue WOs | status not completed, `scheduledDate < today` |
| MTTR | avg `completedAt - startedAt` (or createdAt) for corrective |
| MTBF | avg time between corrective WOs per asset |
| PM compliance | PM WOs completed on/before due / PM WOs due |
| Downtime hours | sum `downtimeMinutes` |
| Cost | labour `cost` + issued parts value |
| Workload | WOs per technician |

**Screens**

- `/engineer` — personal: my overdue, due today, waiting parts.
- `/admin/engineering/reports` — org KPIs, by category, by engineer, by client.
- Export CSV. Charts can follow the stock analytics layout.

---

## 5. Suggested data model (new vs extend)

```
InstalledMachine          EXTEND   assetTag, assetClass, criticality, manufacturer, model
MachineService            EXTEND   woNumber, type, status, priority, checklist, parts[],
                                   requestId, planId, downtimeMinutes, attachments
MaintenancePlan           NEW
CalibrationRecord         NEW
VendorContract            NEW      (warrantyUntil remains on asset)
WorkOrderPartIssue        NEW      or embed parts[] + stock movement id
EngineerProfile           NEW      optional
ServiceRequest            NEW      only if Ticket is insufficient
UtilityReading            NEW      phase 3
```

Keep using: `Ticket`, `ClientComplaint`, `StockProduct`, `StockExpenseClaim`, `User`.

---

## 6. Portal information architecture

**Engineer (`/engineer`)**

| Nav | Module |
|-----|--------|
| Dashboard | 10 (personal KPIs) |
| Assets | 1 |
| Requests | 4 |
| Work orders | 2 + 3 (and 6 due-cal as a filter) |
| Parts | 5 |
| Calendar | 9 |
| Expenses | reuse claims (`source: engineer` / link `woId`) |

Drop or merge: Pending Services, Assigned Duties, Sales Planner.

**Admin (`/admin/engineering` or under Clients)**

- Assets (existing Installed Machines)
- Plans & checklists
- Work order board
- Contracts / vendors
- Technicians
- Reports
- Utilities (later)

---

## 7. Delivery phases

### Phase A — Make the current portal a real job system (do this first)

1. Promote `MachineService` to a work order (number, status, type, priority, start/complete, notes, photos).
2. Engineer **Work orders** page replacing Services + Duties.
3. Ticket → work order link; Requests inbox.
4. Dashboard: my open / overdue / due today.
5. Expenses: wrap existing claims + optional `woId`.
6. Engineering calendar of work orders (remove sales planner).

Outcome: engineers can run the day from `/engineer` without the admin machines page.

### Phase B — PM, parts, calibration, contracts

1. `MaintenancePlan` + scheduler → auto WOs.
2. Parts issue from stock onto WO.
3. Calibration records + certificate upload (mirror service-contract upload).
4. `VendorContract` + warranty/AMC banner on the job card.
5. Asset tag / criticality / manufacturer on the register.

### Phase C — Roster, reports, infrastructure, utilities

1. Engineer profiles, workload, optional shifts.
2. KPI dashboard (MTTR, PM compliance, cost, downtime).
3. `assetClass: infrastructure` + meter readings.
4. Utilities dashboard if a client needs it.

---

## 8. File map (when building)

```
server/src/models/MaintenancePlan.ts
server/src/models/CalibrationRecord.ts
server/src/models/VendorContract.ts
server/src/controllers/engineeringController.ts
server/src/routes/engineering.routes.ts
server/src/jobs/maintenanceScheduler.ts

app/engineer/work-orders/page.tsx
app/engineer/work-orders/[id]/page.tsx
app/engineer/requests/page.tsx
app/engineer/parts/page.tsx
app/engineer/page.tsx                    (replace thin dashboard)

app/admin/engineering/plans/page.tsx
app/admin/engineering/reports/page.tsx
app/admin/engineering/contracts/page.tsx
app/admin/engineering/technicians/page.tsx

components/engineer/sidebar.tsx          (nav)
lib/api.ts                               (engineeringApi)
```

Extend in place: `server/src/models/MachineService.ts`, `InstalledMachine.ts`, `machineServiceController.ts`.

---

## 9. Decisions to lock before coding Phase A

1. **Intake:** tickets only vs tickets + new `ServiceRequest`. Recommendation: tickets only until an internal desk is required.
2. **Stock posting:** issue parts through existing WMS movement vs a side counter. Recommendation: real stock movement so inventory stays true.
3. **Invoicing:** auto service invoice on WO complete (already sketched in `createServiceInvoice`) vs AMC-covered / no charge. Needs a coverage flag from contracts.
4. **Who assigns jobs:** admin only vs engineers can pull unassigned WOs. Recommendation: pull + admin assign.
5. **Infrastructure assets:** same `InstalledMachine` collection vs separate. Recommendation: same collection + `assetClass`.

---

## 10. Success criteria

The engineers system is “fully built” when:

- Every asset has a register record, warranty/contract, and (if applicable) PM/calibration due dates.
- Every fault becomes a request that becomes a tracked work order with an owner and status.
- Completing a job records labour, parts (stock decremented), and attachments.
- Dashboard answers: what is due today, what is overdue, who is overloaded, what it cost, what is out of calibration.
- The sales planner is no longer the engineer’s calendar.

Phase A is enough to run field service. Phases B and C complete the ten-module list above.
