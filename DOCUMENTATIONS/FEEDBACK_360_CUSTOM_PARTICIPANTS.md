# 360° Feedback Pools - Custom Participants Feature

## Overview
The feedback pool system now supports creating pools with **custom participant names and emails** without requiring them to be registered users in the database.

## Changes Made

### Backend Updates

#### 1. Controller Changes (`server/src/controllers/anonymousFeedbackController.ts`)

**Before:** Required `employee_ids` array with database user IDs
```typescript
const { name, description, employee_ids, form_config, expires_at } = req.body
// Validated against User database
const employees = await User.find({ _id: { $in: employee_ids }, org_id })
```

**After:** Accepts `participants` array with name and email
```typescript
const { name, description, participants, form_config, expires_at } = req.body

// Validates participant structure
for (const participant of participants) {
    if (!participant.name || !participant.email) {
        return res.status(400).json({
            success: false,
            message: "Each participant must have a name and email",
        })
    }
}

// Creates custom employee_id for non-database users
const employee_id = participant.employee_id || 
    `custom_${pool._id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
```

**Benefits:**
- ✅ No longer requires users to exist in database
- ✅ Allows external contractors, consultants, or temporary team members
- ✅ Generates unique IDs automatically for tracking
- ✅ Maintains full anonymity guarantee

#### 2. Route Protection (`server/src/routes/anonymousFeedback.routes.ts`)

**Updated Permissions:**
```typescript
roleMiddleware("company_admin", "hr", "super_admin")
```

Now accessible by:
- `company_admin` - Company administrators
- `hr` - HR officers
- `super_admin` - System administrators

### Frontend Updates

#### 1. Create Pool Form (`app/admin/feedback-360/page.tsx`)

**Before:** Selected employees from dropdown list
- Fetched users from `/api/users`
- Clicked to select 5 employees from database

**After:** Manual participant entry
- 5 input fields for names and emails
- No database requirement
- Real-time validation

**New Form Structure:**
```tsx
const [participants, setParticipants] = useState([
    { name: '', email: '' },
    { name: '', email: '' },
    { name: '', email: '' },
    { name: '', email: '' },
    { name: '', email: '' },
])
```

**Validation:**
- All 5 participants must have name and email
- Email format validation (regex)
- Clear error messages

## Usage

### Creating a Pool (Admin Interface)

1. **Navigate:** `/admin/feedback-360`
2. **Click:** "Create Pool" button
3. **Fill in:**
   - Pool Name (e.g., "Q1 2026 Team Feedback")
   - Description (optional)
   - **5 Participants:**
     - Participant 1: John Doe, john@example.com
     - Participant 2: Jane Smith, jane@example.com
     - Participant 3: Bob Wilson, bob@company.com
     - Participant 4: Alice Brown, alice@external.com
     - Participant 5: Charlie Davis, charlie@consultant.com

4. **Submit:** System creates pool and generates anonymous tokens

### Benefits for External Users

✅ **Contractors:** Include freelancers without creating accounts
✅ **Consultants:** Get feedback from external advisors
✅ **Temporary Staff:** Include project-based team members
✅ **Cross-Company:** Collaborate with partners/vendors
✅ **Privacy:** No need to onboard external users to your system

## API Request Format

**Endpoint:** `POST /api/feedback-360/pools`

**Old Format:**
```json
{
  "name": "Team Feedback",
  "description": "Q1 feedback cycle",
  "employee_ids": ["userId1", "userId2", "userId3", "userId4", "userId5"],
  "form_config": { "questions": [...] }
}
```

**New Format:**
```json
{
  "name": "Team Feedback",
  "description": "Q1 feedback cycle",
  "participants": [
    { "name": "John Doe", "email": "john@example.com" },
    { "name": "Jane Smith", "email": "jane@example.com" },
    { "name": "Bob Wilson", "email": "bob@company.com" },
    { "name": "Alice Brown", "email": "alice@external.com" },
    { "name": "Charlie Davis", "email": "charlie@consultant.com" }
  ],
  "form_config": { "questions": [...] }
}
```

## Security & Privacy

### Maintained Features:
- ✅ JWT tokens with 90-day expiry
- ✅ SHA-256 token hashing
- ✅ No rater identity stored
- ✅ Anonymous submission endpoints
- ✅ Multi-tenant isolation via `org_id`

### New Features:
- ✅ Unique custom IDs generated per participant
- ✅ Email validation before pool creation
- ✅ Role-based access control (admin only)

## Database Schema

No changes to existing models:
- `FeedbackPool` - Unchanged
- `PoolMember` - Uses `employee_id` (now can be custom or database ID)
- `FeedbackResponse` - Unchanged (still anonymous)

## Authentication Requirements

**Admin Interface:** `/admin/feedback-360`
- ✅ Must be logged in
- ✅ Role: `company_admin`, `hr`, or `super_admin`
- ✅ Protected by admin layout authentication

**Public Interface:** `/feedback/[token]`
- ✅ No login required
- ✅ Token-based validation only
- ✅ Maintains anonymity

## Testing

### Test Scenario 1: Create Pool with Custom Names
1. Login as admin
2. Go to `/admin/feedback-360`
3. Create pool with 5 custom names/emails
4. Verify pool created successfully
5. Check anonymous links generated

### Test Scenario 2: Submit Feedback
1. Click anonymous link from pool
2. Verify 4 participants shown (excluding self)
3. Fill out feedback form
4. Submit successfully
5. Verify submission count updated

### Test Scenario 3: View Analytics
1. Admin views pool details
2. Check completion status
3. View aggregated feedback (when complete)
4. Verify no rater identity exposed

## Migration Notes

**Backward Compatibility:**
- ✅ Old API format with `employee_ids` still works (if you restore old code)
- ✅ Existing pools in database unaffected
- ✅ Existing anonymous tokens remain valid

**Breaking Changes:**
- ❌ Frontend now expects `participants` array format
- ❌ Backend expects `participants` instead of `employee_ids`

## Future Enhancements

Potential features to add:
- [ ] Import participants from CSV
- [ ] Save participant templates
- [ ] Integration with external HR systems
- [ ] Bulk pool creation
- [ ] Participant groups/teams

## Support

For issues or questions:
1. Check browser console for errors
2. Verify admin role permissions
3. Check server logs for API errors
4. Ensure email format is valid
5. Verify all 5 participants have complete information

---

**Last Updated:** January 8, 2026
**Version:** 2.0
**Status:** ✅ Production Ready
