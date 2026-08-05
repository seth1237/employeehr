```markdown
# eTIMS Configuration Module Documentation

**Version:** 1.0
**Module:** eTIMS Integration (OSCU)
**Purpose:** Electronic Tax Invoice Processing Only

---

# 1. Overview

The eTIMS Configuration Module provides the configuration required for integrating the application with the Kenya Revenue Authority (KRA) Electronic Tax Invoice Management System (eTIMS) through the Online Sales Control Unit (OSCU).

This module is **not** intended to be a complete ERP integration. It focuses solely on electronic tax invoice processing, including invoice submission, credit notes, and communication with the KRA eTIMS platform.

The implementation is based on the OSCU Specification v2.0.

---

# 2. Objectives

The module shall enable the system to:

* Configure KRA taxpayer information.
* Connect to the KRA Sandbox or Production environment.
* Validate customer PINs where applicable.
* Submit electronic tax invoices.
* Submit credit notes.
* Store KRA responses.
* Maintain submission logs.
* Retry failed submissions.

---

# 3. Scope

The first implementation shall include only the following:

* eTIMS Configuration
* Customer PIN Validation
* Tax Invoice Processing
* Credit Note Processing
* Submission History
* API Communication Logs

The following features are outside the scope of Version 1:

* Product Registration
* Item Classification Synchronization
* Inventory Synchronization
* Import Item APIs
* Insurance APIs
* Branch User Synchronization

---

# 4. Configuration Screen

## Company Information

| Field         | Required | Description                               |
| ------------- | -------- | ----------------------------------------- |
| Company Name  | Yes      | Registered business name                  |
| KRA PIN (TIN) | Yes      | Taxpayer PIN                              |
| Branch ID     | Yes      | Registered Branch ID (00 for Head Office) |
| Environment   | Yes      | Sandbox or Production                     |

---

## Connection Information

| Field                | Required | Description                                    |
| -------------------- | -------- | ---------------------------------------------- |
| Communication Key    | Yes      | KRA-issued Communication Key                   |
| API Base URL         | Yes      | Sandbox or Production endpoint                 |
| Connection Status    | Auto     | Connected / Not Connected                      |
| Last Synchronization | Auto     | Date and time of last successful communication |

---

# 5. Environment Configuration

The module shall support two environments.

## Sandbox

Purpose

* Development
* Testing
* User Acceptance Testing

No live tax data shall be generated.

---

## Production

Purpose

* Live tax invoice processing
* Official submission to KRA

Production shall only be enabled after successful sandbox validation.

---

# 6. Customer Validation

## Function

Validate customer KRA PIN before invoice generation.

API

```
/selectCustomer
```

Required Data

* Taxpayer PIN
* Branch ID
* Customer PIN

Response

* Customer Name
* Taxpayer Status
* County
* Sub-County

If the PIN cannot be validated, the system shall notify the user.

---

# 7. Invoice Processing

## Function

Submit invoices to KRA eTIMS.

API

```
/saveTrnsSalesOsdc
```

The invoice shall include:

### Header

* Invoice Number
* Trader Invoice Number
* Customer PIN
* Customer Name
* Receipt Type
* Payment Type
* Sale Date
* Confirmation Date

### Totals

* Total Items
* Taxable Amount
* VAT Amount
* Total Tax
* Grand Total

### Items

Each invoice line shall contain:

* Item Code
* Item Name
* Quantity
* Unit Price
* Discount
* VAT Type
* Tax Amount
* Total Amount

---

# 8. Credit Notes

The module shall support submission of credit notes.

A credit note shall include:

* Original Invoice Number
* Credit Note Reason
* Credit Date
* Corrected Totals

All credit notes shall be linked to the original invoice.

---

# 9. Submission Workflow

```
Create Invoice
      │
      ▼
Validate Required Fields
      │
      ▼
Calculate Taxes
      │
      ▼
Generate OSCU JSON
      │
      ▼
Send to KRA
      │
      ▼
Receive Response
      │
      ▼
Store Response
      │
      ▼
Update Invoice Status
```

---

# 10. Invoice Status

The system shall support the following statuses.

| Status     | Description              |
| ---------- | ------------------------ |
| Draft      | Invoice not submitted    |
| Processing | Submission in progress   |
| Submitted  | Successfully sent to KRA |
| Failed     | Submission unsuccessful  |
| Cancelled  | Cancelled by user        |
| Credited   | Credit note issued       |

---

# 11. Submission Logs

Every API request shall be logged.

The log shall include:

| Field            |
| ---------------- |
| Invoice Number   |
| Request Date     |
| API Endpoint     |
| Request Payload  |
| Response Payload |
| Result Code      |
| Result Message   |
| Status           |

Logs shall be retained for troubleshooting and audit purposes.

---

# 12. Retry Mechanism

If communication fails:

* Store the failed request.
* Mark the invoice as **Failed**.
* Allow manual retry.
* Allow automatic retry based on configurable intervals.

Duplicate submissions shall be prevented.

---

# 13. Dashboard

The dashboard shall display:

* Total Submitted Invoices
* Failed Submissions
* Pending Submissions
* Credit Notes
* Connection Status
* Last Successful Submission
* Last API Error

---

# 14. Security

The module shall:

* Encrypt KRA communication credentials.
* Use HTTPS for all API communication.
* Restrict access to authorized users.
* Maintain an audit trail of configuration changes.
* Log all API transactions.

---

# 15. Multi-Tenant Support

Each tenant shall maintain independent eTIMS settings.

Configuration shall include:

* Company Name
* KRA PIN
* Branch ID
* Communication Key
* Environment
* API Endpoint

Each invoice submission shall use the configuration of the active tenant.

No tenant shall have access to another tenant's configuration or transaction data.

---

# 16. Database Structure

## eTIMS Configuration

| Field             | Description           |
| ----------------- | --------------------- |
| Tenant ID         | Company Identifier    |
| Company Name      | Registered Company    |
| KRA PIN           | Taxpayer PIN          |
| Branch ID         | Branch Code           |
| Communication Key | KRA Communication Key |
| Environment       | Sandbox / Production  |
| API Endpoint      | Base URL              |
| Status            | Active / Inactive     |

---

## Submission Log

| Field             |
| ----------------- |
| Log ID            |
| Tenant ID         |
| Invoice Number    |
| Request Time      |
| Response Time     |
| Result Code       |
| Result Message    |
| Submission Status |
| Retry Count       |

--
```

