# Services-Quotations Integration Guide

## Overview
This guide demonstrates how to integrate services into the existing quotations system, enabling organizations to include services alongside products in customer quotations.

## Current State

### Quotation Item Structure
Quotations currently support products via `StockQuotationItem`:
```typescript
{
  productId: string
  productName: string
  quantity: number
  productUnitPrice: number
  soldUnitPrice: number
  unitPrice: number
  lineTotal: number
  isOutsourced: boolean
}
```

### Service Structure (New)
Services are stored as products with `productType: "service"`:
```typescript
{
  _id: string
  name: string
  category: string
  sellingPrice: number
  isRecurring: boolean
  intervalDays: number
  productType: "service"
}
```

## Integration Steps

### Step 1: Update Quotation Creation UI

Modify `/components/stock/CreateQuotationDialog.tsx` to support service items:

```typescript
// In the item selection section
const [itemType, setItemType] = useState<'product' | 'service'>('product')
const [products, setProducts] = useState([])
const [services, setServices] = useState([])

// When loading items
const fetchItems = async () => {
  const [productsRes, servicesRes] = await Promise.all([
    fetch('/api/stock/products'),
    fetch('/api/stock/services')
  ])
  // Set both products and services
}

// In the item selection form
<Select value={itemType} onValueChange={setItemType}>
  <SelectItem value="product">Product</SelectItem>
  <SelectItem value="service">Service</SelectItem>
</Select>

<Select value={selectedItemId} onValueChange={setSelectedItemId}>
  <SelectContent>
    {(itemType === 'product' ? products : services).map(item => (
      <SelectItem key={item._id} value={item._id}>
        {item.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Step 2: Update buildQuotationItems Helper

Modify `/server/src/controllers/stockController.ts` `buildQuotationItems` function:

```typescript
// Add service detection
const isService = await StockProduct.findOne({
  _id: item.productId,
  productType: 'service'
}).select('productType')

if (isService) {
  // For services, quantity means number of service instances
  return {
    productId: String(item.productId),
    productName: item.productName,
    quantity: item.quantity,
    productUnitPrice: item.unitPrice || Number(product.sellingPrice),
    soldUnitPrice: item.unitPrice || Number(product.sellingPrice),
    unitPrice: item.unitPrice || Number(product.sellingPrice),
    lineTotal: Number((item.quantity * (item.unitPrice || Number(product.sellingPrice))).toFixed(2)),
    isService: true, // New flag
    isOutsourced: false
  }
}
```

### Step 3: Update Quotation to Invoice Conversion

Modify `convertQuotationToInvoice` to skip stock deduction for services:

```typescript
// In convertQuotationToInvoice
const stockManagedItems = quotation.items.filter(
  item => !item.isOutsourced && !item.isService // Add service check
)

// For service items, just include in invoice without stock management
const serviceItems = quotation.items.filter(item => item.isService)
const allInvoiceItems = [...stockManagedItems, ...serviceItems]
```

### Step 4: Create Service Job from Invoice

When converting quotation to invoice with services, auto-create service jobs:

```typescript
// After creating invoice in convertQuotationToInvoice
for (const serviceItem of serviceItems) {
  const service = await StockProduct.findOne({
    _id: serviceItem.productId,
    productType: 'service'
  })

  if (service) {
    // Create initial service job
    const scheduledDate = new Date()
    scheduledDate.setDate(scheduledDate.getDate() + 7) // Schedule 7 days out

    await StockServiceJob.create({
      org_id,
      serviceId: serviceItem.productId,
      serviceName: service.name,
      clientId: clientId, // If available from quotation
      clientName: quotation.client.name,
      scheduledDate,
      status: 'pending',
      notes: `From quotation ${quotation.quotationNumber}, Invoice: ${invoice.invoiceNumber}`,
      isRecurring: service.isRecurring,
      intervalDays: service.intervalDays,
      createdBy: actorId,
    })
  }
}
```

### Step 5: Update Invoice Display

Modify invoice view to show services separately:

```typescript
// In invoice display component
const serviceItems = invoice.items.filter(item => item.isService)
const productItems = invoice.items.filter(item => !item.isService)

// Show services section
{serviceItems.length > 0 && (
  <div className="mt-6 border-t pt-4">
    <h3 className="font-bold mb-3">Services</h3>
    <Table>
      <TableBody>
        {serviceItems.map(item => (
          <TableRow key={item.productId}>
            <TableCell>{item.productName}</TableCell>
            <TableCell>{item.quantity}</TableCell>
            <TableCell>KES {item.unitPrice}</TableCell>
            <TableCell>KES {item.lineTotal}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
)}
```

### Step 6: Update Analytics to Include Services

Modify financial breakdown to include service revenue:

```typescript
// In getFinancialBreakdown
const serviceJobs = await StockServiceJob.find({
  org_id,
  status: 'done',
  completedDate: { $gte: startDate, $lte: endDate }
}).lean()

const serviceRevenue = serviceJobs.reduce((sum, job) => {
  const service = serviceMap.get(String(job.serviceId))
  return sum + (service?.sellingPrice || 0)
}, 0)

const totalRevenue = productRevenue + serviceRevenue

// Update summary
summary.totalRevenue = totalRevenue
summary.serviceRevenue = serviceRevenue
summary.productRevenue = productRevenue
```

## API Endpoints for Integration

### Get Services for Quotation
```
GET /api/stock/services
Response: [
  {
    _id: "svc_123",
    name: "Monthly Maintenance",
    sellingPrice: 5000,
    isRecurring: true,
    intervalDays: 30
  }
]
```

### Add Service to Existing Quotation
```
PUT /api/stock/quotations/:quotationId
{
  "items": [
    {
      "productId": "svc_123",
      "productName": "Monthly Maintenance",
      "quantity": 1,
      "unitPrice": 5000,
      "isService": true
    }
  ]
}
```

### Get Service Jobs from Invoice
```
GET /api/stock/services/jobs?invoiceId=inv_456
Response: [
  {
    _id: "job_789",
    serviceName: "Monthly Maintenance",
    scheduledDate: "2024-02-15T00:00:00Z",
    status: "pending"
  }
]
```

## Database Schema Changes Required

### Update Quotation Item Schema (if using Prisma)
```prisma
model ServiceQuotationItem {
  id              String   @id @default(cuid())
  quotationId     String
  serviceId       String
  quantity        Int      // Number of service instances
  unitPrice       Decimal
  lineTotal       Decimal
  createdAt       DateTime @default(now())

  quotation       StockQuotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)
}
```

### Add Service Reference to Invoice Items
```mongodb
// In StockInvoice document
{
  items: [
    {
      productId: ObjectId,
      productName: String,
      quantity: Number,
      unitPrice: Number,
      lineTotal: Number,
      isService: Boolean // NEW
    }
  ]
}
```

## Example Workflow

### 1. Create Quotation with Products + Services
```
POST /api/stock/quotations
{
  "client": {...},
  "items": [
    // Product items
    {
      "productId": "prod_123",
      "productName": "Widget A",
      "quantity": 5,
      "unitPrice": 1000
    },
    // Service items
    {
      "productId": "svc_456",
      "productName": "Installation Service",
      "quantity": 1,
      "unitPrice": 5000,
      "isService": true
    }
  ]
}
```

### 2. Convert to Invoice
```
POST /api/stock/quotations/:quotationId/convert-to-invoice
// System creates:
// - Invoice with all items (products + services)
// - Service jobs for each service item
// - Stock entries only for products
```

### 3. Track Service Completion
```
PUT /api/stock/services/jobs/:jobId/status
{
  "status": "done"
}
// If recurring, creates next job automatically
```

### 4. View Combined Revenue Analytics
```
GET /api/stock/analytics/financial-breakdown
Response: {
  "productRevenue": 50000,
  "serviceRevenue": 15000,
  "totalRevenue": 65000
}
```

## Benefits

1. **Single Quotation System**: Products and services in same document
2. **Automatic Job Creation**: Service jobs auto-generated from quotations
3. **Unified Invoicing**: Combined product/service invoices
4. **Comprehensive Analytics**: Revenue includes both products and services
5. **Recurring Services**: Automatic follow-up jobs for recurring services
6. **Client Continuity**: Services tracked with same client context

## Implementation Notes

- **Backward Compatibility**: Existing quotations work unchanged
- **Gradual Migration**: Can add services incrementally
- **Performance**: Service items don't impact product stock management
- **Data Integrity**: Service items tracked separately but invoiced together
- **Audit Trail**: Service job history maintained independently

## Testing Checklist

- [ ] Create quotation with both products and services
- [ ] Service items calculate lineTotal correctly
- [ ] Convert quotation to invoice includes all items
- [ ] Service jobs created with correct details
- [ ] Recurring services auto-generate next job on completion
- [ ] Invoice displays products and services sections
- [ ] Analytics include service revenue
- [ ] Stock only deducted for products, not services
- [ ] Client can be tracked from quotation through invoice to completed jobs
- [ ] All permissions enforced (admin/employee roles)
