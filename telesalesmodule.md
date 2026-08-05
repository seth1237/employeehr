# Table of Contents

Accord Medical Supplies currently runs a Telesales section built as a “Communication Room” inside the Client Communication Workspace. The screens, workflow, and status labels agents use every day are already designed and working in the browser — but nothing an agent types is saved. The save action only resets the on-screen form; there is no database behind it yet.

This document proposes upgrading that workspace into a full Telesales CRM + Call Center System: one platform where phone calls (through the Yeastar S20 PBX, or through agents’ normal phones) and customer/lead/quotation data live in the same place. The goal is a system where an agent never has to ask “who is this?”, a manager never has to ask an agent for a status update, and every call, note, quotation, and follow-up is recorded automatically and reportable.

The proposal is organized in four parts:

- What already exists today, and exactly what is missing.
- The target architecture — PBX + web application + shared database.
- The full feature set of the upgraded system, grouped by function.
- A phased roadmap so the upgrade can be delivered in stages rather than one large release.

# 2. Current System — What Exists Today

## 2.1 Location and Purpose

The Telesales section lives inside the Client Communication Workspace, at /admin/clients/communication, as one of the primary “rooms” agents use to manage remote sales conversations, follow-ups, and the conversion pipeline.

## 2.2 Capabilities Already Built

- Room-based conversation logging for each client relationship.
- A rich-text note area for call details, requests, and verbal agreements.
- Staff assignment from the existing Users list, so every lead has a clear owner.
- A follow-up date picker for scheduling the next touchpoint.
- Document attachment support (quotations, product specs) inside the conversation log.
- Five-stage status tracking: Interested, Follow-up Needed, Pending, Closed, Converted to Sale.

## 2.3 Existing Integrations

- Quotations & Stock (stockApi.getQuotations, stockApi.getQuotationFollowUps) — quotations are referenced during calls and conversion is measured from them.
- User Management (api.users.getAll) — populates the staff-assignment dropdown and enables agent performance tracking.
- Client Categories — Hospital, Clinic, Pharmacy, NGO, Government, Private Practice.
- Analytics Dashboard — active rooms, upcoming follow-ups, and converted quotations already feed into reporting.

## 2.4 The Core Gap

The front end is fully built in Next.js/React and is being used for layout and workflow validation. The backend is not: the saveRoomConversation function currently only triggers a UI alert and resets local state. Nothing an agent enters is persisted — which means today, closing the browser tab loses the call notes.

## 2.5 Database Models Not Yet Built


|                              |                                                                    |
| ---------------------------- | ------------------------------------------------------------------ |
| **Model**                    | **Purpose**                                                        |
| CommunicationRoom            | Stores “Telesales” room metadata.                                  |
| ClientConversation           | Logs notes, timestamps, assigned staff (user_id), and attachments. |
| FollowUp                     | Triggers reminders based on the scheduled follow-up date.          |
| ClientFeedback / SalesStatus | Tracks the funnel transition from Interested to Converted to Sale. |


#   
  


# 3. Vision for the Upgraded System

Rather than treating Telesales as one room among many, the upgrade reframes it as the front door of a Customer Relationship Management (CRM) + Call Center System. Two engines work together:

- The PBX (Yeastar S20, with a TG400 gateway for line capacity) handles the actual telephony — ringing, routing, recording, and call detail records (CDR).
- The web application manages customers, leads, quotations, products, tickets, and reporting.

They are joined by SIP / REST API / CDR, so that every call — answered, missed, or outgoing — automatically becomes an activity on the right customer record, without an agent typing anything extra.



## 3.1 Architecture at a Glance

Customer calls in

↓

Yeastar TG400 Gateway (extra analogue/GSM line capacity)

↓

Yeastar S20 PBX (call routing, recording, extensions)

↓ SIP / REST API / CDR

Customer Management System (CRM web application)

↓

MySQL / PostgreSQL Database (single source of truth)

Everything described in Section 5 — call pop-ups, auto-logging, dashboards, quotations, tickets — is built on top of that shared database, so a customer, a call, and a quotation are always the same record, seen the same way, by every role.

# 4. Telephony Integration — Two Calling Modes

Not every call an agent makes will pass through the office PBX — field staff, managers, and technicians often call clients from a personal or mobile line. The system is designed to support both, so no interaction is lost regardless of which phone was used.

## 4.1 PBX-Integrated Calls (Yeastar S20 / TG400)

- Calls ring through a SIP extension tied to the agent.
- The customer's record pops up automatically on the agent's screen the moment the phone rings (Section 5.4).
- The call — date, time, extension, duration, direction, recording link — is logged automatically via the CDR feed (Section 5.5).
- Recordings are stored and linked to the customer record for training and quality review.

## 4.2 How the Screen Pop Reads the Client Database

This is the core link between the PBX and the CRM, and it works the same way for every incoming call:

- The moment a call rings in, the PBX passes the caller's number to the CRM through the REST API / CDR feed.
- The CRM matches that number against the phone fields already stored on the Customer table.
- If a match is found, the agent's screen instantly shows the hospital, contact person, position, last call date, product interest, and any outstanding quotation value — no searching required.
- If no match is found (a new caller), the agent sees a short “New Caller – Add Customer” prompt instead, so the number is captured into the client database on the spot rather than being lost as an unknown call.

Because the pop-up is reading live from the same client database used everywhere else in the system, any update an agent makes during the call — a note, a status change, a new follow-up date — is immediately what the next person who opens that customer record, or the next call from that number, will see.

## 4.3 Normal Phone / Mobile Calls (No PBX Extension)

- A “Log Call” button on the customer profile lets the agent record what happened after the fact — duration, outcome, and notes — in a few taps.
- A click-to-call icon can open the device's own dialer (a standard tel: link) so the number doesn't need to be re-typed.
- No automatic recording or screen-pop applies here, since the call never touches the PBX — but the activity, status, and follow-up date are still captured on the same timeline as PBX calls.


|                    |                            |                                    |
| ------------------ | -------------------------- | ---------------------------------- |
| **Capability**     | **PBX-Integrated**         | **Normal Phone**                   |
| Screen pop on ring | Automatic                  | Not applicable                     |
| Call logging       | Automatic (CDR)            | Manual, one-tap                    |
| Recording          | Automatic                  | Not available                      |
| Setup needed       | SIP extension on S20       | None — works from day one          |
| Best suited to     | In-office telesales agents | Field staff, managers, technicians |


  


# 5. Core Modules — Full Feature Set

## 5.1 Users, Roles & Permissions


|                       |                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Role**              | **Typical Access**                                                                                                              |
| Administrator         | Full system configuration, user management, all data.                                                                           |
| Sales Manager         | Full pipeline visibility, team dashboards, reassignment of leads.                                                               |
| Telesales Agent       | Own customers, calls, quotations, and follow-ups.                                                                               |
| Accounts              | Invoices, payments, customer balances.                                                                                          |
| Customer Support      | Tickets, service history, appointments.                                                                                         |
| Technician (Engineer) | No login. Engineers are contacted directly by phone; the telesales agent records the outcome on their behalf (see Section 5.6). |
| Marketing             | Lead source data, campaign-linked reporting.                                                                                    |


## 5.2 Customer & Lead Data

- Full customer profile: name, hospital, county, department, contact person, position, phone numbers, email, physical address, KRA PIN (optional), category, and lead source.
- Eight-stage lead pipeline: New → Contacted → Interested → Follow-up → Quotation Sent → Negotiation → Won / Lost.
- Every note is timestamped and attributed to the agent who wrote it, so a history like “spoke to procurement, budget expected in August, call after the 20th” is never lost.

## 5.3 Call Handling

- Call pop-up: instead of an unknown number, the agent instantly sees the hospital, contact, last call date, product interest, and any outstanding quotation value.
- Auto call logging for every incoming, outgoing, and missed call — date, time, extension, duration, recording link, agent, and customer.
- Follow-up scheduler with quick options (tomorrow, next week, after quotation) and system reminders.

## 5.4 Sales Enablement

- Quotation module: generate quotations directly from a call, with status Draft / Sent / Accepted / Rejected / Expired.
- Product catalogue: image, description, brochure, price, stock level, and warranty per product.
- Opportunity pipeline view: New Lead → Contacted → Demo Scheduled → Quotation → Negotiation → Closed Won, visible to managers at a glance.

## 5.5 Dashboards & Reporting

- Manager dashboard: today's calls, today's leads, quotes sent, sales closed, follow-ups due, top agent.
- Agent dashboard: calls today, customers called, pending follow-ups, appointments, sales target and personal performance.
- Performance reports per agent: calls made, calls answered, talk time, average duration, leads, conversions, revenue.

## 5.6 Service & Scheduling

- Ticket system: engineers do not log into the CRM. The telesales agent raises the ticket, calls the engineer directly to agree a visit date, and enters that date into the system.
- If the engineer cannot confirm a date on the call, the agent marks the ticket Pending instead of leaving it unscheduled — so it still shows up on follow-up lists until a date is fixed.
- Ticket status flow: Open → Pending (no date yet) or Scheduled (date confirmed) → Visited → Closed.
- Appointment booking with calendar integration for hospital visits, equipment demos, preventive maintenance, and training — booked the same way, by the agent, on the client's behalf.

## 5.7 Messaging Automation

- Email integration: one click to send a brochure, catalogue, or quotation after a call.
- WhatsApp integration: one click to send a catalogue, quotation, or follow-up message.
- SMS automation: appointment reminders, quote reminders, delivery updates, and thank-you messages.

## 5.8 Operations Visibility

- Inventory: agents see what's available, out of stock, or expected, directly while quoting.
- Accounts: outstanding invoices, payments, and customer credit balances visible against the customer record.

  


# 6. Database Models Required

The four models already identified for the existing workspace (CommunicationRoom, ClientConversation, FollowUp, SalesStatus) are the foundation. The full CRM adds the following:


|                           |                                                                               |
| ------------------------- | ----------------------------------------------------------------------------- |
| **Model**                 | **Purpose**                                                                   |
| Customer                  | Master record: hospital, county, department, contacts, category, lead source. |
| Lead                      | Pipeline stage, source, owner, linked customer.                               |
| CallLog                   | Direction, extension, duration, recording link, CDR reference.                |
| Quotation / QuotationItem | Line items, pricing, status, linked customer and product.                     |
| Product                   | Catalogue entry: image, brochure, price, stock, warranty.                     |
| Ticket                    | Service request, assigned technician, visit status.                           |
| Appointment               | Type (visit, demo, maintenance, training), date, linked customer.             |
| Invoice / Payment         | Amounts, balances, payment history per customer.                              |


  


