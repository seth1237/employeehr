# 🏷️ Stamp System Documentation

## Overview

The Stamp System is a **controlled stamp design builder** that lets each tenant create custom document stamps with dynamic fields and branding consistency. This is a major differentiator from standard ERPs like Odoo.

### What Makes It Special

✅ **Not just SVG uploads** - Controlled, consistent stamp designs  
✅ **Dynamic fields** - Automatic date, user, and ID injection  
✅ **Multi-tenant** - Each organization has their own stamps  
✅ **Safe & scalable** - Validated configuration system  
✅ **Easy to use** - Visual builder instead of raw SVG editing  

---

## 🏗️ System Architecture

### Backend Components

#### 1. **Stamp Model** (`server/src/models/Stamp.ts`)
Stores complete stamp configuration as structured data:

```typescript
{
  _id: ObjectId,
  org_id: string,                    // Multi-tenant isolation
  name: "Approved",                  // Display name
  description: "Invoice approval",   // Optional
  shape: "circle",                   // circle | rectangle | badge
  text: "APPROVED",                  // Stamp text (max 50 chars)
  
  fields: {                          // Dynamic fields to include
    date: true,                      // Include current date
    user: true,                      // Include current user
    stampId: false                   // Include stamp ID
  },
  
  style: {
    color: "#8B0000",               // Hex color (validated)
    opacity: 0.2,                   // 0-1 (20% transparency)
    rotation: 12,                   // 0-20 degrees
    fontSize: 18                    // 8-48pt (optional)
  },
  
  isDefault: false,                 // Set as default stamp
  createdBy: "user123",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

Indexes:
- `{ org_id: 1, name: 1 }` - Fast retrieval by org and name
- `{ org_id: 1, isDefault: 1 }` - Quick default lookup

#### 2. **Stamp Controller** (`server/src/controllers/stampController.ts`)

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `getStamps()` | Fetch all stamps for org |
| `getStampById()` | Get single stamp |
| `createStamp()` | Create new stamp with validation |
| `updateStamp()` | Update existing stamp |
| `deleteStamp()` | Remove stamp |
| `getDefaultStamp()` | Fetch default stamp |
| `generatePreview()` | Generate SVG preview |
| `getStampSVG()` | Get stamp with injected values |

**Validation:**
- Stamp name required, less than 256 chars
- Text required, max 50 chars
- Shape must be: circle, rectangle, or badge
- Opacity: 0-1 float
- Rotation: 0-20 degrees
- Color: valid hex format `#RRGGBB`

#### 3. **SVG Generator** (`server/src/utils/stampGenerator.ts`)

Converts stamp config to SVG dynamically:

```typescript
generateStampSVG(stamp, values)
  ├─ Renders shape (circle, rectangle, or badge)
  ├─ Applies main text
  ├─ Injects dynamic values:
  │  ├─ Date (if enabled)
  │  ├─ User (if enabled)
  │  └─ Stamp ID (if enabled)
  └─ Applies rotation and opacity

generateStampPreviewSVG(stamp)
  └─ Generates preview with sample data for builder UI

validateStampConfig(stamp)
  └─ Returns array of validation errors
```

#### 4. **Stamp Routes** (`server/src/routes/stamp.routes.ts`)

```
GET    /api/stamps                    # All stamps
GET    /api/stamps/default            # Default stamp
GET    /api/stamps/:stampId           # Single stamp
GET    /api/stamps/:stampId/svg       # Stamp as SVG with values
POST   /api/stamps                    # Create stamp
POST   /api/stamps/preview            # Generate preview
PUT    /api/stamps/:stampId           # Update stamp
DELETE /api/stamps/:stampId           # Delete stamp
```

All routes require authentication and org isolation via middleware.

---

### Frontend Components

#### 1. **Stamp Builder** (`components/admin/stamps/stamp-builder.tsx`)

Interactive visual editor with:

**Controls:**
- Stamp text input (max 50 chars)  
- Shape selector (radio buttons)
- Dynamic field toggles (date, user, stamp ID)
- Style controls:
  - Color picker + hex input
  - Opacity slider (0-100%)
  - Rotation slider (0-20°)
  - Font size slider (8-48pt)

**Features:**
- Live SVG preview
- Reset to default button
- Real-time validation feedback
- Mobile responsive

#### 2. **Stamps Admin Page** (`app/admin/stamps/page.tsx`)

Main interface for stamp management:

**Features:**
- Create new stamps
- Edit existing stamps
- Delete stamps
- View stamp previews
- Set default stamp
- List view with status badges

**UI Flow:**
1. Click "Create Stamp" button
2. Fill in stamp name & description
3. Use visual builder to configure stamp
4. See live preview
5. Click "Create Stamp" to save

---

### API Integration

#### Frontend API Helper (`lib/stampAPI.ts`)

```typescript
stampAPI.getStamps()              // Get all stamps
stampAPI.getStampById(id)         // Get single stamp
stampAPI.getDefaultStamp()        // Get default stamp
stampAPI.createStamp(data)        // Create stamp
stampAPI.updateStamp(id, data)    // Update stamp
stampAPI.deleteStamp(id)          // Delete stamp
stampAPI.getStampSvg(id, ...)     // Fetch SVG with values
stampAPI.generatePreview(config)  // Generate preview
```

#### Centralized API (`lib/api.ts`)

Added stamps section to main API:

```typescript
api.stamps.getAll()
api.stamps.getById(id)
api.stamps.getDefault()
api.stamps.create(data)
api.stamps.update(id, data)
api.stamps.delete(id)
api.stamps.generatePreview(config)
```

---

## 🎯 Use Cases

### 1. Invoice Stamping
```javascript
const stamp = await stampAPI.getDefaultStamp();
applyTextStampToPdf(doc, stamp.text, 150, 100, 
  stamp.style.color, stamp.style.opacity, 
  stamp.style.rotation, stamp.style.fontSize);
```

### 2. Status Tracking
Stamps for different document statuses:
- **Approved** - Green circle stamp
- **Paid** - Blue badge stamp
- **Received** - Red rectangle stamp

### 3. Approval Workflows
Automatically apply stamps when:
- Document approved by manager
- Payment received
- Delivery confirmed

### 4. Audit Trail
Each stamped document records:
- Which stamp used
- Applied by (user)
- Applied at (timestamp)
- Document reference

---

## 🔧 Configuration Examples

### Example 1: Professional "APPROVED" Stamp
```json
{
  "name": "Approved",
  "shape": "circle",
  "text": "APPROVED",
  "fields": { "date": true, "user": true, "stampId": false },
  "style": {
    "color": "#27ae60",      // Green
    "opacity": 0.25,
    "rotation": 15,
    "fontSize": 20
  },
  "isDefault": true
}
```

### Example 2: Subtle "PAID" Badge
```json
{
  "name": "Paid",
  "shape": "badge",
  "text": "PAID",
  "fields": { "date": true, "user": false, "stampId": true },
  "style": {
    "color": "#2c3e50",      // Dark blue-gray
    "opacity": 0.15,
    "rotation": 0,
    "fontSize": 16
  }
}
```

### Example 3: Medical "VERIFIED" Stamp
```json
{
  "name": "Verified",
  "shape": "rectangle",
  "text": "VERIFIED",
  "fields": { "date": true, "user": true, "stampId": false },
  "style": {
    "color": "#34495e",      // Professional gray
    "opacity": 0.2,
    "rotation": 8,
    "fontSize": 18
  }
}
```

---

## 📱 Navigation

**Stamps are located in the admin sidebar under "INVENTORY MANAGER":**

```
Admin Dashboard
├── Dashboard
├── Manage Users
├── [RECRUITMENT]
├── [EMPLOYEE MANAGEMENT]
├── [INVENTORY MANAGER]
│   ├── Add Inventory
│   ├── Sales
│   ├── Quotations
│   ├── Invoices
│   ├── Inventory Status
│   ├── Analytics
│   ├── Inventory History
│   └── 🆕 Stamps ← You are here
└── [PERFORMANCE]
```

---

## 🔐 Security & Permissions

### Multi-Tenant Isolation
- Stamps stored with `org_id` for complete isolation
- API middleware ensures users can only access their organization's stamps
- No cross-tenant stamp access possible

### Validation
- All inputs validated on backend before storage
- Color format strictly validated (hex format)
- Text length constrained (max 50 chars)
- Numeric ranges enforced (opacity, rotation, font size)

### Future Permissions (Ready to implement)
```json
{
  "canCreateStamp": "ADMIN",
  "canEditStamp": "ADMIN",
  "canDeleteStamp": "ADMIN",
  "canUseStamp": "ADMIN | MANAGER | STAFF"
}
```

---

## 🚀 Future Enhancements

### Phase 2: Audit & Verification
```typescript
interface StampAudit {
  documentId: string;
  stampId: string;
  appliedBy: string;       // User who applied
  appliedAt: Date;
  docStatus: "APPROVED" | "PAID" | "RECEIVED";
}

// Verification page: /verify/STAMP-12345
```

### Phase 3: Automated Stamping
- Auto-apply "PAID" when invoice paid
- Auto-apply "RECEIVED" when delivery confirmed
- Auto-apply "APPROVED" when workflow completes

### Phase 4: Batch Operations
- Apply stamp to multiple documents
- Schedule stamps for future dates
- Stamp templates based on document type

### Phase 5: Advanced Styles
- SVG pattern fills
- Gradient backgrounds
- Custom fonts
- QR codes in stamps

---

## 📋 Database Schema Summary

```typescript
stamps collection:
├── _id: ObjectId (PK)
├── org_id: string (FK + index)
├── name: string (required, unique per org)
├── description: string
├── shape: enum["circle"|"rectangle"|"badge"]
├── text: string (required, ≤50 chars)
├── fields: {
│   ├── date: boolean
│   ├── user: boolean
│   └── stampId: boolean
├── style: {
│   ├── color: string (hex validation)
│   ├── opacity: number (0-1)
│   ├── rotation: number (0-20)
│   └── fontSize: number (8-48)
├── isDefault: boolean (index)
├── createdBy: string
├── createdAt: Date (index)
└── updatedAt: Date
```

---

## 🎓 Learning Resources

1. **Next Steps**: Check [STAMP_INTEGRATION_GUIDE.md](./STAMP_INTEGRATION_GUIDE.md) for PDF integration examples
2. **Architecture**: Review [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md) for system diagrams
3. **API**: See endpoint definitions in `server/src/routes/stamp.routes.ts`
4. **Components**: Study `components/admin/stamps/stamp-builder.tsx` for UI patterns

---

## ✅ Implementation Checklist

- [x] MongoDB Stamp model with validation
- [x] Full CRUD controller
- [x] API routes with auth middleware
- [x] SVG generation utility
- [x] Frontend stamp builder component
- [x] Admin stamps page (list, create, edit, delete)
- [x] Multi-tenant isolation
- [x] Live preview system
- [x] Integrated into admin sidebar
- [x] PDF integration utilities
- [x] Centralized API wrapper
- [ ] Stamp audit logging
- [ ] Audit verification page
- [ ] Auto-stamping workflows
- [ ] Batch operations
- [ ] Role-based permissions

---

**Version:** 1.0  
**Last Updated:** March 22, 2026  
**Status:** Production Ready ✅
