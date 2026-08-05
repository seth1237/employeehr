# Quick Start Guide - Enhanced Complaints Module

**Status**: ✅ Ready to Use  
**Location**: `/admin/accounts/complaints/new` and `/admin/clients/complaints/new`  
**Features**: Invoice & Machine Linking

---

## 🚀 Quick Overview

The complaints module now automatically suggests related invoices and machines based on the complaint type you select.

---

## 📋 Complaint Types & Dropdowns

### 💵 Delivery/Billing/Refund Complaints → Invoice Dropdown

| Complaint Type | Dropdown | Shows |
|---|---|---|
| Delayed Delivery | 📋 Invoice | `INV-001 - 06/28/2026` |
| Billing Issues | 📋 Invoice | `INV-001 - 06/28/2026` |
| Refund Requests | 📋 Invoice | `INV-001 - 06/28/2026` |

**Use Case**: Track complaints related to specific invoices

---

### 🔧 Warranty/Technical/Quality Complaints → Machine Dropdown

| Complaint Type | Dropdown | Shows |
|---|---|---|
| Warranty Claims | 🖥️ Machine | `MRI Scanner (SN-2024-001)` |
| Technical Problems | 🖥️ Machine | `Ultrasound Machine` |
| Product Defects | 🖥️ Machine | `CT Scanner (SN-2024-002)` |
| Quality Issues | 🖥️ Machine | `X-Ray (SN-2024-003)` |

**Use Case**: Track complaints related to specific machines

---

### ℹ️ Other Complaint Types → No Dropdown

| Complaint Type | Dropdown |
|---|---|
| Poor Service | None |
| Staff Misconduct | None |
| Other | None |

**Use Case**: General complaints without specific assets

---

## 🎯 How to Use

### Step 1: Create New Complaint
```
Navigate to: /admin/accounts/complaints/new
```

### Step 2: Select Client
```
Search by:
  • Client Name (e.g., "John's Clinic")
  • Location (e.g., "Nairobi")
  • Phone Number (e.g., "0712345678")
  • Contact Person (e.g., "Dr. Smith")

👆 Click client to select
```

### Step 3: Fill Basic Info
```
Title: Brief summary of complaint
Description: Detailed explanation

✍️ Fill both required fields
```

### Step 4: Select Category
```
Options appear:
• Poor Service
• Delayed Delivery         ← Shows invoice dropdown ⬇️
• Billing Issues           ← Shows invoice dropdown ⬇️
• Product Defects          ← Shows machine dropdown ⬇️
• Staff Misconduct
• Technical Problems       ← Shows machine dropdown ⬇️
• Warranty Claims          ← Shows machine dropdown ⬇️
• Refund Requests          ← Shows invoice dropdown ⬇️
• Quality Issues           ← Shows machine dropdown ⬇️
• Other

👆 Click category
```

### Step 5: Select Related Item (if applicable)
```
IF Invoice Dropdown Showed:
  💡 Choose related invoice
  📍 Shows "INV-001 - 06/28/2026"

IF Machine Dropdown Showed:
  💡 Choose related machine
  📍 Shows "MRI Scanner (SN-2024-001)"

IF Neither Showed:
  ✓ No action needed - proceed to step 6
```

### Step 6: Set Priority
```
Priority Level:
  • Low      (Minor issues)
  • Medium   (Standard)
  • High     (Important)
  • Urgent   (Critical)

👆 Select priority
```

### Step 7: Create Complaint
```
Click "Create Complaint"

Result:
  ✅ Complaint created
  📍 Linked to invoice/machine if selected
  📧 Auto-saves to database
  🔄 Redirects to complaint detail page
```

---

## 💡 Smart Features

### Auto-Load Data
When you select a client, the system automatically:
- 🔄 Fetches all invoices for that client
- 🔄 Fetches all machines installed at that client
- ⏱️ Shows "Loading..." while fetching
- ✅ Data appears instantly

### Smart Filtering
The dropdowns only show:
- ✓ Items for your selected client
- ✓ Current/active items
- ✓ Properly formatted for easy selection

### Helpful Messages
If no items found:
- "No invoices found for this client" - when complaint is about delivery/billing
- "No machines found for this client" - when complaint is about warranty/technical

---

## 🎨 Visual Guide

```
┌─────────────────────────────────────────┐
│ New Client Complaint                    │
├─────────────────────────────────────────┤
│                                         │
│ 🔍 Search Client                        │
│ [Search by name, number, location...]   │
│                                         │
│ Selected: John's Clinic                 │
│           0712345678 · Nairobi          │
│                                         │
│ 📝 Title: [Emergency service needed..] │
│                                         │
│ 📝 Description: [Long description...]  │
│                                         │
│ 📋 Category: [Warranty Claims ▼]        │
│                                         │
│ ⭐ Priority: [Medium ▼]                 │
│                                         │
│ 🖥️  Related Machine: [MRI Scanner ▼]    │
│                                         │
│ [Cancel] [Create Complaint]             │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔍 Examples

### Example 1: Invoice Complaint (Delayed Delivery)

```
1. Search: "ABC Medical Center"
2. Title: "Delivery delayed by 3 days"
3. Description: "Equipment was supposed to arrive on June 25"
4. Category: "Delayed Delivery"
5. Invoice appears ▼
6. Select: "INV-2024-001 - 06/28/2026"
7. Priority: "High"
8. ✅ Create
   → Complaint linked to specific invoice
   → Admin can see delivery details for that invoice
```

### Example 2: Machine Complaint (Warranty)

```
1. Search: "City Hospital"
2. Title: "MRI machine not functioning properly"
3. Description: "Screen shows error code E-001, machine won't turn on"
4. Category: "Warranty Claims"
5. Machine appears ▼
6. Select: "MRI Scanner (SN-2024-001)"
7. Priority: "Urgent"
8. ✅ Create
   → Complaint linked to specific machine
   → Admin can see service history for that machine
   → Warranty status tracked from machine record
```

### Example 3: General Complaint (No Dropdown)

```
1. Search: "Clinic X"
2. Title: "Poor communication from staff"
3. Description: "Staff was rude and unhelpful"
4. Category: "Poor Service"
5. No dropdown (this is a general complaint)
6. Priority: "Medium"
7. ✅ Create
   → General complaint created
   → Not linked to specific invoice or machine
```

---

## ⚙️ Technical Details

### What Gets Stored
```javascript
{
  clientId: "john-clinic-001",
  clientName: "John's Clinic",
  title: "Equipment delivery delayed",
  description: "...",
  complaintCategory: "delayed_delivery",
  priority: "high",
  relatedInvoiceId: "64f5a3c9e2d1b4a6f9c8",  // ← NEW
  relatedMachineId: null
}
```

### API Integration
```
Client Selected:
  ↓
GET /api/stock/invoices?client=John's%20Clinic
GET /api/stock/installed-machines
  ↓
Data Displayed in Dropdowns
  ↓
User Submits:
  ↓
POST /api/complaints (with relatedInvoiceId/relatedMachineId)
  ↓
✅ Stored in Database with Links
```

---

## 🆘 Troubleshooting

### Dropdown Not Appearing
**Problem**: Selected category but dropdown didn't show  
**Solution**: 
- Refresh page
- Check if client actually has invoices/machines
- Look for error message in red

### No Items in Dropdown
**Problem**: Category is right but dropdown is empty  
**Solution**:
- Client may not have invoices/machines created yet
- Check with stock module to create invoices first
- Message shows "No X found for this client" - this is expected

### Can't Select Client
**Problem**: Client list not showing  
**Solution**:
- Type to search
- Click in search box and wait for results
- Refresh page if still stuck

### Form Won't Submit
**Problem**: Button shows "Creating..." but doesn't complete  
**Solution**:
- Check internet connection
- Check browser console for errors (F12)
- Ensure all required fields are filled
- Try again after a moment

---

## 📞 Support

### For Technical Issues
1. Check browser console (F12)
2. Look for error messages
3. Verify all required fields filled
4. Try refreshing page
5. Contact developer with error message

### For Missing Data
1. Ensure invoices are created in stock module
2. Ensure machines are registered as installed
3. Check that data belongs to current client
4. Verify user has proper permissions

---

## ✅ Checklist Before Creating Complaint

- [ ] Client is selected
- [ ] Title is filled in
- [ ] Description is detailed
- [ ] Category is selected
- [ ] If invoice needed - invoice chosen
- [ ] If machine needed - machine chosen
- [ ] Priority is set
- [ ] Information is correct
- [ ] Ready to submit

---

## 🎯 Key Points to Remember

1. **Smart Selection**: Just pick the category and the right dropdown appears
2. **Auto-Populated**: Data loads automatically when you pick a client
3. **Optional Links**: Invoice/machine selection is optional
4. **Clear Format**: Invoice shows number + date, Machine shows name + serial
5. **Easy Filtering**: Only see items for the client you selected
6. **Helpful Messages**: If no items found, you'll see why

---

## 📊 Success Indicators

✅ **Good Signs**:
- Dropdown appears when you select category
- Data loads after you select client
- Items shown are relevant to your selection
- Form submission succeeds with checkmark
- Redirected to complaint detail page

❌ **Problem Signs**:
- Dropdown never appears
- "Loading..." spins forever
- No items in dropdown with no explanation
- Form submission shows error
- Page doesn't redirect

---

## 🚀 You're All Set!

The enhanced complaints module is ready to use. Navigate to:
```
/admin/accounts/complaints/new
```

or

```
/admin/clients/complaints/new
```

And start creating complaints with smart invoice and machine linking!

---

**Last Updated**: June 28, 2026  
**Version**: 1.0  
**Status**: Production Ready ✅
