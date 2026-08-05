# Client Complaints System Documentation

## Overview

The Client Complaints System is a comprehensive module for managing and tracking client complaints within the Employee HR system. It enables administrators to record, categorize, assign, and resolve customer complaints efficiently while maintaining communication logs and internal notes.

---

## Features

### 1. **Complaint Registration**
- Register new complaints directly from clients section
- Capture essential information:
  - Client information (name, number, email, phone)
  - Complaint title and detailed description
  - Category classification
  - Priority level (Low, Medium, High, Urgent)
  - Optional attachment support

### 2. **Complaint Dashboard**
- **Statistics Overview:**
  - Total complaints count
  - Open complaints count
  - Pending client feedback count
  - Resolved complaints count
  - Escalated complaints count

- **Advanced Filtering:**
  - Filter by status (new, under_review, assigned, in_progress, pending_client_feedback, escalated, resolved, closed)
  - Filter by priority (urgent, high, medium, low)
  - Search by complaint ID, title, client name, or description

### 3. **Complaint Assignment**
- Assign complaints to employees for resolution
- Track assignment history
- Link complaints to employee duties/tasks
- Automatic status update when assigned

### 4. **Communication Management**
- **Client Communications:**
  - Send messages/responses to clients
  - Track all client-staff interactions
  - Timestamp all communications
  - Support for file attachments

- **Internal Notes:**
  - Add confidential internal notes
  - Track note author and timestamp
  - Maintain internal communication history

### 5. **Complaint Resolution**
- Mark complaints as resolved with:
  - Resolution notes
  - Resolution type (refund, replacement, service_repeat, apology, compensation, other)
  - Client satisfaction rating (1-5 scale)
  - Resolver identification

- **Workflow Status Tracking:**
  - New → Under Review → Assigned → In Progress
  - Pending Client Feedback
  - Escalation management
  - Resolution and closure

### 6. **Complaint Categories**
- Poor Service
- Delayed Delivery
- Billing Issues
- Product Defects
- Staff Misconduct
- Technical Problems
- Warranty Claims
- Refund Requests
- Quality Issues
- Other

---

## User Roles & Permissions

### **Administrator**
- View all complaints across the organization
- Create new complaints
- Assign complaints to employees
- Add internal notes
- Manage complaint resolution
- View analytics and reports
- Close complaints

### **Assigned Employee**
- View assigned complaints
- Communicate with clients
- Add internal notes
- Update complaint status
- Resolve complaints
- Provide resolution details

### **Manager/Supervisor**
- View team complaints
- Approve/review resolutions
- Escalate complaints when needed
- Access reporting and analytics

---

## Complaint Lifecycle

```
NEW
  ↓
UNDER_REVIEW
  ↓
ASSIGNED → (to employee)
  ↓
IN_PROGRESS → (work in progress)
  ↓
PENDING_CLIENT_FEEDBACK → (waiting for client response)
  ↓
RESOLVED → (resolution provided)
  ↓
CLOSED → (final closure)

Alternative: ESCALATED → (if urgent/complex)
```

---

## API Endpoints

### **List Complaints**
```http
GET /api/complaints?status=&priority=&search=
```
Query Parameters:
- `status`: Filter by status
- `priority`: Filter by priority
- `search`: Search term
- `clientId`: Filter by client
- `assignedTo`: Filter by assigned employee

### **Get Single Complaint**
```http
GET /api/complaints/:complaintId
```

### **Create Complaint**
```http
POST /api/complaints
Body: {
  "clientId": "string",
  "title": "string",
  "description": "string",
  "complaintCategory": "string",
  "priority": "low|medium|high|urgent",
  "attachments": ["url1", "url2"]
}
```

### **Update Complaint**
```http
PUT /api/complaints/:complaintId
Body: { ...updateFields }
```

### **Assign Complaint**
```http
PATCH /api/complaints/:complaintId/assign
Body: { "assignedTo": "employeeId" }
```

### **Add Internal Note**
```http
POST /api/complaints/:complaintId/notes
Body: { "note": "string" }
```

### **Add Client Communication**
```http
POST /api/complaints/:complaintId/communicate
Body: { 
  "message": "string",
  "senderRole": "staff|client",
  "attachments": ["url1"]
}
```

### **Resolve Complaint**
```http
PATCH /api/complaints/:complaintId/resolve
Body: {
  "resolutionType": "refund|replacement|service_repeat|apology|compensation|other",
  "resolutionNotes": "string",
  "clientFeedback": "string",
  "satisfactionRating": 1-5
}
```

### **Close Complaint**
```http
PATCH /api/complaints/:complaintId/close
```

### **Get Statistics**
```http
GET /api/complaints/stats
```
Returns: Total, open, pending, resolved, escalated counts by category and priority

---

## Frontend Navigation

### **Admin Sidebar**
- **Location:** Accounts Section
- **Item:** Client Complaints
- **Routes:**
  - `/admin/accounts/complaints` - Main list view
  - `/admin/accounts/complaints/new` - Create new complaint
  - `/admin/accounts/complaints/:complaintId` - Complaint detail view

### **Main Pages**

#### 1. **Complaints List Page** (`/admin/accounts/complaints`)
- Dashboard with statistics cards
- Complaints list with filters and search
- Quick preview of selected complaint
- Action button to view full details

#### 2. **Create Complaint Page** (`/admin/accounts/complaints/new`)
- Form to register new complaint
- Client selection dropdown
- Category selection
- Priority setting
- Description input

#### 3. **Complaint Detail Page** (`/admin/accounts/complaints/[complaintId]`)
- Complete complaint overview
- Client communication section
- Internal notes section
- Assignment management
- Resolution interface
- Client satisfaction tracking

---

## Database Schema

### **ClientComplaint Model**

```typescript
interface IClientComplaint {
  _id?: string
  org_id: string
  complaintId?: string                    // COMP-2024-001
  clientId: string                        // Reference to StockClient
  clientName: string
  clientNumber: string
  clientEmail?: string
  clientPhone?: string
  complaintCategory: string               // enum
  priority: "low" | "medium" | "high" | "urgent"
  status: "new" | "under_review" | "assigned" | "in_progress" | 
          "pending_client_feedback" | "escalated" | "resolved" | "closed"
  title: string
  description: string
  attachments?: string[]                  // File URLs
  submittedBy: string                     // User ID
  submittedByName?: string
  assignedTo?: string                     // Employee ID
  assignedToName?: string
  relatedTaskId?: string                  // Link to Task model
  escalatedTo?: string
  escalationReason?: string
  
  communications?: Array<{
    senderUserId: string
    senderName?: string
    senderRole?: "client" | "staff"
    message: string
    attachments?: string[]
    createdAt?: Date
  }>
  
  internalNotes?: Array<{
    userId: string
    userName?: string
    note: string
    createdAt?: Date
  }>
  
  resolution?: {
    resolvedBy: string                    // Employee ID
    resolvedByName?: string
    resolutionType?: string
    resolutionNotes?: string
    clientFeedback?: string
    satisfactionRating?: number           // 1-5
    resolvedAt?: Date
  }
  
  createdAt?: Date
  updatedAt?: Date
  dueDate?: Date
  resolvedAt?: Date
  closedAt?: Date
}
```

---

## Integration with Other Modules

### **Client Management**
- Complaints are linked to existing clients in the `clients` section
- Complaint history visible in client accounts dashboard

### **Employee Tasks**
- Complaints can be converted to tasks for employee assignments
- Related task ID tracked in complaint record

### **User Management**
- Complaint resolution tracked against employee records
- Resolution counts contribute to employee performance metrics

### **Notifications** (Future Enhancement)
- Email notifications for new complaint assignments
- SMS alerts for escalated complaints
- Status update notifications to clients

---

## Key Workflows

### **Workflow 1: Standard Resolution**
1. Client submits complaint → Complaint created (Status: NEW)
2. Admin reviews → Status: UNDER_REVIEW
3. Admin assigns to employee → Status: ASSIGNED
4. Employee works on resolution → Status: IN_PROGRESS
5. Employee adds client communication → Status: IN_PROGRESS
6. Employee resolves with satisfaction rating → Status: RESOLVED
7. Admin closes complaint → Status: CLOSED

### **Workflow 2: With Escalation**
1. Complaint created (Status: NEW)
2. Complex issue identified
3. Escalated to manager → Status: ESCALATED
4. Manager assigns and resolves
5. Client feedback collected
6. Complaint closed

### **Workflow 3: With Client Feedback**
1. Complaint resolved
2. Awaiting client confirmation → Status: PENDING_CLIENT_FEEDBACK
3. Client provides feedback and satisfaction rating
4. Complaint closed based on feedback

---

## Analytics & Reporting

### **Available Metrics**
- Total complaints by client
- Average resolution time
- Satisfaction ratings distribution
- Most common complaint categories
- Complaint trends over time
- Employee resolution performance
- Escalation rate and reasons

---

## Best Practices

1. **Timely Response:**
   - Acknowledge complaints within 24 hours
   - Provide regular status updates

2. **Clear Communication:**
   - Use separate channels: external (client communication) vs internal (notes)
   - Maintain professional tone in client communications

3. **Proper Documentation:**
   - Log all interactions and decisions
   - Attach supporting documents and evidence

4. **Follow-up:**
   - Obtain client satisfaction rating
   - Request feedback on resolution quality

5. **Escalation Management:**
   - Escalate promptly if resolution exceeds SLA
   - Involve management for complex cases

---

## Future Enhancements

- [ ] Automated email notifications
- [ ] SMS escalation alerts
- [ ] Complaint satisfaction surveys
- [ ] SLA (Service Level Agreement) tracking
- [ ] Complaint templates
- [ ] Multi-channel complaint intake (phone, email, chat)
- [ ] AI-powered complaint categorization
- [ ] Predictive analytics for resolution time
- [ ] Integration with CRM systems
- [ ] Public complaint portal for clients

---

## Support & Troubleshooting

### **Common Issues**

| Issue | Solution |
|-------|----------|
| Can't see client in dropdown | Ensure client exists in Stock Clients section |
| Complaint not saving | Verify all required fields are filled |
| Assignment not working | Check employee status (must be active) |
| Communication not sending | Ensure internet connection and valid email |

### **Contact**
For technical support or feature requests, contact the development team.

---

**Last Updated:** May 2024  
**Version:** 1.0  
**Status:** Production Ready
