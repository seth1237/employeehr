# Elevate HR Platform - Complete System Documentation

## Project Overview

**Elevate** is a multi-tenant SaaS Employee Performance & Development Platform that combines:
- Performance tracking & KPI management
- Personal Development Plans (PDPs)
- Employee recognition & awards
- 360° feedback system
- Analytics & reporting
- Automated workflows

## System Architecture

### Multi-Tenant Design

Each company gets:
- **Unique slug** for company-specific login URLs (e.g., `yourapp.com/company/acme-corp`)
- **Isolated data** via `org_id` tenant separation
- **Custom branding** (logo, primary/secondary colors)
- **Independent user management**

---

## User Roles & Access Levels

### 1. **Company Admin** (`company_admin`)
**Login:** Main admin login (`/auth/login`) or company-specific URL
**Dashboard:** `/admin`

**Capabilities:**
- Full organization management
- Create/edit/delete all users
- Configure KPIs and performance metrics
- Manage awards and recognition
- Access all analytics and reports
- Company settings and branding
- Subscription management

**Menu Items:**
- Dashboard
- Manage Users
- KPI Configuration
- Awards & Recognition
- Analytics
- Reports
- Company Settings
- System Settings

### 2. **HR Officer** (`hr`)
**Login:** Same as company admin
**Dashboard:** `/admin`
**Capabilities:** Similar to company admin with focus on HR operations

### 3. **Manager** (`manager`)
**Login:** Company-specific URL (`/company/[slug]`)
**Dashboard:** `/manager`

**Capabilities:**
- View and manage direct reports only
- Approve/reject PDPs for team members
- Conduct performance evaluations
- Submit team feedback
- View team analytics
- Nominate team for awards
- Access team performance reports

**Menu Items:**
- Manager Dashboard
- My Team
- Evaluations
- Feedback
- PDP Reviews
- Team Analytics

### 4. **Employee** (`employee`)
**Login:** Company-specific URL (`/company/[slug]`)
**Dashboard:** `/employee`

**Capabilities:**
- View personal performance metrics
- Create and update PDPs
- Track personal goals
- View feedback received
- View awards and recognitions
- Request training/learning resources
- Self-evaluation

**Menu Items:**
- My Dashboard
- My PDPs
- My Feedback
- My Awards
- Performance History

---

## Authentication Flow

### Company Registration
1. Admin visits `/auth/signup`
2. Fills company registration form
3. System generates unique **slug** from company name
4. Creates company record + admin user
5. Admin redirected to `/admin` dashboard

### Admin/HR Login
1. Visit `/auth/login` (main login)
2. Enter email + password
3. System validates credentials
4. Redirects to `/admin` dashboard

### Employee/Manager Login (Company-Specific)
1. Visit `/company/[company-slug]` (e.g., `/company/acme-corp`)
2. System validates company exists and is active
3. Shows company-branded login page
4. Enter email + password
5. System validates user belongs to that company
6. Redirects based on role:
   - Manager → `/manager`
   - Employee → `/employee`

**Employee Login URL Format:**
```
https://yourapp.com/company/acme-corp
https://yourapp.com/company/techstartup-123
https://yourapp.com/company/big-enterprise
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/api/auth/register-company` | Register new company | Public |
| POST | `/api/auth/login` | Admin login | Public |
| POST | `/api/auth/company-login` | Employee login via slug | Public |
| GET | `/api/auth/validate-company/:slug` | Check if company exists | Public |
| POST | `/api/auth/change-password` | Change password | Authenticated |

### Users
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/users` | Get all users (role-filtered) | Authenticated |
| GET | `/api/users/:userId` | Get user details | Authenticated |
| POST | `/api/users` | Create employee | Admin/HR |
| PUT | `/api/users/:userId` | Update user | Admin/HR/Self |
| DELETE | `/api/users/:userId` | Delete user | Admin/HR |
| GET | `/api/users/team/:managerId` | Get manager's team | Manager |

### Performance
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/performance` | List performances | Authenticated |
| GET | `/api/performance/:userId/:period` | Get performance by period | Authenticated |
| PUT | `/api/performance/:id/kpi/:kpiId` | Update KPI score | Manager/Admin |

### PDPs
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/pdps` | List PDPs (role-filtered) | Authenticated |
| GET | `/api/pdps/:pdpId` | Get PDP details | Authenticated |
| POST | `/api/pdps` | Create PDP | Employee/Manager/Admin |
| PUT | `/api/pdps/:pdpId` | Update PDP | Owner/Manager/Admin |
| PUT | `/api/pdps/:pdpId/goal/:goalId` | Update goal progress | Owner |

### KPIs
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/kpis` | List all KPIs | Authenticated |
| POST | `/api/kpis` | Create KPI | Admin/HR |
| PUT | `/api/kpis/:id` | Update KPI | Admin/HR |
| DELETE | `/api/kpis/:id` | Delete KPI | Admin/HR |

### Awards
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/awards` | List awards | Authenticated |
| POST | `/api/awards` | Create award | Admin/HR/Manager |
| GET | `/api/awards/leaderboard/top` | Get top performers | Authenticated |

### Feedback
| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/api/feedback` | List feedback | Authenticated |
| POST | `/api/feedback` | Submit feedback | Authenticated |

---

## Database Schema

### Company Model
```typescript
{
  _id: ObjectId
  name: string                    // "Acme Corporation"
  slug: string (unique)           // "acme-corp" (for login URL)
  email: string (unique)          // Company contact email
  phone: string
  website: string
  industry: string                // "Technology", "Healthcare", etc.
  employeeCount: string           // "10-50", "50-200", etc.
  logo: string                    // URL to logo
  primaryColor: string            // "#2563eb" (company branding)
  secondaryColor: string          // "#059669"
  subscription: enum              // "starter" | "professional" | "enterprise"
  status: enum                    // "active" | "suspended" | "inactive"
  createdAt: Date
  updatedAt: Date
}
```

### User Model
```typescript
{
  _id: ObjectId
  org_id: string (indexed)        // Links to Company
  firstName: string
  lastName: string
  email: string (unique)
  password: string (hashed)
  role: enum                      // "company_admin" | "hr" | "manager" | "employee"
  department: string
  manager_id: string              // Reference to manager
  avatar: string
  phone: string
  dateOfJoining: Date
  status: enum                    // "active" | "inactive" | "pending"
  createdAt: Date
  updatedAt: Date
}
```

### Performance Model
```typescript
{
  _id: ObjectId
  org_id: string (indexed)
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
  status: enum                    // "pending" | "completed" | "reviewed"
  reviewed_by: string
  reviewedAt: Date
}
```

### PDP Model
```typescript
{
  _id: ObjectId
  org_id: string (indexed)
  user_id: string
  period: string
  title: string
  description: string
  goals: [{
    title: string
    description: string
    linkedKPI: string
    targetDate: Date
    progress: number (0-100)
    status: enum                  // "not_started" | "in_progress" | "completed" | "at_risk"
    milestones: [{
      title: string
      dueDate: Date
      completed: boolean
      completedAt: Date
    }]
  }]
  overallProgress: number (0-100)
  status: enum                    // "draft" | "submitted" | "approved" | "rejected" | "completed"
  manager_id: string
  manager_feedback: string
  approvedAt: Date
}
```

---

## Key Features by Module

### 1. **Performance Management**
- Configure custom KPIs per role/department
- Weight-based scoring (e.g., Sales 40%, Quality 30%, Attendance 30%)
- Periodic reviews (monthly, quarterly, annual)
- Manager evaluations with comments
- Self-assessments
- 360° peer feedback
- Performance trends and history

### 2. **Personal Development Plans (PDPs)**
- SMART goal framework
- Link goals to KPIs
- Milestones with due dates
- Progress tracking (0-100%)
- Manager approval workflow
- Learning resource requests
- PDP templates by role
- Quarterly/annual versioning

### 3. **Employee Recognition & Awards**
- Automated ranking algorithms
- Configurable scoring formulas
- Multiple award types:
  - Employee of the Month
  - Employee of the Quarter
  - Employee of the Year
  - Special Recognition
- Digital certificate generation
- Public leaderboard
- Manager nomination system
- Award history tracking

### 4. **Analytics & Reporting**
- Organization-wide dashboards
- Department/team comparisons
- Individual performance trends
- Skill gap analysis
- PDP completion rates
- Award distribution
- Custom report generation (Excel, PDF)
- Predictive insights

### 5. **Feedback System**
- Peer-to-peer feedback
- Anonymous option
- Feedback types:
  - General
  - Praise
  - Constructive
  - Recognition
- Rating system (1-5 stars)
- Feedback inbox for employees
- Manager coaching notes

### 6. **Learning & Development**
- Training request workflow
- Manager approval for funding
- Link training to PDP goals
- Track completion
- Store certificates
- Learning budget management

### 7. **Attendance Tracking**
- Daily attendance logging
- Status types: Present, Absent, Late, Half-day, Leave
- Check-in/out times
- Attendance score calculation
- Integration with performance reviews

---

## Security Features

### Backend Security
- ✅ JWT authentication (7-day expiry)
- ✅ bcrypt password hashing (10 rounds)
- ✅ Helmet security headers
- ✅ CORS configuration (now allows all origins for development)
- ✅ Rate limiting (API throttling)
- ✅ Input sanitization
- ✅ Tenant isolation (all queries scoped to `org_id`)
- ✅ Role-based access control (RBAC)

### Frontend Security
- ✅ Protected routes (auth guards)
- ✅ Role-based redirects
- ✅ Token storage in localStorage
- ✅ Automatic logout on 401
- ✅ XSS prevention (React escaping)

---

## Development Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or cloud)
- pnpm package manager

### Installation

```bash
# 1. Clone repository
git clone <repo-url>
cd employeehr

# 2. Install frontend dependencies
pnpm install

# 3. Install backend dependencies
cd server
pnpm install
cd ..

# 4. Configure environment variables
# Create server/.env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/elevate
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your_secret_key_here

# Create .env.local (frontend)
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Running the Application

```bash
# Terminal 1 - Backend
cd server
pnpm dev  # Runs on http://localhost:5000

# Terminal 2 - Frontend
pnpm dev  # Runs on http://localhost:3000
```

### Building for Production

```bash
# Backend
cd server
pnpm build
pnpm start

# Frontend
pnpm build
pnpm start
```

---

## Usage Workflows

### 1. Company Registration
1. Visit `http://localhost:3000/auth/signup`
2. Fill in company details
3. System creates company with slug (e.g., "acme-corp")
4. Admin account created automatically
5. Login URL generated: `http://localhost:3000/company/acme-corp`

### 2. Admin Creates Employees
1. Admin logs in → `/admin`
2. Navigate to "Manage Users"
3. Click "Add Employee"
4. Fill form (name, email, role, department, manager)
5. System generates temp password
6. Employee receives invitation email
7. Employee can login at: `/company/acme-corp`

### 3. Employee Uses Platform
1. Visit `/company/acme-corp`
2. Login with credentials
3. Redirected to `/employee` dashboard
4. View performance, PDPs, feedback
5. Create/update goals
6. Track progress

### 4. Manager Workflow
1. Login at `/company/acme-corp`
2. Redirected to `/manager` dashboard
3. View team performance
4. Approve/reject PDPs
5. Conduct evaluations
6. Submit feedback
7. Nominate for awards

---

## Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4.1
- **UI Components:** Radix UI primitives
- **Animations:** Framer Motion
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **State:** React hooks + localStorage

### Backend
- **Runtime:** Node.js
- **Framework:** Express 4.18
- **Language:** TypeScript
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + bcryptjs
- **Security:** Helmet, CORS, rate limiting
- **Email:** Nodemailer
- **Logging:** Morgan

---

## Recent Enhancements

### ✅ Implemented Features

1. **Company-Specific Login URLs**
   - Each company gets unique slug (e.g., `acme-corp`)
   - Login at `/company/[slug]`
   - Company branding on login page
   - Validates company is active

2. **Separate Interfaces by Role**
   - **Admin:** `/admin/*` routes (full control)
   - **Manager:** `/manager/*` routes (team management)
   - **Employee:** `/employee/*` routes (self-service)

3. **Role-Based Route Protection**
   - Layout guards check user role
   - Auto-redirect to appropriate dashboard
   - Prevents unauthorized access

4. **Enhanced Authentication**
   - `POST /api/auth/company-login` - Company-specific login
   - `GET /api/auth/validate-company/:slug` - Validate company
   - JWT includes role for authorization

5. **Admin Interface**
   - Complete admin dashboard at `/admin`
   - Admin-specific sidebar navigation
   - User management, KPI config, analytics
   - Company settings and branding

6. **Company Branding**
   - `primaryColor` and `secondaryColor` fields
   - Logo upload support
   - Branded login pages per company

---

## Roadmap / Future Enhancements

### Planned Features
- [ ] Super-admin platform (manage all companies)
- [ ] Subscription billing integration
- [ ] Email template customization
- [ ] Advanced analytics dashboards
- [ ] Mobile apps (iOS/Android)
- [ ] AI-powered insights
- [ ] Integration with Slack/Teams
- [ ] White-label options
- [ ] API webhooks
- [ ] SSO/SAML support

---

## Support & Documentation

### For Admins
- Admin guide: How to configure KPIs, create users, manage awards
- Video tutorials for common tasks
- Best practices for performance management

### For Managers
- Manager handbook: PDP approval, evaluations, feedback
- Team management best practices

### For Employees
- Employee guide: Creating PDPs, tracking goals
- FAQ section

---

## License

Proprietary - All rights reserved

---

## Contact & Support

For technical support or questions:
- Email: support@elevate-hr.com
- Documentation: https://docs.elevate-hr.com
- Status Page: https://status.elevate-hr.com

---

**Version:** 2.0.0
**Last Updated:** December 10, 2025
**Platform:** Multi-tenant SaaS
**Architecture:** REST API + Next.js App Router
