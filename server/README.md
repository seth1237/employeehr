# Elevate Backend API

A comprehensive Node.js/Express backend for the Elevate Employee Performance & Development Platform.

## Features

- Multi-tenant architecture with organization isolation
- User authentication with JWT
- Role-based access control (Admin, Manager, Employee, HR)
- Performance tracking and KPI management
- Personal Development Plans (PDP)
- 360-degree feedback system
- Awards and recognition
- Attendance tracking
- Learning & development requests
- Real-time notifications

## Setup

### Prerequisites

- Node.js 18+
- MongoDB
- npm or yarn

### Installation

\`\`\`bash
cd server
npm install
\`\`\`

### Configuration

1. Copy `.env.example` to `.env`:
\`\`\`bash
cp .env.example .env
\`\`\`

2. Update environment variables in `.env`

### Running the Server

**Development mode:**
\`\`\`bash
npm run dev
\`\`\`

**Production build:**
\`\`\`bash
npm run build
npm start
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/register-company` - Register new company
- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Change password

### Users
- `GET /api/users` - Get all users in organization
- `GET /api/users/:userId` - Get user by ID
- `PUT /api/users/:userId` - Update user
- `POST /api/users` - Create employee
- `GET /api/users/team/:managerId` - Get team members

### Performance
- `GET /api/performance/:userId/:period` - Get performance by period
- `PUT /api/performance/:performanceId/kpi/:kpiId` - Update KPI score
- `GET /api/performance` - Get all performances

### KPIs
- `GET /api/kpis` - Get all KPIs
- `POST /api/kpis` - Create KPI
- `PUT /api/kpis/:kpiId` - Update KPI
- `DELETE /api/kpis/:kpiId` - Delete KPI

### PDPs
- `GET /api/pdps` - Get all PDPs
- `POST /api/pdps` - Create PDP
- `PUT /api/pdps/:pdpId` - Update PDP
- `POST /api/pdps/:pdpId/submit` - Submit PDP
- `POST /api/pdps/:pdpId/approve` - Approve PDP
- `POST /api/pdps/:pdpId/reject` - Reject PDP

### Feedback
- `POST /api/feedback` - Submit feedback
- `GET /api/feedback/:userId` - Get feedback for user
- `GET /api/feedback/:userId/summary` - Get 360 feedback summary

### Attendance
- `POST /api/attendance` - Mark attendance
- `GET /api/attendance/:userId` - Get attendance records

### Awards
- `GET /api/awards` - Get all awards
- `POST /api/awards` - Create award
- `POST /api/awards/nominations` - Create nomination
- `GET /api/awards/nominations` - Get nominations
- `GET /api/awards/leaderboard/top` - Get leaderboard

## Project Structure

\`\`\`
server/
├── src/
│   ├── config/          # Configuration files (DB, Auth)
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Express middleware
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── types/           # TypeScript interfaces
│   └── index.ts         # Server entry point
├── dist/                # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
\`\`\`

## Authentication

All protected endpoints require a JWT token in the Authorization header:

\`\`\`
Authorization: Bearer <token>
\`\`\`

## Database Models

- **User** - System users with roles
- **Company** - Organization tenants
- **KPI** - Performance key indicators
- **Performance** - Performance records
- **PDP** - Personal development plans
- **Feedback** - 360-degree feedback
- **Attendance** - Attendance records
- **Award** - Awards and recognition
- **Learning Request** - Training requests
- **Notification** - System notifications

## Error Handling

All endpoints return consistent error responses:

\`\`\`json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
\`\`\`

## Multi-Tenancy

All data is isolated by `org_id`. Users can only access data from their organization. This is enforced at the middleware level.

## License

MIT
