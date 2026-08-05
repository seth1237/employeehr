# Quick Reference Guide

## New Navigation Paths

### Admin - Clients Module
| Feature | Old Path | New Path |
|---------|----------|----------|
| Hub | N/A | `/admin/clients` |
| Clients List | `/admin/accounts/clients` | `/admin/clients/clients-list` |
| Installed Machines | `/admin/clients/installed-machines` | `/admin/clients/installed-machines` |
| Communication | `/admin/clients-communication` | `/admin/clients/communication` |
| Bulk SMS | `/admin/accounts/bulk-sms` | `/admin/clients/bulk-sms` |

### Employee Pages (Unchanged)
- Quotations: `/employee/stock/quotations`
- Invoices: `/employee/stock/invoices`
- Warehouse: `/admin/stock/wms`

---

## Key Features at a Glance

### Installed Machines Page
```
URL: /admin/clients/installed-machines

Top Section:
  ├─ Title & Description
  └─ "Add Machines" Button (toggles candidates panel)

Candidates Panel (Collapsible):
  ├─ Category filter dropdown
  ├─ Machine checkboxes
  └─ Save Selected button

Machines List:
  ├─ Search bar (name, client, serial, location)
  ├─ Table with columns:
  │  ├─ Machine name
  │  ├─ Serial number
  │  ├─ Client
  │  ├─ Location
  │  ├─ Installation date
  │  ├─ Next service date
  │  ├─ Status badge
  │  └─ Actions (Edit, Delete)
  └─ Edit Dialog:
     ├─ Serial Number field
     ├─ Installed By field
     ├─ Attendant field
     ├─ Next Service Date picker
     ├─ Is Trained checkbox
     └─ Save/Cancel buttons
```

### Employee Quotations Page
```
URL: /employee/stock/quotations

Collapsible Form Section:
  ├─ Click "Create Quotation" to expand
  └─ Form includes:
     ├─ Client selection (name, location shown)
     ├─ Product search with autocomplete
     ├─ Quantity & price input
     └─ Add to list button

Products Dropdown:
  ├─ Shows matching count
  ├─ Color-coded stock status
  └─ Click to select product

Quotations List:
  ├─ Search & filter options
  └─ Each quotation row:
     ├─ Quote number & date
     ├─ Client info
     ├─ Total amount
     ├─ Status (Pending/Approved/Converted)
     └─ Actions:
        ├─ Edit (if not approved)
        ├─ Download PDF (if approved)
        └─ Delete
```

### Warehouse Management
```
URL: /admin/stock/wms

Canvas Area:
  ├─ Grid-based layout
  ├─ Drag-and-place elements
  └─ Click to select & edit

Property Inspector (Right side):
  ├─ Properties (accordion - DEFAULT OPEN)
  │  ├─ Label
  │  └─ Color picker
  ├─ Position & Size (accordion)
  │  ├─ X, Y coordinates
  │  ├─ Width, Height
  │  └─ Rotation (if applicable)
  ├─ Type-specific Details (accordion)
  │  ├─ Zone Details
  │  ├─ Rack Details
  │  ├─ Bin Details
  │  └─ Storage Allocation
  └─ Footer:
     └─ Lock status

Tools Panel:
  ├─ Pointer/Select
  ├─ Drawing tools (wall, door, rack, shelf, etc.)
  ├─ Zoom controls
  └─ Mode toggle (Design/Operations)
```

---

## API Quick Reference

### Create Installed Machine
```bash
POST /api/stock/installed-machines
Content-Type: application/json

{
  "client": {
    "name": "Acme Corp",
    "number": "C001",
    "location": "Nairobi",
    "contactPerson": "John Doe"
  },
  "productId": "prod_123",
  "productName": "X-Ray Machine",
  "category": "Medical Imaging",
  "invoiceId": "inv_123",
  "quotationId": "quot_123",
  "installationDate": "2024-12-28T00:00:00Z"
}
```

### Update Installed Machine
```bash
PATCH /api/stock/installed-machines/{id}
Content-Type: application/json

{
  "serialNumber": "SN-2024-001",
  "installedBy": "Engineer John",
  "attendant": "Operator Mary",
  "nextServiceDate": "2025-06-28T00:00:00Z",
  "isTrained": true
}
```

### Delete Installed Machine
```bash
DELETE /api/stock/installed-machines/{id}
```

### Get All Machines
```bash
GET /api/stock/installed-machines
```

### Get Candidates
```bash
GET /api/stock/installed-candidates
```

---

## Database Fields

### InstalledMachine Model
```typescript
{
  _id: ObjectId,
  org_id: string,
  client: {
    name: string,
    number?: string,
    location?: string,
    contactPerson?: string
  },
  productId: string,
  productName: string,
  category?: string,
  serialNumber?: string,
  installationLocation?: string,
  installationDepartment?: string,
  installationDate?: Date,
  warrantyUntil?: Date,
  status: "active" | "maintenance" | "ended",
  invoiceId?: string,
  quotationId?: string,
  isActive?: boolean,
  notes?: string,
  
  // NEW FIELDS
  nextServiceDate?: Date,
  installedBy?: string,
  attendant?: string,
  isTrained?: boolean,
  
  createdBy?: string,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Common Tasks

### Add a Machine to Registry
1. Go to `/admin/clients/installed-machines`
2. Click "Add Machines" button
3. Select category in dropdown
4. Check machines from the list
5. Click "Save Selected"
6. Machine appears in main list

### Edit Machine Details
1. Find machine in list
2. Click pencil icon (Edit)
3. Fill in fields:
   - Serial number
   - Engineer name
   - Operator name
   - Service date
   - Training status
4. Click "Save Changes"

### Search for a Machine
1. Use search bar at top of machines list
2. Type: machine name, client, serial, or location
3. Table filters in real-time

### Delete a Machine
1. Click trash icon on machine row
2. Confirm deletion in alert
3. Machine is removed

---

## Keyboard Shortcuts (Warehouse)

| Action | Shortcut |
|--------|----------|
| Select tool | `S` |
| Draw walls | `W` |
| Zoom in | `+` or `Scroll Up` |
| Zoom out | `-` or `Scroll Down` |
| Pan | Drag with middle mouse |
| Delete selected | `Delete` key |

---

## Common Issues & Solutions

### Issue: Routes not working
**Solution**: Clear browser cache (Ctrl+Shift+Del or Cmd+Shift+Del)

### Issue: Can't edit installed machine
**Solution**: Check if you have admin role, verify machine exists

### Issue: Product search not showing results
**Solution**: Product must be in inventory, check spelling

### Issue: Warehouse canvas blank
**Solution**: Click on warehouse name, verify it has saved locations

### Issue: Download button disabled for approved quotation
**Solution**: Refresh page, quotation must be in "converted" status

---

## Monitoring & Logs

### Check installed machines
```
Database: MongoDB
Collection: installedmachines
Query: db.installedmachines.find({org_id: "your_org"})
```

### Check API errors
Browser Console → Network tab → Check responses for errors

### Check server logs
Look for error messages mentioning:
- `InstalledMachine`
- `installed-machines` routes
- Org_id validation failures

---

## Performance Tips

1. **Search**: Index on `org_id`, `productId`, `serialNumber`
2. **List**: Machines load with single query
3. **Edit**: Only updates changed fields
4. **Delete**: Immediate removal (use soft delete if recovery needed)

---

## Rollback Instructions

If something goes wrong:

### Frontend
```bash
# Revert page file
git checkout app/admin/clients/installed-machines/page.tsx

# Clear cache
rm -rf .next/
npm run build
```

### Backend
```bash
# Revert controller
git checkout server/src/controllers/installedMachineController.ts

# Revert routes
git checkout server/src/routes/stock.routes.ts

# Revert model
git checkout server/src/models/InstalledMachine.ts
```

### Database
```bash
# No migration needed - fields are optional
# If needed, remove fields:
db.installedmachines.updateMany(
  {org_id: "your_org"},
  {$unset: {nextServiceDate: 1, installedBy: 1, attendant: 1, isTrained: 1}}
)
```

---

## Support

**Documentation Files:**
- `FINAL_COMPLETION_SUMMARY.md` - Full overview
- `CLIENTS_MODULE_IMPLEMENTATION.md` - Detailed changes
- `IMPLEMENTATION_STATUS.md` - Feature checklist

**Questions?**
1. Check relevant documentation
2. Review code comments
3. Test in development first
4. Check error messages for guidance

---

**Last Updated**: 2024-12-28
**Version**: 1.0 Final
