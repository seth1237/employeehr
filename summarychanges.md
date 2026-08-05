Based on the current documentation, I would actually redesign the architecture slightly. Right now the website is acting as a thin frontend that communicates directly with the ERP. As your ERP grows into a multi-tenant SaaS, the website should become a small application with its own database and authentication while the ERP remains the source of truth for business operations.

## Proposed Architecture

```text
                    ERP SYSTEM (Main Backend)
                -------------------------------
                Products
                Customers (Master)
                Quotations
                Invoices
                Stock
                Payments
                API Gateway
                Authentication
                Audit Logs
                -------------------------------
                         ▲
                         │ Secure REST APIs
                         │
──────────────────────────────────────────────────
                         │
             WEBSITE BACKEND (Lightweight)
──────────────────────────────────────────────────
Customer Accounts
Website Sessions
Password Reset
Email Verification
Website Orders
Wishlist (optional)
Quote History Cache
Notification Service
──────────────────────────────────────────────────
                         ▲
                         │
                  Customer Website
```

The ERP is the **master business system**, while every website has its own lightweight backend responsible only for customer-facing operations.

---

# Website Database

Instead of relying entirely on the ERP, every website should have its own database.

Example:

```
Website Database

Users
------
id
erpClientId
name
email
phone
passwordHash
status
createdAt

WebsiteSessions
---------------
token
userId
expiresAt

WebsiteQuoteRequests
--------------------
id
quotationId
userId
status
createdAt

PasswordResets

EmailVerification
```

Notice the important field:

```
erpClientId
```

This links the website user to the ERP customer.

---

# Registration Flow

When a visitor requests a quotation for the first time:

```text
Customer visits website

↓

Adds products to Quote Cart

↓

Clicks Request Quotation

↓

Fills

Name
Email
Phone
Company
Location

↓

Website Backend checks

SELECT * FROM users
WHERE email = ?

```

---

## Case 1 : Existing Customer

```
User exists

↓

Login automatically

↓

Create Quote Request

↓

Send request to ERP

↓

ERP creates quotation

↓

Return quotationId

↓

Save quotationId

↓

Display quotation
```

No new account is created.

---

## Case 2 : New Customer

This is the interesting workflow.

```
Customer submits quote

↓

Website Backend

Generate Password

↓

Hash Password

↓

Create Website Account

↓

Save User

↓

Call ERP

POST /clients

↓

ERP creates Customer

↓

Returns Client ID

↓

Website updates

erpClientId

↓

Call ERP

POST /quotation

↓

ERP creates quotation

↓

Return quotationId

↓

Save quotationId

↓

Send Welcome Email

↓

Automatically log customer in

↓

Redirect to Dashboard
```

---

# Generated Password

Example

```
Password

Qx7@L9kp
```

The website never stores the plain password.

Instead

```
bcrypt(password)
```

Only the hash is stored.

---

# Welcome Email

The customer receives:

```
Hello John,

Welcome to Accord Medical Supplies.

Your account has been created successfully.

Login Details

Email:
john@gmail.com

Temporary Password:
Qx7@L9kp

Please login and change your password after signing in.

Regards,
Accord Medical Supplies
```

---

# Automatic Login

Immediately after account creation

```
Create JWT

↓

Create Refresh Token

↓

Set HTTP Only Cookie

↓

Return Success

↓

Website opens Dashboard
```

The customer never has to log in manually.

From their perspective:

```
Request Quote

↓

Submit

↓

Account created

↓

Already logged in
```

Very smooth experience.

---

# Customer Dashboard

Once logged in they can access

```
Dashboard

My Quotations

Invoices

Pending Orders

Order Tracking

Download Documents

Update Profile

Change Password

Notifications

Support Tickets
```

Everything comes from the ERP through APIs.

---

# ERP Responsibilities

The ERP remains responsible for

```
Products

Customers

Stock

Quotations

Invoices

Payments

Receipts

Reports

Accounting
```

The website never modifies these directly in its own database.

---

# Website Responsibilities

The website only manages

```
Authentication

Customer Sessions

Website Profile

Email Sending

Password Reset

Caching

Customer Preferences

Website Notifications
```

---

# API Flow

## Get Products

```
Website

↓

GET /products

↓

ERP

↓

Products
```

---

## Create Customer

```
Website

↓

POST /clients

↓

ERP

↓

Client Created

↓

clientId
```

---

## Create Quotation

```
Website

↓

POST /quotations

↓

ERP

↓

quotationId
```

---

## Customer Dashboard

```
Website

↓

GET /customer/{erpClientId}/quotations

↓

ERP

↓

Quotation List
```

---

## Invoice

```
Customer

↓

Download Invoice

↓

Website

↓

ERP

↓

PDF

↓

Customer
```

---

# Recommended API Sequence

```
1. GET  /public/products

2. POST /public/check-email

3. POST /public/register
      (only if customer doesn't exist)

4. POST /public/login

5. POST /public/create-client

6. POST /public/create-quotation

7. GET  /public/customer/quotations

8. GET  /public/customer/invoices

9. POST /public/request-invoice

10. GET /public/profile
```

---

# Multi-Tenant Security

Since your ERP is multi-tenant, every request should carry the tenant context. Rather than exposing only an `orgId`, I recommend issuing each website its own credentials:

* **Website ID** (public identifier)
* **Website API Key** (secret)
* **Tenant ID** (resolved internally by the ERP)

The website backend authenticates with the ERP using the Website ID and API Key. The ERP validates them and determines the correct tenant automatically, so customers never see or send the tenant identifier. This prevents one tenant from accidentally or maliciously accessing another tenant's data.

---

## Overall Workflow

```text
Visitor opens Website

        │
        ▼
Views Products (ERP)

        │
        ▼
Requests Quotation

        │
        ▼
Website Backend

        │
        ├── Existing Account?
        │        │
        │        ├── YES → Login Automatically
        │        │
        │        └── NO
        │             │
        │             ├── Generate Password
        │             ├── Create Website User
        │             ├── Create ERP Customer
        │             ├── Link erpClientId
        │             ├── Send Welcome Email
        │             └── Login Automatically
        │
        ▼
Create Quotation in ERP

        │
        ▼
ERP Returns Quotation

        │
        ▼
Customer Dashboard

        │
        ├── View Quotations
        ├── Request Invoice
        ├── Download PDF
        ├── Track Orders
        └── Manage Profile
```

I would also recommend introducing an **API Gateway** in front of the ERP. Every website would communicate only with this gateway, which would handle authentication, tenant resolution, rate limiting, logging, API versioning, and request validation. This keeps your ERP services isolated and makes the integration far more scalable as you onboard more client websites.
