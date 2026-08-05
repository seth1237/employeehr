
# HR Web Application – Vacancy & Application Management Module

## 1. Overview

The **Vacancy & Application Management Module** enables HR personnel to manage job postings, create dynamic application forms, collect and evaluate applicant submissions, and communicate effectively with candidates.

Key features include:

* Job creation and management
* Customizable application forms
* Applicant submission collection
* File handling (CVs, certificates, PDFs)
* Analytics dashboard for HR insights
* Bulk email communication with auto-filled applicant details
* Private and public comments to personalize feedback

This module is designed to enhance HR efficiency and improve candidate experience.

---

## 2. Actors and Permissions

| Actor              | Permissions & Actions                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **HR / Recruiter** | Create/edit jobs, build dynamic forms, view applications, add private comments, analyze applicant data, send bulk emails. |
| **Admin**          | View applications, add public comments visible to applicants, generate reports, approve job postings.                     |
| **Applicant**      | Apply for jobs via dynamic forms, upload supporting documents, receive emails.                                            |

---

## 3. Core Features

### 3.1 Job Management

HR can:

* Create, edit, or close job postings.
* Assign dynamic application forms to jobs.
* Track applicant pipeline and job status.

**Job Schema (MongoDB Example):**

```json
{
  "_id": "ObjectId",
  "title": "Software Engineer",
  "department": "Engineering",
  "location": "Nairobi",
  "formId": "ObjectId",
  "status": "Open", 
  "createdBy": "userId",
  "createdAt": "Date"
}
```

---

### 3.2 Dynamic Form Builder

* HR can create unlimited questions: text, email, number, select, checkbox, or file upload (PDF).
* Questions can be marked required or optional.
* Form schema stored as JSON for flexible rendering and analytics.

**Form Schema Example:**

```json
{
  "_id": "ObjectId",
  "jobId": "ObjectId",
  "title": "Software Engineer Application",
  "fields": [
    { "fieldId": "full_name", "label": "Full Name", "type": "text", "required": true },
    { "fieldId": "email", "label": "Email Address", "type": "email", "required": true },
    { "fieldId": "cv", "label": "Upload CV", "type": "file", "accept": "application/pdf" }
  ]
}
```

---

### 3.3 Application Submission

Applicants submit answers linked to the job and form:

**Application Schema Example:**

```json
{
  "_id": "ObjectId",
  "jobId": "ObjectId",
  "formId": "ObjectId",
  "applicantId": "ObjectId",
  "answers": {
    "full_name": "Jane Doe",
    "email": "jane.doe@email.com",
    "cv": "fileReference"
  },
  "status": "Applied",
  "submittedAt": "Date",
  "privateComments": [],
  "publicComments": []
}
```

---

### 3.4 File Handling (PDFs)

#### Options:

1. **GridFS**

   * Store PDF files inside MongoDB.
   * Reference using `ObjectId`.

2. **Cloud Storage (Recommended)**

   * Use AWS S3, Cloudinary, or Google Cloud Storage.
   * Store URL and metadata in MongoDB.

**File Reference Example:**

```json
"cv": { "url": "https://storage.com/cvs/janedoe.pdf", "size": 230000, "uploadedAt": "Date" }
```

---

### 3.5 Analytics Dashboard

* Real-time insights into applications:

  * Applicants per job
  * Gender, education, experience distribution
  * Hiring funnel metrics
* Uses MongoDB aggregations + frontend charts

**Example Aggregation Query:**

```js
db.applications.aggregate([
  { $match: { jobId: ObjectId("...") } },
  { $group: { _id: "$answers.gender", count: { $sum: 1 } } }
])
```

---

### 3.6 Comments System

#### **Private Comments**

* Visible only to HR/recruiter.
* Stored in the applicant document for internal reference.
* Example:

```json
{
  "comment": "Strong coding skills, but needs improvement in communication.",
  "createdBy": "hrId",
  "createdAt": "Date",
  "type": "private"
}
```

#### **Public Comments**

* Written by Admin/HR to be included in emails to applicants.
* Only included in emails if present.
* Example:

```json
{
  "comment": "You are a competent candidate. Work on your leadership skills.",
  "createdBy": "adminId",
  "createdAt": "Date",
  "type": "public"
}
```

---

### 3.7 Bulk Emailing

* Sends personalized emails to applicant pools.
* Auto-fills dynamic placeholders in email template:

**Template Example:**

```
Subject: Interview Outcome for {{job_title}}

Dear {{full_name}},

Thank you for applying for {{job_title}} at our company.

{{publicComments}}

We wish you the best in your future endeavors.

Best regards,
HR Team
```

* **Flow:**

  1. HR selects job / applicant pool.
  2. System fetches all applicants and replaces placeholders:

     * `{{full_name}}`
     * `{{job_title}}`
     * `{{publicComments}}` (included only if present)
  3. Emails are sent using Nodemailer, SendGrid, or AWS SES.

---

## 4. Frontend Architecture

**HR Dashboard**

* Job Management: Create/Edit/Close jobs
* Form Builder: Add/Remove/Preview fields
* Applicant View: Table with search, filters, private/public comments
* Analytics: Graphs, metrics, filters
* Bulk Email Interface: Select applicants → Choose template → Send

**Applicant Portal**

* Job Listings: View & apply
* Dynamic Form Renderer: Render form fields
* File Upload: CV, certificates
* Confirmation & status tracking

---

## 5. Backend Architecture

* **REST API / GraphQL**

* **Endpoints:**

  * `/jobs` – CRUD jobs
  * `/forms` – CRUD forms
  * `/applications` – Submit/view applications
  * `/comments` – Add private/public comments
  * `/analytics` – Aggregated metrics
  * `/emails/bulk` – Send bulk emails

* **File Upload:** Middleware (Multer) + Cloud/GridFS

* **Auth:** JWT + Role-Based Access Control

---

## 6. Security & Compliance

* Role-based access (HR/Admin/Applicant)
* Encrypt sensitive fields & files
* Signed URLs for secure file downloads
* Audit logs for actions: comments, emails, application updates
* GDPR/Kenya Data Protection compliance

---

## 7. Tech Stack Recommendation

| Layer        | Technology                                |
| ------------ | ----------------------------------------- |
| Frontend     | React + Recharts/Chart.js                 |
| Backend      | Node.js (Express/NestJS) or FastAPI       |
| Database     | MongoDB (GridFS or Cloud file references) |
| File Storage | Cloudinary / AWS S3                       |
| Email        | Nodemailer / SendGrid / AWS SES           |
| Auth         | JWT + RBAC                                |

---

## 8. Development Roadmap

1. Design **MongoDB Schemas** (Jobs, Forms, Applications, Comments)
2. Build **Dynamic Form Builder UI**
3. Implement **Application Submission + File Upload**
4. Create **Analytics Dashboard**
5. Implement **Private & Public Comments**
6. Implement **Bulk Emailing with Dynamic Template Replacement**
7. Add **Security & Role-Based Access Control**
8. Test & Deploy

---

## 9. Notes on Dynamic Email Integration

* Only include fields in emails if they exist in the applicant data.
* Example placeholders:

  * `{{full_name}}` → applicant’s name
  * `{{job_title}}` → job applied
  * `{{publicComments}}` → admin/public comments
* System dynamically checks existence and skips missing placeholders.

---
