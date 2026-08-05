# ELEVATE HR PLATFORM - COMPREHENSIVE SYSTEM STUDY

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [User Roles & Access Control](#user-roles--access-control)
4. [Authentication & Authorization](#authentication--authorization)
5. [Frontend Structure](#frontend-structure)
6. [Backend Structure](#backend-structure)
7. [Database Models](#database-models)
8. [API Endpoints](#api-endpoints)
9. [Core Features & Modules](#core-features--modules)
10. [Data Flow & Integration](#data-flow--integration)

---

## System Overview

### Project Name
**ELEVATE** - A comprehensive, multi-tenant SaaS Employee Performance & Development Platform

### Tech Stack
- **Frontend**: Next.js 15.5.7, React 18.3.1, TypeScript, TailwindCSS, Radix UI
- **Backend**: Node.js/Express, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Real-time Communication**: Socket.io, WebRTC for video calling
- **Email**: SMTP with multi-tenant configuration
- **Additional**: OpenAI for AI transcription/analysis, M-Pesa webhook support

### Key Capabilities
- Multi-tenant SaaS architecture (company-level isolation)
- Performance management with KPI tracking
- Personal Development Plans (PDPs)
- 360° feedback system
- Meeting management with AI transcription
- Stock/Inventory management
- Leave & Attendance management
- Payroll management
- Employee engagement tools
- Client/Complaint management
- Job recruitment system

---

## Architecture

### High-Level System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                     ELEVATE HR PLATFORM (SaaS)                  │
└─────────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
   │  Frontend   │    │   Backend   │    │  Database   │
   │ (Next.js)   │◄───┤  (Express)  │◄───┤ (MongoDB)   │
   └─────────────┘    └─────────────┘    └─────────────┘
        │                   │                   │
        ├─ Auth Pages       ├─ Auth Routes      ├─ Company
        ├─ Admin Pages      ├─ User Routes      ├─ User
        ├─ Employee Portal  ├─ Performance      ├─ Performance
        ├─ Manager Portal   ├─ PDP Routes       ├─ PDP
        ├─ Stock Module     ├─ Stock Routes     ├─ Task
        ├─ Meetings         ├─ Meeting Routes   ├─ Meeting
        └─ Payroll          └─ 40+ API Routes   └─ 50+ Models
```

### Multi-Tenant Architecture

```
Single Application Instance
        │
        ├─ Company A (org_id: "comp-001")
        │   ├─ Users (5)
        │   ├─ Meetings (10)
        │   └─ Tasks (50)
        │
        ├─ Company B (org_id: "comp-002")
        │   ├─ Users (8)
        │   ├─ Meetings (15)
        │   └─ Tasks (75)
        │
        └─ Company C (org_id: "comp-003")
            ├─ Users (12)
            ├─ Meetings (20)
            └─ Tasks (100)
```

**Tenant Isolation Strategy**:
- Every entity includes `org_id` field
- JWT payload contains `org_id`
- Middleware enforces tenant isolation on all requests
- Database queries filtered by `org_id`
- Audit logging for compliance

---

## User Roles & Access Control

### Role Hierarchy

```
┌──────────────────────────────────────────────────────────────┐
│                     SUPER ADMIN (System-wide)               │
│              (Manages all companies/superusers)              │
└──────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
    COMPANY ADMIN    COMPANY ADMIN      COMPANY ADMIN
    (Company A)      (Company B)        (Company C)
        │
    ┌───┼────┬────────────────┐
    ▼   ▼    ▼                ▼
   HR  MANAGER  MANAGER    EMPLOYEE
        │         │
    ┌───┴─┐   ┌───┴─┐
    ▼     ▼   ▼     ▼
  EMP1  EMP2 EMP3  EMP4
```

### Role Details

#### 1. SUPER_ADMIN
- **Scope**: System-wide
- **Access**: All companies, all users, all data
- **Typical Usage**: System administrators, SaaS provider
- **Dashboard**: `/admin` (global)
- **Permissions**:
  - Create/manage companies
  - Manage all users across companies
  - System settings and configuration
  - View all analytics and reports
  - Access compliance and audit logs

#### 2. COMPANY_ADMIN / HR
- **Scope**: Single company (org_id)
- **Access**: All data within their company
- **Login URL**: `/auth/login` (main admin login)
- **Dashboard**: `/admin`
- **Permissions**:
  - Full organization management
  - User creation/deletion
  - KPI configuration
  - Award management
  - All analytics and reporting
  - Company branding and settings
  - Email configuration

#### 3. MANAGER
- **Scope**: Single company, team members only
- **Access**: Team members, own performance, delegated tasks
- **Login URL**: `/company/[slug]` (company-specific)
- **Dashboard**: `/manager`
- **Permissions**:
  - View team members
  - Approve/reject team PDPs
  - Conduct performance evaluations
  - View team analytics
  - Assign tasks to team
  - Nominate for awards
  - Request feedback from team

#### 4. EMPLOYEE
- **Scope**: Single company, self + delegated access
- **Access**: Own profile, own PDPs, own feedback, delegated resources
- **Login URL**: `/company/[slug]` (company-specific)
- **Dashboard**: `/employee`
- **Permissions**:
  - View own performance
  - Create/update own PDPs
  - Submit self-assessments
  - Request training/resources
  - View achievements and awards
  - Book resources (desks, cars, etc.)
  - Submit suggestions
  - Vote on polls
  - Submit complaints/feedback

### Permission Matrix

| Feature | Super Admin | Admin/HR | Manager | Employee |
|---------|:----------:|:-------:|:-------:|:--------:|
| Manage Companies | ✅ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ |
| Manage Team | ❌ | ✅ | ✅ | ❌ |
| View All PDPs | ✅ | ✅ | Team Only | Own Only |
| Approve PDPs | ❌ | ✅ | ✅ | ❌ |
| Manage KPIs | ✅ | ✅ | ❌ | ❌ |
| Submit Feedback | ✅ | ✅ | ✅ | ✅ |
| Create Meetings | ✅ | ✅ | ✅ | ✅ |
| Configure System | ✅ | ✅ | ❌ | ❌ |

---

## Authentication & Authorization

### Authentication Flow

#### Admin Registration & Login

```
1. Visit /auth/signup
   ↓
2. Register Company & Admin User
   - Company info: name, email, phone, website, industry, etc.
   - Admin user: email, password, name
   ↓
3. System generates unique company SLUG
   - E.g., "acme-corp", "techstartup-123"
   ↓
4. Company & Admin User created in MongoDB
   ↓
5. Admin redirected to /admin (full dashboard)
```

#### Employee/Manager Login (Company-Specific)

```
1. Employee receives invitation with link:
   https://app.com/company/acme-corp
   ↓
2. System validates company exists via GET /api/auth/validate-company/:slug
   ↓
3. Shows company-branded login page
   ↓
4. Employee enters email + password
   ↓
5. System validates:
   - Credentials correct
   - User belongs to that company (org_id match)
   ✓ Manager → /manager
   ✓ Employee → /employee
```

#### Authentication Methods

1. **Email + Password**
   - Standard login form
   - Password hashing with bcryptjs
   - OTP verification (optional, on deployed domain)

2. **Company-Specific Login**
   - Uses company SLUG in URL
   - Routes to `/company/[slug]` page
   - Validates company exists

3. **Employee ID Login**
   - Some users have employee_id (EMP001, EMP002, etc.)
   - Alternative login via `/api/auth/employee-login`

### Company Setup Wizard (Post-Registration Onboarding)

After registration, new company admins are guided through a **5-step setup wizard** at `/setup`:

**Step 1: Company Information** (Required)
- Country, State/Province, City
- Phone number
- Website (optional)
- Allows integration with holiday calendars

**Step 2: Branding & Colors** (Optional)
- **Logo Upload**: Upload PNG or SVG company logo (~300KB recommended)
- **Primary Color**: Default #2563eb (blue)
- **Secondary Color**: Default #059669 (green)
- **Accent Color**: Default #f59e0b (amber)
- ✅ Simple and natural - just 3 colors + optional logo
- Note: Advanced branding options (fonts, button styles, backgrounds) available after setup in `/admin/settings/company`

**Step 3: Email Configuration** (Optional)
- Enable/disable SMTP configuration
- If enabled: from name, from email, SMTP host/port, credentials
- Allows sending company emails from custom domain

**Step 4: Add Employees** (Required)
- Bulk add employees with: first name, last name, email, position, department
- Creates employee records with temporary password
- Employees can reset password on first login

**Step 5: Configure KPIs** (Optional)
- Define Key Performance Indicators
- Set: KPI name, category, weight, target, unit (%)
- Department-specific KPIs supported

**Wizard Flow**:
```
1. Admin completes signup at /auth/signup
   ↓
2. System creates Company and Admin User
   ↓
3. Admin redirected to /setup (onboarding wizard)
   ↓
4. Admin completes 5 steps (can skip optional steps)
   ↓
5. Setup completion: /api/setup/complete
   ↓
6. Admin redirected to /admin dashboard
```

**Branding Customization After Setup**:
All branding settings can be modified later:
- **Location**: `/admin/settings/company` → "Company Branding" section
- **Available Options**:
  - Logo upload (PNG/SVG)
  - 8 customizable color fields (primary, secondary, accent, background, text, border-radius, font-family, button-style)
  - Font family options: system-ui, Inter, Roboto, Open Sans, Poppins, Montserrat, Lato, Georgia
  - Border radius options: 0, 0.25rem, 0.5rem, 0.75rem, 1rem, full (pill)
  - Button style options: rounded, sharp, pill
- **Changes apply immediately** to all company users (they see updates upon page refresh)

### JWT Token Structure

```typescript
interface JWTPayload {
  userId: string        // User's MongoDB _id
  email: string        // User email
  role: UserRole       // "super_admin" | "company_admin" | "manager" | "employee" | "hr"
  org_id: string       // Company identifier (multi-tenancy)
  firstName: string    // User's first name
  lastName: string     // User's last name
  iat: number          // Issued at
  exp: number          // Expiration (typically 7 days)
}
```

### Middleware & Tenant Isolation

**File**: `server/src/middleware/auth.ts`, `server/src/middleware/tenantIsolation.middleware.ts`

```typescript
// All protected routes follow this pattern:
router.use(authMiddleware)           // Verify JWT
router.use(orgMiddleware)             // Extract org_id from token
router.use(tenantIsolation)           // Enforce org_id on queries
router.use(roleMiddleware(...))       // Check specific roles if needed
```

**Key Protections**:
- ✅ JWT verified on every request
- ✅ org_id extracted from decoded token
- ✅ All database queries filtered by org_id
- ✅ Audit logging of access attempts
- ✅ Rate limiting (100 req/minute)

---

## Frontend Structure

### Directory Organization

```
app/
├── page.tsx                    # Landing page
├── layout.tsx                  # Root layout
├── globals.css                 # Global styles
│
├── auth/                       # Authentication pages
│   ├── login/                  # /auth/login
│   ├── signup/                 # /auth/signup
│   └── ...
│
├── admin/                      # Admin dashboard
│   ├── page.tsx               # /admin (main)
│   ├── users/                 # User management
│   ├── analytics/             # Analytics & reports
│   ├── settings/              # Company settings
│   ├── stock/                 # Stock management
│   ├── meetings/              # Meeting admin
│   ├── feedback-360/          # 360 feedback setup
│   └── ...
│
├── employee/                   # Employee portal
│   ├── page.tsx               # /employee (dashboard)
│   ├── pdp/                   # PDP management
│   ├── feedback/              # View feedback
│   ├── performance/           # Performance metrics
│   ├── meetings/              # Meeting list
│   ├── bookings/              # Resource booking
│   ├── suggestions/           # Suggestion box
│   ├── badges/                # Earned badges
│   ├── polls/                 # Company polls
│   ├── contracts/             # Contract alerts
│   ├── tasks/                 # Task list
│   ├── leave/                 # Leave requests
│   ├── payslip/               # Payroll info
│   └── settings/              # Profile settings
│
├── manager/                    # Manager portal
│   ├── page.tsx               # /manager (dashboard)
│   ├── team/                  # Team management
│   ├── performance/           # Team performance
│   ├── pdp-reviews/           # PDP approvals
│   ├── evaluations/           # Performance evals
│   ├── feedback/              # Team feedback
│   ├── meetings/              # Team meetings
│   ├── leave-requests/        # Leave approvals
│   └── reports/               # Team analytics
│
├── company/                    # Company auth/login
│   └── [slug]/                # /company/[company-slug]
│
├── owner/                      # Owner dashboard
│   ├── analytics/             # Business analytics
│   ├── reports/               # Reports
│   └── settings/              # Owner settings
│
└── dashboard/                  # Generic dashboard
```

### Key Frontend Pages

#### Admin Pages (`/admin/*`)
1. **Dashboard**: KPIs, recent activities, quick stats
2. **Users Management**: Create, edit, delete employees
3. **Analytics**: Performance trends, department stats, KPI tracking
4. **KPI Configuration**: Define company KPIs, set targets
5. **Awards & Recognition**: Manage badges, award points
6. **Feedback Setup**: Create 360° feedback pools
7. **Stock Management**: Products, inventory, sales
8. **Meetings**: Schedule, manage company meetings
9. **Payroll**: Salary management, pay slips
10. **Settings**: Company branding, email config

#### Employee Pages (`/employee/*`)
1. **Dashboard**: Quick overview, recent feedback, upcoming tasks
2. **PDP (Personal Development Plan)**:
   - Personal profile section
   - Vision & mission statement
   - Goals with milestones
   - Skill development
   - Action plans
3. **Performance**: KPI scores, feedback history, trending
4. **Feedback**: View 360° feedback, submit upward feedback
5. **Meetings**: Scheduled meetings, attend, view transcripts
6. **Resource Booking**: Book desks, cars, meeting rooms
7. **Suggestions**: Submit workplace improvement ideas
8. **Badges**: View earned badges and points
9. **Polls**: Vote on company decisions
10. **Contracts**: Track expiring contracts
11. **Tasks**: Task list, due dates, status tracking
12. **Leave**: Submit leave requests, view balance
13. **Payslip**: Download payroll slips

#### Manager Pages (`/manager/*`)
1. **Dashboard**: Team overview, urgent items
2. **Team**: View direct reports, team structure
3. **Performance**: Team performance evaluation
4. **PDP Reviews**: Approve/reject team PDPs
5. **Evaluations**: Conduct performance reviews
6. **Feedback**: Conduct 360° feedback sessions
7. **Meetings**: Schedule team meetings
8. **Leave Requests**: Approve/reject leave
9. **Reports**: Team analytics and reports

### Component Structure

```
components/
├── ui/                         # Radix UI components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── table.tsx
│   └── ... (30+ components)
│
├── admin/                       # Admin-specific components
│   ├── dashboard/
│   ├── user-management/
│   ├── kpi-config/
│   └── ...
│
├── employee/                    # Employee-specific components
│   ├── pdp/
│   ├── performance/
│   ├── meetings/
│   └── ...
│
├── manager/                     # Manager-specific components
│   ├── team/
│   ├── evaluations/
│   └── ...
│
├── meetings/                    # Meeting system components
│   ├── meeting-interface.tsx   # Video call interface
│   ├── meeting-list.tsx        # Meeting list view
│   ├── meeting-report.tsx      # Report view
│   └── ...
│
├── auth/                        # Authentication components
│   ├── login-form.tsx
│   ├── signup-form.tsx
│   └── ...
│
├── animations/                  # Animation components
│   ├── scroll-reveal.tsx
│   ├── fade-in.tsx
│   └── ...
│
├── three/                       # 3D components (Three.js)
│   └── three-model.tsx
│
├── dashboard/                   # Dashboard components
│   ├── stats-card.tsx
│   ├── chart.tsx
│   └── ...
│
├── landing/                     # Landing page components
│   ├── hero.tsx
│   ├── features.tsx
│   └── ...
│
└── ... (20+ component directories)
```

---

## Backend Structure

### Directory Organization

```
server/
├── src/
│   ├── config/
│   │   ├── database.ts         # MongoDB connection
│   │   ├── auth.ts             # JWT handling
│   │   └── env.ts              # Environment variables
│   │
│   ├── middleware/
│   │   ├── auth.ts             # JWT middleware
│   │   ├── tenantIsolation.middleware.ts
│   │   ├── errorHandler.ts
│   │   ├── sanitization.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   └── upload.middleware.ts
│   │
│   ├── models/                 # MongoDB Mongoose models (50+ models)
│   │   ├── User.ts
│   │   ├── Company.ts
│   │   ├── Task.ts
│   │   ├── Meeting.ts
│   │   ├── PDP.ts
│   │   ├── Performance.ts
│   │   ├── Feedback.ts
│   │   ├── Attendance.ts
│   │   ├── LeaveBalance.ts
│   │   ├── Payroll.ts
│   │   ├── StockProduct.ts
│   │   ├── StockInvoice.ts
│   │   ├── Message.ts
│   │   └── ... (30+ more)
│   │
│   ├── controllers/            # Request handlers (40+ controllers)
│   │   ├── userController.ts
│   │   ├── authController.ts
│   │   ├── performanceController.ts
│   │   ├── pdpController.ts
│   │   ├── meetingController.ts
│   │   ├── taskController.ts
│   │   ├── stockController.ts
│   │   └── ... (30+ more)
│   │
│   ├── routes/                 # Express route handlers (40+ routes)
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── performance.routes.ts
│   │   ├── pdp.routes.ts
│   │   ├── meeting.routes.ts
│   │   ├── stock.routes.ts
│   │   └── ... (35+ more)
│   │
│   ├── services/               # Business logic
│   │   ├── authService.ts
│   │   ├── userService.ts
│   │   ├── performanceService.ts
│   │   ├── aiMeetingService.ts  # AI transcription & analysis
│   │   ├── email.service.ts      # Email sending
│   │   ├── sms.service.ts        # SMS sending
│   │   ├── stockService.ts
│   │   ├── mpesa.service.ts      # M-Pesa payments
│   │   ├── holidayService.ts
│   │   └── ... (10+ more)
│   │
│   ├── types/
│   │   └── interfaces.ts        # TypeScript interfaces
│   │
│   ├── utils/
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   │
│   ├── scripts/
│   │   ├── runMigrations.mjs    # Schema migrations
│   │   ├── seed_accord_survey.js
│   │   └── ...
│   │
│   └── index.ts                 # Express app bootstrap
│
├── package.json
├── tsconfig.json
├── .env                        # Environment variables
└── dist/                       # Compiled output
```

### Main Server File (`server/src/index.ts`)

```typescript
// Key configurations:
- Express app setup
- MongoDB connection
- CORS policy (localhost + production domains)
- Middleware chain:
  ✓ Security (helmet)
  ✓ Logging (morgan)
  ✓ Body parsing (JSON, URL-encoded)
  ✓ Input sanitization
  ✓ Rate limiting (100 req/min)
  ✓ Error handling

// Route mounting (40+ API modules):
- /api/auth
- /api/users
- /api/performance
- /api/pdp
- /api/kpi
- /api/feedback
- /api/meetings
- /api/tasks
- /api/stock
- /api/payroll
- /api/leave
- /api/attendance
- /api/award
- /api/badge
- /api/poll
- ... (25+ more)

// WebRTC signaling service
// Scheduler for background tasks
// File upload handling
```

---

## Database Models

### Core Models (50+ total)

#### 1. Company Model
**Purpose**: Multi-tenant organization record

**Where to Customize Branding**: Company admins can customize all branding settings in **`/admin/settings/company`** under the **"Company Branding"** section. During initial company setup, basic branding can be configured in **Step 2: Branding & Colors** of the onboarding wizard.

```typescript
{
  _id: ObjectId
  name: string                    // E.g., "Acme Corporation"
  slug: string (unique)           // E.g., "acme-corp" for login URLs
  email: string (unique)
  phone: string
  website: string
  industry: string                // Technology, Healthcare, etc.
  employeeCount: number           // 10-50, 50-200, 200+
  logo: string                    // URL (optional, PNG/SVG recommended, ~300KB max). Customizable in /admin/settings/company
  primaryColor: string            // Default: "#2563eb". Customizable in /admin/settings/company
  secondaryColor: string          // Default: "#059669". Customizable in /admin/settings/company
  accentColor: string             // Default: "#f59e0b". Customizable in /admin/settings/company
  backgroundColor: string         // Default: "#ffffff". Customizable in /admin/settings/company
  textColor: string               // Default: "#1f2937". Customizable in /admin/settings/company
  borderRadius: string            // Default: "0.5rem". Options: 0, 0.25rem, 0.5rem, 0.75rem, 1rem, full. Customizable in /admin/settings/company
  fontFamily: string              // Default: "system-ui". Options: system-ui, Inter, Roboto, Open Sans, Poppins, Montserrat, Lato, Georgia. Customizable in /admin/settings/company
  buttonStyle: string             // Default: "rounded". Options: rounded | sharp | pill. Customizable in /admin/settings/company
  subscription: enum              // starter | professional | enterprise
  status: enum                    // active | suspended | inactive
  emailConfig: {
    enabled: boolean
    verified: boolean
    fromName: string
    fromEmail: string
    smtp: { host, port, secure, username, password }
  }
  invoiceSettings: {
    invoiceEmail: string
    contactPhone: string
    officeLocation: string
    vatNumber: string
    termsAndConditions: string
    paymentChannels: []
  }
  setupProgress: {
    completed: boolean
    currentStep: string
    steps: { companyInfo, branding, emailConfig, employees, kpis }
  }
  createdAt: Date
  updatedAt: Date
}
```

#### 2. User Model
**Purpose**: Employee/admin user record
```typescript
{
  _id: ObjectId
  org_id: string (indexed)        // Tenant identifier
  employee_id: string (unique)    // E.g., "EMP001"
  firstName: string
  lastName: string
  email: string (unique)
  password: string (bcryptjs hash)
  role: enum                      // super_admin | company_admin | manager | employee | hr
  department: string
  position: string                // Job title
  manager_id: string              // Reference to manager
  avatar: string                  // Photo URL
  signatureUrl: string            // Signature for documents
  phone: string
  dateOfJoining: Date
  status: enum                    // active | inactive | pending
  salary: number
  bankDetails: {
    accountName: string
    accountNumber: string
    bankName: string
    bankBranch: string
  }
  // IDs for compliance
  sha_id: string
  kra_pin: string
  national_id: string
  nssf_number: string
  createdAt: Date
  updatedAt: Date
}
```

#### 3. Task Model
**Purpose**: Task assignment and tracking
```typescript
{
  _id: ObjectId
  org_id: string (indexed)
  title: string
  description: string
  assigned_to: string (user_id, indexed)
  assigned_by: string (user_id)
  priority: enum                  // low | medium | high | urgent
  status: enum                    // pending | in_progress | completed | cancelled
  due_date: Date
  completed_at: Date
  notes: string
  notes_history: [{
    text: string
    user_id: string
    user_name: string
    createdAt: Date
  }]
  attachments: [string]
  postpone_requests: [{
    requested_by: string
    requested_at: Date
    new_due_date: Date
    reason: string
    status: enum                  // pending | approved | rejected
  }]
  // AI Meeting integration
  is_ai_generated: boolean        // Created by AI from meeting
  meeting_id: string              // Reference to meeting
  is_ai_reminder: boolean         // AI task reminder
  ai_source: string               // How task was created
  createdAt: Date
  updatedAt: Date
}
```

#### 4. Meeting Model
**Purpose**: Meeting scheduling and management
```typescript
{
  _id: ObjectId
  org_id: string (indexed)
  title: string
  description: string
  scheduled_at: Date (indexed)
  duration_minutes: number        // Default: 60
  meeting_type: enum              // video | audio | in-person
  meeting_id: string (unique)     // Unique identifier
  meeting_link: string            // External link (Zoom, Teams, etc.)
  password: string                // Optional meeting password
  status: enum (indexed)          // scheduled | in-progress | completed | cancelled
  organizer_id: string (indexed)
  attendees: [{
    user_id: string
    display_name: string
    is_guest: boolean
    status: enum                  // invited | accepted | declined | tentative
    attended: boolean
    joined_at: Date
    left_at: Date
    duration_minutes: number
  }]
  actual_start_time: Date
  actual_end_time: Date
  agenda: string
  transcript: string              // AI-generated
  ai_summary: string              // Meeting summary
  key_points: [string]            // Main discussion points
  action_items: [{
    description: string
    assigned_to: string
    due_date: Date
    task_id: string
  }]
  recording_url: string
  ai_processed: boolean
  ai_processing_status: enum      // pending | processing | completed | failed
  ai_processing_error: string
  created_at: Date
  updated_at: Date
}
```

#### 5. PDP Model (Personal Development Plan)
**Purpose**: Employee development tracking
```typescript
{
  _id: ObjectId
  org_id: string
  user_id: string
  period: string                  // "2025-Q1"
  title: string
  description: string
  
  // Personal Profile
  personalProfile: {
    background: string
    personalityType: string       // MBTI, etc.
    strengths: [string]
    weaknesses: [string]
    values: [string]
  }
  
  // Vision & Mission
  visionMission: {
    lifeVision: string
    missionStatement: string
    purpose: string
    legacy: string
  }
  
  // Goals with milestones
  goals: [{
    title: string
    category: enum                // career | education | finance | health | relationships
    timeframe: enum               // short_term | long_term
    targetDate: Date
    progress: number (0-100)
    status: enum                  // not_started | in_progress | completed | at_risk
    milestones: [{
      title: string
      dueDate: Date
      completed: boolean
      completedAt: Date
    }]
  }]
  
  // Action Plans
  actionPlans: [{
    goalId: string
    whatToAchieve: string
    howToAchieve: string
    timeline: string
    kpis: [string]
  }]
  
  // Skills
  skills: [{
    name: string
    currentLevel: enum            // beginner | intermediate | advanced | expert
    targetLevel: enum
    learningResources: [string]
  }]
  
  overallProgress: number (0-100)
  status: enum                    // draft | submitted | approved | rejected | completed
  manager_id: string
  manager_feedback: string
  approvedAt: Date
  createdAt: Date
  updatedAt: Date
}
```

#### 6. Performance Model
**Purpose**: Performance evaluation and scoring
```typescript
{
  _id: ObjectId
  org_id: string
  user_id: string
  period: string                  // "2025-Q1", "2025-01"
  kpi_scores: [{
    kpi_id: string
    score: number (0-100)
    achieved: number
    target: number
  }]
  overall_score: number           // Weighted average
  attendance_score: number
  feedback_score: number
  status: enum                    // pending | completed | reviewed
  reviewed_by: string
  reviewedAt: Date
  createdAt: Date
  updatedAt: Date
}
```

#### 7. Feedback Model
**Purpose**: 360° feedback and reviews
```typescript
{
  _id: ObjectId
  org_id: string
  recipient_id: string
  submitted_by: string
  feedback_type: enum             // upward | peer | downward | self
  form_type: enum                 // 360 | anonymous | survey
  rating: number (1-5)
  comments: string
  anonymous: boolean
  status: enum                    // draft | submitted | reviewed
  submittedAt: Date
  createdAt: Date
  updatedAt: Date
}
```

#### 8. Attendance Model
**Purpose**: Daily attendance tracking
```typescript
{
  _id: ObjectId
  org_id: string
  user_id: string
  date: Date
  status: enum                    // present | absent | late | half_day | leave
  checkIn: Date
  checkOut: Date
  hoursWorked: number
  remarks: string
  createdAt: Date
  updatedAt: Date
}
```

#### 9. LeaveBalance Model
**Purpose**: Leave entitlement tracking
```typescript
{
  _id: ObjectId
  org_id: string
  user_id: string
  year: number
  annual_total: number            // Default: 21
  annual_used: number             // Default: 0
  sick_total: number              // Default: 14
  sick_used: number
  maternity_total: number         // Default: 90
  maternity_used: number
  paternity_total: number         // Default: 14
  paternity_used: number
  unpaid_used: number
  createdAt: Date
  updatedAt: Date
}
```

#### 10. StockProduct Model
**Purpose**: Product inventory tracking
```typescript
{
  _id: ObjectId
  org_id: string
  name: string
  category: string
  startingPrice: number
  sellingPrice: number
  minAlertQuantity: number        // For low stock alerts
  currentQuantity: number
  assignedUsers: [string]         // Users allowed to sell
  isOutsourced: boolean
  expiryEnabled: boolean
  expiryDate: Date
  expiryReminderDays: number      // Default: 7
  createdBy: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

#### 11. StockInvoice Model
**Purpose**: Sales invoice and delivery tracking
```typescript
{
  _id: ObjectId
  org_id: string
  invoiceNumber: string (indexed)
  deliveryNoteNumber: string (indexed)
  quotationId: string
  client: {
    name: string
    number: string
    location: string
  }
  items: [{
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    lineTotal: number
    isOutsourced: boolean
  }]
  subTotal: number
  etims: {
    status: enum                  // not_posted | posted | failed
    kraInvoiceId: string
    postedAt: Date
  }
  status: enum                    // issued | paid | cancelled
  dispatch: {
    status: enum                  // not_assigned | packed | dispatched | delivered
    assignedToUserId: string
    packingItems: [...]
    delivery: { received, condition, arrivalTime }
  }
  createdBy: string
  createdAt: Date
  updatedAt: Date
}
```

### Other Important Models
- `KPI.ts` - Key Performance Indicators
- `Award.ts` - Awards and recognition
- `Badge.ts` - Gamification badges
- `Feedback.ts` - Feedback submissions
- `Notification.ts` - System notifications
- `Alert.ts` - Alert system
- `Payroll.ts` - Payroll records
- `LeaveRequest.ts` - Leave request workflow
- `Attendance.ts` - Attendance tracking
- `Message.ts` - Internal messaging
- `ResourceBooking.ts` - Resource reservations
- `Suggestion.ts` - Employee suggestions
- `Poll.ts` - Company voting
- `ContractAlert.ts` - Contract expiry tracking
- `Job.ts` - Job postings
- `JobApplication.ts` - Job applications
- `ApplicationForm.ts` - Application forms
- `CreditNote.ts` - Credit note management
- `ClientComplaint.ts` - Client complaints
- And 25+ more...

---

## API Endpoints

### Total: 200+ Endpoints across 40+ route modules

### Authentication Routes (`/api/auth/*`)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| POST | `/register-company` | Register new company | Public |
| POST | `/login` | Admin login | Public |
| POST | `/company-login` | Employee login via slug | Public |
| POST | `/employee-login` | Login with employee ID | Public |
| GET | `/validate-company/:slug` | Check company exists | Public |
| POST | `/forgot-password` | Request password reset | Public |
| POST | `/verify-otp` | Verify OTP code | Public |
| POST | `/reset-password` | Reset password | Public |
| POST | `/change-password` | Change password (logged in) | Authenticated |

### User Management (`/api/users/*`)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| GET | `/` | List all users (role-filtered) | Authenticated |
| GET | `/:userId` | Get user details | Authenticated |
| POST | `/` | Create employee | Admin/HR |
| PUT | `/:userId` | Update user | Admin/HR/Self |
| PATCH | `/:userId` | Update user (partial) | Admin/HR/Self |
| DELETE | `/:userId` | Delete user | Admin/HR |
| POST | `/:userId/signature` | Upload signature | Admin/Self |
| GET | `/team/:managerId` | Get manager's team | Manager |
| GET | `/colleagues/list` | Get organization colleagues | Authenticated |

### Performance Management (`/api/performance/*`)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| GET | `/` | List performances | Authenticated |
| GET | `/:userId/:period` | Get performance by period | Authenticated |
| PUT | `/:id/kpi/:kpiId` | Update KPI score | Manager/Admin |

### PDP Management (`/api/pdps/*`)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| GET | `/` | List PDPs (role-filtered) | Authenticated |
| GET | `/:pdpId` | Get PDP details | Authenticated |
| POST | `/` | Create PDP | Employee/Manager/Admin |
| PUT | `/:pdpId` | Update PDP | Owner/Manager/Admin |
| PUT | `/:pdpId/goal/:goalId` | Update goal progress | Owner |

### KPI Management (`/api/kpis/*`)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| GET | `/` | List all KPIs | Authenticated |
| POST | `/` | Create KPI | Admin/HR |
| PUT | `/:id` | Update KPI | Admin/HR |
| DELETE | `/:id` | Delete KPI | Admin/HR |

### Meeting Management (`/api/meetings/*`)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| GET | `/` | List meetings | Authenticated |
| GET | `/upcoming` | Get upcoming meetings | Authenticated |
| GET | `/:id` | Get meeting details | Authenticated |
| POST | `/` | Create meeting | Authenticated |
| PUT | `/:id/start` | Start meeting | Authenticated |
| PUT | `/:id/end` | End meeting | Authenticated |
| POST | `/:id/process-ai` | Process with AI | Authenticated |
| GET | `/:id/report` | Get meeting report | Authenticated |
| POST | `/:id/upload-transcript` | Upload transcript | Authenticated |

### Task Management (`/api/tasks/*`)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| GET | `/` | List tasks | Authenticated |
| GET | `/:taskId` | Get task details | Authenticated |
| POST | `/` | Create task | Admin/Manager |
| PUT | `/:taskId` | Update task | Owner/Manager/Admin |
| PATCH | `/:taskId/status` | Update status | Owner/Manager/Admin |
| DELETE | `/:taskId` | Delete task | Admin |

### Stock Management (`/api/stock/*`)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| GET | `/products` | List products | Authenticated |
| POST | `/products` | Create product | Admin |
| PUT | `/products/:id` | Update product | Admin |
| GET | `/invoices` | List invoices | Authenticated |
| POST | `/invoices` | Create invoice | Staff |
| GET | `/invoices/:id` | Get invoice details | Authenticated |
| PUT | `/invoices/:id/dispatch` | Update dispatch status | Staff |
| POST | `/quotations` | Create quotation | Staff |
| GET | `/categories` | List categories | Authenticated |
| POST | `/sales` | Record sale | Staff |

### Leave Management (`/api/leave/*`)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| GET | `/balance/:userId` | Get leave balance | Authenticated |
| POST | `/request` | Submit leave request | Employee |
| GET | `/requests` | List leave requests | Authenticated |
| PUT | `/request/:id/approve` | Approve leave | Manager/Admin |
| PUT | `/request/:id/reject` | Reject leave | Manager/Admin |

### Feedback System (`/api/feedback/*`)

| Method | Endpoint | Purpose | Access |
|--------|----------|---------|--------|
| GET | `/` | List feedback | Authenticated |
| POST | `/` | Submit feedback | Authenticated |
| GET | `/pools` | List feedback pools | Authenticated |
| POST | `/pools` | Create pool | Admin/HR |
| GET | `/360/:userId` | Get 360 feedback | Authenticated |

### Additional Routes (25+ more modules)
- `/api/attendance` - Attendance tracking
- `/api/payroll` - Payroll management
- `/api/award` - Award system
- `/api/badge` - Badge system
- `/api/poll` - Voting/polling
- `/api/contract` - Contract management
- `/api/alert` - Alert system
- `/api/job` - Job posting
- `/api/applicants` - Job applications
- `/api/messages` - Internal messaging
- `/api/company` - Company management
- `/api/notification` - Notifications
- `/api/resource` - Resource booking
- `/api/suggestion` - Suggestion box
- `/api/report` - Reports and analytics
- `/api/stamp` - Signature stamps
- `/api/complaint` - Client complaints
- `/api/holiday` - Holiday management
- And more...

---

## Core Features & Modules

### 1. Performance Management System

**Overview**: Track employee performance through KPIs, feedback, and evaluations

**Components**:
- **KPI Configuration**: Define custom KPIs with targets and weights
- **Performance Reviews**: Manager-conducted evaluations
- **Self-Assessments**: Employee self-evaluation
- **360° Feedback**: Multi-rater feedback collection
- **Performance Dashboard**: Visual metrics and trends
- **Performance History**: Historical tracking and analytics

**Key Files**:
- Model: `server/src/models/Performance.ts`
- Controller: `server/src/controllers/performanceController.ts`
- Service: `server/src/services/performanceService.ts`
- Routes: `server/src/routes/performance.routes.ts`

**Workflow**:
```
1. Admin defines KPIs with targets and weights
2. Manager conducts reviews and inputs KPI scores
3. System calculates weighted overall score
4. Employee submits self-assessment
5. Feedback compiled from multiple sources
6. Analytics dashboard displays performance metrics
```

### 2. Personal Development Plan (PDP)

**Overview**: Comprehensive employee development planning

**Sections**:
1. **Personal Profile**: Background, personality type, strengths, weaknesses
2. **Vision & Mission**: Life vision (10-20 years), mission, purpose, legacy
3. **Goals**: Short-term and long-term goals with milestones
4. **Action Plans**: How to achieve goals, resources, timeline
5. **Skill Development**: Current vs. target level, learning resources
6. **Habit Development**: New habits to form with progress tracking
7. **Journaling**: Reflection entries (daily, weekly, monthly, quarterly)
8. **Progress Tracking**: Overall completion percentage

**Workflow**:
```
1. Employee creates new PDP (draft)
2. Fills sections: profile, vision, goals, plans, skills
3. Manager reviews and provides feedback
4. Employee adjusts based on feedback
5. Manager approves
6. Status tracking: draft → submitted → approved → in_progress → completed
```

**Key Files**:
- Model: `server/src/models/PDP.ts`
- Controller: `server/src/controllers/pdpController.ts`
- Routes: `server/src/routes/pdp.routes.ts`

### 3. AI-Powered Meeting System

**Overview**: Video meetings with AI transcription, analysis, and automated task creation

**Capabilities**:
1. **Video/Audio Calling**: Real-time WebRTC communication
2. **AI Transcription**: OpenAI Whisper integration for automatic transcription
3. **AI Analysis**:
   - Meeting summary generation
   - Key points extraction (3-5 points)
   - Sentiment analysis (positive/neutral/negative)
   - Topic identification
   - Action item detection
4. **Automated Task Creation**: AI identifies action items and creates tasks
5. **Meeting Reports**: HTML reports sent to all attendees
6. **Meeting Link Management**: Support for external links (Zoom, Teams, etc.)

**Architecture**:
```
Meeting Created
    ↓
Meeting Scheduled & Invites Sent
    ↓
Meeting Starts (WebRTC established)
    ↓
Real-time Audio Recording
    ↓
Meeting Ends
    ↓
Async AI Processing:
  - Transcribe audio (OpenAI Whisper)
  - Analyze for summary & key points
  - Extract action items
  - Analyze sentiment
    ↓
Create Tasks from Action Items
    ↓
Generate HTML Report
    ↓
Send Report Email to All Attendees
```

**Key Files**:
- Model: `server/src/models/Meeting.ts`
- Service: `server/src/services/aiMeetingService.ts`
- Controller: `server/src/controllers/meetingController.ts`
- Routes: `server/src/routes/meeting.routes.ts`
- Frontend: `components/meetings/meeting-interface.tsx`

### 4. Stock/Inventory Management

**Overview**: Complete product and sales management

**Features**:
- **Product Management**: Create, edit, categorize products
- **Stock Tracking**: Current quantity, min alert quantity
- **Sales Recording**: Track sales with quantity, price, seller info
- **Invoicing**: Generate and manage sales invoices
- **Quotations**: Create quotations for clients
- **Dispatch Management**: Multi-stage dispatch workflow
- **ETIMS Integration**: E-tax management integration
- **Courier Tracking**: Integrate courier information
- **Delivery Confirmation**: Track delivery status

**Workflow**:
```
1. Admin creates categories and products
2. Sets pricing and minimum alert quantities
3. Staff records sales
4. System generates invoices
5. Invoices can be dispatched
6. Track dispatch through various stages
7. Confirm delivery
8. Manage financials (payments, credit notes)
```

**Dispatch Workflow**:
```
Invoice Created
    ↓
Packing Stage (assign items to pack)
    ↓
Dispatch Stage (courier assignment)
    ↓
In Transit
    ↓
Delivery Confirmation
```

**Key Files**:
- Models: `StockProduct.ts`, `StockInvoice.ts`, `StockSale.ts`, etc.
- Controller: `server/src/controllers/stockController.ts`
- Service: `server/src/services/stockService.ts`
- Routes: `server/src/routes/stock.routes.ts`

### 5. 360° Feedback System

**Overview**: Anonymous structured feedback collection from multiple perspectives

**Features**:
- **Feedback Pools**: Create anonymous feedback sessions
- **Custom Participants**: Add participants by name/email without database registration
- **Anonymous Tokens**: Secure tokens for anonymous access
- **Multiple Question Types**: Rating scales, text responses, etc.
- **Feedback Form Templates**: Pre-designed or custom forms
- **Anonymous Submission**: No rater identity tracking
- **Feedback Results**: Compiled feedback with privacy
- **Standard Feedback**: Non-360 feedback collection

**Type of Feedback**:
- Upward feedback (employee → manager)
- Peer feedback (colleague → colleague)
- Downward feedback (manager → employee)
- Self-assessment (employee → self)

**Key Files**:
- Model: `server/src/models/FeedbackPool.ts`, `Feedback.ts`
- Controller: `server/src/controllers/anonymousFeedbackController.ts`
- Routes: `server/src/routes/anonymousFeedback.routes.ts`

### 6. Leave Management

**Overview**: Leave request and approval workflow

**Features**:
- **Leave Types**: Annual, sick, maternity, paternity, unpaid
- **Leave Balance**: Track entitlements and usage per year
- **Leave Requests**: Submit requests with dates and reason
- **Manager Approval**: Managers approve/reject requests
- **Attendance Integration**: Marked as "leave" in attendance
- **Balance Tracking**: Real-time balance updates

**Workflow**:
```
1. Admin sets up leave year entitlements
2. Employee requests leave (with dates, type, reason)
3. Manager reviews and approves/rejects
4. If approved: attendance marked as "leave", balance reduced
5. Notifications sent to employee and manager
```

**Key Files**:
- Models: `LeaveRequest.ts`, `LeaveBalance.ts`
- Controller: `server/src/controllers/LeaveController.ts`
- Routes: `server/src/routes/leave.routes.ts`

### 7. Attendance Tracking

**Overview**: Daily attendance and check-in system

**Features**:
- **Daily Check-In**: Mark presence, late, half-day, absent, leave
- **Check-In/Out Times**: Track entry and exit times
- **Hours Worked Calculation**: Automatic calculation
- **Attendance Anomaly Detection**: Identify patterns
- **Monthly Reports**: Attendance summaries
- **Integration with Leave**: Marked as leave during leave periods

**Status Types**:
- Present
- Absent
- Late
- Half Day
- Leave

**Key Files**:
- Model: `server/src/models/Attendance.ts`
- Controller: `server/src/controllers/attendanceController.ts`
- Routes: `server/src/routes/attendance.routes.ts`

### 8. Payroll Management

**Overview**: Salary processing and pay slip management

**Features**:
- **Salary Configuration**: Set salary per employee
- **Deductions**: Tax, NSSF, other deductions
- **Pay Periods**: Monthly, bi-weekly configurations
- **Pay Slip Generation**: Automated pay slip creation
- **Pay Slip Distribution**: Email delivery
- **Payroll Reports**: Analysis and summaries

**Key Files**:
- Model: `server/src/models/Payroll.ts`
- Controller: `server/src/controllers/PayrollController.ts`
- Routes: `server/src/routes/payroll.routes.ts`

### 9. Employee Engagement Features

#### a) Resource Booking
**Path**: `/employee/bookings`
- Book desks, cars, meeting rooms, parking, equipment
- Date range selection
- Approval workflow (pending → approved → completed)
- Personal booking list

#### b) Suggestions Box
**Path**: `/employee/suggestions`
- Submit improvement suggestions
- Anonymous or identified options
- Categories: workplace, culture, process, benefits, tech
- Upvoting system
- Admin response tracking

#### c) Badges & Gamification
**Path**: `/employee/badges`
- View earned badges
- Points system
- Leaderboard
- Badge categories and criteria
- Award reasons tracking

#### d) Voting/Polls
**Path**: `/employee/polls`
- Vote on company decisions
- Poll types: employee_of_month, policy_change, etc.
- Real-time results
- Anonymous voting option
- Department-specific polls

#### e) Contract Alerts
**Path**: `/employee/contracts`
- Track contract expiry dates
- Contract types: employment, probation, project, etc.
- Visual expiry alerts
- Renewal tracking
- Acknowledgment system

### 10. Job Recruitment

**Overview**: Job posting and application management

**Features**:
- **Job Posting**: Create job openings
- **Applications**: Manage applications
- **Application Forms**: Custom forms per job
- **Analytics**: Tracking application sources and status
- **Interview Tracking**: Schedule and track interviews

**Key Files**:
- Models: `Job.ts`, `JobApplication.ts`, `ApplicationForm.ts`
- Controllers: `jobController.ts`, `jobApplicationController.ts`
- Routes: `job.routes.ts`, `jobApplication.routes.ts`

### 11. Client & Complaint Management

**Overview**: Client relationship and complaint handling

**Features**:
- **Client Communication**: Track client interactions
- **Complaint Management**: Log and track complaints
- **Follow-up Tracking**: Schedule follow-ups
- **Resolution Tracking**: Track complaint resolution

**Key Files**:
- Model: `ClientComplaint.ts`
- Routes: `complaint.routes.ts`

### 12. Alert System

**Overview**: Automated alerts for important events

**Alert Types** (8 types):
1. Contract expiry warnings
2. Incomplete PDP alerts
3. Attendance anomalies
4. Task overload
5. Low performance alerts
6. Low leave balance
7. Project deadline approaching
8. Feedback pending

**Features**:
- Severity levels (Low, Medium, High, Critical)
- Smart filtering
- Action URLs for resolution
- Metadata for context

**Key Files**:
- Model: `Alert.ts`
- Routes: `alert.routes.ts`

---

## Data Flow & Integration

### Request-Response Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser/React)                        │
└──────────────────────────────────────────────────────────────────┘
                            │
                            │ (1) HTTP Request + JWT Token
                            │ lib/api.ts or fetch()
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                  SERVER (Express.js)                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ (2) Middleware Chain                                       │  │
│  │  - helmet() - Security headers                             │  │
│  │  - morgan() - Request logging                              │  │
│  │  - cors() - Cross-origin validation                        │  │
│  │  - express.json() - Parse request body                     │  │
│  │  - sanitizeInput() - Input validation                      │  │
│  │  - apiLimiter - Rate limiting (100 req/min)               │  │
│  │  - authMiddleware - Verify JWT token                       │  │
│  │  - orgMiddleware - Extract org_id from token              │  │
│  │  - tenantIsolation - Enforce tenant isolation             │  │
│  │  - roleMiddleware - Check specific roles                   │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            │                                      │
│  (3) Route Handler (Controller)                                   │
│    ┌──────────────────────────────────────────────────────┐      │
│    │ Example: UserController.getUserById()                │      │
│    │  - Validate request parameters                       │      │
│    │  - Check authorization                              │      │
│    │  - Call service layer                               │      │
│    └──────────────────────────────────────────────────────┘      │
│                            │                                      │
│  (4) Service Layer (Business Logic)                              │
│    ┌──────────────────────────────────────────────────────┐      │
│    │ Example: UserService.getUserById()                   │      │
│    │  - Execute business logic                            │      │
│    │  - Interact with models                              │      │
│    │  - Transform data                                    │      │
│    │  - Call external services (email, SMS, etc.)         │      │
│    └──────────────────────────────────────────────────────┘      │
│                            │                                      │
│  (5) Database Query                                              │
│    ┌──────────────────────────────────────────────────────┐      │
│    │ Mongoose Model Query                                  │      │
│    │ User.findOne({                                        │      │
│    │   _id: userId,                                        │      │
│    │   org_id: req.org_id  // Tenant isolation            │      │
│    │ })                                                    │      │
│    └──────────────────────────────────────────────────────┘      │
│                            │                                      │
│  (6) MongoDB Response                                            │
│    ┌──────────────────────────────────────────────────────┐      │
│    │ Returns user document or null                         │      │
│    └──────────────────────────────────────────────────────┘      │
│                            │                                      │
│  (7) API Response Generation                                     │
│    ┌──────────────────────────────────────────────────────┐      │
│    │ {                                                     │      │
│    │   success: boolean                                    │      │
│    │   message: string                                     │      │
│    │   data: {...}                                         │      │
│    │ }                                                     │      │
│    └──────────────────────────────────────────────────────┘      │
│                            │                                      │
│  (8) Error Handling (if any)                                     │
│    ┌──────────────────────────────────────────────────────┐      │
│    │ errorHandler.middleware catches errors:              │      │
│    │ - Validation errors                                  │      │
│    │ - Database errors                                    │      │
│    │ - Authorization errors                               │      │
│    │ - Server errors                                      │      │
│    └──────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────┘
                            │
                            │ (9) HTTP Response + Status Code
                            │ 200, 201, 400, 401, 403, 404, 500
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser/React)                        │
│  (10) Process Response                                            │
│   - api.ts handles response                                       │
│   - Updates state (useState, Redux, etc.)                         │
│   - Triggers UI re-render                                         │
│   - On 401: Calls logout() and redirects to /auth/login         │
└──────────────────────────────────────────────────────────────────┘
```

### Frontend API Client (`lib/api.ts`)

The frontend uses a centralized API client for most requests:

```typescript
const api = new ApiClient()

// Sets Authorization header with JWT token
// Handles 401 errors by logging out
// Provides typed methods for all endpoints

await api.authApi.login(email, password)
await api.usersApi.getAll()
await api.performanceApi.getByPeriod(userId, period)
await api.pdpsApi.create(pdpData)
await api.meetingsApi.create(meetingData)
await api.stockApi.createInvoice(invoiceData)
// ... 50+ API methods
```

### Backend Request Processing

**Step-by-step** for a typical request:

```
1. Client sends request:
   POST /api/pdps/create
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   Body: { title: "2025 Development Plan", ... }

2. Express receives request, executes middleware chain:
   - helmet() - Adds security headers
   - morgan() - Logs request details
   - cors() - Validates origin
   - json parser - Parses body
   - sanitize - Sanitizes string inputs
   - rate limiter - Checks request count
   - authMiddleware:
     * Extracts token from Authorization header
     * Calls jwt.verify(token, JWT_SECRET)
     * Sets req.user = decoded payload
     * Sets req.org_id = decoded.org_id
   - orgMiddleware - Confirms org_id presence
   - tenantIsolation - Logs audit event
   - roleMiddleware - Checks if user.role is allowed

3. Router matches route: /api/pdps/create → POST handler
   - Constructor call: PdpController.createPdp(req, res)

4. Controller executes:
   - Validates req.org_id exists
   - Validates req.body (title, description, etc.)
   - Calls PdpService.createPdp(org_id, userId, data)

5. Service executes business logic:
   - Checks if user can create PDP (role-based)
   - Creates PDP document
   - Calls PDP.create({ org_id, user_id, ...data })

6. Mongoose executes validators:
   - Schema validation
   - Required field checks
   - Default value assignment

7. MongoDB processes insert:
   - Creates document
   - Returns with _id
   - Indexes are updated

8. Service returns result:
   - { success: true, message, data: pdp }

9. Controller sends response:
   res.status(201).json(result)

10. Client receives response:
    - Checks status code
    - If 2xx: treats as success
    - If 401: calls logout()
    - Updates UI with data
```

### Multi-Tenant Data Isolation Example

```typescript
// Request from Company A employee (org_id: "comp-001")
const req.user = { org_id: "comp-001", role: "employee", userId: "user-123" }
const req.org_id = "comp-001"

// Query: Get PDPs
await PDP.find({ org_id: "comp-001", user_id: "user-123" })

// Result: Only PDPs from Company A are returned
// Company B's PDPs are completely hidden
// Even if Company A employee guesses Company B's PDP ID:
await PDP.findById("comp-002-pdp-id")
// The tenantIsolation middleware adds: AND org_id="comp-001"
// Result: null (access denied)
```

### Complex Feature: AI Meeting System Flow

```
1. User creates meeting at /employee/meetings
   Frontend: POST /api/meetings
   { title, description, scheduled_at, attendees }

2. Backend creates Meeting document
   Status: "scheduled"
   Sends calendar invites via email

3. During meeting:
   - WebRTC signaling (server/src/services/webrtcSignaling.ts)
   - Audio recording
   - Real-time transcript (optional)

4. Meeting ends:
   User clicks "End Meeting"
   Frontend: PUT /api/meetings/:id/end
   Backend updates status to "completed"

5. Async AI Processing Triggered:
   Frontend: POST /api/meetings/:id/process-ai
   
   Backend:
   a) Call aiMeetingService.transcribeAudio()
      - Send audio to OpenAI Whisper API
      - Get full transcript
      
   b) Call aiMeetingService.analyzeMeeting()
      - Send transcript to GPT-4
      - Get: summary, key_points, sentiment
      
   c) Call aiMeetingService.createTasksFromActionItems()
      - Extract action items from analysis
      - For each item: Call Task.create()
      - Mark as is_ai_generated=true
      
   d) Call aiMeetingService.generateMeetingReport()
      - Create HTML report
      - Include: summary, points, items, transcript
      
   e) Call aiMeetingService.sendMeetingReportsToAttendees()
      - Get all attendee emails
      - Send HTML report via email service

6. Frontend shows report:
   Meeting report tabs: Summary, Key Points, Actions, Transcript
   Displays sentiment, action items created

7. Tasks View:
   Employee sees new tasks marked "AI Created" with meeting link
```

### Stock Invoice Dispatch Workflow

```
Invoice Created (status: "issued")
│
├─ Items specified with quantity and price
├─ Invoice number generated
├─ Client information recorded
│
▼
Dispatch Assignment (staff clicks "Assign for Dispatch")
│
├─ Select user to pack items
├─ User enters packing details:
│   - For each item: how many packed vs. required
│   - Mark when packing complete
│
▼
Packing Stage (dispatch.status: "packing")
│
├─ Selected user packs items from warehouse
├─ Marks which items are ready
│
▼
Ready for Dispatch (dispatch.status: "packed")
│
├─ User selects courier
├─ Enters tracking details
│
▼
Dispatch (dispatch.status: "dispatched")
│
├─ Courier information saved
├─ Delivery date estimated
│
▼
Delivery Confirmation (dispatch.delivery)
│
├─ Client receives and confirms
├─ Confirmation details:
│   - Received: yes/no
│   - Condition: good/not_good
│   - Arrival time
│   - Everything packed: yes/no
│   - Notes
│
▼
Complete (dispatch.status: "delivered")
│
└─ Invoice marked delivered
```

---

## Summary: System Capabilities

### What This System Does

✅ **HR Management**
- Employee database with detailed profiles
- Role-based access control (5 role levels)
- User creation, editing, deletion
- Team hierarchy and manager relationships
- Attendance tracking
- Leave management with approvals
- Payroll with pay slips

✅ **Performance Management**
- Custom KPI definition and tracking
- Performance reviews and ratings
- 360° feedback collection (anonymous)
- Performance trends and analytics
- Performance dashboards

✅ **Employee Development**
- Personal Development Plans (PDPs)
- Goal setting with milestones
- Skill development tracking
- Habit tracking
- Progress monitoring
- Manager feedback and approval workflow

✅ **Meetings & Collaboration**
- Video/audio calling with WebRTC
- Real-time transcription (AI)
- Meeting analysis (summary, key points, sentiment)
- Automated task creation from meetings
- Meeting reports sent to attendees
- External meeting links (Zoom/Teams)

✅ **Employee Engagement**
- Resource booking (desks, cars, rooms)
- Suggestions box with voting
- Gamification (badges, points, leaderboards)
- Company polling and voting
- Contract expiry tracking
- Task management

✅ **Stock & Inventory**
- Product and category management
- Sales tracking
- Invoice generation
- Quotations
- Multi-stage dispatch workflow
- Courier tracking
- Delivery confirmation
- ETIMS E-tax integration

✅ **Communication**
- Internal messaging
- Client communication rooms
- Complaint management
- Bulk SMS campaigns
- Multi-tenant email configuration

✅ **Analytics & Reporting**
- Performance dashboards
- Attendance reports
- Department analytics
- Payroll reports
- Stock analytics
- Leave analytics

✅ **Additional Features**
- Job recruitment system
- Alert system (8 types)
- Audit logging
- Multi-tenant data isolation
- Company branding customization
- Role-based permissions

### Technology Highlights

✅ **Scalable Architecture**: Multi-tenant design supports unlimited companies
✅ **Security**: JWT authentication, tenant isolation, rate limiting, input sanitization
✅ **Real-Time**: WebRTC for video calls, potentially Socket.io for live updates
✅ **AI Integration**: OpenAI for meeting transcription and analysis
✅ **RESTful API**: 200+ endpoints across 40+ modules
✅ **Modern UI**: Next.js, React, Radix UI, TailwindCSS
✅ **Type Safety**: Full TypeScript in frontend and backend
✅ **Database**: MongoDB for flexibility and scalability
✅ **Email**: SMTP with multi-tenant configuration
✅ **Payments**: M-Pesa webhook integration for African markets

---

## Key Takeaways

1. **Multi-Tenant SaaS**: Supports multiple companies with complete data isolation
2. **Comprehensive HR Platform**: Covers recruitment to retirement
3. **AI-Powered**: AI transcription, analysis, and task creation
4. **Modern Stack**: Next.js, Express, MongoDB, TypeScript
5. **Scalable**: Designed for enterprise use
6. **Secure**: Multiple layers of security and authorization
7. **Extensible**: 50+ models and 200+ API endpoints allow easy feature additions
8. **User-Centric**: Different UIs for different roles (admin, manager, employee)
9. **International**: M-Pesa, ETIMS, SMS integration for African markets
10. **Complete**: Handles every aspect of HR and business operations

