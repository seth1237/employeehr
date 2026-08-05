This document provides a detailed functional specification for the system's Role-Based Access Control (RBAC) model, defining the permissions, data scope, and primary responsibilities for each user type within the multi-tenant architecture.

The fundamental principle of this system is **Multi-Tenancy Isolation**: Users are strictly limited to data belonging to their respective organizations, except for the Super Admin, who holds platform-wide access.

---

# 10. User Roles, Permissions, and Data Access Architecture

The system supports five distinct user roles, ensuring fine-grained control over sensitive HR data and business logic based on the user's operational scope within the organization or the wider SaaS platform.

| User Type | Primary Scope | Core Responsibility | Data Isolation Level |
| :--- | :--- | :--- | :--- |
| **Super Admin** | Entire SaaS Platform (All Tenants) | System maintenance, billing, tenant activation, and global settings management. | Access to all companies' metadata and billing; can approve/suspend tenants. |
| **Company Admin** | Single Organization/Tenant | Full management of the organization's setup, users, KPI structure, and policy customization. | Access limited strictly to data within their own Organization (`org_id`). |
| **HR Officer** | Single Organization/Tenant | Operational HR functions, policy enforcement, reporting, and system audit logging. | Access limited strictly to data within their own Organization (`org_id`). |
| **Manager** | Team/Direct Reports | Performance evaluation, personal development plan (PDP) approval, and team oversight. | Access limited to their team's data and their own personal records within the Organization (`org_id`). |
| **Employee** | Personal Profile and Goals | Self-service functions, progress tracking, and participating in feedback/recognition cycles. | Access limited strictly to their own personal data within the Organization (`org_id`). |

---

## 10.1. Role Detailed Functional Specification

### A. Super Admin (SaaS Platform Owner)

This role operates outside the standard tenant structure, managing the integrity, revenue, and infrastructure of the entire multi-tenant platform.

| Module/Section | Key Functions and Permissions | Visibility |
| :--- | :--- | :--- |
| **Central Super-Admin Portal** | **Tenant Management:** See all registered companies, approve new companies, suspend/activate companies. **Billing & Finance:** See revenue/Billing, manage subscription plans. **Global Settings:** Add global policies and settings (e.g., system-wide branding defaults). **System Monitoring:** See system-wide metrics and performance data across all organizations. | All system data, tenant metadata, financial/billing dashboards. |

### B. Company Admin (Tenant Administrator)

The primary administrative and configuration authority for a single registered company.

| Module/Section | Key Functions and Permissions | Visibility |
| :--- | :--- | :--- |
| **User & Role Management** | Create, edit, and delete user accounts; assign roles (Manager, Employee, HR Officer) within the organization. | All employee profiles, departments, and organizational structure data within the tenant. |
| **KPI & Performance Setup** | Define global Key Performance Indicators (KPIs) and performance categories for the entire organization. Manage PDP templates and system policies. | Organization-wide KPI catalog, policy configurations. |
| **Award Configuration** | Configure the weighted scoring formula for automatic recognition (e.g., Employee-of-the-Month/Year). | Award configuration module, historical scoring data. |
| **Analytics Dashboard** | View organization-wide performance trends, skill-gap analysis, and overall team performance averages. | Full analytics and reporting data for the entire organization. |

### C. HR Officer (HR Administrator Module)

This role focuses on operational human resources management and organizational oversight within a single company.

| Module/Section | Key Functions and Permissions | Visibility |
| :--- | :--- | :--- |
| **Organizational Setup** | Assign employees to departments or managers. Manage user roles (in collaboration with Company Admin). | All employee records, departmental structures. |
| **Data & Auditing** | Export performance, PDP, and attendance reports (Excel/PDF). View system-wide audit logs and score overrides. | Access to all operational data and reporting tools. |
| **Performance Periods** | Add performance periods (e.g., "2025 Q1," "Q2") and manage the system workflow calendar. | Performance cycle configuration, organizational calendar. |
| **Budget Management** | Manage and track learning and training budgets allocated to the organization or departments. | Learning budget tracking and approval summary. |

### D. Manager (Team Leader)

This role is responsible for the direct evaluation, coaching, and development of their assigned employees.

| Module/Section | Key Functions and Permissions | Visibility |
| :--- | :--- | :--- |
| **Manager Dashboard** | Track team performance in one page; view team performance averages and team ranking (optional). | Aggregated team metrics and individual direct report performance data. |
| **Performance Evaluation** | Conduct manager evaluations and provide feedback/coaching notes. Review attendance and punctuality records for direct reports. | Detailed evaluation forms, performance history, and attendance records for their team. |
| **PDP & Learning Workflow** | Approve or reject submitted Personal Development Plans (PDPs). Evaluate employee goals and milestones. Approve learning budgets/courses and recommend training. | PDP submissions, training requests, and goal progress of direct reports. |
| **Reports** | Generate performance and progress reports specifically for their assigned team. | Team-level performance reports. |

### E. Employee (Self-Service Portal)

This is the primary end-user role, focused on personal growth, engagement, and transparency.

| Module/Section | Key Functions and Permissions | Visibility |
| :--- | :--- | :--- |
| **Employee Self-Service Portal** | **Performance:** View personal KPIs and current performance scores. Respond to performance evaluations (self-evaluations, 360° reviews). | Personal KPIs, personal performance graph, evaluation responses, personal feedback. |
| **PDP & Growth** | View and update progress on their Personal Development Plan (PDP). Update milestones and track progress percentage (0–100%). Apply for training/learning assistance. | Personal PDP module, skill growth dashboard. |
| **Recognition** | View personal awards, badges, and digital certificates. View team ranking (optional). | Personal awards history, recognition board. |
| **Notifications** | Receive automated alerts, reminders, and notifications (goal overdue, manager approval pending). | Alerts and notification center. |