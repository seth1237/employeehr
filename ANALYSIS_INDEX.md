something like this:

```
Clients
├── Telesales Activity   ⭐ NEW


```

The **Telesales Activity** page becomes the central workspace for all telesales agents, where they can manage every client they're responsible for.

# Telesales Activity

This page should have four main sections.

---

## 1. Today's Planner

At the top, show what the agent needs to do today.

```
Today's Calls          35
Completed              12
Remaining              23

Follow-ups Due         18
Overdue                 5

Meetings Today          3


```

Buttons:

- 

- Start Calling

- 

- Add Follow-up

- 

- Create Task

- 

- View Calendar

---

## 2. Call Queue

A working list of clients to call.


| Client            | Contact | Last Call  | Priority  | Next Action |
| ----------------- | ------- | ---------- | --------- | ----------- |
| Aga Khan Hospital | John    | 3 days ago | 🔴 High   | Call        |
| Coast General     | Mary    | Yesterday  | 🟡 Medium | Follow-up   |
| Labcare Ltd       | Peter   | Never      | 🔴 High   | First Call  |


Filters:

- Assigned to Me
- Today
- Overdue
- New Leads
- High Priority
- Quotations Pending
- No Answer
- Lost Opportunities

Each row should have quick actions:

- 📞 Call
- 📝 Add Note
- 📧 Email
- 💬 WhatsApp
- 📄 Quote
- 📅 Schedule

---

## 3. Planner & Calendar

A daily/weekly planner.

```
9:00
Call Aga Khan

9:30
Call Avenue Hospital

10:00
Follow up quotation

11:00
Demo Meeting

2:00
Call Labcare

4:00
Send quotations

```

Tasks can be dragged to different times if needed.

---

## 4. Performance Dashboard

This measures the telesales agent's productivity.

```
Calls Made           47

Connected            33

Average Duration     6m 18s

Interested           18

Quotes Sent          9

Meetings             4

Sales Closed         2

Conversion Rate      12%

Revenue Generated    KES 2.4M

```

Managers can filter by:

- Today
- This Week
- This Month
- Custom Date

---

## 5. Activity Feed

A live stream of recent telesales actions.

```
09:15
John called Aga Khan Hospital

09:30
Quotation sent to Coast General

10:10
Follow-up scheduled for Mediheal

11:00
Meeting booked with Nairobi Hospital

11:45
Sale closed for Chemistry Analyzer

```

---

## 6. Follow-up Board

```
Overdue (8)

Today (15)

Tomorrow (22)

This Week (40)

Completed (120)

```

Clicking a section opens the relevant client list.

---

## 7. KPIs

```
Clients Assigned
320

Active Clients
214

Clients Contacted Today
27

Clients Awaiting Follow-up
39

Clients with Quotes
21

Clients in Negotiation
14

Won This Month
9

Lost This Month
5

```

---

## 8. Manager View

Managers should also be able to see performance by salesperson.


| Salesperson | Calls | Connected | Quotes | Sales | Conversion |
| ----------- | ----- | --------- | ------ | ----- | ---------- |
| John        | 54    | 41        | 10     | 3     | 7.4%       |
| Mary        | 49    | 35        | 8      | 2     | 5.7%       |
| Peter       | 61    | 44        | 12     | 4     | 9.1%       |


---

### Suggested Navigation

```
Clients
├── All Clients
├── Leads
├── Telesales Activity
│   ├── Dashboard
│   ├── Call Queue
│   ├── Planner
│   ├── Calendar
│   ├── Follow-ups
│   ├── Activity Feed
│   ├── Performance
│   └── Reports
├── Client Groups
└── Reports

```

This layout keeps **all client-related work under the Clients module** while giving telesales agents a dedicated operational workspace. Individual client records remain focused on customer details, and **Telesales Activity** becomes the place where agents plan their day, make calls, track follow-ups, and managers monitor team performance.