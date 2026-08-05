# Multi-Tenant Company Separation & Login Flow

## Overview

This HR application is designed to be used by **multiple companies (multi-tenant)**. To ensure proper separation of data, users, and permissions, each company is identified by a **unique 6-digit Company ID**.

This Company ID acts as the **primary separating factor** across the system and is required for employee authentication and access.

---

## Company ID (6-Digit Identifier)

* Each company is assigned a **unique 6-digit numeric ID** (e.g. `483921`).
* The Company ID is generated when a company is created by a Super Admin or during onboarding.
* This ID is:

  * Used to separate data at the database level
  * Used by employees during login
  * Embedded in invitation links

Example:

```
Company ID: 483921
```

---

## Login URL Structure

The login flow is company-aware using the Company ID.

### Base Login URL

```
https://hr.codewithseth.co.ke/auth/login
```

### Company-Specific Login URL

```
https://hr.codewithseth.co.ke/auth/login/{companyId}
```

Example:

```
https://hr.codewithseth.co.ke/auth/login/483921
```

---

## Employee Invitation Flow

### Admin Actions

1. Admin creates a company → system generates a **6-digit Company ID**
2. Admin invites employees (e.g. 10 employees)
3. All invited employees receive the **same company-specific login link**

Example invite link sent to all employees:

```
https://hr.codewithseth.co.ke/auth/login/483921
```

---

## Employee Login Experience

1. Employee clicks the invite/login link
2. Company ID is automatically resolved from the URL
3. Employee enters:

   * Email
   * Password (or sets password on first login)
4. System validates:

   * Credentials
   * Company ID match
5. Employee is logged into **their company workspace only**

---

## Data Isolation Rules

All core entities are scoped by `companyId`:

* Employees
* Admins
* Departments
* Attendance records
* Tasks
* Contracts
* Payroll (future)
* Notifications

### Example Database Rule

```ts
Employee {
  id
  companyId
  email
  role
}
```

Every query must include `companyId` to prevent cross-company access.

---

## Security Considerations

* Company ID alone does **not** grant access
* Authentication still requires valid credentials
* Users cannot switch companies without:

  * Invitation
  * Matching Company ID
* Rate-limit login attempts per company

---

## Benefits of This Approach

* Simple and clear company separation
* One shared deployment for all companies
* Easy onboarding via a single invite link
* Scales cleanly as more companies join

---

## Summary

* The system is **multi-tenant**
* A **6-digit Company ID** is the tenant identifier
* Employees log in via:

```
/auth/login/{companyId}
```

* All invited employees under a company share the same login link
* Data is fully isolated per company

---

*End of document*
