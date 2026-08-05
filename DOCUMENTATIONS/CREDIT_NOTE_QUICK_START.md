# Credit Note System - Quick Start Guide

## What is a Credit Note?

A credit note is a document that reduces the amount of money owed by a customer. It's used when:
- Goods are returned after invoicing
- Services are overcharged
- Wrong items were billed
- Discounts are applied after invoicing
- Part of an order is canceled

## Features

✅ Create credit notes from existing invoices
✅ Select specific items to credit
✅ Choose predefined or custom reasons
✅ Track status (draft, issued, applied)
✅ Download as professional PDF documents
✅ Filter by status
✅ Edit and issue draft credit notes
✅ Delete draft credit notes

## Step-by-Step Workflow

### 1. Create a Credit Note

**Navigate**: `/admin/stock/credit-notes` → Click "Create Credit Note"

```
Step 1: Select Invoice
  └─ Choose from issued/paid invoices
  └─ See invoice summary (items, amounts)

Step 2: Select Items to Credit
  └─ Choose which items from the invoice to credit
  └─ Adjust quantities (cannot exceed original qty)
  └─ See subtotal update automatically

Step 3: Add Reason
  └─ Select reason from dropdown:
     • Goods are returned
     • Services were overcharged
     • Incorrect items were billed
     • Discounts are applied after invoicing
     • An order is partially canceled
     • Other (custom)
  └─ If "Other", provide details

Step 4: Review & Create
  └─ Confirm total credit amount
  └─ Click "Create" to save as DRAFT
```

### 2. Issue a Credit Note

**Status**: Draft → Issued

```
View the credit note → Click "Issue" button
→ Status changes to "Issued"
→ Can now be downloaded or applied
```

### 3. Download PDF

**Status**: Issued or Applied

```
View credit note in list → Click "Download" button
→ Browser downloads: credit-note-[CN-number].pdf
→ Professional document ready to send to customer
```

### 4. Apply to Invoice (Future)

**Status**: Issued → Applied

```
Link credit note to original invoice
→ Reduce invoice balance by credit amount
→ Create new invoice or payment against original
```

## Credit Note Statuses

| Status | Description | Actions Available |
|--------|-------------|-------------------|
| **Draft** | Being prepared, not finalized | Edit, Issue, Delete, Download |
| **Issued** | Finalized, can be used | Download, Apply (future) |
| **Applied** | Applied to invoice, reduces balance | View, Download |

## Filters & Search

**View Page Features**:
- Status filter: All, Draft, Issued, Applied
- Lists all credit notes for your organization
- Shows: CN number, invoice ref, client, amount, reason, status, date
- Sort by date (newest first)

## PDF Document Contents

When you download a credit note PDF, it includes:

```
┌─────────────────────────────────────┐
│  Company Logo (if configured)       │
│                  CREDIT NOTE        │ ← Large title
├─────────────────────────────────────┤
│ CN-20240115-5432                    │
│ Date: Jan 15, 2024                  │
├──────────────┬──────────────────────┤
│ Bill To:     │ Contact Info:        │
│ ABC Company  │ Phone: +254...       │
│ Nairobi      │ Location: ...        │
├──────────────┴──────────────────────┤
│ Reference Invoice: INV-2024-001     │
│ Reason: Goods are returned          │
│ Details: 5 units defective          │
├─────────────┬───────┬─────┬─────────┤
│ Item        │ Qty   │ Price │ Total │
├─────────────┼───────┼─────┼─────────┤
│ Product A   │ 5     │ 1000  │ 5000  │
│ Product B   │ 2     │ 500   │ 1000  │
├─────────────┴───────┴─────┼─────────┤
│ Subtotal: KSh 6,000       │         │
│ Total Credit: KSh 6,000   │ KSh 6k  │
└───────────────────────────┴─────────┘
```

## Validation Rules

### Creating a Credit Note
✅ Must select at least 1 item
✅ Item quantities cannot exceed original invoice quantities
✅ Invoice must be "Issued" or "Paid" status
✅ If reason is "Other", must provide details

### Editing a Credit Note
✅ Only draft notes can be edited
✅ Cannot change reason after issuing
✅ Cannot delete items after issuing

### Deleting a Credit Note
✅ Only draft notes can be deleted
✅ Issued/applied notes are permanent records

## Common Use Cases

### Scenario 1: Customer Returns 5 Units
```
1. Go to invoices, find original invoice
2. Create credit note from invoice
3. Select the returned product, qty = 5
4. Reason: "Goods are returned"
5. Create and issue
6. Download PDF to send to customer
```

### Scenario 2: Overcharge Correction
```
1. Create credit note for the invoice
2. Select item with wrong unit price
3. Adjust qty if needed
4. Reason: "Services were overcharged"
5. Details: "Charged 5000, should be 3000"
6. Create, issue, and download
```

### Scenario 3: Wrong Items Billed
```
1. Create credit note
2. Select wrong items that were billed
3. Reason: "Incorrect items were billed"
4. Details: "Customer ordered Product X, billed Product Y"
5. Issue and send to customer
```

## Tips & Best Practices

💡 **Always Issue Before Sending**
- Drafts show "DRAFT" watermark on PDF
- Only issued notes are final documents

💡 **Keep Detailed Notes**
- Use "Other" reason type to explain complex situations
- Helps with audit trail and customer communication

💡 **Track All Credits**
- All credit notes are logged with your user ID
- System tracks creation date and status changes
- Apply credits promptly to keep accounting accurate

💡 **Organization Filtering**
- Only see credit notes for your organization
- Cannot access other orgs' credit notes

## Troubleshooting

**"Invoices list is empty"**
- Only issued/paid invoices are available
- Check invoice status in stock module

**"Quantity exceeds original"**
- Original qty from invoice: [X]
- You selected: [Y] (too many!)
- Reduce quantity to ≤ [X]

**"Cannot issue, already issued"**
- Credit note already issued
- Can only download, not modify

**"PDF download fails"**
- Check browser download settings
- Verify internet connection
- Try another browser if persists
- Contact support if error continues

## API Reference (Developers)

All credit note operations follow REST API pattern:

```
GET    /api/stock/credit-notes                  → List all
POST   /api/stock/credit-notes                  → Create
GET    /api/stock/credit-notes/reasons          → Get reasons
GET    /api/stock/credit-notes/:id              → Get one
GET    /api/stock/credit-notes/:id/pdf          → Download PDF
PUT    /api/stock/credit-notes/:id              → Update (draft only)
POST   /api/stock/credit-notes/:id/issue        → Issue
DELETE /api/stock/credit-notes/:id              → Delete (draft only)
```

Authentication: Bearer token required (JWT)

## Support & Next Steps

**Questions?** Check the system documentation:
- Full schema: [CREDIT_NOTES_SYSTEM.md](./CREDIT_NOTES_SYSTEM.md)
- Technical details: [CREDIT_NOTE_PDF_IMPLEMENTATION.md](./CREDIT_NOTE_PDF_IMPLEMENTATION.md)

**Coming Soon**:
- Email delivery of credit notes
- Automatic invoice balance adjustment
- Bulk credit note operations
- Credit note templates
