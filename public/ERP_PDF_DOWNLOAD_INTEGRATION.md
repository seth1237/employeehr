# ERP PDF Download Integration Guide

This guide explains how a website backend should integrate with the ERP to download quotation and invoice PDFs.

## Purpose

The website should never generate or store PDFs. Instead, it should request the PDF from the ERP whenever a customer clicks **Download Quotation** or **Download Invoice**.

## Endpoint Summary

### Quotation PDF

```
GET /api/stock/public/quotations/:quotationId/pdf
```

### Invoice PDF

```
GET /api/stock/public/invoices/:invoiceId/pdf
```

## Authentication and Tenant Context

These endpoints are public, but they require tenant context via `orgId`.

Pass `orgId` in one of these ways:

- Query parameter: `?orgId=YOUR_ORG_ID`
- Header: `X-Org-Id: YOUR_ORG_ID`
- Request body for POST requests (not needed for these GET downloads)

The website backend should use the ERP organization ID provided by the ERP admin system.

## Example URLs

```bash
GET https://backend.codewithseth.co.ke/api/stock/public/quotations/6874abc123/pdf?orgId=your-org-id
GET https://backend.codewithseth.co.ke/api/stock/public/invoices/6874abc123/pdf?orgId=your-org-id
```

## Website Backend Integration (Node.js / Express)

### 1. Configure the ERP client

```js
import axios from "axios";

const ERP_API_BASE_URL = process.env.ERP_API_BASE_URL;
const ERP_ORG_ID = process.env.ERP_ORG_ID;

if (!ERP_API_BASE_URL || !ERP_ORG_ID) {
  throw new Error("ERP_API_BASE_URL and ERP_ORG_ID must be configured")
}

const erpClient = axios.create({
  baseURL: ERP_API_BASE_URL,
  headers: {
    "X-Org-Id": ERP_ORG_ID,
    "Content-Type": "application/json",
  },
  responseType: "arraybuffer",
});
```

### 2. Download the quotation PDF from the ERP

```js
export async function downloadQuotationPdf(quotationId) {
  const response = await erpClient.get(
    `/api/stock/public/quotations/${quotationId}/pdf`,
    { params: { orgId: ERP_ORG_ID } },
  );

  return response.data; // Buffer containing PDF bytes
}
```

### 3. Download the invoice PDF from the ERP

```js
export async function downloadInvoicePdf(invoiceId) {
  const response = await erpClient.get(
    `/api/stock/public/invoices/${invoiceId}/pdf`,
    { params: { orgId: ERP_ORG_ID } },
  );

  return response.data; // Buffer containing PDF bytes
}
```

### 4. Stream the PDF to the browser

```js
import express from "express";
import { downloadQuotationPdf, downloadInvoicePdf } from "./erpClient";

const app = express();

app.get("/website/quotation/:quotationId/download", async (req, res) => {
  try {
    const pdfBuffer = await downloadQuotationPdf(req.params.quotationId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="quotation-${req.params.quotationId}.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to download quotation PDF" });
  }
});

app.get("/website/invoice/:invoiceId/download", async (req, res) => {
  try {
    const pdfBuffer = await downloadInvoicePdf(req.params.invoiceId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="invoice-${req.params.invoiceId}.pdf"`,
    );
    res.send(pdfBuffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to download invoice PDF" });
  }
});
```

## Frontend Usage

The website frontend should call the website backend endpoint, not the ERP directly.

### Example fetch from frontend

```js
async function downloadQuotation(quotationId) {
  const response = await fetch(`/website/quotation/${quotationId}/download`);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `quotation-${quotationId}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
```

## Best Practices

- Do not cache or store the generated PDF on the website backend.
- Always fetch the latest PDF from the ERP on demand.
- Let the ERP handle document formatting and tenant validation.
- Use the ERP `orgId` to identify the tenant for each request.

## Error Handling

### Common error responses

- `400 Bad Request`: Missing or invalid `orgId`
- `404 Not Found`: Quotation or invoice does not exist for the provided tenant
- `500 Internal Server Error`: PDF generation failed on the ERP

### Example retry strategy

If the website backend receives a `500` error, retry once or twice before returning an error to the customer. If `404` is returned, verify the resource ID and tenant association.

## Summary

For quotation and invoice downloads, the website backend should:

1. call the ERP public endpoint with `orgId`
2. receive the PDF bytes
3. stream the PDF to the customer

The website must never generate or store the PDF itself.
