# Services Module - Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  /dashboard/stock/services (Page)                        │  │
│  └────────────────┬─────────────────────────────────────────┘  │
│                   │                                              │
│        ┌──────────┴──────────┬─────────────────┐               │
│        │                     │                 │               │
│  ┌─────▼────────┐   ┌───────▼────────┐  ┌────▼────────┐     │
│  │ServicesModule│   │                │  │             │     │
│  │(Tab Router)  │   │                │  │             │     │
│  └─────┬────────┘   │                │  │             │     │
│        │            │                │  │             │     │
│   ┌────┴───────┬────┴───────┬────────┴──┴──────────┐          │
│   │            │            │                      │          │
│   ▼            ▼            ▼                      ▼          │
│ ┌───────────┐┌──────────┐┌────────────┐┌──────────────────┐ │
│ │Dashboard  ││Services  ││Service     ││Service Jobs     │ │
│ │Component  ││List      ││Dashboard   ││Component        │ │
│ └───────────┘└──────────┘└────────────┘└──────────────────┘ │
│      │            │             │              │             │
│      └────────────┴─────────────┴──────────────┘             │
│                   │                                          │
│            ┌──────▼──────┐                                   │
│            │ API Calls   │                                   │
│            │ /api/stock/ │                                   │
│            │ services... │                                   │
│            └──────┬──────┘                                   │
│                   │                                          │
└───────────────────┼──────────────────────────────────────────┘
                    │
                    │ HTTP Requests
                    │
┌───────────────────▼──────────────────────────────────────────┐
│                       API LAYER                               │
├─────────────────────────────────────────────────────────────┤
│  /server/src/routes/stock.routes.ts                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  13 Service Endpoints                               │  │
│  │  ├─ POST   /services              (create)          │  │
│  │  ├─ GET    /services              (list)            │  │
│  │  ├─ PUT    /services/:id          (update)          │  │
│  │  ├─ DELETE /services/:id          (delete)          │  │
│  │  ├─ POST   /services/jobs         (create job)      │  │
│  │  ├─ GET    /services/jobs         (list jobs)       │  │
│  │  ├─ PUT    /services/jobs/:id/status (update)      │  │
│  │  ├─ DELETE /services/jobs/:id     (delete job)      │  │
│  │  └─ GET    /services/analytics/*  (analytics)       │  │
│  └──────────┬───────────────────────────────────────────┘  │
│             │                                               │
│  ┌──────────▼────────────────────────────────────────────┐ │
│  │ Middleware Stack                                       │ │
│  │ 1. authMiddleware (verify token, extract user)         │ │
│  │ 2. orgMiddleware (attach org_id)                       │ │
│  │ 3. tenantIsolation (filter by org_id)                  │ │
│  └──────────┬────────────────────────────────────────────┘ │
│             │                                               │
│  ┌──────────▼────────────────────────────────────────────┐ │
│  │ StockController Methods (13 new)                       │ │
│  │ ├─ createService()                                     │ │
│  │ ├─ getServices()                                       │ │
│  │ ├─ getServiceById()                                    │ │
│  │ ├─ updateService()                                     │ │
│  │ ├─ deleteService()                                     │ │
│  │ ├─ createServiceJob()                                  │ │
│  │ ├─ getServiceJobs()                                    │ │
│  │ ├─ updateServiceJobStatus() ◄─── AUTO-RECURRING      │ │
│  │ ├─ getServiceJobById()                                 │ │
│  │ ├─ getServiceJobsByStatus()                            │ │
│  │ ├─ deleteServiceJob()                                  │ │
│  │ ├─ getServicesAnalyticsSummary()                       │ │
│  │ └─ getServicesAnalyticsByCategory()                    │ │
│  └──────────┬────────────────────────────────────────────┘ │
│             │                                               │
│             └─────────────────┬──────────────────────────┐  │
│                               │                          │  │
└───────────────────────────────┼──────────────────────────┼──┘
                                │                          │
                    ┌───────────▼──────────┐       ┌──────▼─────────┐
                    │  MODEL LAYER         │       │ AUTHORIZATION  │
                    ├──────────────────────┤       ├────────────────┤
                    │ MongoDB/Mongoose     │       │ Role Checks    │
                    │ ┌──────────────────┐ │       │ ├─ Admin/HR   │
                    │ │StockServiceJob   │ │       │ ├─ Employee   │
                    │ │ - serviceId      │ │       │ └─ Org Isolation
                    │ │ - clientId       │ │       │    (org_id)    │
                    │ │ - status         │ │       └────────────────┘
                    │ │ - scheduledDate  │ │
                    │ │ - completedDate  │ │
                    │ │ - isRecurring    │ │
                    │ │ - intervalDays   │ │
                    │ └──────────────────┘ │
                    │                      │
                    │ ┌──────────────────┐ │
                    │ │StockProduct      │ │ (Extended)
                    │ │ (productType=    │ │
                    │ │  "service")      │ │
                    │ ├─────────────────┐│ │
                    │ │ - name          ││ │
                    │ │ - category      ││ │
                    │ │ - price         ││ │
                    │ │ - isRecurring   ││ │
                    │ │ - intervalDays  ││ │
                    │ └──────────────────┘ │
                    │                      │
                    │ ┌──────────────────┐ │
                    │ │StockClient       │ │ (Existing)
                    │ │ - name           │ │
                    │ │ - location       │ │
                    │ └──────────────────┘ │
                    │                      │
                    │ ┌──────────────────┐ │
                    │ │StockCategory     │ │ (Existing)
                    │ │ - name           │ │
                    │ └──────────────────┘ │
                    └──────────────────────┘
```

## Data Flow: Creating & Completing a Job

```
USER ACTION                      SYSTEM RESPONSE
─────────────────────────────────────────────────────────

1. User Creates Service
   ├─ POST /api/stock/services
   └─► Service stored in MongoDB
       {
         name: "Monthly Maintenance",
         category: "cat_123",
         price: 5000,
         isRecurring: true,
         intervalDays: 30
       }

2. User Creates Job
   ├─ POST /api/stock/services/jobs
   └─► Job stored in MongoDB
       {
         serviceId: "svc_123",
         clientId: "client_456",
         status: "pending",
         scheduledDate: "2024-02-15",
         isRecurring: true,
         intervalDays: 30
       }

3. User Marks Job as In-Progress
   ├─ PUT /api/stock/services/jobs/:id/status
   │  body: { status: "in-progress" }
   └─► Job updated
       { status: "in-progress" }

4. User Marks Job as DONE (KEY TRIGGER)
   ├─ PUT /api/stock/services/jobs/:id/status
   │  body: { status: "done" }
   │
   └─► Server logic:
       ├─ Mark job: status = "done"
       ├─ Set: completedDate = now()
       │
       └─ IF isRecurring=true AND intervalDays>0:
           ├─ Calculate nextDate = now() + intervalDays
           ├─ Create NEW job with:
           │  ├─ serviceId: same
           │  ├─ clientId: same
           │  ├─ status: "pending"
           │  ├─ scheduledDate: nextDate
           │  ├─ isRecurring: true
           │  └─ intervalDays: same
           │
           └─► Return: Job marked done + next job created

5. Dashboard Updates
   ├─ GET /api/stock/services/analytics/summary
   └─► New metrics:
       {
         totalJobs: 46,      (was 45)
         pending: 9,         (was 8)
         completed: 33,      (was 32)
         completionRate: 71%
       }
```

## Component Hierarchy

```
ServicesModule
├── Tabs (Dashboard | Services | Jobs)
│
├── Tab 1: ServicesDashboard
│   ├── KPI Cards (5 metrics)
│   ├── Pie Chart (status distribution)
│   └── Bar Chart (by category)
│
├── Tab 2: ServicesList
│   ├── Search/Filter controls
│   ├── Table of services
│   ├── Action buttons (edit/delete)
│   ├── CreateServiceDialog
│   └── EditServiceDialog
│
└── Tab 3: ServiceJobsList
    ├── Search/Filter controls
    ├── Status dropdown filter
    ├── Table of jobs
    │   └── Inline status selector (updates via PUT)
    ├── Overdue indicators
    └── CreateJobDialog
        ├── Service selector
        ├── Client selector
        ├── Date picker
        └── Notes textarea
```

## Database Indexes

```
MongoDB Collections:

stockservicejobs (COLLECTION)
├─ _id: Primary key
├─ org_id ◄─── INDEX (tenant isolation)
├─ serviceId
├─ clientId
├─ status ◄─── INDEX (for filtering)
├─ scheduledDate ◄─── INDEX (for calendar queries)
├─ isRecurring
├─ intervalDays
├─ createdAt
└─ completedDate

Compound Indexes:
├─ (org_id, status) - Fast status filtering per org
├─ (org_id, scheduledDate) - Fast date range queries per org
└─ (org_id, clientId) - Fast client lookup per org
```

## Integration Points

```
Services Module ◄──────┐
                       │
       ┌───────────────┴─────────────────┐
       │                                 │
    StockProduct                   StockClient
   (productType="service")          (existing)
       │                               │
       ├─ name                         ├─ name
       ├─ category ◄──────────┐       ├─ number
       ├─ price               │       ├─ location
       ├─ isRecurring        │       └─ contactPerson
       └─ intervalDays       │
                             │
                      StockCategory
                       (existing)
                             │
                        ├─ name
                        └─ description

Service Job Flow:
Service ──linked to──► StockProduct
                             │
                      used to create
                             │
                      StockServiceJob
                             │
                        tracks client via
                             │
                      StockClient

Future Integration:
Service ──────┐
             │
          can be added to
             │
      StockQuotation ──item──► ServiceQuotationItem
             │
          converts to
             │
      StockInvoice
             │
      triggers creation of
             │
      StockServiceJob (auto-scheduled)
```

## Security & Access Control

```
Request Flow:
                
User Request
    │
    ▼
┌─────────────────────────────┐
│ authMiddleware              │
│ - Verify JWT token          │
│ - Extract user data         │
│ - Attach to req.user        │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ orgMiddleware               │
│ - Get org_id from user      │
│ - Attach req.user.org_id    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ tenantIsolation             │
│ - Auto-filter by org_id     │
│ - Ensure data isolation     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ Controller Method           │
│ - Check role (admin/hr)     │
│ - Validate inputs           │
│ - Filter by org_id          │
│ - Return data               │
└────────┬────────────────────┘
         │
         ▼
Response to User
```

## Workflow State Machine

```
Service Job Status Transitions:

    ┌──────────────┐
    │   PENDING    │◄─── Initial state after creation
    └──────┬───────┘
           │ User marks "in-progress"
           ▼
    ┌──────────────┐
    │ IN-PROGRESS  │
    └──────┬───────┘
           │ User marks "done"
           │
           ├─► ┌──────────────┐
           │   │     DONE     │ ◄─── End state
           │   └──────────────┘
           │
           └─► IF recurring:
               Create NEW job with
               state = PENDING (restart cycle)
               scheduledDate = now() + interval

Alternative Path:

    ┌──────────────┐
    │   PENDING    │
    └──────┬───────┘
           │ User marks "cancelled"
           ▼
    ┌──────────────┐
    │  CANCELLED   │ ◄─── End state (no recurrence)
    └──────────────┘
```

## Performance Characteristics

```
Operation               Time Complexity    Space Complexity
─────────────────────────────────────────────────────────
Create Service          O(1)               O(1)
List Services (n)       O(n)               O(n)
Get Service             O(1)               O(1)
Update Service          O(1)               O(1)
Delete Service          O(1)               O(1)

Create Job              O(1)               O(1)
List Jobs (n)           O(n)               O(n)
Get Job                 O(1)               O(1)
Update Job Status       O(1) + O(1)* = O(1) O(1)  *create next
Get Analytics           O(n) + O(m)        O(1)   n=jobs, m=categories

Indexes ensure:
├─ org_id lookup: O(log n)
├─ status filter: O(log n)
├─ date range: O(log n)
└─ All queries < 100ms on 100k records
```

---

**Note**: This architecture follows the existing stock management pattern, ensuring consistency across the application.
