# Credit Note System Documentation

## Overview

The Credit Note system allows users to create and manage credit notes for existing invoices. Credit notes are used to adjust invoice amounts due to various reasons such as returned goods, overcharges, or discounts applied after invoicing.

## Features

### Key Capabilities
- **Invoice-Based Creation**: Credit notes can only be created from existing issued or paid invoices
- **Partial Item Adjustment**: Select specific items and quantities to credit
- **Reason Tracking**: Categorically track reasons for credit note issuance
- **Custom Reasons**: Support for "Other" reason type with custom details
- **Status Management**: Track credit notes through draft → issued → applied states
- **Item-Level Control**: Adjust quantities for each line item in the original invoice

### Supported Reasons
1. **Goods are returned** - Customer returned purchased items
2. **Services were overcharged** - Services charged at incorrect higher rate
3. **Incorrect items were billed** - Wrong products invoiced to customer
4. **Discounts are applied after invoicing** - Discount offered post-invoice
5. **An order is partially canceled** - Customer canceled part of order
6. **Other** - Custom reason with description

## Data Model

### CreditNote Schema
```typescript
{
  creditNoteNumber: string       // Auto-generated unique number
  invoiceId: string              // Reference to original invoice
  invoiceNumber: string          // Invoice number for display
  client: {
    name: string                 // Client/customer name
    number: string               // Client contact number
    location: string             // Client location
  }
  items: [{
    productId: string            // Product ID from invoice
    productName: string          // Product name
    quantity: number             // Quantity being credited
    unitPrice: number            // Unit price (may differ from invoice)
    lineTotal: number            // quantity × unitPrice
    originalInvoiceItemQty: number  // Original qty on invoice
  }]
  subTotal: number               // Sum of all line totals
  reason: string                 // Reason enum value
  reasonDetails?: string         // Additional details if reason is "other"
  status: "draft" | "issued" | "applied"
  createdBy: string              // User ID who created the note
  createdAt: Date                // Creation timestamp
}
```

## API Endpoints

### GET `/api/stock/credit-notes/invoices-for-credit-note`
Fetch list of invoices available for credit note creation (issued/paid status)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "invoice_id",
      "invoiceNumber": "INV-123",
      "client": {"name": "...", "number": "...", "location": "..."},
      "items": [...],
      "subTotal": 50000
    }
  ]
}
```

### GET `/api/stock/credit-notes/reasons`
Get all available credit note reasons

**Response:**
```json
{
  "success": true,
  "data": {
    "returned": "Goods are returned",
    "overcharged": "Services were overcharged",
    ...
  }
}
```

### POST `/api/stock/credit-notes`
Create a new credit note

**Request Body:**
```json
{
  "invoiceId": "invoice_id",
  "items": [
    {
      "productId": "prod_123",
      "productName": "Product Name",
      "quantity": 5,
      "unitPrice": 1000
    }
  ],
  "reason": "returned",
  "reasonDetails": null
}
```

**Response:** Returns created credit note object with status `draft`

### GET `/api/stock/credit-notes`
Get all credit notes with optional filtering

**Query Parameters:**
- `status`: Filter by status (draft, issued, applied, all)
- `page`: Page number for pagination
- `limit`: Records per page

### GET `/api/stock/credit-notes/:id`
Get a specific credit note by ID

### PUT `/api/stock/credit-notes/:id`
Update credit note (draft only)

**Allowed Edits:**
- `items`: Modify items and quantities
- `reason`: Change reason
- `reasonDetails`: Update custom reason details
- `status`: Change status

### POST `/api/stock/credit-notes/:id/issue`
Issue a credit note (draft → issued)

### DELETE `/api/stock/credit-notes/:id`
Delete credit note (draft only)

## Frontend Usage

### Create Credit Note Flow
1. Navigate to `/admin/stock/credit-notes`
2. Click "Create Credit Note" button
3. Select invoice from dropdown
4. Adjust quantities for each item to credit
5. Select reason and add details (if "Other")
6. Review total credit amount
7. Click "Create" - saves as draft

### Manage Credit Notes
- View list with filtering by status
- Issue draft credit notes
- Download credit notes as PDF
- Delete draft credit notes

## Workflow Example

**Scenario**: Customer returned 5 units of Product A (originally priced at KSh 1,000)

1. **Create**: Generate credit note from invoice, select Product A quantity 5
2. **Reason**: Select "Goods are returned"
3. **Status**: Draft (KSh 5,000 credit)
4. **Issue**: When confirmed, change status to issued
5. **Apply**: Either auto-apply to reduce invoice balance or create new invoice with negative amount

## Validation Rules

- Invoice must be in "issued" or "paid" status
- At least one item must be selected for credit
- Item quantity cannot exceed original invoice quantity
- If reason is "other", custom details are mandatory
- Only draft credit notes can be edited or deleted
- Draft credit notes can be converted to issued state

## Future Enhancements

- [ ] PDF generation and download for credit notes
- [ ] Email delivery of credit notes to customers
- [ ] Automatic invoice balance adjustment
- [ ] Bulk credit note creation
- [ ] Credit note templates for frequent reasons
- [ ] Integration with accounting module
- [ ] Credit note approval workflow
- [ ] Historical credit note archive

## Security

- All endpoints require authentication (Bearer token)
- User can only view/manage credit notes for their organization
- Write operations (create, update, delete) require specific user role
- Audit trail maintained through `createdBy` field
