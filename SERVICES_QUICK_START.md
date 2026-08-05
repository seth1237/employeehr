# Services Module - Quick Reference

## What Was Added

A complete **services management system** to your HR platform, enabling:
- ✅ Service catalog management (create, edit, delete services)
- ✅ Job scheduling (assign services to clients with dates)
- ✅ Recurring services (auto-create follow-up jobs)
- ✅ Status tracking (pending → in-progress → done)
- ✅ Analytics dashboard (KPIs, completion rates, category breakdown)

## Access Point

**URL**: `/dashboard/stock/services`

**Navigation**: Dashboard → Stock → Services (new menu item)

## Three Main Tabs

### 1. Dashboard Tab
- **Total Jobs**: Overall job count
- **Pending**: Jobs waiting to start
- **In Progress**: Active jobs
- **Completed**: Finished jobs
- **Overdue**: Past due date jobs
- **Pie Chart**: Status distribution
- **Bar Chart**: Jobs by category
- **Completion Rate**: % of jobs finished

### 2. Services Tab
- **Service List**: All defined services
- **Search/Filter**: By name or category
- **Create**: New service button
- **Edit**: Update service details
- **Delete**: Remove services
- **Fields**: Name, category, price, recurring settings

### 3. Jobs Tab
- **Job List**: All scheduled service appointments
- **Filter**: By status (pending/in-progress/done)
- **Search**: By client name
- **Create**: Schedule new job
- **Status Update**: Change job status in dropdown
- **Auto-recurring**: Completing recurring job creates next automatically

## Key Workflows

### Creating a Service
1. Go to Services tab
2. Click "New Service"
3. Fill: Name, Category, Price, Recurring? (with interval if yes)
4. Click Create

**Result**: Service appears in service list, available for job scheduling

### Scheduling a Job
1. Go to Jobs tab
2. Click "New Job"
3. Select: Service, Client (optional), Scheduled Date, Notes
4. Click Create

**Result**: Job appears in jobs list with pending status

### Completing a Job
1. Find job in Jobs tab
2. Change status dropdown from "Pending" → "In Progress" → "Completed"
3. If recurring: Next job auto-created for date = today + intervalDays

**Result**: Job marked done, next occurrence scheduled if applicable

### Viewing Analytics
1. Go to Dashboard tab
2. See KPI cards (5 metrics)
3. View Pie chart (status distribution)
4. Switch to "By Category" tab for category breakdown

## API Endpoints (for developers)

### Services
```
POST   /api/stock/services              - Create
GET    /api/stock/services              - List all
GET    /api/stock/services/:id          - Get one
PUT    /api/stock/services/:id          - Update
DELETE /api/stock/services/:id          - Delete
```

### Jobs
```
POST   /api/stock/services/jobs                 - Create
GET    /api/stock/services/jobs                 - List
GET    /api/stock/services/jobs/status/:status - Filter by status
PUT    /api/stock/services/jobs/:id/status     - Update status
GET    /api/stock/services/jobs/:id            - Get one
DELETE /api/stock/services/jobs/:id            - Delete
```

### Analytics
```
GET /api/stock/services/analytics/summary       - Overall metrics
GET /api/stock/services/analytics/by-category   - Category breakdown
```

## Data Model

### Service
```
{
  name: string              // "Monthly Maintenance"
  category: string          // category ID
  sellingPrice: number      // 5000 KES
  isRecurring: boolean      // true/false
  intervalDays: number      // 30 days
  description: string       // optional
}
```

### Service Job
```
{
  serviceName: string       // "Monthly Maintenance"
  clientName: string        // "Acme Corp"
  scheduledDate: Date       // "2024-02-15T10:00:00"
  status: string            // pending|in-progress|done|cancelled
  isRecurring: boolean      // inherits from service
  intervalDays: number      // inherits from service
  notes: string             // optional
  completedDate: Date       // set when marked done
}
```

## Permissions

| Role | Can Do |
|------|--------|
| Admin/HR | Create/edit/delete services; create/update/delete jobs; view all |
| Employee | View own jobs; cannot manage services |
| Manager | Same as employee (unless promoted to admin) |

## Status Workflow

```
pending → in-progress → done → (if recurring: auto-create new pending job)
               ↓
           cancelled (manual action)
```

## Important Features

### Auto-Recurring
When you complete a recurring job (mark as "done"):
1. Job status → "done"
2. completedDate → today
3. NEW job created with:
   - Same service, client, notes
   - scheduledDate = today + intervalDays
   - status = "pending"
   - isRecurring = true (continues chain)

This happens **automatically** - no manual action needed!

### Overdue Indicator
- Jobs past scheduled date with status ≠ done
- Shown with red highlight and "Overdue" badge
- Helps track delays

### Multi-Organization
- Every service/job tied to your organization
- Complete data isolation
- No cross-org data leakage

## File Locations

**Components**: `/components/stock/services/`
- ServicesModule.tsx (main)
- ServicesList.tsx
- ServiceJobsList.tsx
- ServicesDashboard.tsx
- CreateServiceDialog.tsx
- CreateJobDialog.tsx
- EditServiceDialog.tsx

**API**: `/server/src/routes/stock.routes.ts`
- 13 new endpoints

**Controller**: `/server/src/controllers/stockController.ts`
- 13 new methods

**Page**: `/app/dashboard/stock/services/page.tsx`

**Documentation**: 
- `/SERVICES_MODULE_DOCUMENTATION.md` (technical)
- `/SERVICES_QUOTATIONS_INTEGRATION.md` (integration roadmap)

## Common Scenarios

### Scenario 1: Monthly Maintenance Contract
1. Create service "Monthly Maintenance" → isRecurring=true, intervalDays=30
2. Schedule job for first client → status=pending
3. When completed → next job auto-created 30 days later
4. Pattern repeats indefinitely

### Scenario 2: One-Time Service
1. Create service "Installation" → isRecurring=false
2. Schedule job → status=pending
3. When completed → status=done, no next job created
4. Can schedule another manually later

### Scenario 3: Tracking Progress
1. Dashboard shows 45 total jobs
2. 8 pending, 3 in-progress, 32 completed, 2 overdue
3. Completion rate = 32/45 = 71%
4. Category breakdown shows which services most in-demand

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Service not showing in list | Check category exists, service is marked active |
| Job not created | Service ID required, date must be future |
| Recurring not working | Mark job as "done" (not just in-progress) |
| Can't see other users' jobs | Permission: only admins see all jobs |
| Analytics show no data | Need to complete some jobs first |

## Next Steps

1. **Optional**: Integrate with quotations (see SERVICES_QUOTATIONS_INTEGRATION.md)
2. **Optional**: Add field technician assignments
3. **Optional**: Add time tracking for actual duration
4. **Future**: Mobile app for field team
5. **Future**: SMS/Email job notifications

## Support

For technical details, see:
- SERVICES_MODULE_DOCUMENTATION.md
- SERVICES_QUOTATIONS_INTEGRATION.md

## Summary

You now have a **production-ready services management system** that:
- Follows your existing stock management architecture
- Integrates with categories and clients
- Supports recurring services with auto-scheduling
- Provides real-time analytics
- Enforces multi-tenancy and permissions
- Is ready to integrate with quotations
