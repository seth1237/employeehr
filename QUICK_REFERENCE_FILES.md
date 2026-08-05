# QUICK REFERENCE - FILE LOCATIONS & FIXES

## 🎯 QUICK LOOKUP BY TASK

### Task: Fix Runtime Errors
**Error 1: Lazy Component Promise**
- File: `/components/admin/stock/stock-manager-content.tsx`
- Lines: 52-55
- Error: "Element type is invalid. Received a promise..."
- Fix: Check export of WarehouseManagement in warehouse-management.tsx

**Error 2: Select Empty Value**
- File: `/components/admin/stock/warehouse-management.tsx`
- Line: ~429
- Error: "A <Select.Item /> must have a value prop..."
- Fix: Replace empty string values with meaningful values

**Error 3: Build Error**
- File: `/server/src/controllers/installedMachineController.ts`
- Line: 305
- Error: "Expected "}" but found end of file"
- Fix: Clear cache (rm -rf .next dist), rebuild

---

### Task: Employee Quotations - Hide Phone Number
- File: `/app/employee/stock/quotations/page.tsx`
- Lines: 407-416 (filteredClients)
- Change: Only show name + location in client search results
- Components to update: Client dropdown display, selected client display

---

### Task: Employee Quotations - Collapse Create Section
- File: `/app/employee/stock/quotations/page.tsx`
- Add: `const [showCreateForm, setShowCreateForm] = useState(false);`
- Wrap: Entire create form in `{showCreateForm && (...)}`
- Add: Toggle button: `<button onClick={() => setShowCreateForm(!showCreateForm)}>`
- Default: Hidden (false)

---

### Task: Employee Quotations - Download Control
- File: `/app/employee/stock/quotations/page.tsx`
- Function: `canDownloadQuotation` (search for it)
- Rule: Only allow if `quotation.status === "approved"`
- Status values: "draft" | "pending" | "approved" | "converted"

---

### Task: Employee Quotations - Edit Control
- File: `/app/employee/stock/quotations/page.tsx`
- Before approval: Allow edit/add/remove
- After approval: Disable all edits
- Key states to check: `quotation.status`
- Components: Edit button, form inputs, remove buttons

---

### Task: Employee Invoice Redesign
- File: `/app/employee/stock/invoices/page.tsx`
- Reference: `/app/admin/stock/invoices/page.tsx`
- Copy: Layout structure, status indicators, amount displays
- Keep: Employee-specific data filtering

---

### Task: Warehouse Save Persistence
- Frontend: `/app/admin/stock/wms/page.tsx`
- Backend Controller: `/server/src/controllers/warehouseController.ts`
- Backend Routes: `/server/src/routes/warehouse.ts`
- Database Model: `/server/src/models/Warehouse.ts`
- Issue: Designs save but don't retrieve on reload
- Check: org_id in save, database writes, query filters

---

### Task: Warehouse Select Fix
- File: `/components/admin/stock/warehouse-management.tsx`
- Problem: `<Select.Item value="">` (empty string)
- Solution: Use `value={category || "uncategorized"}` or `value={String(index)}`
- Pattern: Never use empty string for value prop

---

### Task: Warehouse Grid-Based Design
- File: `/components/admin/stock/warehouse-management.tsx`
- Change from: `{x: 100, y: 200}` (pixels)
- Change to: `{gridX: 2, gridY: 3, gridWidth: 3, gridHeight: 4}` (cells)
- Grid size: Each cell = 50px (configurable)
- Benefits: Simpler math, easier to understand, consistent naming

---

### Task: Warehouse Workflow Fix
- File: `/components/admin/stock/warehouse-management.tsx` (main component)
- Steps in order:
  1. Select Warehouse
  2. Design Layout (walls, doors, zones)
  3. Create Hierarchy (aisles, shelves, bins)
  4. Assign Products (with quantities)
- Remove: "Select layout" before creating one

---

### Task: Warehouse UI Compaction
- File: `/components/admin/stock/warehouse-management.tsx`
- Use: Radix UI `<Accordion>` component
- Collapse: Create warehouse, settings, import, hierarchy sections
- Show: Layout designer prominently
- Keep visible: Main canvas, controls

---

### Task: Product Location Display
- Files: 
  - Search product endpoint (backend)
  - Product search component (frontend)
  - Display component for location
- Show: Warehouse name → Zone → Aisle → Shelf → Bin → Quantity
- Highlight: Location on warehouse map

---

### Task: Installed Machines - Fix Selection
- File: `/app/admin/clients/installed-machines/page.tsx`
- Problem: Machines not clickable
- Solution: Add checkbox + click handler
- Add: `isSelected` state per machine
- Add: "Save Selected" button

---

### Task: Installed Machines - Edit Form Data
- File: `/app/admin/clients/installed-machines/page.tsx`
- Function: On edit click, fetch machine data
- Endpoint: `GET /api/installed-machines/:id`
- Populate: All form fields with existing data
- Fields: serialNumber, installationLocation, installationDate, nextServiceDate, installedBy, attendant, attendantNumber, isTrained

---

### Task: Installed Machines - Operator Number
- File: `/app/admin/clients/installed-machines/page.tsx`
- Field: `attendantNumber` (already in model)
- Add to form: Input for operator number
- Model has: attendant (name) + attendantNumber (phone/ID)

---

### Task: Installed Machines - Auto-Add on Invoice
- Backend: On invoice creation, check for "machine" type products
- Create: InstalledMachine records automatically
- Set: Status to "pending_installation_details"
- Show: In employee list with warning badge
- Allow: Click to edit and fill details

---

### Task: Email - Logo Usage
- Logo location: `/public/` folder
- Method: Embed as base64 or attachment with CID
- Implementation: 
  ```html
  <img src="cid:logo" alt="Logo" style="width: 150px;">
  ```
- Attachment:
  ```typescript
  attachments: [{
    filename: 'logo.png',
    path: path.join(process.cwd(), 'public/logo.png'),
    cid: 'logo'
  }]
  ```

---

### Task: Email - Template Improvements
- Files: Email templates (search for `/src/templates` or `/email`)
- Use: Existing brand colors only
- Style: Professional, not AI-like
- Layout: Centered, mobile-responsive
- Sections: Header with logo, content, footer

---

## 📂 DIRECTORY STRUCTURE FOR QUICK REFERENCE

```
/app/admin/stock/
├── quotations/page.tsx          ← Admin quotations (1370 lines)
├── invoices/page.tsx            ← Admin invoices
├── wms/page.tsx                 ← Warehouse management page
└── dispatch/[invoiceId]/page.tsx ← Delivery tracking

/app/admin/clients/
├── page.tsx                     ← Hub page
├── clients-list/page.tsx        ← Client management
├── installed-machines/page.tsx  ← Installed equipment (TO FIX)
├── communication/page.tsx       ← Client communication
└── bulk-sms/page.tsx            ← SMS campaigns

/app/employee/stock/
├── page.tsx                     ← Stock home
├── quotations/page.tsx          ← Employee quotations (1764 lines) (TO FIX)
└── invoices/page.tsx            ← Employee invoices (TO REDESIGN)

/components/admin/stock/
├── stock-manager-content.tsx    ← Main stock manager
├── warehouse-management.tsx     ← WMS canvas (1632 lines) (TO FIX)
└── [other stock components]

/server/src/
├── controllers/
│   ├── installedMachineController.ts  ← Machine CRUD
│   ├── warehouseController.ts         ← Warehouse CRUD
│   └── [other controllers]
├── models/
│   ├── InstalledMachine.ts
│   ├── Warehouse.ts
│   └── [other models]
└── routes/
    ├── warehouse.ts
    ├── installed-machines.ts
    └── [other routes]
```

---

## 🔍 SEARCH PATTERNS

### Find All Quotation-Related Code
```bash
grep -r "quotation" app/employee/stock --include="*.tsx"
grep -r "Quotation" server/src --include="*.ts"
```

### Find All Warehouse-Related Code
```bash
grep -r "warehouse\|Warehouse" components/admin/stock --include="*.tsx"
grep -r "warehouse\|Warehouse" server/src --include="*.ts"
```

### Find All Machine-Related Code
```bash
grep -r "machine\|Machine" app/admin/clients --include="*.tsx"
grep -r "machine\|Machine" server/src/controllers --include="*.ts"
```

### Find Dynamic Imports
```bash
grep -r "dynamic(" app --include="*.tsx"
```

### Find Select Components
```bash
grep -r "Select.Item" components --include="*.tsx"
```

---

## 🧪 TESTING COMMANDS

### Test WMS Page
1. Navigate to: `http://localhost:3000/admin/stock/wms`
2. Check console for errors
3. Try to save a warehouse design
4. Reload page and check if design persists

### Test Employee Quotations
1. Navigate to: `http://localhost:3000/employee/stock/quotations`
2. Check if phone number hidden in client search
3. Check if create form is collapsed
4. Try to download different quotation statuses

### Test Installed Machines
1. Navigate to: `http://localhost:3000/admin/clients/installed-machines`
2. Try to click/select machines
3. Try to edit a machine
4. Check if operator number field appears

---

## 🛠️ COMMON FIXES

### Fix 1: Import Error
**Problem**: "Cannot find module..."
**Solution**: Check file path, verify exports

### Fix 2: Select Value Error
**Problem**: "Select.Item must have value prop"
**Solution**: Ensure `value=""` is never used

### Fix 3: Async/Await Error
**Problem**: "Promise" in component
**Solution**: Unwrap with `.then()` or use client-side hook

### Fix 4: org_id Undefined
**Problem**: "org_id" missing in queries
**Solution**: Check `req.user?.org_id` in backend, add to frontend headers

### Fix 5: Data Not Persisting
**Problem**: Data saves but doesn't load on reload
**Solution**: Check database write, check query filter, verify org_id

---

## 📊 IMPLEMENTATION CHECKLIST

```
PRIORITY 1: FIX ERRORS
☐ Fix lazy import error
☐ Fix select value error  
☐ Clear and rebuild cache
☐ Verify no console errors

PRIORITY 2: EMPLOYEE QUOTATIONS
☐ Hide phone number in search
☐ Collapse create section
☐ Control download by status
☐ Control edit by status
☐ Redesign invoice page

PRIORITY 3: WAREHOUSE MANAGEMENT
☐ Fix save persistence
☐ Fix select empty values
☐ Implement grid system
☐ Fix workflow steps
☐ Add collapsible sections
☐ Show product locations

PRIORITY 4: INSTALLED MACHINES
☐ Fix machine selection
☐ Fix edit form data loading
☐ Add operator number field
☐ Implement auto-add
☐ Add edit dialog

PRIORITY 5: EMAIL & POLISH
☐ Update logo in emails
☐ Improve email layout
☐ Use brand colors
☐ Comprehensive testing
☐ Final polish & deploy
```

---

## 🚀 QUICK START COMMAND

To verify everything is set up:

```bash
cd /home/seth/Documents/code/employeehr

# Install dependencies
npm install

# Start dev server
npm run dev

# In another terminal, start backend
cd server
npm run dev

# Check if system runs at localhost:3000
# Check console for errors
# Navigate to /admin/stock/wms to test
```

---

## 📞 KEY CONTACTS/REFERENCES

- **Frontend Issues**: Check `/app/admin/stock/` and `/app/employee/stock/`
- **Backend Issues**: Check `/server/src/controllers/` and `/server/src/models/`
- **Database Issues**: Check MongoDB connection, org_id filtering
- **Error Messages**: Check browser console and server terminal
- **API Testing**: Use Postman/Insomnia with Authorization header

---

## ✨ FINAL NOTES

- All code uses TypeScript - check `.d.ts` files for types
- All routes require auth token in Authorization header
- All operations filtered by `org_id` for multi-tenant isolation
- Use existing UI components from Radix UI, don't create new ones
- Follow existing code patterns and style
- Test frequently (after each task)
- Document any API changes
- Keep this reference handy!

---

**Last Updated**: 2026-06-28
**Study Status**: ✅ COMPLETE
**Ready for Implementation**: YES
