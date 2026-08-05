# Installed Machines Module - Testing Guide

## Test Environment
- **Frontend**: `http://localhost:3000/admin/clients/installed-machines`
- **Backend API**: `/api/stock/*` endpoints
- **Database**: Should have sample quotations and invoices with physical products

## Test Scenarios

### Scenario 1: Machine Details Display & Edit
**Prerequisites**: At least one InstalledMachine record exists in the database

**Steps**:
1. Navigate to `/admin/clients/installed-machines`
2. Verify machines list loads with "Machines Registry"
3. Click on any machine in the list
4. **Expected Result**: Right panel should display machine details (productName, client, serial number, etc.)
5. Click "Edit Details" button
6. **Expected Result**: Dialog should open showing editable fields:
   - Serial Number
   - Installation Location
   - Installed By
   - Operator/Attendant
   - Operator Phone/Number
   - Notes
   - Operator is trained (checkbox)
   - Next Service Date
7. Modify any field (e.g., add Serial Number)
8. Click "Save Changes"
9. **Expected Result**: 
   - Dialog should close
   - Confirmation message: "Machine details updated"
   - Machine list should refresh
   - Details panel should show updated information

### Scenario 2: Add Machines from Candidates
**Prerequisites**: 
- Delivered invoices exist with physical products (quotations converted to invoices)
- Machines not yet marked as installed

**Steps**:
1. Navigate to `/admin/clients/installed-machines`
2. Click "Add Machines" button
3. **Expected Result**: "Add Machines from Invoices" section expands
4. Verify "Filter by Category" dropdown loads with product categories
5. Select a category
6. **Expected Result**: List updates to show candidates from that category
7. Click on a candidate item
8. **Expected Result**: Item highlights with blue/primary color
9. Verify Checkbox and "Add/Remove" button are clickable
10. Select multiple candidates (3-5)
11. Click "Save X Selected" (X = number of selected)
12. **Expected Result**:
    - Confirmation message: "Saved selected installed machines"
    - Candidates section collapses
    - New machines appear in the registry
    - Machines have status "active" (shown in badge)

### Scenario 3: Auto-Create on Quotation to Invoice Conversion
**Prerequisites**: 
- A quotation with physical products (machines)
- User has permission to convert quotations

**Steps**:
1. Create or find a quotation with at least 2 physical products
2. Navigate to quotation and convert to invoice
3. Click "Convert to Invoice"
4. **Expected Result**: Invoice created successfully
5. Navigate to `/admin/clients/installed-machines`
6. **Expected Result**:
   - New machines should appear in the list
   - Status should show as badge (default "active")
   - If machines have no serial numbers, they may appear incomplete
7. Click on auto-created machine
8. **Expected Result**: Details panel shows:
   - Product name
   - Client from quotation
   - Invoice ID and Quotation ID populated
   - Other fields empty (waiting for user input)

### Scenario 4: Auto-Create on Direct Invoice Creation
**Prerequisites**: Ability to create invoices directly from items

**Steps**:
1. Navigate to create invoice from items (not from quotation)
2. Add physical products to the invoice
3. Create invoice
4. Navigate to `/admin/clients/installed-machines`
5. **Expected Result**: New machines appear with:
   - Status: "active"
   - Invoice ID populated
   - No quotation ID (since created directly)

### Scenario 5: Machine Deletion
**Prerequisites**: InstalledMachine record exists

**Steps**:
1. Click on machine in list
2. Click "Delete" button
3. **Expected Result**: Confirmation prompt appears
4. Confirm deletion
5. **Expected Result**:
   - Confirmation message: "Machine deleted"
   - Machine removed from list
   - Details panel hidden

### Scenario 6: Machine Search
**Prerequisites**: Multiple machines in registry

**Steps**:
1. Navigate to `/admin/clients/installed-machines`
2. Enter search term in "Search by machine, client, serial..." field
3. **Test terms**:
   - Product name (partial match)
   - Client name
   - Serial number
   - Installation location
4. **Expected Result**: List filters to matching machines

## API Testing

### Test 1: List Installed Machines
```
GET /api/stock/installed-machines
Expected: 200 OK
Response: { success: true, data: [...] }
```

### Test 2: Create Installed Machine
```
POST /api/stock/installed-machines
Body: {
  client: { name: "Test Corp", number: "123", location: "Nairobi" },
  productId: "abc123",
  productName: "Test Machine",
  category: "Heavy Machinery",
  invoiceId: "inv123",
  quotationId: "quot123"
}
Expected: 201 Created
Response: { success: true, data: { _id: "...", ... } }
```

### Test 3: Update Installed Machine
```
PATCH /api/stock/installed-machines/{machineId}
Body: {
  serialNumber: "SN-2024-001",
  installationLocation: "Lab 1",
  nextServiceDate: "2024-12-31T00:00:00Z",
  installedBy: "John Doe",
  isTrained: true
}
Expected: 200 OK
Response: { success: true, data: { _id: "...", serialNumber: "SN-2024-001", ... } }
```

### Test 4: Delete Installed Machine
```
DELETE /api/stock/installed-machines/{machineId}
Expected: 200 OK
Response: { success: true, message: "Machine deleted" }
```

### Test 5: List Candidates
```
GET /api/stock/installed-candidates
Expected: 200 OK
Response: {
  success: true,
  data: {
    categories: ["Electronics", "Heavy Machinery", ...],
    candidates: [
      {
        invoiceId: "...",
        quotationId: "...",
        invoiceNumber: "INV-001",
        client: {...},
        productId: "...",
        productName: "...",
        category: "...",
        quantity: 1
      },
      ...
    ]
  }
}
```

## Success Indicators
✅ All machines display with correct information
✅ Dialog opens and closes properly
✅ Save button sends PATCH request and updates machine
✅ Add machines from candidates works smoothly
✅ Auto-created machines appear after invoice conversion
✅ Search filters machines correctly
✅ Delete removes machine from list

## Failure Indicators
❌ Dialog doesn't open when clicking "Edit Details"
❌ PATCH request returns "no response" or 500 error
❌ Auto-created machines don't appear in list
❌ Candidates list doesn't load
❌ Machines don't highlight when selected
❌ Save button shows error after clicking

## Browser Console
Monitor for:
- API response errors
- Console errors (red messages)
- Network tab for failed requests
- Check request/response payloads

## Database Verification
```javascript
// MongoDB - verify installed machines created
db.installedmachines.find({ status: "installation_pending" })
db.installedmachines.find({ invoiceId: "target_invoice_id" })

// Verify auto-created records have correct fields
db.installedmachines.findOne({ status: "installation_pending" })
```

## Performance Notes
- Machine list with 100+ records should load in < 2 seconds
- Search should filter in real-time
- Dialog should open within 200ms
- Save operation should complete in < 1 second
