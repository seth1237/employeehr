# Multi-Tenant Email System Documentation

## Overview

This document describes the design and integration of a **fallback-based multi-tenant email system** for a platform built with **MongoDB, Node.js (Express), and React**.

The system allows:

* Multi-tenant users **with company email configurations** to send emails using their own email identity.
* Multi-tenant users **without company emails** to automatically use the **platform’s default system email**.

No tenant is blocked from sending emails due to missing email configuration.

---

## Key Design Principles

1. **Single Email Engine** – One centralized email service handles all emails.
2. **Runtime Resolution** – The sender email is determined at send time.
3. **Automatic Fallback** – If tenant email is unavailable or unverified, the system email is used.
4. **Non-Disruptive Integration** – Existing email logic is wrapped, not rewritten.
5. **Bulk & Transactional Support** – Same logic applies to all email types.

---

## Email Resolution Logic

At the moment an email is sent:

1. Check if the tenant has enabled a company email.
2. Confirm the email configuration has been verified.
3. If both are true → send using tenant email.
4. Otherwise → send using the system default email.

This ensures reliability and zero setup friction.

---

## MongoDB Data Model

### Tenant / Organization Schema

```js
{
  _id: ObjectId,
  name: String,

  emailConfig: {
    enabled: Boolean,        // Tenant wants to use their own email
    verified: Boolean,       // SMTP credentials tested successfully

    fromName: String,
    fromEmail: String,

    smtp: {
      host: String,
      port: Number,
      secure: Boolean,
      username: String,
      password: String       // Encrypted
    }
  },

  createdAt: Date
}
```

### Behavior

* `enabled = false` → system email is used
* `enabled = true` + `verified = false` → system email is used
* `enabled = true` + `verified = true` → tenant email is used

---

## Backend Architecture

### Email Transport Resolver

The resolver determines which SMTP transporter to use:

```js
resolveTransporter(tenant)
```

**Returns:**

* A configured Nodemailer transporter
* The appropriate `from` address

This abstraction prevents conditional logic from being scattered across the codebase.

---

## Unified Email Sender

All emails (transactional and bulk) pass through one function:

```js
sendEmail({ tenant, to, subject, html, text })
```

### Responsibilities

* Resolve correct transporter
* Set sender identity
* Send email
* Allow safe fallback on failure

---

## Bulk Email Support

Bulk emails reuse the same email engine.

### Flow

1. Fetch tenant
2. Iterate recipients
3. Compile template with variables
4. Send email using `sendEmail()`

### Recommended Enhancements

* Background processing (BullMQ + Redis)
* Rate limiting per tenant
* Retry on failure

---

## Frontend (React) Integration

### Email Settings Page

**Optional setup for tenants:**

* Toggle: "Use company email"
* SMTP configuration fields
* "Test & Verify Email" button

### UX Rules

* If setup is skipped → system email is used automatically
* If verification fails → tenant is notified, fallback continues

---

## Email Verification Flow

1. Tenant submits SMTP credentials
2. Backend attempts test email
3. On success → `verified = true`
4. On failure → configuration saved but inactive

This prevents broken email setups from affecting production workflows.

---

## Failure & Fallback Handling

To ensure reliability:

* If tenant email fails at runtime
* Automatically retry with system email

This guarantees:

* No lost emails
* No blocked workflows
* Seamless tenant experience

---

## Security Best Practices

* Encrypt SMTP passwords before storage
* Never expose credentials to frontend
* Log email events (success/failure)
* Apply rate limits for bulk emails
* Validate SMTP credentials before verification

---

## Environment Variables (System Email)

```env
SYSTEM_SMTP_HOST=
SYSTEM_SMTP_PORT=
SYSTEM_EMAIL=
SYSTEM_EMAIL_PASSWORD=
SYSTEM_FROM_NAME=
```

---

## Integration With Existing Email System

### Recommended Approach

* Keep existing email templates and triggers
* Replace sender logic with the unified email service

### Result

* No breaking changes
* Centralized control
* Future extensibility (SES, SendGrid, Mailgun)

---

## Future Enhancements

* OAuth (Google / Outlook)
* Per-tenant email analytics
* Email queue dashboard
* Webhook delivery status
* Custom domains

---

## Summary

This multi-tenant email system:

* Supports tenants with or without company emails
* Ensures reliable delivery through fallback logic
* Uses a single, clean email engine
* Scales for both transactional and bulk emails
* Integrates seamlessly with existing infrastructure

---

**End of Document**
