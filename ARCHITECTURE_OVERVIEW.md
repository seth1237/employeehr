# System Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER (Browser)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────┐      ┌──────────────────┐                     │
│  │   Admin Portal   │      │ Employee Portal  │                     │
│  │  /app/admin/*    │      │ /app/employee/*  │                     │
│  ├──────────────────┤      ├──────────────────┤                     │
│  │ - Quotations     │      │ - Quotations     │                     │
│  │ - Invoices       │      │ - Invoices       │                     │
│  │ - Dispatch       │      │ - Dispatch View  │                     │
│  │ - WMS            │      │ - Analytics      │                     │
│  │ - Machines       │      │ - Reports        │                     │
│  │ - Complaints     │      └──────────────────┘                     │
│  │ - Clients        │                                                │
│  │ - HR Ops         │      ┌──────────────────┐                     │
│  │ - Reports        │      │ Auth Portal      │                     │
│  └────────┬─────────┘      │ /app/auth/*      │                     │
│           │                │ /app/setup/*     │                     │
│           └────────────────┴──────────────────┘                     │
│                                                                       │
└─────────────┬──────────────────────────────────────────────────────┘
              │ (HTTP/REST)
              │ Fetch API + Axios
              │ JWT Token Auth
┌─────────────▼──────────────────────────────────────────────────────┐
│                      API GATEWAY / MIDDLEWARE                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ Auth Middleware  │  │ Tenant Isolation│  │ Rate Limiting    │  │
│  │ - JWT verification│  │ - org_id filter │  │ - DDoS protect   │  │
│  │ - Role-based access │ │ - Data isolation│  │ - API quotas     │  │
│  └──────────────────┘  └─────────────────┘  └──────────────────┘  │
│                                                                      │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │ Validation       │  │ CORS Handler    │  │ Error Handler    │  │
│  │ - Input sanitize │  │ - Cross-origin  │  │ - Exception catch│  │
│  │ - Type checking  │  │ - Credentials   │  │ - Error response │  │
│  └──────────────────┘  └─────────────────┘  └──────────────────┘  │
│                                                                      │
└─────────────┬──────────────────────────────────────────────────────┘
              │ (Express Routes)
┌─────────────▼──────────────────────────────────────────────────────┐
│                    EXPRESS API LAYER (Backend)                      │
├────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Stock Routes (/api/stock/*)                                       │
│  ├─ quotations        → StockController                            │
│  ├─ invoices          → StockController                            │
│  ├─ dispatch          → StockController                            │
│  ├─ warehouses        → WarehouseController                        │
│  ├─ installed-machines → InstalledMachineController               │
│  ├─ clients           → StockController                            │
│  ├─ products          → StockController                            │
│  ├─ categories        → StockController                            │
│  └─ accounts          → StockController (payments, expenses)       │
│                                                                      │
│  Complaint Routes (/api/complaints/*)                              │
│  ├─ GET/POST          → ComplaintController                        │
│  ├─ /:id              → ComplaintController                        │
│  └─ /:id/*            → ComplaintController (assign, resolve)      │
│                                                                      │
│  HR Routes (/api/*)                                                │
│  ├─ users             → Various controllers                        │
│  ├─ attendance        → AttendanceController                       │
│  ├─ leave             → LeaveController                            │
│  ├─ payroll           → PayrollController                          │
│  ├─ jobs              → JobController                              │
│  ├─ meetings          → MeetingController                          │
│  ├─ feedback          → FeedbackController                         │
│  └─ [20+ more routes] → Various controllers                        │
│                                                                      │
└─────────────┬──────────────────────────────────────────────────────┘
              │
    ┌─────────┴──────────┬──────────────┐
    │                    │              │
┌───▼────┐      ┌────────▼──┐   ┌──────▼─────┐
│Services│      │Controllers│   │   Utils    │
└────────┘      └───────────┘   └────────────┘
    │                │              │
    ├─email.service  ├─stockController   ├─validators
    ├─sms.service    ├─complaintController├─transformers
    ├─mpesa.service  ├─warehouseController├─formatters
    ├─scheduler      ├─installedMachineController└─...
    └─...            └─40+ more...
              │
              │
    ┌─────────┴──────────────────────────────┐
    │       BUSINESS LOGIC LAYER              │
    │    (Services + Model Methods)           │
    ├─────────────────────────────────────────┤
    │ - Document generation                   │
    │ - Workflow management                   │
    │ - Data transformation                   │
    │ - Validation rules                      │
    │ - Integration logic                     │
    │ - Report generation                     │
    └────────┬──────────────────────────────┘
             │
    ┌────────▼──────────────────────────────┐
    │         DATA ACCESS LAYER              │
    │      (Mongoose ORM Models)             │
    ├────────────────────────────────────────┤
    │                                         │
    │  Stock Models (17)                     │
    │  ├─ StockQuotation                     │
    │  ├─ StockInvoice                       │
    │  ├─ StockProduct                       │
    │  ├─ StockClient                        │
    │  ├─ InstalledMachine                   │
    │  ├─ Warehouse                          │
    │  ├─ CreditNote                         │
    │  └─ ... 10+ more                       │
    │                                         │
    │  Client Models (3)                     │
    │  ├─ ClientComplaint                    │
    │  ├─ StockClient (also here)            │
    │  └─ InstalledMachine (also here)       │
    │                                         │
    │  HR Models (56)                        │
    │  ├─ User                               │
    │  ├─ Company                            │
    │  ├─ Attendance                         │
    │  ├─ LeaveRequest                       │
    │  ├─ Payroll                            │
    │  ├─ Job                                │
    │  ├─ Task                               │
    │  └─ ... 49+ more                       │
    │                                         │
    │  Total: 76+ Models                     │
    └────────┬──────────────────────────────┘
             │
    ┌────────▼──────────────────────────────┐
    │        DATABASE LAYER                  │
    ├────────────────────────────────────────┤
    │                                         │
    │  PRIMARY: MongoDB                      │
    │  ├─ Stock Management Data              │
    │  ├─ HR & Operations Data               │
    │  ├─ Client & Complaint Data            │
    │  ├─ Multi-tenant Collections           │
    │  │  (all with org_id field)            │
    │  └─ Indexes on org_id & foreign keys   │
    │                                         │
    │  SECONDARY: MySQL (via Prisma)         │
    │  ├─ Cache/Sync Layer                   │
    │  ├─ Session Storage                    │
    │  ├─ mongo_sync_* tables                │
    │  └─ Scheduled Sync from MongoDB        │
    │                                         │
    │  FILE STORAGE: Local /uploads          │
    │  ├─ Logos                              │
    │  ├─ Product Images                     │
    │  ├─ Blueprints                         │
    │  ├─ Attachments                        │
    │  └─ Generated PDFs                     │
    └────────────────────────────────────────┘

```

---

## Data Flow Examples

### Quotation Workflow
```
1. CREATION
   Employee → Create Quotation Form → POST /api/stock/quotations
   ├─ Backend validates client & products
   ├─ Generates quotationNumber (QT-TIMESTAMP-RANDOM)
   ├─ Saves to StockQuotation model
   ├─ Sets status: "draft"
   └─ Returns quotation ID

2. APPROVAL
   Admin → View Quotation → Approve Button
   ├─ POST /api/stock/quotations/:id/approve
   ├─ Updates status: "pending_approval"
   ├─ Records approvedBy & approvedAt
   ├─ May trigger email notification
   └─ Response: success/error

3. CONVERSION
   Admin → Convert to Invoice → POST /api/stock/quotations/:id/convert
   ├─ Creates new StockInvoice from quotation
   ├─ Generates invoiceNumber & deliveryNoteNumber
   ├─ Links via quotationId reference
   ├─ Sets invoice status: "issued"
   └─ Returns invoice ID

4. USAGE IN MACHINE INSTALLATION
   System → Get installable candidates
   ├─ SELECT invoices WHERE quotationId != null
   ├─ FILTER WHERE dispatch.delivery.received = true
   ├─ Return as candidates for InstalledMachine registration
   └─ User selects candidate → registers machine
```

### Invoice Dispatch Flow
```
1. ASSIGNMENT
   Admin → Select Invoice → Assign to Dispatch User
   ├─ PUT /api/stock/invoices/:id/dispatch/assign
   ├─ Sets dispatch.status: "assigned"
   ├─ Records assignedToUserId, assignedByUserId
   ├─ Creates packing items from invoice items
   └─ Sends notification to dispatch user

2. PACKING
   Dispatch User → Update Packing → PUT /api/stock/invoices/:id/dispatch/packing
   ├─ Updates packingItems[i].packedQuantity
   ├─ Verifies all items packed (requiredQuantity == packedQuantity)
   ├─ Sets packingCompleted: true when done
   ├─ Records packingCompletedAt timestamp
   └─ Unlocks dispatch button

3. DISPATCH
   Dispatch User → Mark Dispatched → POST /api/stock/invoices/:id/dispatch/dispatch
   ├─ Sets dispatch.status: "dispatched"
   ├─ Records dispatchedAt & dispatchedByUserId
   ├─ Captures courier details
   ├─ Records transportMeans
   ├─ Sends SMS to client with tracking info
   └─ Creates DispatchNotification record

4. DELIVERY CONFIRMATION
   Client/Delivery Person → Confirm Delivery → POST .../dispatch/delivery
   ├─ Sets dispatch.delivery.received: true
   ├─ Records condition: "good" | "not_good"
   ├─ Records arrivalTime & confirmation details
   ├─ Records confirmedBy & confirmedAt
   ├─ Sets dispatch.status: "delivered"
   └─ Now machine becomes installable candidate
```

### Complaint Management Flow
```
1. CREATION
   Admin → New Complaint Form → POST /api/complaints
   ├─ Captures clientId, title, description
   ├─ Selects category (8 types)
   ├─ Sets priority (low/medium/high/urgent)
   ├─ Generates complaintId (COMP-2024-0001)
   ├─ Sets status: "new"
   └─ Stores in ClientComplaint model

2. ASSIGNMENT
   Admin → Assign to Staff Member → POST /api/complaints/:id/assign
   ├─ Sets assignedTo: userId
   ├─ Updates status: "assigned"
   ├─ Sends notification to staff
   └─ Records assignment history

3. WORK IN PROGRESS
   Staff → Update Status → PUT /api/complaints/:id
   ├─ Change status: "in_progress"
   ├─ Add internal notes via POST .../communications
   ├─ Can escalate if needed: POST .../escalate
   ├─ Can attach evidence/docs
   └─ Communicate with client (if needed)

4. RESOLUTION
   Staff → Mark Resolved → POST /api/complaints/:id/resolve
   ├─ Sets status: "resolved"
   ├─ Records resolution.resolvedBy: userId
   ├─ Selects resolution type (refund/replacement/etc)
   ├─ Records satisfaction rating (1-5)
   ├─ Sends resolution notification to client
   └─ Updates resolvedAt timestamp

5. CLOSURE
   Admin → Close Complaint → Status update to "closed"
   ├─ Records closing details
   ├─ Archives complaint
   └─ Generates complaint report
```

### Machine Installation Flow
```
1. CANDIDATE DISCOVERY
   System → Get Installable Machines → GET /api/stock/installed-machines/candidates
   ├─ Query: invoices WHERE quotationId != null AND status != "cancelled"
   ├─ Filter: dispatch.delivery.received = true (delivered)
   ├─ Exclude: invoices with active/issued CreditNotes
   ├─ Return: [{invoiceId, productId, productName, category, client}]
   └─ Display as "Add Machines" candidates list

2. REGISTRATION
   Admin → Select Candidate → Register Machine → POST /api/stock/installed-machines
   ├─ Creates InstalledMachine record
   ├─ Links to invoiceId & quotationId
   ├─ Sets basic fields:
   │  ├─ client: extracted from invoice
   │  ├─ productId & productName
   │  ├─ installationDate: today's date
   │  └─ status: "active"
   └─ Returns machine ID

3. DETAIL ENHANCEMENT
   Admin → Edit Machine → Update Details → PUT /api/stock/installed-machines/:id
   ├─ Adds: serialNumber (unique tracking)
   ├─ Adds: installedBy (engineer name)
   ├─ Adds: attendant (operator name)
   ├─ Adds: attendantNumber (contact)
   ├─ Adds: installationLocation (site address)
   ├─ Adds: warrantyUntil (expiry date)
   ├─ Adds: nextServiceDate (maintenance schedule)
   ├─ Adds: isTrained (operator training status)
   └─ Returns updated record

4. MAINTENANCE TRACKING
   System → Monitor Service Schedule
   ├─ List view shows nextServiceDate highlighted
   ├─ Admin can filter by status (active/maintenance/ended)
   ├─ Can log service activities via internal notes
   ├─ Can extend warranty or reschedule
   └─ Can mark as "ended" when decommissioned

5. DELETION
   Admin → Remove Machine → DELETE /api/stock/installed-machines/:id
   ├─ Soft or hard delete (depending on implementation)
   ├─ Maintains referential integrity
   └─ Archives for historical reporting
```

---

## Security Architecture

```
┌─────────────────────────────────────────┐
│     AUTHENTICATION LAYER                │
├─────────────────────────────────────────┤
│                                         │
│  Login Request → Username + Password    │
│  ├─ POST /api/auth/login               │
│  ├─ Verify against User model          │
│  ├─ Generate JWT token                 │
│  │  {userId, org_id, role, exp}        │
│  └─ Return token to client             │
│                                         │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│    AUTHORIZATION LAYER                  │
├─────────────────────────────────────────┤
│                                         │
│  Every Request:                         │
│  1. Extract JWT from Authorization     │
│  2. Verify signature (secret key)       │
│  3. Check expiration                    │
│  4. Extract userId, org_id, role       │
│  5. Pass to authMiddleware              │
│                                         │
│  authMiddleware:                        │
│  ├─ req.user = {id, org_id, role}     │
│  ├─ req.org_id = extracted org_id      │
│  └─ Allow request to proceed            │
│                                         │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│  TENANT ISOLATION LAYER                 │
├─────────────────────────────────────────┤
│                                         │
│  tenantIsolation Middleware:            │
│  1. Get req.org_id from authMiddleware  │
│  2. Verify not null/undefined           │
│  3. Add org_id to ALL queries           │
│                                         │
│  Every DB Query Pattern:                │
│  db.find({                              │
│    org_id: req.org_id,  ← ALWAYS!      │
│    ...otherFilters                      │
│  })                                     │
│                                         │
│  Result: Org A cannot see Org B data    │
│                                         │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│  INPUT VALIDATION LAYER                 │
├─────────────────────────────────────────┤
│                                         │
│  sanitizeInput Middleware:              │
│  - Remove HTML tags                     │
│  - Validate data types                  │
│  - Check required fields                │
│  - Enforce length limits                │
│  - Sanitize special characters          │
│                                         │
└────────────┬────────────────────────────┘
             │
┌────────────▼────────────────────────────┐
│  RATE LIMITING LAYER                    │
├─────────────────────────────────────────┤
│                                         │
│  apiLimiter Middleware:                 │
│  - Track requests per IP                │
│  - Enforce rate limits                  │
│  - Prevent brute force                  │
│  - Prevent scraping                     │
│  - Return 429 if exceeded               │
│                                         │
└─────────────────────────────────────────┘

```

---

## Data Storage Strategy

```
┌──────────────────────────────────────────┐
│   PRIMARY: MongoDB (Main Database)       │
├──────────────────────────────────────────┤
│                                          │
│  Collections (by feature):               │
│  ├─ stockquotations      (Q2Q references)│
│  ├─ stockinvoices        (dispatch data) │
│  ├─ stockproducts        (full product)  │
│  ├─ stokcategories       (taxonomy)      │
│  ├─ stockclients         (with KRA)      │
│  ├─ clientcomplaints     (resolution)    │
│  ├─ installedmachines    (asset registry)│
│  ├─ warehouses           (grid layout)   │
│  ├─ stocklocations       (positions)     │
│  ├─ users                (staff accounts)│
│  ├─ companies            (tenants)       │
│  ├─ attendance           (time logs)     │
│  ├─ leaverequests        (PTO)           │
│  ├─ payroll              (salary)        │
│  ├─ jobs                 (postings)      │
│  ├─ tasks                (assignments)   │
│  ├─ meetings             (events)        │
│  ├─ [40+ more]           (various)       │
│  └─ etc.                                 │
│                                          │
│  Indexing Strategy:                      │
│  ├─ org_id on every collection           │
│  ├─ status fields (for filtering)        │
│  ├─ timestamps (for sorting)             │
│  ├─ Foreign key IDs (for joins)          │
│  └─ Unique constraints (business logic)  │
│                                          │
│  Replication: ✓ (recommended)            │
│  Sharding: ○ (consider at scale)        │
│  Backup: ✓ (must configure)             │
│                                          │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  SECONDARY: MySQL (Sync Cache)           │
├──────────────────────────────────────────┤
│                                          │
│  Tables (Prisma managed):                │
│  ├─ mongo_sync_users                     │
│  ├─ mongo_sync_companies                 │
│  ├─ mongo_sync_sessions                  │
│  ├─ mongo_sync_audit_logs                │
│  └─ mongo_sync_*                         │
│                                          │
│  Purpose:                                │
│  ├─ Session storage (performance)        │
│  ├─ Sync cache (fallback queries)        │
│  ├─ Audit log backup                     │
│  ├─ Analytical queries (sometimes)       │
│  └─ Secondary consistency check          │
│                                          │
│  Sync Mechanism:                         │
│  ├─ Scheduled job (syncScheduler)        │
│  ├─ Runs periodically                    │
│  ├─ Pulls from MongoDB                   │
│  ├─ Updates/inserts MySQL                │
│  └─ Handles conflicts gracefully         │
│                                          │
│  Note: Latency possible (async sync)     │
│                                          │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│  TERTIARY: File System (/uploads)        │
├──────────────────────────────────────────┤
│                                          │
│  Storage:                                │
│  ├─ Product images (PNG, JPEG)           │
│  ├─ Warehouse blueprints (images)        │
│  ├─ Company logos (SVG, PNG)             │
│  ├─ Complaint attachments (PDF, DOC)     │
│  ├─ Generated PDFs (invoices, quotes)    │
│  └─ User profile images (JPEG, PNG)      │
│                                          │
│  Serving:                                │
│  ├─ Static files via Express.static()    │
│  ├─ CORS enabled for frontend            │
│  ├─ Custom middleware for access control │
│  └─ Path structure: /uploads/{type}/{id} │
│                                          │
│  Considerations:                         │
│  ├─ ⚠️  No CDN (consider adding)        │
│  ├─ ⚠️  Local disk only (scale issues)   │
│  ├─ ✓ Cleanup scripts available         │
│  └─ ✓ Integrates with Multer            │
│                                          │
└──────────────────────────────────────────┘

```

---

## Scaling Considerations

```
CURRENT STATE (Single Instance):
├─ Frontend: 1 instance (next.js dev or production)
├─ Backend: 1 instance (express server)
├─ MongoDB: 1 primary + optional replicas
└─ MySQL: 1 instance (Prisma sync)

PERFORMANCE LIMITS (Current):
├─ Concurrent users: ~100-500 (depending on operations)
├─ Monthly transactions: ~50,000-100,000
├─ Storage: ~10-50 GB (initial)
└─ Queries per second: ~100-500

SCALING ROADMAP:

Phase 1: Database Optimization (Current)
├─ Add MongoDB indexes ✓
├─ Configure MySQL replication
├─ Implement query caching
└─ Monitor slow queries

Phase 2: Backend Scaling
├─ Deploy multiple Express instances
├─ Add load balancer (nginx/HAProxy)
├─ Implement session management (sticky sessions)
├─ Add Redis for distributed caching
└─ Separate background jobs (Bull queue)

Phase 3: Frontend Scaling
├─ Next.js on multiple instances
├─ Static assets to CDN
├─ Enable compression
├─ Optimize bundle size
└─ Add caching headers

Phase 4: Database Scaling
├─ MongoDB sharding (by org_id)
├─ MySQL read replicas
├─ Archive old data to cold storage
├─ Implement data retention policies
└─ Consider data warehouse

Phase 5: Infrastructure
├─ Kubernetes deployment
├─ Auto-scaling groups
├─ Distributed logging (ELK stack)
├─ APM (New Relic/DataDog)
└─ Multi-region setup

```

---

## Component Hierarchy (Frontend)

```
App Layout
├── AdminLayout (/app/admin/layout.tsx)
│   ├── Sidebar (Navigation)
│   ├── Topbar (Search, Notifications, Profile)
│   ├── MainContent
│   │   ├── StockSection (/admin/stock/*)
│   │   │   ├── QuotationPage
│   │   │   │   ├── QuotationList (Table)
│   │   │   │   ├── CreateQuotationForm
│   │   │   │   └── QuotationDetail Modal
│   │   │   ├── InvoicePage
│   │   │   │   ├── InvoiceList
│   │   │   │   ├── CreateInvoiceForm
│   │   │   │   └── DispatchFlow Wizard
│   │   │   ├── WMSPage
│   │   │   │   └── WarehouseCanvas (Complex 2D visual)
│   │   │   └── [other submodules]
│   │   ├── ClientsSection (/admin/clients/*)
│   │   │   ├── ClientsHubPage
│   │   │   ├── ClientsList
│   │   │   ├── InstalledMachinesPage
│   │   │   │   ├── MachineTable
│   │   │   │   └── EditMachineDialog
│   │   │   ├── CommunicationPage
│   │   │   └── BulkSMSPage
│   │   ├── ComplaintsSection (/admin/clients/complaints/*)
│   │   │   ├── ComplaintsList
│   │   │   ├── ComplaintDetail
│   │   │   └── CreateComplaintForm
│   │   └── [other sections]
│   └── Footer
│
├── EmployeeLayout (/app/employee/layout.tsx)
│   ├── Sidebar
│   ├── Topbar
│   ├── MainContent
│   │   ├── StockSection (/employee/stock/*)
│   │   │   ├── QuotationsList
│   │   │   └── InvoicesList
│   │   └── [other sections]
│   └── Footer
│
└── AuthLayout (/app/auth/*, /app/setup/*)
    ├── LoginPage
    ├── SignupPage
    ├── PasswordReset
    └── CompanySetup Wizard

SharedComponents:
├── UI Components (from Shadcn)
│   ├── Card, Button, Input, Select
│   ├── Dialog, Sheet, Modal
│   ├── Table, Tabs, Dropdown
│   ├── Badge, Avatar, Toast
│   └── [20+ base components]
├── Forms
│   ├── QuotationForm
│   ├── InvoiceForm
│   ├── ClientForm
│   ├── ComplaintForm
│   └── [15+ domain forms]
├── Tables
│   ├── QuotationTable
│   ├── InvoiceTable
│   ├── MachineTable
│   ├── ComplaintTable
│   └── [10+ domain tables]
├── Modals/Dialogs
│   ├── EditQuotation
│   ├── DispatchFlow
│   ├── EditMachine
│   └── [10+ domain modals]
└── Charts/Analytics
    ├── SalesChart
    ├── InventoryChart
    └── [5+ analytics]
```

---

## Integration Points

```
EXTERNAL INTEGRATIONS:

1. EMAIL SERVICE
   ├─ Provider: Configurable (Gmail, SendGrid, AWS SES)
   ├─ Controllers: companyEmailController
   ├─ Uses: nodemailer library
   ├─ Triggers:
   │  ├─ Quotation approval
   │  ├─ Invoice sent
   │  ├─ Dispatch notification
   │  ├─ Delivery confirmation
   │  ├─ Complaint escalation
   │  └─ Payment confirmation
   └─ Config: /server/src/config/email.ts

2. SMS GATEWAY
   ├─ Provider: Configurable
   ├─ Controllers: smsWebhookController, stockController
   ├─ Triggers:
   │  ├─ Dispatch notifications
   │  ├─ Delivery updates
   │  ├─ Bulk SMS campaigns
   │  ├─ Complaint acknowledgment
   │  └─ Payment reminders
   └─ Webhook: /webhooks/sms for delivery reports

3. MPESA PAYMENT
   ├─ Provider: Safaricom M-Pesa (Kenya)
   ├─ Controller: mpesaWebhookController
   ├─ Flow:
   │  ├─ Customer initiates M-Pesa payment
   │  ├─ Webhook triggers: /webhooks/mpesa
   │  ├─ Validates callback
   │  ├─ Updates StockInvoicePayment
   │  └─ Generates receipt
   └─ Config: /server/src/config/mpesa.ts

4. ETIMS (KRA TAX)
   ├─ Provider: Kenya Revenue Authority
   ├─ Controller: stockController (accounts section)
   ├─ Flow:
   │  ├─ Admin marks "post to ETIMS"
   │  ├─ Creates StockInvoice.etims record
   │  ├─ Calls ETIMS API
   │  ├─ Stores KRA reference
   │  └─ Tracks posting status
   └─ Note: Requires KRA API credentials

5. FILE UPLOAD
   ├─ Middleware: upload.middleware.ts (Multer)
   ├─ Types:
   │  ├─ Product images
   │  ├─ Warehouse blueprints
   │  ├─ Complaint attachments
   │  └─ CSV for bulk import
   ├─ Limits: Configurable (size, count)
   └─ Storage: /uploads directory

```

---

## Performance Optimization Strategies

```
FRONTEND OPTIMIZATION:
├─ Code Splitting
│  ├─ Dynamic imports for heavy components
│  ├─ Route-based splitting (Next.js automatic)
│  └─ Component-level lazy loading
├─ Caching
│  ├─ Browser cache (static assets)
│  ├─ Query caching (consider SWR/React Query)
│  ├─ IndexedDB for offline capability (future)
│  └─ LocalStorage for form drafts
├─ Bundle Size
│  └─ Consider lighter alternatives for heavy deps
└─ Rendering
   ├─ Memoization for expensive components
   ├─ Virtual lists for large tables
   └─ Debounce search inputs

BACKEND OPTIMIZATION:
├─ Database
│  ├─ Connection pooling
│  ├─ Query optimization
│  ├─ Index tuning
│  └─ Denormalization where needed
├─ Caching
│  ├─ Redis for session cache
│  ├─ In-memory cache for constants
│  └─ Query result caching
├─ Async Processing
│  ├─ Bull queue for background jobs
│  ├─ Batch processing for bulk operations
│  └─ Webhook queuing
└─ API
   ├─ Pagination (default limit)
   ├─ Field selection (projection)
   ├─ Compression (gzip/brotli)
   └─ CDN for static assets

MONITORING & METRICS:
├─ Application Performance Monitoring (APM)
│  ├─ New Relic / DataDog
│  ├─ Track response times
│  └─ Monitor error rates
├─ Database Metrics
│  ├─ Query performance
│  ├─ Connection count
│  └─ Slow query log
├─ Infrastructure Metrics
│  ├─ CPU & Memory usage
│  ├─ Disk I/O
│  └─ Network throughput
└─ Business Metrics
   ├─ Active users
   ├─ Transaction volume
   └─ Revenue impact

```

---

**End of Architecture Overview**
