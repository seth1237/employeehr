# Complete Onboarding Flow Documentation

## Overview
This document describes the comprehensive onboarding experience for new companies signing up to Elevate HR. The flow ensures every new organization completes essential setup steps before accessing the main dashboard.

## Flow Architecture

### 1. User Journey
```
Signup → Registration → Setup Wizard → Dashboard
  ↓         ↓              ↓            ↓
Landing   Form Entry    5 Steps      Full Access
```

### 2. Setup Wizard Steps

The onboarding wizard consists of 5 progressive steps:

#### Step 1: Company Information ✅ **Required**
- **Purpose**: Complete company profile details
- **Fields**:
  - Company description
  - Website URL
  - Phone number
  - Address (street, zip code)
  - LinkedIn profile
- **Backend**: Updates Company model with profile information
- **API**: Uses `/api/setup/step` endpoint

#### Step 2: Branding 🎨 **Optional**
- **Purpose**: Customize company appearance
- **Fields**:
  - Logo upload (image file)
  - Primary brand color
  - Brand tagline
- **Features**:
  - Can skip this step
  - Color picker for brand customization
- **Backend**: Stores branding data in Company model
- **API**: `/api/setup/step` with step: 'branding'

#### Step 3: Email Configuration 📧 **Optional**
- **Purpose**: Set up company-specific email sending
- **Fields**:
  - SMTP Host (e.g., smtp.gmail.com)
  - SMTP Port (465 for SSL, 587 for TLS)
  - SMTP Username
  - SMTP Password
  - From Email
  - From Name
- **Features**:
  - Can skip - system will use default email
  - Test connection before saving
  - Secure password storage
  - Multi-tenant email support
- **Backend**: Stores in Company.emailConfig
- **Fallback**: System email used if not configured
- **API**: `/api/setup/step` with step: 'emailConfig'

#### Step 4: Employee Management 👥 **Optional**
- **Purpose**: Add initial team members
- **Features**:
  - Bulk employee import via CSV
  - Manual entry form (one at a time)
  - Can skip for later
- **CSV Format**:
  ```csv
  firstName,lastName,email,role,department
  John,Doe,john@company.com,employee,Engineering
  Jane,Smith,jane@company.com,manager,HR
  ```
- **Roles**: employee, manager, hr, company_admin
- **Backend**: Creates User records with org_id
- **API**: `/api/setup/step` with step: 'employees'

#### Step 5: KPI Configuration 🎯 **Optional**
- **Purpose**: Define key performance indicators
- **Fields** (per KPI):
  - KPI Title
  - Description
  - Target value
  - Unit of measurement
- **Features**:
  - Add multiple KPIs
  - Remove KPIs
  - Can skip for later
- **Backend**: Creates KPI records
- **API**: `/api/setup/step` with step: 'kpis'

### 3. Setup Progress Tracking

#### Database Schema (Company Model)
```typescript
setupProgress: {
  completed: Boolean,      // Overall completion status
  currentStep: String,     // Last active step
  steps: {
    companyInfo: Boolean,  // Required step
    branding: Boolean,     // Optional
    emailConfig: Boolean,  // Optional
    employees: Boolean,    // Optional
    kpis: Boolean          // Optional
  },
  startedAt: Date,
  completedAt: Date
}
```

#### API Endpoints

**GET /api/setup/progress**
- Returns current setup progress
- Response includes completion status and individual steps

**POST /api/setup/step**
- Updates specific step completion
- Request body:
  ```json
  {
    "step": "companyInfo",
    "data": { ...stepData },
    "completed": true
  }
  ```

**POST /api/setup/complete**
- Marks entire setup as complete
- Sets `setupProgress.completed = true`
- Records `completedAt` timestamp

**POST /api/setup/skip**
- Skips optional step
- Request body: `{ "step": "branding" }`

**POST /api/setup/reset**
- Admin only: Reset setup progress
- Allows re-running setup wizard

## Technical Implementation

### Frontend Components

#### 1. OnboardingWizard Component
**Location**: `/components/setup/onboarding-wizard.tsx`

**Features**:
- Step-by-step navigation
- Progress indicator
- Form validation
- Auto-save on step completion
- Skip functionality for optional steps
- Loading states
- Error handling

**State Management**:
```typescript
const [currentStep, setCurrentStep] = useState(0)
const [setupData, setSetupData] = useState({
  companyInfo: {},
  branding: {},
  emailConfig: {},
  employees: [],
  kpis: []
})
```

#### 2. Setup Page
**Location**: `/app/setup/page.tsx`

Simple wrapper that renders OnboardingWizard component.

#### 3. Signup Form Integration
**Location**: `/components/auth/signup-form.tsx`

**Flow**:
1. User fills registration form
2. Submit calls `/api/auth/register-company`
3. On success, stores JWT token
4. Redirects to `/setup` (line 100)

### Backend Architecture

#### 1. Setup Controller
**Location**: `/server/src/controllers/setupController.ts`

**Functions**:
- `getSetupProgress()` - Fetch current progress
- `updateSetupStep()` - Update individual step
- `completeSetup()` - Mark setup done
- `skipSetup()` - Skip optional step
- `resetSetup()` - Admin reset

#### 2. Setup Routes
**Location**: `/server/src/routes/setup.routes.ts`

All routes protected with authentication middleware.

#### 3. Company Model Updates
**Location**: `/server/src/models/Company.ts`

Added `setupProgress` field to track wizard completion.

### Access Control

#### Setup Enforcement
**Location**: `/app/admin/layout.tsx`

```typescript
useEffect(() => {
  checkSetupStatus()
}, [])

const checkSetupStatus = async () => {
  const response = await api.setup.getProgress()
  if (!response.data?.setupProgress?.completed) {
    router.push('/setup')
  }
}
```

This ensures users cannot access admin dashboard until setup is complete.

## User Experience Flow

### 1. New Company Signs Up
1. User visits `/auth/signup`
2. Fills company registration form
3. Clicks "Create Account & Setup Organization"
4. Account created, JWT issued
5. **Automatically redirected to `/setup`**

### 2. Setup Wizard Experience
1. Wizard loads, fetches setup progress
2. Shows progress indicator (5 steps)
3. User completes Step 1 (required)
4. Can skip Steps 2-5 or complete them
5. Each step auto-saves on continue
6. Final "Complete Setup" button on last step

### 3. Access Control
- Before setup complete: User can only access `/setup`
- Admin layout checks setup status on mount
- If incomplete, redirects to `/setup`
- After completion: Full dashboard access

### 4. Return Users
- If setup incomplete, redirected to last step
- Can continue from where they left off
- Progress persisted in database

## Multi-Tenant Email Integration

### How It Works

1. **During Setup** (Step 3):
   - Company provides SMTP credentials
   - Credentials stored encrypted in `Company.emailConfig`
   - Can test connection before saving

2. **Email Sending**:
   ```typescript
   // Email service automatically resolves transport
   await sendEmail({
     companyId: user.org_id,
     to: 'recipient@example.com',
     subject: 'Welcome',
     html: '<p>Hello</p>'
   })
   ```

3. **Transport Resolution**:
   - Check if company has emailConfig enabled
   - If yes, use company SMTP
   - If no, fall back to system email
   - If company SMTP fails, automatically retry with system email

4. **System Fallback**:
   - Configured in `/server/.env`:
     ```
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=your-email@gmail.com
     SMTP_PASS=your-app-password
     SYSTEM_FROM_EMAIL=noreply@elevate.com
     SYSTEM_FROM_NAME=Elevate HR
     ```

### Email Configuration UI
**Location**: `/app/admin/settings/email/page.tsx`

Allows companies to:
- Enable/disable custom email
- Update SMTP settings
- Test email configuration
- View verification status

## CSV Employee Import

### CSV Format
```csv
firstName,lastName,email,role,department,position,salary
John,Doe,john@company.com,employee,Engineering,Developer,75000
Jane,Smith,jane@company.com,manager,HR,HR Manager,85000
```

### Import Process
1. User uploads CSV file
2. Frontend parses CSV using papaparse library
3. Validates required fields
4. Shows preview table
5. User confirms import
6. Backend creates User records
7. Sends welcome emails to new users

### Validation Rules
- Email must be unique per organization
- Role must be: employee, manager, hr, company_admin
- Required fields: firstName, lastName, email, role

## Testing the Flow

### End-to-End Test
1. **Start Fresh**:
   ```bash
   # Clear company setup status in MongoDB
   db.companies.updateOne(
     { _id: ObjectId('...') },
     { $set: { 'setupProgress.completed': false } }
   )
   ```

2. **Test Signup**:
   - Visit `/auth/signup`
   - Fill form and submit
   - Verify redirect to `/setup`

3. **Test Setup Steps**:
   - Complete Step 1 (required)
   - Skip or complete Steps 2-5
   - Click "Complete Setup"

4. **Test Dashboard Access**:
   - Should redirect to `/admin`
   - Try accessing `/admin` directly
   - Should stay on admin (not redirect to setup)

5. **Test Incomplete Setup**:
   - Reset setup status
   - Try accessing `/admin`
   - Should redirect to `/setup`

### API Testing

```bash
# Get setup progress
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/setup/progress

# Update step
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"step": "companyInfo", "data": {...}, "completed": true}' \
  http://localhost:5000/api/setup/step

# Complete setup
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/setup/complete
```

## Environment Variables

### Required Variables
```env
# Database
MONGODB_URI=mongodb+srv://...

# JWT
JWT_SECRET=your-secret-key

# System Email (Fallback)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SYSTEM_FROM_EMAIL=noreply@elevate.com
SYSTEM_FROM_NAME=Elevate HR

# Frontend URL (for redirects)
FRONTEND_URL=https://yourapp.com
```

## Troubleshooting

### Setup Redirect Loop
**Symptom**: Keeps redirecting between `/setup` and `/admin`

**Solution**:
1. Check setup status in database
2. Ensure `setupProgress.completed` is boolean
3. Verify JWT token is valid

### Email Not Sending
**Symptom**: Step 3 email test fails

**Solution**:
1. Verify SMTP credentials
2. Check if using App Password (for Gmail)
3. Ensure port is correct (587 for TLS, 465 for SSL)
4. Check firewall settings

### CSV Import Fails
**Symptom**: Employee import shows errors

**Solution**:
1. Verify CSV headers match format
2. Check for duplicate emails
3. Ensure role values are valid
4. Check for special characters in names

### Cannot Access Dashboard
**Symptom**: Stuck on setup page

**Solution**:
1. Check if all required steps completed
2. Click "Complete Setup" button
3. Verify API call succeeds
4. Check browser console for errors

## Future Enhancements

### Planned Features
1. **Setup Analytics**:
   - Track time spent per step
   - Identify common drop-off points
   - A/B test different flows

2. **Guided Tours**:
   - Interactive tooltips
   - Video tutorials
   - Contextual help

3. **More Integrations**:
   - Calendar sync (Google, Outlook)
   - Slack notifications
   - HRIS imports

4. **Advanced Email**:
   - Email template editor
   - Scheduled email campaigns
   - Email analytics

5. **Bulk Operations**:
   - Bulk employee edit
   - Department structure import
   - Org chart auto-generation

## Maintenance Notes

### Regular Checks
- Monitor setup completion rates
- Check email delivery success
- Review user feedback on setup flow
- Update CSV import validation as needed

### Database Maintenance
```javascript
// Find companies with incomplete setup
db.companies.find({ 'setupProgress.completed': false })

// Reset setup for testing
db.companies.updateOne(
  { _id: ObjectId('...') },
  { 
    $set: { 
      'setupProgress.completed': false,
      'setupProgress.currentStep': 'companyInfo'
    } 
  }
)
```

## Support Resources

### For Users
- Setup wizard has inline help text
- "Skip" options clearly labeled
- Progress saved automatically
- Can return and complete later

### For Developers
- All components have TypeScript types
- API endpoints documented
- Error messages are descriptive
- Console logs for debugging

## Conclusion

The onboarding flow ensures every new company:
1. ✅ Completes essential company information
2. 🎨 Has option to customize branding
3. 📧 Can configure custom email (with fallback)
4. 👥 Can add initial team members
5. 🎯 Can define KPIs

This creates a complete, production-ready organization from day one, while being flexible enough to skip optional steps and complete them later.
