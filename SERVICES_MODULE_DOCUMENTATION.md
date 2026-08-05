# Services Module - Complete Implementation

## Overview
A comprehensive services management system has been added to the HR system, following the exact architectural pattern of the stock management module. This module enables organizations to define services, schedule service jobs, track recurring services, and manage service delivery with full analytics.

## Architecture

### 1. **Database Models**

#### Prisma Schema (Schema Definition)
- **Service**: Core service definition with pricing, recurring configuration, and metadata
- **ServiceJob**: Individual service job instances with scheduling, status tracking, and recurring support
- **ServiceQuotationItem**: Junction model for services in quotations

#### Mongoose Models (MongoDB Implementation)
- **StockProduct** (Extended): Used for service definitions with `productType: "service"` flag
  - Supports recurring services via `isRecurring` and `intervalDays` fields
  - Integrates with existing pricing and category system

- **StockServiceJob**: MongoDB model for service job instances
  - Tracks scheduling (`scheduledDate`, `completedDate`)
  - Manages recurring job auto-generation
  - Status tracking: pending, in-progress, done, cancelled
  - Org-level isolation via `org_id` index

### 2. **API Endpoints**

All endpoints are protected by `authMiddleware`, `orgMiddleware`, and `tenantIsolation`.

#### Service Management
```
POST   /api/stock/services              - Create service
GET    /api/stock/services              - List services
GET    /api/stock/services/:serviceId   - Get service details
PUT    /api/stock/services/:serviceId   - Update service
DELETE /api/stock/services/:serviceId   - Delete service (soft)
```

#### Service Jobs
```
POST   /api/stock/services/jobs                  - Create job
GET    /api/stock/services/jobs                  - List jobs (with filtering)
GET    /api/stock/services/jobs/status/:status  - Get jobs by status
PUT    /api/stock/services/jobs/:jobId/status   - Update job status (triggers recurring)
GET    /api/stock/services/jobs/:jobId          - Get job details
DELETE /api/stock/services/jobs/:jobId          - Delete job
```

#### Analytics
```
GET /api/stock/services/analytics/summary      - Overall metrics
GET /api/stock/services/analytics/by-category  - Performance by category
```

### 3. **Controller Methods (StockController)**

**Service CRUD**:
- `createService()`: Validates inputs, creates service with category
- `getServices()`: Retrieves all active services, returns with category details
- `getServiceById()`: Returns single service with related data
- `updateService()`: Updates service configuration, pricing, recurring settings
- `deleteService()`: Soft delete (sets `isActive: false`)

**Job Management**:
- `createServiceJob()`: Creates job with service/client linking
- `getServiceJobs()`: Fetches jobs with status/client filtering, sorted by date
- `getServiceJobsByStatus()`: Returns jobs filtered by status
- `getServiceJobById()`: Returns single job with full details
- `updateServiceJobStatus()`: 
  - Updates job status
  - **Auto-creates next job** when completing recurring jobs
  - Calculates next date using `intervalDays`
  - Preserves all job metadata for next occurrence
- `deleteServiceJob()`: Removes job record

**Analytics**:
- `getServicesAnalyticsSummary()`: 
  - Total/pending/in-progress/completed/cancelled/overdue counts
  - Returns grouped jobs by status for dashboard
- `getServicesAnalyticsByCategory()`: 
  - Category-level metrics (service count, job counts)
  - Completion rates by category
  - Sorted by volume

### 4. **Key Features**

#### Recurring Services
1. Service defined with `isRecurring: true` and `intervalDays` (e.g., 30)
2. When job marked as "done", system auto-creates next job
3. Next job scheduled `intervalDays` days from completion
4. All metadata (client, service, notes) preserved for recurring occurrence
5. Supports indefinite recurring schedules

#### Multi-Tenancy
- Every service and job indexed by `org_id`
- All queries filtered by user's `org_id`
- Role-based access control via `isAdminRole()` checks
- Employee role restrictions on self-owned jobs only

#### Status Workflow
- **pending**: Initial state, awaiting start
- **in-progress**: Work actively being performed
- **done**: Completed, triggers recurring job creation
- **cancelled**: Job cancelled, no recurring creation

#### Authorization
- Admin/HR only: Create, update, delete services
- Admin/HR: View all jobs
- Employee: View only own jobs
- Dispatch: Manage assigned jobs

### 5. **UI Components**

#### ServicesList.tsx
- List all services with search and category filtering
- Edit/delete actions
- Shows pricing and recurring configuration
- Integrates `CreateServiceDialog` and `EditServiceDialog`

#### CreateServiceDialog.tsx
- Form to create new service
- Category selection from existing categories
- Price input (numeric)
- Recurring checkbox with optional interval configuration
- Validates required fields

#### EditServiceDialog.tsx
- Allows modification of existing service
- Pre-populated form with current values
- Same validation as create dialog
- Updates service via PUT endpoint

#### ServiceJobsList.tsx
- Displays all jobs with client/date/status
- Status-based filtering (pending/in-progress/done)
- Search by client name
- Inline status updates via dropdown
- Shows overdue jobs with visual indicators
- Integrates `CreateJobDialog`

#### CreateJobDialog.tsx
- Service selection from API
- Client selection (optional)
- Date/time picker for scheduling
- Optional notes field
- Creates job via POST endpoint

#### ServicesDashboard.tsx
- **KPI Cards**: Total jobs, pending, in-progress, completed, overdue
- **Pie Chart**: Job status distribution visualization
- **Bar Chart**: Jobs by category with completion rates
- **Completion Rate**: Overall job completion percentage
- Real-time data from analytics endpoints

#### ServicesModule.tsx
- Master component organizing dashboard, services, and jobs tabs
- Centralized entry point for entire module
- Tab-based navigation

### 6. **API Routes**

All routes defined in `/server/src/routes/stock.routes.ts`:

```typescript
// Services
router.post("/services", StockController.createService)
router.get("/services", StockController.getServices)
router.get("/services/:serviceId", StockController.getServiceById)
router.put("/services/:serviceId", StockController.updateService)
router.delete("/services/:serviceId", StockController.deleteService)

// Service Jobs
router.post("/services/jobs", StockController.createServiceJob)
router.get("/services/jobs", StockController.getServiceJobs)
router.get("/services/jobs/status/:status", StockController.getServiceJobsByStatus)
router.put("/services/jobs/:jobId/status", StockController.updateServiceJobStatus)
router.get("/services/jobs/:jobId", StockController.getServiceJobById)
router.delete("/services/jobs/:jobId", StockController.deleteServiceJob)

// Analytics
router.get("/services/analytics/summary", StockController.getServicesAnalyticsSummary)
router.get("/services/analytics/by-category", StockController.getServicesAnalyticsByCategory)
```

### 7. **Integration with Existing Systems**

#### Stock System Integration
- Uses existing `StockCategory` model for service categorization
- Extends `StockProduct` model with `productType: "service"` field
- Maintains compatible pricing structure (sellingPrice for service cost)
- Compatible with existing client (`StockClient`) system

#### Quotation Integration (Future)
- Services can be added to quotations via `ServiceQuotationItem` model
- Maintains same pricing/quantity pattern as products
- Can be converted to invoices alongside products

#### Authorization Patterns
- Follows exact `isAdminRole()` pattern from stock module
- Uses org-level isolation consistent across application
- Respects employee/admin role separation

## Usage Examples

### Creating a Service
```
POST /api/stock/services
{
  "name": "Monthly Maintenance",
  "category": "cat_123",
  "price": 5000,
  "description": "Regular system maintenance",
  "isRecurring": true,
  "intervalDays": 30
}
```

### Scheduling a Job
```
POST /api/stock/services/jobs
{
  "serviceId": "svc_123",
  "clientId": "client_456",
  "scheduledDate": "2024-02-15T10:00:00",
  "notes": "Scheduled quarterly review"
}
```

### Completing a Job (Auto-creates Next)
```
PUT /api/stock/services/jobs/job_789/status
{
  "status": "done"
}
// System automatically creates next job scheduled 30 days later
```

### Viewing Analytics
```
GET /api/stock/services/analytics/summary
Response: {
  "summary": {
    "totalJobs": 45,
    "pending": 8,
    "inProgress": 3,
    "completed": 32,
    "cancelled": 2,
    "overdue": 1
  },
  "byStatus": {
    "pending": [...],
    "inProgress": [...],
    "completed": [...]
  }
}
```

## File Structure

```
/components/stock/services/
  ├── ServicesModule.tsx              (Main entry component)
  ├── ServicesList.tsx                (Service listing & management)
  ├── CreateServiceDialog.tsx         (New service form)
  ├── EditServiceDialog.tsx           (Edit service form)
  ├── ServiceJobsList.tsx             (Job listing & tracking)
  ├── CreateJobDialog.tsx             (New job form)
  └── ServicesDashboard.tsx           (Analytics & KPIs)

/server/src/controllers/
  └── stockController.ts             (Service & job methods added)

/server/src/routes/
  └── stock.routes.ts               (Service endpoints)

/server/src/models/
  └── StockServiceJob.ts            (MongoDB model)

/server/src/generated/prisma/
  └── schema.prisma                 (Service schema models)

/app/dashboard/stock/services/
  └── page.tsx                      (Page entry point)
```

## Performance Considerations

1. **Indexing**: 
   - `org_id` indexed for tenant isolation
   - `status` indexed for quick filtering
   - `scheduledDate` indexed for calendar queries
   - Compound index on `(org_id, status)` for common queries

2. **Query Optimization**:
   - Uses `.lean()` for read-only operations
   - Batch loads related entities (categories, users)
   - Analytics pre-computed on-demand

3. **Scaling**:
   - Recurring job creation happens synchronously on status update
   - Can be moved to async queue for large deployments
   - Consider pagination for large job lists

## Security

1. **Authorization**: All endpoints check `org_id` and role
2. **Validation**: Input sanitization on all endpoints
3. **Data Isolation**: Org-level filtering on all queries
4. **Role Enforcement**: Admin-only operations protected

## Future Enhancements

1. **Service Templates**: Pre-configured service packages
2. **Bulk Job Creation**: Schedule multiple jobs at once
3. **Service History**: Track service execution history
4. **Client Notifications**: SMS/Email job confirmations
5. **Resource Allocation**: Assign technicians to jobs
6. **Time Tracking**: Track actual service duration vs scheduled
7. **SLA Management**: Define and track service level agreements
8. **Integration**: Calendar view (Google Calendar, Outlook)
9. **Mobile App**: Field technician mobile job tracking
10. **Invoicing**: Auto-generate invoices from completed jobs
