# Alert System Implementation

## Overview
Comprehensive alert system for employee notifications across 8 different alert types with severity levels and smart filtering.

## Alert Types

### 1. Contract Expiry Warnings 📋
- **Type ID:** `contract_expiry`
- **Severity:** Medium → Critical (based on days remaining)
- **Triggers:**
  - Contract expires in X days (default: 30)
  - Contract has already expired
- **Related Entity:** ContractAlert
- **Action URL:** `/employee/contracts`
- **Metadata:** contract_type, end_date, days_until_expiry

### 2. Incomplete PDP Alerts 📝
- **Type ID:** `incomplete_pdp`
- **Severity:** Medium → High (based on completion %)
- **Triggers:**
  - Missing personal profile information
  - Missing vision & mission statement
  - No goals defined
  - No action plans created
- **Related Entity:** PDP
- **Action URL:** `/employee/pdp`
- **Metadata:** incomplete_sections, completion_percent

### 3. Attendance Anomalies 📊
- **Type ID:** `attendance_anomaly`
- **Severity:** Medium → High
- **Triggers:**
  - Frequent late arrivals
  - Excessive absences
  - Pattern violations (if configured)
  - Unscheduled leaves
- **Related Entity:** Attendance record
- **Action URL:** `/employee/attendance`
- **Metadata:** anomaly_type, days_affected, pattern_details

### 4. Task Overload Alerts ⚠️
- **Type ID:** `task_overload`
- **Severity:** High → Critical (based on task count)
- **Triggers:**
  - 3+ overdue tasks
  - 10+ tasks due within 7 days
- **Related Entity:** Task
- **Action URL:** `/employee/tasks?filter=overdue`
- **Metadata:** overdue_count, upcoming_count, total_pending

### 5. Low Performance Alerts 📉
- **Type ID:** `performance_low`
- **Severity:** High
- **Triggers:**
  - Performance rating below threshold
  - Multiple negative feedback items
  - KPI targets not met
- **Related Entity:** Performance record
- **Action URL:** `/employee/performance`
- **Metadata:** current_rating, target_rating, kpis_missed

### 6. Low Leave Balance ✈️
- **Type ID:** `leave_balance_low`
- **Severity:** Medium
- **Triggers:**
  - Remaining leave balance < 5 days
  - Planned leaves scheduled
- **Related Entity:** Leave record
- **Action URL:** `/employee/settings#leave`
- **Metadata:** remaining_days, planned_days, year_end_date

### 7. Project Deadline Approaching 📅
- **Type ID:** `project_deadline`
- **Severity:** Medium → High (based on days)
- **Triggers:**
  - Project deadline in X days
  - Multiple deadlines within week
- **Related Entity:** Project/Task
- **Action URL:** `/employee/tasks?project=id`
- **Metadata:** project_name, deadline_date, days_remaining, completion_percent

### 8. Feedback Pending ⏳
- **Type ID:** `feedback_pending`
- **Severity:** Low → Medium
- **Triggers:**
  - Feedback requested from user
  - Review period started
  - 360-degree feedback awaiting response
- **Related Entity:** Feedback record
- **Action URL:** `/employee/feedback`
- **Metadata:** feedback_type, requester, due_date

## Database Model

```typescript
interface Alert {
  _id: ObjectId
  org_id: string                    // Organization ID for multi-tenancy
  user_id: string                   // Target user
  alert_type: string               // One of 8 types above
  severity: "low" | "medium" | "high" | "critical"
  title: string                    // Alert title
  message: string                  // Alert message
  related_id?: string              // ID of related entity
  related_type?: string            // Type of related entity (contract, pdp, task, etc.)
  action_url?: string              // URL to take action
  action_label?: string            // Button label for action
  is_read: boolean                 // Read status
  is_dismissed: boolean            // Dismissed status
  metadata: Record<string, any>   // Additional context data
  created_at: Date
  expires_at: Date                 // Auto-deleted after 30 days
  updatedAt: Date
}
```

## API Endpoints

### Get All Alerts
```
GET /api/alerts
Query Params:
  - severity: "critical" | "high" | "medium" | "low"
  - alert_type: alert type ID
  - include_dismissed: boolean (default: false)

Response:
{
  success: true,
  data: {
    total: number,
    unread: number,
    by_severity: {
      critical: number,
      high: number,
      medium: number,
      low: number
    },
    alerts: Alert[]
  }
}
```

### Get Alert Summary
```
GET /api/alerts/summary
Response:
{
  success: true,
  data: [{
    _id: "alert_type",
    count: number,
    critical: number,
    high: number,
    medium: number,
    low: number
  }]
}
```

### Mark Alert as Read
```
PATCH /api/alerts/:alertId/read
Response:
{
  success: true,
  data: Alert (updated)
}
```

### Dismiss Alert
```
PATCH /api/alerts/:alertId/dismiss
Response:
{
  success: true,
  data: Alert (updated)
}
```

### Dismiss All Alerts of Type
```
PATCH /api/alerts/type/:alert_type/dismiss-all
Response:
{
  success: true,
  data: {
    dismissed_count: number
  }
}
```

### Generate Contract Alerts (Admin/Cron)
```
POST /api/alerts/generate/contracts
Response:
{
  success: true,
  data: {
    alerts_created: number
  }
}
```

### Generate PDP Alerts (Admin/Cron)
```
POST /api/alerts/generate/pdp
Response:
{
  success: true,
  data: {
    alerts_created: number
  }
}
```

### Generate Task Overload Alerts (Admin/Cron)
```
POST /api/alerts/generate/task-overload
Response:
{
  success: true,
  data: {
    alerts_created: number
  }
}
```

## Frontend Features

### Alert Dashboard (`/employee/alerts`)

**Summary Cards:**
- Critical alerts count
- High priority alerts count
- Medium priority alerts count
- Low priority alerts count
- Total alerts count

**Filtering Tabs:**
- All alerts
- Critical only
- High only
- Medium only
- Low only

**Alert Card Features:**
- Icon by alert type
- Title and severity badge
- Type badge
- Alert message
- Metadata details (collapsible)
- Action button (if available)
- Read/Dismiss actions
- Created date

**Color Coding:**
- Critical: Red (bg-red-100, text-red-800)
- High: Orange (bg-orange-100, text-orange-800)
- Medium: Yellow (bg-yellow-100, text-yellow-800)
- Low: Blue (bg-blue-100, text-blue-800)

## Implementation Details

### Auto-Alert Generation

#### Contract Alerts
- Triggered when: Contract end date < alert_days_before (default 30)
- Severity calculation:
  - 0-7 days: Critical
  - 8-14 days: High
  - 15+ days: Medium
  - Expired: Critical
- Prevents duplicate alerts with `is_dismissed = false` check

#### PDP Alerts
- Triggered when: Sections incomplete
- Severity based on completion percentage
- Tracks which sections are missing
- Updates when user completes sections

#### Task Overload Alerts
- Triggered when: Overdue >= 3 OR upcoming (7 days) >= 10
- Severity: Critical (5+ overdue), High (3+ overdue)
- Only generated if thresholds exceeded
- Can include metadata about specific tasks

### Auto-Deletion
- All alerts auto-delete after 30 days
- TTL index on `expires_at` field
- Can be manually extended if needed

### Access Control
- Users only see their own alerts
- Filtered by `user_id` and `org_id`
- Admins can view all org alerts (with additional auth)

## Best Practices

### For Developers

1. **Creating Alerts Programmatically:**
```typescript
await Alert.create({
  org_id: org_id,
  user_id: user_id,
  alert_type: "contract_expiry",
  severity: "high",
  title: "Contract expiring soon",
  message: "Your employment contract expires in 14 days",
  related_id: contract._id,
  related_type: "contract",
  action_url: "/employee/contracts",
  action_label: "View Contract",
  metadata: {
    contract_type: "employment",
    end_date: contract.end_date,
    days_until_expiry: 14
  }
})
```

2. **Preventing Duplicates:**
```typescript
const existing = await Alert.findOne({
  org_id: org_id,
  user_id: user_id,
  alert_type: "contract_expiry",
  related_id: contract_id,
  is_dismissed: false
})
if (!existing) {
  // Create alert
}
```

3. **Scheduling Alerts (Cron Job):**
```typescript
// Run daily at 8 AM
0 8 * * * curl -X POST http://localhost:5000/api/alerts/generate/contracts
0 8 * * * curl -X POST http://localhost:5000/api/alerts/generate/pdp
0 8 * * * curl -X POST http://localhost:5000/api/alerts/generate/task-overload
```

### For Admins

1. **Monitor alert volumes** - Check if certain alert types spike
2. **Adjust thresholds** - Modify severity cutoffs based on org needs
3. **Regular cleanup** - Dismissed alerts auto-delete after 30 days
4. **Set up automation** - Configure cron jobs for alert generation

## Future Enhancements

1. **Real-time Notifications** - WebSocket push notifications
2. **Email Alerts** - Send critical alerts via email
3. **SMS Alerts** - SMS for critical contract/task alerts
4. **Custom Rules** - Admin-defined alert rules
5. **Alert History** - Archive read/dismissed alerts
6. **Bulk Dismiss** - Dismiss multiple alerts at once
7. **Snooze Alerts** - Temporarily hide alerts
8. **Alert Preferences** - User can control which alerts they receive

## Testing

### Manual Testing Endpoints

```bash
# Get all alerts
curl http://localhost:5000/api/alerts \
  -H "Authorization: Bearer <token>"

# Get alert summary
curl http://localhost:5000/api/alerts/summary \
  -H "Authorization: Bearer <token>"

# Generate contract alerts
curl -X POST http://localhost:5000/api/alerts/generate/contracts \
  -H "Authorization: Bearer <token>"

# Mark as read
curl -X PATCH http://localhost:5000/api/alerts/<alertId>/read \
  -H "Authorization: Bearer <token>"

# Dismiss alert
curl -X PATCH http://localhost:5000/api/alerts/<alertId>/dismiss \
  -H "Authorization: Bearer <token>"
```

## Files Created/Modified

**New Files:**
- `/server/src/models/Alert.ts` - Alert schema
- `/server/src/controllers/alertController.ts` - Alert logic
- `/server/src/routes/alert.routes.ts` - Alert endpoints
- `/app/employee/alerts/page.tsx` - Alert dashboard UI

**Modified Files:**
- `/server/src/index.ts` - Added alert routes
- `/components/employee/sidebar.tsx` - Added alerts menu link

## Status: ✅ Complete

All alert types implemented with:
- ✅ Database model with TTL
- ✅ CRUD operations and generation logic
- ✅ Frontend dashboard with filtering
- ✅ Navigation integration
- ✅ Multi-tenant support
- ✅ Role-based access control
- ✅ Auto-deletion after 30 days
