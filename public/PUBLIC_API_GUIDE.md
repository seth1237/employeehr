# ERP Public API Guide for Website Backends

## Overview

The ERP provides public REST APIs for websites to integrate with the product catalog, quotation system, and invoice management. These APIs require **no user authentication** but do require the **organization ID** to identify the tenant.

---

## Authentication

### For Public Endpoints

Public endpoints (`/api/stock/public/*`) require only the **organization ID** (`orgId`), no bearer token needed.

Pass `orgId` in one of these ways:

**Option 1: Query Parameter**
```bash
GET /api/stock/public/products?orgId=YOUR_ORG_ID
```

**Option 2: Request Header**
```bash
GET /api/stock/public/products
X-Org-Id: YOUR_ORG_ID
```

**Option 3: Request Body (POST requests)**
```json
{
  "orgId": "YOUR_ORG_ID",
  "items": [...]
}
```

---

## Configuration for Website Backends

### Environment Variables

Create a `.env` file in your website backend with:

```env
ERP_API_BASE_URL=https://backend.codewithseth.co.ke
ERP_ORG_ID=your-organization-id-here
```

### Example: Node.js/Express Website Backend

```javascript
import axios from 'axios'

const ERP_API_BASE_URL = process.env.ERP_API_BASE_URL || 'https://backend.codewithseth.co.ke'
const ERP_ORG_ID = process.env.ERP_ORG_ID

const erpClient = axios.create({
  baseURL: ERP_API_BASE_URL,
  headers: {
    'X-Org-Id': ERP_ORG_ID,
    'Content-Type': 'application/json',
  },
})

export default erpClient
```

### Example Usage

```javascript
// Load product catalog
async function loadProductCatalog() {
  try {
    const response = await erpClient.get('/api/stock/public/products')
    return response.data.data
  } catch (error) {
    console.error('Could not load ERP catalog:', error.message)
    throw new Error('Failed to fetch products from ERP')
  }
}

// Create quotation request
async function createQuotationRequest(items, clientData) {
  try {
    const response = await erpClient.post('/api/stock/public/quote-requests', {
      items,
      clientName: clientData.name,
      clientNumber: clientData.phone,
      clientLocation: clientData.location,
      email: clientData.email,
    })
    return response.data.data
  } catch (error) {
    console.error('Failed to create quotation:', error.message)
    throw error
  }
}

// Request invoice PDF
async function requestInvoicePDF(quotationId) {
  try {
    const response = await erpClient.post(
      `/api/stock/public/quotations/${quotationId}/request-invoice`,
      {},
      { responseType: 'arraybuffer' }
    )
    return response.data
  } catch (error) {
    console.error('Failed to request invoice:', error.message)
    throw error
  }
}
```

---

## Available Endpoints

### 1. Get Product Catalog

**Endpoint:**
```
GET /api/stock/public/products?orgId=YOUR_ORG_ID
```

**Query Parameters:**
- `orgId` (required) - Organization ID
- `categoryIds` (optional) - Comma-separated category IDs to filter by

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "product-id",
      "productName": "Product Name",
      "description": "Description",
      "sellingPrice": 1000,
      "category": "category-id",
      "productType": "product|service",
      "unit": "units",
      "imageUrl": "image-url",
      "isActive": true
    }
  ]
}
```

---

### 2. Create Quotation Request

**Endpoint:**
```
POST /api/stock/public/quote-requests
```

**Request Body:**
```json
{
  "orgId": "YOUR_ORG_ID",
  "clientName": "Company Name",
  "clientNumber": "+254712345678",
  "clientLocation": "Nairobi, Kenya",
  "contactPerson": "John Doe",
  "email": "john@company.com",
  "items": [
    {
      "productId": "product-id",
      "quantity": 5,
      "unitPrice": 1000
    },
    {
      "productId": "service-id",
      "quantity": 1,
      "unitPrice": 500
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Quotation request created successfully",
  "data": {
    "quotation": {
      "_id": "quotation-id",
      "quotationNumber": "QTN-001",
      "status": "draft",
      "items": [...],
      "subTotal": 5500
    },
    "clientProfile": {
      "_id": "client-id",
      "legalName": "Company Name"
    },
    "portalUser": {
      "_id": "user-id",
      "email": "john@company.com"
    }
  }
}
```

---

### 3. Request Invoice PDF

**Endpoint:**
```
POST /api/stock/public/quotations/{quotationId}/request-invoice?orgId=YOUR_ORG_ID
```

**Request Body:**
```json
{}
```

**Response:**
- Binary PDF file (Content-Type: application/pdf)

---

## Error Handling

### Common Errors

**Missing orgId:**
```json
{
  "success": false,
  "message": "orgId is required for public product access"
}
```

**Fix:** Pass `orgId` as query param or header

---

**Quotation Not Found:**
```json
{
  "success": false,
  "message": "Quotation not found"
}
```

**Fix:** Verify quotation ID exists and matches the same organization

---

**Invalid Items:**
```json
{
  "success": false,
  "message": "clientName, clientNumber, clientLocation and items are required"
}
```

**Fix:** Ensure all required fields are provided and items array is not empty

---

## Implementation Example: Full Website Integration

```javascript
// website-backend/services/erpIntegration.js

import axios from 'axios'

const ERP_API_BASE_URL = process.env.ERP_API_BASE_URL || 'https://backend.codewithseth.co.ke'
const ERP_ORG_ID = process.env.ERP_ORG_ID

if (!ERP_ORG_ID) {
  throw new Error('ERP_ORG_ID environment variable is not set')
}

const erpClient = axios.create({
  baseURL: ERP_API_BASE_URL,
  headers: {
    'X-Org-Id': ERP_ORG_ID,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Add error handling
erpClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 400) {
      console.error('Bad Request:', error.response.data)
    } else if (error.response?.status === 404) {
      console.error('Resource not found:', error.response.data)
    } else if (!error.response) {
      console.error('Network Error:', error.message)
    }
    throw error
  }
)

export const erpIntegration = {
  // Load all products
  async getProducts() {
    const response = await erpClient.get('/api/stock/public/products')
    return response.data.data
  },

  // Get products by category
  async getProductsByCategory(categoryIds) {
    const response = await erpClient.get('/api/stock/public/products', {
      params: { categoryIds: categoryIds.join(',') },
    })
    return response.data.data
  },

  // Create quotation request from website cart
  async createQuotationRequest(cartItems, customerData) {
    const response = await erpClient.post('/api/stock/public/quote-requests', {
      items: cartItems,
      clientName: customerData.companyName,
      clientNumber: customerData.phone,
      clientLocation: customerData.location,
      contactPerson: customerData.contactName,
      email: customerData.email,
    })
    return response.data.data
  },

  // Get invoice PDF
  async getInvoicePDF(quotationId) {
    const response = await erpClient.post(
      `/api/stock/public/quotations/${quotationId}/request-invoice`,
      {},
      { responseType: 'arraybuffer' }
    )
    return response.data
  },
}

export default erpIntegration
```

---

## Troubleshooting

### Issue: "Could not load ERP catalog"

**Cause:** Website backend cannot reach the ERP API or orgId is missing

**Solution:**
1. Verify `ERP_API_BASE_URL` is correct
2. Check `ERP_ORG_ID` is set and valid
3. Verify network connectivity to the ERP server
4. Check firewall/CORS settings

---

### Issue: "No authorization token provided"

**Cause:** This error should NOT appear for public endpoints. It indicates a different endpoint is being called.

**Solution:**
1. Verify you're calling public endpoints: `/api/stock/public/*`
2. Ensure `orgId` is included in the request
3. Check the full URL path is correct

---

## Next Steps: Advanced Features (v2)

For production multi-tenant SaaS deployments, consider implementing:

1. **API Key Authentication** - Issue each website a unique API key
2. **Rate Limiting** - Protect endpoints from abuse
3. **Webhook Notifications** - Real-time updates on quotation/invoice changes
4. **Caching** - Cache product catalog locally for performance
5. **API Gateway** - Centralized authentication and request routing

---

## Support

For issues or questions about the public API:
- Check this guide again
- Review the error message returned by the API
- Contact your ERP administrator with:
  - `ERP_ORG_ID` value
  - `ERP_API_BASE_URL` value
  - Full error message and request details