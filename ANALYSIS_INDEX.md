# Yes. Based on the current Accounts module, you already have a useful foundation, but it is currently closer to a **receivables + expenses + reporting module** than a complete accounting system.

Your current module has eTIMS posting, payments, debts, expenses, remuneration reports and financial analytics. The biggest opportunity is to introduce a proper **double-entry accounting core**, then build the operational modules around it.

## 1. Recommended Accounts structure

I would restructure the ERP Accounts module into:

```text
ACCOUNTS
│
├── Dashboard
│
├── General Ledger
│   ├── Chart of Accounts
│   ├── Journal Entries
│   ├── General Ledger
│   ├── Trial Balance
│   └── Account Reconciliation
│
├── Sales & Receivables
│   ├── Sales Invoices
│   ├── Customer Payments
│   ├── Credit Notes
│   ├── Debit Notes
│   ├── Customer Statements
│   ├── Debtors
│   └── Aging Report
│
├── Purchases & Payables
│   ├── Supplier Bills
│   ├── Supplier Payments
│   ├── Credit Notes
│   ├── Supplier Statements
│   ├── Creditors
│   └── Aging Report
│
├── Cash & Banking
│   ├── Cash Accounts
│   ├── Bank Accounts
│   ├── M-Pesa
│   ├── Cashbook
│   ├── Bank Reconciliation
│   └── Transfers
│
├── Expenses
│   ├── Expenses
│   ├── Recurring Expenses
│   ├── Expense Categories
│   ├── Expense Approvals
│   └── Expense Claims
│
├── Tax
│   ├── eTIMS
│   ├── VAT
│   ├── PAYE
│   ├── NSSF
│   ├── SHA
│   ├── Withholding Tax
│   └── Tax Reports
│
├── Payroll
│   ├── Payroll Summary
│   ├── Statutory Deductions
│   └── Payroll Journal
│
├── Assets
│   ├── Fixed Assets
│   ├── Asset Register
│   ├── Depreciation
│   ├── Asset Disposal
│   └── Asset Transfers
│
├── Inventory Accounting
│   ├── Stock Valuation
│   ├── COGS
│   ├── Stock Adjustments
│   └── Inventory Reconciliation
│
├── Reports
│   ├── Profit & Loss
│   ├── Balance Sheet
│   ├── Cash Flow
│   ├── Trial Balance
│   ├── General Ledger
│   ├── Debtors
│   ├── Creditors
│   ├── VAT
│   ├── Tax
│   └── Management Reports
│
└── Settings
    ├── Fiscal Periods
    ├── Accounting Settings
    ├── Tax Settings
    ├── Payment Methods
    ├── Approval Rules
    └── Audit Logs
```

---

# 2. FIRST PRIORITY: Build the Accounting Engine

This is the most important change.

At the moment, payments are essentially being recorded against invoices, with fields such as amount, payment method, reference, note and paid-at date.

You need to make every financial transaction produce a proper accounting entry.

### Example

Customer buys equipment for:

**KES 100,000**

Invoice:

```text
Dr Accounts Receivable       100,000
    Cr Sales Revenue                 100,000
```

Customer pays through M-Pesa:

```text
Dr M-Pesa                    100,000
    Cr Accounts Receivable          100,000
```

Expense of KES 20,000:

```text
Dr Expense                    20,000
    Cr M-Pesa                         20,000
```

This becomes the foundation for:

- Profit & Loss
- Balance Sheet
- Cash Flow
- Trial Balance
- General Ledger
- Debtors
- Creditors
- Tax reports
- Management reports

### Core entities to add

```text
Account
JournalEntry
JournalEntryLine
AccountingPeriod
FiscalYear
Transaction
TransactionAttachment
AccountBalance
```

Every journal entry should have:

```text
id
tenantId
date
reference
description
sourceType
sourceId
status
createdBy
approvedBy
createdAt
```

And each journal line:

```text
journalEntryId
accountId
debit
credit
description
costCenterId
branchId
```

### Critical rule

**Total Debits must always equal Total Credits.**

The backend should reject any unbalanced journal entry.

---

# 3. Chart of Accounts

Add a proper Chart of Accounts.

For a medical-supplies ERP, something like:

### 1000 — Assets

```text
1100 Cash
1110 Petty Cash
1200 Bank
1210 M-Pesa
1300 Accounts Receivable
1400 Inventory
1410 Medical Equipment Inventory
1420 Laboratory Reagents
1430 Consumables
1500 Prepayments
1600 Fixed Assets
1700 Accumulated Depreciation
```

### 2000 — Liabilities

```text
2100 Accounts Payable
2200 VAT Payable
2210 Withholding Tax Payable
2220 PAYE Payable
2230 NSSF Payable
2240 SHA Payable
2300 Accrued Expenses
2400 Loans
```

### 3000 — Equity

```text
3100 Share Capital
3200 Retained Earnings
3300 Current Year Profit/Loss
```

### 4000 — Revenue

```text
4100 Medical Equipment Sales
4200 Laboratory Equipment Sales
4300 Reagents Sales
4400 Consumables Sales
4500 Service Revenue
4600 Installation Revenue
4700 Training Revenue
```

### 5000 — Cost of Sales

```text
5100 Equipment COGS
5200 Reagent COGS
5300 Consumables COGS
5400 Freight / Import Costs
```

### 6000 — Operating Expenses

```text
6100 Salaries
6200 Rent
6300 Utilities
6400 Internet
6500 Transport
6600 Fuel
6700 Marketing
6800 Repairs
6900 Professional Fees
```

This should be **configurable per company/tenant**, not hard-coded.

---

# 4. Accounts Dashboard

You currently don't even have an Accounts index page; `/admin/accounts` has no `page.tsx`.

This should become the main accounting dashboard.

### Top cards

```text
Cash Position
Bank Balance
M-Pesa Balance
Accounts Receivable
Accounts Payable
Inventory Value
This Month Revenue
This Month Expenses
Gross Profit
Net Profit
```

### Charts

**Revenue**

```text
Jan ███████
Feb █████████
Mar ███████████
Apr █████████████
```

**Expenses**

**Cash Flow**

**Receivables Aging**

**Sales vs COGS**

**Profit Trend**

### Alerts

```text
⚠ KES 1.4M overdue customer invoices

⚠ 7 invoices pending eTIMS submission

⚠ Bank reconciliation pending

⚠ VAT filing period approaching

⚠ 4 supplier bills overdue

⚠ 3 transactions require approval
```

---

# 5. Sales & Accounts Receivable

You already have Payments and Debts. Payments supports partial/full payments, and Debts shows unsettled invoices.

Expand this substantially.

### Add:

#### Customer statement

Example:

```text
CUSTOMER: XYZ HOSPITAL

Invoice        Date        Debit       Credit      Balance
INV-001        01/08       500,000                 500,000
PAY-001        10/08                    200,000    300,000
PAY-002        20/08                    100,000    200,000
```

Include:

- opening balance
- invoices
- payments
- credit notes
- debit notes
- closing balance

### Customer aging

You already have an aging API with:

- 0–30
- 31–60
- 61–90
- 90+ days

but no UI.

Definitely build this.

```text
Customer       Current    30d    60d    90d+    Total
Hospital A     500K       200K   0      300K    1M
Hospital B     100K       0      50K    0       150K
```

Add:

**Send statement**

**Send reminder**

**WhatsApp**

**Email**

**Export PDF**

---

# 6. Credit Notes & Debit Notes

This is essential.

### Credit Note

Used when:

- customer returns goods
- invoice was overcharged
- price adjustment
- damaged product
- cancellation

### Debit Note

Used when:

- additional charges
- freight adjustment
- price correction
- additional services

These must automatically reverse/adjust the original accounting entries.

---

# 7. Accounts Payable

This is a major missing piece.

You have customer receivables, but you need the other side:

**Suppliers → Bills → Payments → Creditors.**

Create:

### Supplier database

```text
Supplier
Supplier PIN
Contact
Payment terms
Credit limit
Bank
M-Pesa
Currency
```

### Supplier bills

```text
Bill Number
Supplier
Date
Due Date
Items
Subtotal
VAT
Total
Payment Status
Attachment
```

### Supplier payment

```text
Supplier
Bill
Amount
Payment method
Reference
Date
```

Then:

```text
Dr Inventory / Expense
Dr Input VAT
    Cr Accounts Payable
```

---

# 8. Cash & Bank Management

This should be its own major section.

Create:

### Cash accounts

```text
Petty Cash
Main Cash
Branch Cash
```

### Bank accounts

```text
Bank
Account Number
Branch
Currency
Opening Balance
```

### M-Pesa accounts

Since your current expense system already supports M-Pesa prompts, this should become a formal accounting account rather than simply an expense mechanism.

---

# 9. Bank Reconciliation

This will significantly improve stability and usefulness.

Allow:

```text
ERP Balance
Bank Statement Balance
Difference
```

Upload:

- CSV
- Excel
- PDF where possible

Then match:

```text
Bank transaction
        ↓
ERP transaction
        ↓
Matched / Unmatched
```

Example:

```text
Bank                         ERP
KES 50,000                  KES 50,000     ✓
KES 20,500                  KES 20,500     ✓
KES 100,000                 —              ⚠
—                           KES 15,000     ⚠
```

---

# 10. Expense Management

Your current Expenses page focuses heavily on M-Pesa STK/prompt expenses and recurring bills.

Expand it into a proper expense system.

### Expense fields

```text
Expense Number
Date
Payee
Category
Amount
VAT
Payment Account
Branch
Department
Cost Centre
Description
Attachment
Requested By
Approved By
Status
```

### Workflow

```text
Draft
 ↓
Submitted
 ↓
Manager Approval
 ↓
Finance Approval
 ↓
Paid
 ↓
Posted
```

This is much safer than immediately triggering payment.

---

# 11. Expense Claims

Add employee expense claims.

Example:

Employee spends:

```text
Fuel             5,000
Accommodation   10,000
Meals             3,000
Transport         2,000
----------------------
Total            20,000
```

Employee uploads receipts.

Manager approves.

Accounts reimburses.

---

# 12. Recurring Transactions

Your current recurring bill feature stores repeat bills and allows "Run Now."

Make this more powerful.

Support:

- rent
- internet
- subscriptions
- insurance
- loans
- salaries
- utilities
- licenses
- maintenance contracts

Fields:

```text
Frequency
Start date
End date
Next occurrence
Amount
Account
Auto-post
Auto-pay
Approval required
```

---

# 13. Tax Management

Because the ERP already has eTIMS OSCU integration, this should become a complete tax section rather than only an invoice-posting page.

The current system already tracks KRA PIN, branch ID, device serial, environment, communication key and submission status.

Add:

### VAT

```text
Output VAT
Input VAT
VAT Payable
VAT Receivable
VAT Returns
```

### Withholding Tax

Track:

```text
Supplier
Invoice
WHT rate
WHT amount
Certificate
Payment
```

### Other statutory liabilities

Integrate accounting entries for:

- PAYE
- NSSF
- SHA
- HELB
- VAT
- withholding tax

Your payroll reporting already exposes PAYE, SHA, NSSF and HELB totals.

The missing piece is connecting these reports to the **General Ledger**.

---

# 14. Payroll → Accounting Integration

Don't duplicate payroll.

Instead:

```text
Payroll Module
       ↓
Payroll Approved
       ↓
Create Payroll Journal
       ↓
General Ledger
```

Example:

```text
Dr Salaries Expense
Dr Employer Contributions
    Cr PAYE Payable
    Cr NSSF Payable
    Cr SHA Payable
    Cr Employee Advances
    Cr Bank / Salary Payable
```

---

# 15. Fixed Assets

Very important for a medical equipment company.

Add:

```text
Asset Register
Asset Category
Purchase Date
Purchase Cost
Supplier
Serial Number
Location
Department
Useful Life
Depreciation Method
Accumulated Depreciation
Net Book Value
```

For example:

```text
Ultrasound Machine
Cost:              3,500,000
Useful life:       5 years
Accumulated dep.:  1,400,000
Net book value:    2,100,000
```

Support:

- depreciation
- transfer
- maintenance
- disposal
- impairment
- asset history

---

# 16. Inventory Accounting

This is **critical** because the ERP already handles stock and sales.

Your existing Financial Breakdown already calculates inventory valuation, stock, buying/selling price, revenue, quantity sold, operating profit and margin.

But the accounting system needs to formally connect inventory to the ledger.

When goods are purchased:

```text
Dr Inventory
Dr Input VAT
    Cr Accounts Payable
```

When goods are sold:

```text
Dr Accounts Receivable
    Cr Sales Revenue
    Cr Output VAT
```

And:

```text
Dr Cost of Goods Sold
    Cr Inventory
```

This makes your Profit & Loss accurate.

---

# 17. Cost Centres

Add:

```text
Branch
Department
Sales Team
Project
Product Category
```

Example:

```text
NAIROBI BRANCH
MOMBASA BRANCH
KISUMU BRANCH
```

Then management can ask:

> How profitable is Nairobi?

or:

> How much did the sales department spend?

or:

> Which product category has the highest margin?

---

# 18. Budgeting

Add a budgeting module.

Example:


| Category  | Budget | Actual | Variance |
| --------- | ------ | ------ | -------- |
| Marketing | 500K   | 430K   | +70K     |
| Transport | 300K   | 350K   | -50K     |
| Salaries  | 2M     | 2M     | 0        |
| Rent      | 400K   | 400K   | 0        |


Allow:

**Annual → Quarterly → Monthly → Branch → Department**

---

# 19. Proper Financial Reports

This is where the current Financial Breakdown should evolve.

You currently have revenue, operating profit, cash inflow/outflow and product profitability.

Add formal accounting reports.

### Profit & Loss

```text
Revenue
- Cost of Sales
----------------
Gross Profit

- Operating Expenses
----------------
Operating Profit

+/- Other Income/Expenses
----------------
Net Profit
```

### Balance Sheet

```text
ASSETS
Cash
Bank
M-Pesa
Receivables
Inventory
Fixed Assets

LIABILITIES
Payables
VAT
Taxes
Loans

EQUITY
Capital
Retained Earnings
Current Profit
```

### Trial Balance

```text
Account                 Debit       Credit
Cash                    500,000
Bank                  2,000,000
Inventory             5,000,000
Receivables           3,000,000
Sales                              8,000,000
Payables                           1,500,000
Capital                            4,000,000
```

**Debit = Credit**

Always.

---

# 20. General Ledger

This should be one of the core screens.

Select:

```text
Account: 1200 Bank
Period: August 2026
```

Then:

```text
Date       Reference     Description       Debit    Credit    Balance
01/08      OB            Opening balance                     500K
03/08      INV-001       Customer payment  100K              600K
05/08      EXP-021       Office supplies             20K     580K
```

Every transaction should link back to its source.

---

# 21. Journal Entry System

Allow authorized accountants to create manual journals.

Example:

```text
Journal No: JE-000021

Date: 23/08/2026

Account                    Debit       Credit

Depreciation Expense       50,000
Accumulated Depreciation               50,000
```

But **never allow ordinary users to edit posted journals directly.**

Use:

```text
Draft
Submitted
Approved
Posted
Reversed
```

---

# 22. Reversal System

Do not delete accounting transactions.

If a transaction is wrong:

❌ Delete

Instead:

```text
Original Transaction
        ↓
Reverse
        ↓
Reversal Journal
        ↓
Correct Journal
```

This is one of the biggest things that will make the ERP more reliable.

---

# 23. Accounting Periods

Add:

```text
Fiscal Year
Accounting Period
Period Status
```

Example:

```text
August 2026
OPEN

July 2026
CLOSED
```

Once closed:

**No normal user can modify July transactions.**

Only an authorized accountant/admin can reopen it.

---

# 24. Approval System

Introduce approval levels.

### Example

```text
KES 0–10,000
→ Department Manager

KES 10,001–100,000
→ Manager + Finance

KES 100,001–500,000
→ Finance Manager

KES 500,000+
→ Director
```

Make thresholds configurable.

---

# 25. Audit Trail

This is extremely important for stability.

Record:

```text
Who
What
When
Before
After
IP
Device
Reason
```

Example:

```text
Seth
Changed invoice INV-001
Amount: 500,000 → 450,000
23 Aug 2026 14:31
Reason: Approved discount
```

For accounting transactions, audit history should be **immutable**.

---

# 26. Attachments & Documents

Every financial transaction should support attachments.

Examples:

```text
Invoice
Receipt
LPO
Delivery Note
Bank Slip
M-Pesa Statement
Tax Certificate
Supplier Bill
Credit Note
```

Then:

```text
Transaction
   ├── Journal
   ├── Attachment
   ├── Approval
   └── Audit history
```

---

# 27. Multi-Branch Accounting

Since your Financial Breakdown already supports branch filtering, you should formalize branch accounting.

Every financial transaction should carry:

```text
tenantId
branchId
departmentId
costCenterId
```

This allows:

> Show me Nairobi only.

> Show me Mombasa only.

> Show consolidated company accounts.

---

# 28. Multi-Tenant Isolation

This is particularly important for your ERP architecture.

Every accounting record should contain:

```text
tenantId
```

And backend queries should **always scope by tenant**.

Never rely on the frontend to filter tenant data.

For example:

```text
WHERE tenantId = authenticatedUser.tenantId
```

This should be enforced at the service/repository layer.

---

# 29. Transaction Idempotency

This is one of the biggest stability improvements I recommend.

Especially for:

- M-Pesa
- eTIMS
- payments
- webhooks
- invoice posting
- payroll
- bank imports

A request must not create the same transaction twice.

For example:

```text
M-Pesa transaction ID
ABC123XYZ
```

If the callback comes twice:

```text
First → CREATE ✓
Second → ALREADY PROCESSED → IGNORE
```

This prevents duplicate payments.

---

# 30. Financial Transaction State Machine

Don't use only a generic `status`.

Use controlled transitions.

For example:

```text
DRAFT
  ↓
SUBMITTED
  ↓
APPROVED
  ↓
POSTED
  ↓
RECONCILED
  ↓
CLOSED
```

For failed transactions:

```text
POSTED
   ↓
REVERSED
```

This makes the system much harder to corrupt.

---

# 31. Database Stability

I would add database-level constraints.

### Money

Use:

```text
DECIMAL(19,4)
```

rather than floating point.

Never:

```text
float
double
```

for accounting money.

### Unique constraints

Examples:

```text
tenantId + invoiceNumber
tenantId + paymentReference
tenantId + journalNumber
tenantId + accountCode
tenantId + eTIMSInvoiceNumber
```

### Foreign keys

Ensure:

```text
Payment → Invoice
JournalLine → Account
Invoice → Customer
Bill → Supplier
Asset → AssetCategory
```

cannot point to invalid records.

---

# 32. Transactional Database Writes

A payment should never partly save.

For example:

```text
Create payment
↓
Update invoice balance
↓
Create journal
↓
Update account balance
↓
Audit log
```

These should happen inside **one database transaction**.

If anything fails:

```text
ROLLBACK EVERYTHING
```

That is essential.

---

# 33. Reconciliation Engine

Add a system-wide reconciliation page.

```text
Invoice balance
        =
Payments
        +
Credit notes
        -
Refunds
```

And:

```text
General Ledger balance
        =
Subledger balance
```

For example:

```text
Accounts Receivable GL       5,250,000
Customer invoices            5,250,000
Difference                           0 ✓
```

If:

```text
GL                            5,250,000
Invoices                      5,300,000
Difference                      50,000 ⚠
```

The system should flag it.

---

# 34. Notifications

Create accounting alerts.

### Finance

```text
Invoice overdue
Supplier bill due
Payment failed
M-Pesa failed
eTIMS failed
Bank reconciliation mismatch
Budget exceeded
Low cash balance
Tax deadline approaching
```

Allow:

- in-app
- email
- SMS/WhatsApp where appropriate

---

# 35. Search & Command Centre

Your current Cmd-K only covers part of Accounts, and Remuneration Reports and Financial Breakdown are currently missing from it.

Expand it.

Search:

```text
INV-001
Customer
Supplier
Payment
Journal
Receipt
Asset
Expense
Account
```

Actions:

```text
Create Invoice
Record Payment
Create Expense
Create Journal
Add Supplier
Add Customer
Open Bank Reconciliation
```

---

# 36. What I Would Build FIRST

Don't attempt everything simultaneously.

I'd implement it in these phases:

### PHASE 1 — Accounting Foundation

**Highest priority**

- Chart of Accounts
- Journal Entries
- Journal Lines
- General Ledger
- Accounting Periods
- Double-entry validation
- Transaction numbering
- Audit logs
- Reversal mechanism
- Database transactions
- Tenant isolation

### PHASE 2 — Receivables

- Customer statements
- Aging dashboard
- Credit notes
- Debit notes
- Refunds
- Payment allocation
- Collection reminders

### PHASE 3 — Payables

- Suppliers
- Supplier bills
- Supplier payments
- Supplier statements
- Creditor aging
- Purchase credit notes

### PHASE 4 — Cash & Banking

- Cashbook
- Bank accounts
- M-Pesa ledger
- Transfers
- Bank reconciliation
- Statement import

### PHASE 5 — Reporting

- Trial Balance
- Profit & Loss
- Balance Sheet
- Cash Flow
- General Ledger report
- AR report
- AP report
- Tax reports

### PHASE 6 — Tax

- eTIMS reliability
- VAT
- WHT
- PAYE
- NSSF
- SHA
- Tax reconciliation

### PHASE 7 — Assets & Inventory

- Fixed assets
- Depreciation
- Asset disposal
- Inventory valuation
- COGS
- Stock reconciliation

### PHASE 8 — Management Accounting

- Budgets
- Cost centres
- Branch profitability
- Product profitability
- Salesperson profitability
- Department profitability
- Forecasting

---

## The architecture I recommend

The key change is this:

```text
                 ┌───────────────────┐
                 │     ACCOUNTS      │
                 └─────────┬─────────┘
                           │
                 ┌─────────▼─────────┐
                 │ ACCOUNTING ENGINE │
                 │                   │
                 │ Double Entry      │
                 │ Journal           │
                 │ Ledger             │
                 │ Periods            │
                 │ Audit              │
                 └─────────┬─────────┘
                           │
       ┌───────────┬───────┼────────┬────────────┐
       ▼           ▼       ▼        ▼            ▼
    SALES       PURCHASES CASH     PAYROLL     INVENTORY
       │           │       │        │            │
       └───────────┴───────┴────────┴────────────┘
                           │
                           ▼
                    GENERAL LEDGER
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
             P&L      BALANCE SHEET   CASH FLOW
```

**The most important architectural principle:** Sales, Payments, Expenses, Payroll, Inventory, eTIMS and Purchases should **not independently calculate the company's financial position**.

They should create controlled transactions that flow into **one accounting engine / General Ledger**.

That is what will make the ERP stable rather than simply adding more pages.

Your existing Financial Breakdown can then become a **management analytics layer** on top of the accounting engine, rather than being responsible for calculating accounting truth. The current version already provides revenue, profit, cash flow and product/category analysis, so it is a good starting point for that layer.

### In short

Your current Accounts module:

**Invoices → Payments → Debts → Expenses → Reports → eTIMS**

should evolve into:

**Transactions → Double Entry → General Ledger → Subledgers → Reconciliation → Financial Statements → Management Analytics**

That is the structural change I would make before adding dozens of individual accounting features.