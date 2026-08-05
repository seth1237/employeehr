# Meeting System Update - Navigation & KPI Tracking

## What's New

### 1. **Navigation Menu Integration**
Meetings have been added to all navigation menus:

#### Employee Portal
- **Location:** Employee Sidebar → "Meetings" (4th item)
- **Icon:** Video camera icon
- **Route:** `/employee/meetings`

#### Manager Dashboard  
- **Location:** Dashboard Sidebar → "Meetings"
- **Route:** `/dashboard/meetings`

#### Admin Panel
- **Location:** Admin Sidebar → Employee Management section → "Meetings"
- **Route:** `/admin/meetings`

### 2. **Background Meeting Support**
Meetings now support minimized mode for multitasking:

- **Minimize Button:** Click the minimize button (↓) during active meetings
- **Floating Window:** Meeting continues in a small floating window at bottom-right
- **Quick Controls:** Access mute and end meeting buttons from minimized view
- **Expand:** Click ↑ to restore full meeting view
- **Perfect for Mobile:** Users can browse other pages while in meeting

### 3. **KPI Time Tracking**
Complete meeting time tracking for performance metrics:

#### Automatic Tracking
- **Join Time:** Automatically tracked when user joins meeting
- **Leave Time:** Tracked when user leaves or meeting ends
- **Duration:** Calculated in minutes for each attendee
- **Background Tracking:** Works even when meeting is minimized

#### New API Endpoints

**Track Join Time**
```
POST /api/meetings/:id/join
```
Automatically called when user joins meeting.

**Track Leave Time**
```
POST /api/meetings/:id/leave
```
Automatically called when user leaves meeting.

**Get User Meeting Stats (Employee KPI)**
```
GET /api/meetings/stats/user?startDate=2025-01-01&endDate=2025-12-31
```
Returns:
```json
{
  "totalMeetings": 45,
  "attendedMeetings": 42,
  "missedMeetings": 3,
  "totalMinutes": 2100,
  "averageDuration": 50,
  "attendanceRate": 93
}
```

**Get Team Meeting Stats (Admin/Manager KPI)**
```
GET /api/meetings/stats/team?startDate=2025-01-01&endDate=2025-12-31&userId=123
```
Returns:
```json
{
  "totalMeetings": 150,
  "completedMeetings": 140,
  "inProgressMeetings": 2,
  "scheduledMeetings": 8,
  "cancelledMeetings": 0,
  "totalDurationMinutes": 7500,
  "averageDuration": 53,
  "attendeeStats": {
    "user123": {
      "totalMeetings": 45,
      "attended": 42,
      "missed": 3,
      "totalMinutes": 2100
    }
  }
}
```

### 4. **Enhanced Meeting Model**
Updated meeting schema with time tracking fields:

```typescript
attendees: [{
  user_id: string
  status: "invited" | "accepted" | "declined" | "tentative"
  attended: boolean
  joined_at?: Date          // NEW: When user joined
  left_at?: Date            // NEW: When user left
  duration_minutes?: number // NEW: Time spent in meeting
}]
actual_start_time?: Date    // NEW: Actual meeting start
actual_end_time?: Date      // NEW: Actual meeting end
```

---

## KPI Integration

### For Performance Reviews
Use meeting stats in employee evaluations:

```typescript
// Get employee meeting participation
const stats = await fetch('/api/meetings/stats/user?userId=123&startDate=2025-01-01&endDate=2025-12-31')

// Sample metrics:
- Meeting Attendance Rate: 93%
- Average Meeting Duration: 50 minutes
- Total Meeting Time: 35 hours
- Missed Meetings: 3
```

### For Team Analytics
Track team meeting efficiency:

```typescript
// Get team-wide statistics
const teamStats = await fetch('/api/meetings/stats/team')

// Dashboard metrics:
- Total Team Meetings: 150
- Average Meeting Duration: 53 minutes
- Meeting Completion Rate: 93%
- Top Attendees: [...sorted by participation]
```

### Dashboard Widgets Example

**Employee Dashboard Widget:**
```jsx
<Card>
  <CardHeader>My Meeting Stats (This Month)</CardHeader>
  <CardContent>
    <div>Meetings Attended: {stats.attendedMeetings}</div>
    <div>Total Time: {Math.round(stats.totalMinutes / 60)} hours</div>
    <div>Attendance Rate: {stats.attendanceRate}%</div>
  </CardContent>
</Card>
```

**Manager Dashboard Widget:**
```jsx
<Card>
  <CardHeader>Team Meeting Analytics</CardHeader>
  <CardContent>
    <div>Active Meetings: {stats.inProgressMeetings}</div>
    <div>Upcoming: {stats.scheduledMeetings}</div>
    <div>Avg Duration: {stats.averageDuration} min</div>
  </CardContent>
</Card>
```

---

## Usage Examples

### 1. Employee Joining a Meeting
```typescript
// User clicks "Join Meeting" button
// System automatically:
1. Tracks join time
2. Marks as attended
3. Updates meeting status to "in-progress"
4. Starts duration timer
```

### 2. Minimizing Meeting (Mobile/Multitasking)
```typescript
// User clicks minimize button during meeting
// System:
1. Shows floating window at bottom-right
2. Keeps audio/video active
3. User can navigate to other pages
4. Meeting timer continues
5. Duration tracking continues
```

### 3. Leaving Meeting
```typescript
// User clicks "End Meeting" or closes tab
// System automatically:
1. Tracks leave time
2. Calculates duration
3. Saves to database
4. Updates KPI metrics
```

### 4. Viewing Meeting Stats (Employee)
```tsx
import { useEffect, useState } from 'react'

function MyMeetingStats() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/api/meetings/stats/user')
      .then(res => res.json())
      .then(data => setStats(data.data))
  }, [])

  return (
    <div>
      <h3>My Meeting Performance</h3>
      <p>Attendance Rate: {stats?.attendanceRate}%</p>
      <p>Total Time in Meetings: {Math.round(stats?.totalMinutes / 60)} hours</p>
      <p>Average Meeting Duration: {stats?.averageDuration} minutes</p>
    </div>
  )
}
```

### 5. Team Analytics (Manager/Admin)
```tsx
function TeamMeetingDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetch('/api/meetings/stats/team?startDate=2025-01-01')
      .then(res => res.json())
      .then(data => setStats(data.data))
  }, [])

  return (
    <div>
      <h3>Team Meeting Analytics</h3>
      <div>Total Meetings: {stats?.totalMeetings}</div>
      <div>Completion Rate: {Math.round((stats?.completedMeetings / stats?.totalMeetings) * 100)}%</div>
      
      <h4>Top Attendees</h4>
      {Object.entries(stats?.attendeeStats || {}).map(([userId, data]) => (
        <div key={userId}>
          User {userId}: {data.attended} meetings, {data.totalMinutes} minutes
        </div>
      ))}
    </div>
  )
}
```

---

## Mobile/Background Features

### How Background Mode Works

1. **User joins meeting on mobile**
   - Full-screen video interface
   - All controls available

2. **User needs to check something else**
   - Clicks minimize button
   - Meeting shrinks to floating window
   - User can navigate anywhere in app

3. **Floating window features**
   - Shows meeting title
   - Recording indicator
   - Quick mute button
   - End meeting button
   - Expand button

4. **User returns to meeting**
   - Clicks expand (↑) button
   - Full interface restored
   - No interruption to meeting

5. **Time tracking continues**
   - Duration tracked throughout
   - Even when minimized
   - Accurate KPI data

### Benefits
- ✅ Multitask during meetings
- ✅ Check messages/emails
- ✅ Review documents
- ✅ Look up information
- ✅ Stay in meeting continuously
- ✅ Accurate time tracking
- ✅ Better mobile experience

---

## Integration with Existing KPIs

### Adding to Performance Metrics

**In KPI Configuration:**
```typescript
{
  name: "Meeting Participation",
  metric_key: "meeting_attendance_rate",
  target: 90, // 90% attendance target
  current: stats.attendanceRate,
  status: stats.attendanceRate >= 90 ? "on-track" : "needs-attention"
}

{
  name: "Meeting Time",
  metric_key: "meeting_hours_month",
  target: 20, // 20 hours per month
  current: Math.round(stats.totalMinutes / 60),
  status: "in-progress"
}
```

**In Reports:**
```typescript
const meetingKPIs = {
  attendance: {
    value: stats.attendanceRate,
    trend: "+5%", // compared to last period
    status: "good"
  },
  efficiency: {
    value: stats.averageDuration,
    trend: "-10 min", // meetings are shorter
    status: "excellent"
  }
}
```

---

## Testing the Features

### Test Navigation
```bash
1. Login as employee
2. Check sidebar - "Meetings" should be visible
3. Click on Meetings
4. Should navigate to /employee/meetings
5. Repeat for admin and dashboard
```

### Test Time Tracking
```bash
1. Create a test meeting
2. Join the meeting
3. Check network tab - should see POST /api/meetings/:id/join
4. Wait 2 minutes
5. Leave meeting
6. Check network tab - should see POST /api/meetings/:id/leave
7. Fetch stats - GET /api/meetings/stats/user
8. Verify duration_minutes is ~2
```

### Test Background Mode
```bash
1. Join a meeting
2. Click minimize button (↓)
3. Floating window should appear bottom-right
4. Navigate to another page (e.g., Tasks)
5. Meeting should still be visible
6. Click expand (↑)
7. Full meeting view restored
```

### Test KPI APIs
```bash
# User stats
curl http://localhost:5010/api/meetings/stats/user \
  -H "Authorization: Bearer TOKEN"

# Team stats
curl http://localhost:5010/api/meetings/stats/team \
  -H "Authorization: Bearer TOKEN"

# With date range
curl "http://localhost:5010/api/meetings/stats/user?startDate=2025-01-01&endDate=2025-12-31" \
  -H "Authorization: Bearer TOKEN"
```

---

## Files Modified

### Backend
- ✅ `/server/src/models/Meeting.ts` - Added time tracking fields
- ✅ `/server/src/controllers/meetingController.ts` - Added join/leave/stats endpoints
- ✅ `/server/src/routes/meeting.routes.ts` - Registered new routes

### Frontend
- ✅ `/components/employee/sidebar.tsx` - Added Meetings link
- ✅ `/components/dashboard/sidebar.tsx` - Added Meetings link
- ✅ `/components/admin/sidebar.tsx` - Added Meetings link
- ✅ `/components/meetings/meeting-interface.tsx` - Added minimize & time tracking
- ✅ `/app/employee/meetings/page.tsx` - Employee meetings page
- ✅ `/app/admin/meetings/page.tsx` - Admin meetings page
- ✅ `/app/dashboard/meetings/page.tsx` - Manager meetings page

---

## Next Steps

1. **Add KPI Widgets**
   - Create meeting stats widgets for dashboards
   - Display in employee and manager views
   - Add charts/graphs for visualization

2. **Reports Integration**
   - Include meeting stats in performance reports
   - Add to monthly/quarterly reviews
   - Export meeting participation data

3. **Notifications**
   - Alert users who miss meetings frequently
   - Remind about upcoming meetings
   - Send meeting time summaries

4. **Advanced Analytics**
   - Meeting efficiency scores
   - Best meeting times analysis
   - Team collaboration metrics
   - Meeting cost calculator (time × attendance)

---

## Support

- Navigation issues: Check user roles and permissions
- Time tracking not working: Verify API endpoints are accessible
- Background mode issues: Check browser compatibility
- KPI data missing: Ensure meetings have been completed

**All systems operational! 🚀**
