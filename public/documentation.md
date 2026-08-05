# Website Integration Guide

This guide explains how to connect a client website to the ERP for product catalog, quotation requests, and invoice download.

## 1. API Base URL

Use the ERP API base URL below for all requests:

- Base URL (production): https://backend.codewithseth.co.ke
- Local development: http://localhost:5010

For the public website workflow, the website should send the tenant/company `orgId` with each request.

## 2. Public endpoints

### Get products

Endpoint:

GET /api/stock/public/products?orgId={orgId}

Example:

```bash
curl "https://backend.codewithseth.co.ke/api/stock/public/products?orgId=your-org-id"
```

### Create a quotation request

Endpoint:

POST /api/stock/public/quote-requests

Example body:

```json
{
  "orgId": "your-org-id",
  "clientName": "Jane Doe",
  "clientNumber": "0712345678",
  "clientLocation": "Nairobi",
  "email": "jane@example.com",
  "items": [
    {
      "productId": "product-id",
      "quantity": 2,
      "unitPrice": 1500
    }
  ]
}
```

### Request an invoice for a quotation

Endpoint:

POST /api/stock/public/quotations/{quotationId}/request-invoice?orgId={orgId}

Example:

```bash
curl -X POST "https://backend.codewithseth.co.ke/api/stock/public/quotations/quotation-id/request-invoice?orgId=your-org-id" -o invoice.pdf
```

The response is a PDF invoice download.

## 3. Website workflow

1. Load products from the public products endpoint.
2. Let the client submit a quote request form on the website.
3. Send the form payload to the quote request endpoint.
4. Store the returned quotation ID in your website system.
5. When the client clicks "Request Invoice", call the invoice endpoint.
6. Download and display the PDF invoice.

## 4. Notes

- No API key is required for this first public workflow.
- The website only needs the ERP base URL and the tenant `orgId`.
- The ERP will create or update the client profile automatically and generate the quotation.
- Once the quotation is converted to an invoice, the website can download the invoice PDF directly.
