# Resource Registry - System Architecture & Flow Diagram

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                         │
│              /admin/bookings/page.tsx                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ │
│  │ Products │ │ Depts    │ │ Alloc    │ │History │ │Bookings│ │
│  │   Tab    │ │   Tab    │ │   Tab    │ │  Tab   │ │  Tab   │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬───┘ └────┬───┘ │
│       │             │             │             │        │      │
│       └─────────────┴─────────────┴─────────────┴────────┘      │
│                         HTTP Requests                            │
│                    (with JWT Auth Token)                         │
└─────────────┬──────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Backend API Routes                             │
│            /server/src/routes/resources.routes.ts               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ Products         │  │ Departments      │  │ Allocations  │  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────┤  │
│  │ GET /products    │  │ GET /departments │  │ GET /alloc   │  │
│  │ POST /products   │  │ POST /depts      │  │ POST /alloc  │  │
│  │ PUT /products/:id│  │ PUT /depts/:id   │  │ PUT /alloc/id│  │
│  │ DELETE /prod/:id │  │ DELETE /depts/:id│  │ /return      │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                     │                    │           │
└───────────┼─────────────────────┼────────────────────┼───────────┘
            │                     │                    │
            ▼                     ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Database Models                              │
│                      (MongoDB)                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ ResourceProduct  │  │ ResourceDepart   │  │ ResourceAlloc│  │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────┤  │
│  │ • name           │  │ • name           │  │ • product_id │  │
│  │ • category       │  │ • manager_id     │  │ • employee_id│  │
│  │ • qty_total      │  │ • description    │  │ • dept_id    │  │
│  │ • qty_available  │  │ • budget_alloc   │  │ • alloc_date │  │
│  │ • purchase_date  │  │ • active         │  │ • return_date│  │
│  │ • cost           │  │ • timestamps     │  │ • condition  │  │
│  │ • serial_number  │  │                  │  │ • is_returned│  │
│  │ • status         │  │                  │  │ • duration   │  │
│  │ • timestamps     │  │                  │  │ • timestamps │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### 1. Product Allocation Flow
```
┌──────────┐
│ Admin    │
│ Creates  │
│ Product  │
└─────┬────┘
      │
      ▼
┌──────────────────────────────────────────┐
│ ResourceProduct Created                  │
│ • name: "MacBook Pro"                    │
│ • qty_total: 2                           │
│ • qty_available: 2 ✅                    │
└─────┬────────────────────────────────────┘
      │
      ▼
┌──────────┐
│ Admin    │
│ Selects  │
│ Allocate │
└─────┬────┘
      │
      ▼
┌──────────────────────────────────────────┐
│ ResourceAllocation Created               │
│ • product_id: "MacBook"                  │
│ • employee_id: "Jane Doe"                │
│ • allocation_date: "2026-05-27"          │
│ • status: "allocated"                    │
│ • is_returned: false ✅                  │
└─────┬────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│ Product Quantity Updated                 │
│ • qty_available: 1 (was 2) ⬇️             │
│ System prevents further allocation       │
└──────────────────────────────────────────┘
```

### 2. Product Return Flow
```
┌──────────────┐
│ Employee     │
│ Returns      │
│ Product      │
└─────┬────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│ Admin Processes Return                   │
│ • Condition: "Good" ✅                   │
│ • Remark: "Works fine, minor wear"       │
└─────┬────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│ ResourceAllocation Updated               │
│ • return_date: "2026-11-27"              │
│ • is_returned: true ✅                   │
│ • condition_on_return: "good"            │
│ • duration_days: 184 (calculated)       │
└─────┬────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│ Product Quantity Restored                │
│ • qty_available: 2 (was 1) ⬆️             │
│ Product available for next allocation    │
└──────────────────────────────────────────┘
```

### 3. Damaged/Lost Product Flow
```
┌──────────────┐
│ Employee     │
│ Returns      │
│ Damaged/Lost │
│ Product      │
└─────┬────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│ Admin Processes Return                   │
│ • Condition: "Damaged" / "Lost" ❌       │
│ • Remark: "Screen broken"                │
└─────┬────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│ ResourceAllocation Updated               │
│ • is_returned: true                      │
│ • condition_on_return: "damaged"/"lost"  │
│ • status: "damaged" / "lost"             │
└─────┬────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────────┐
│ Product NOT Restored to Inventory        │
│ • qty_available: Stays at 1              │
│ • Product marked as damaged/lost in DB   │
│ Archived in history for audit trail      │
└──────────────────────────────────────────┘
```

---

## 🔄 Complete Lifecycle Example

### Timeline: MacBook Pro M2 from Purchase to Return

```
┌─ MAY 1, 2026 ─────────────────────────────────────────────────┐
│                                                                │
│  Admin creates ResourceProduct:                               │
│  ├─ Name: "MacBook Pro M2"                                   │
│  ├─ Category: "Laptop"                                       │
│  ├─ qty_total: 2                                             │
│  ├─ qty_available: 2                                         │
│  ├─ cost: $1,800                                             │
│  └─ purchase_date: "2026-04-15"                              │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ MAY 15, 2026 ─────────────────────────────────────────────────┐
│                                                                │
│  Admin allocates to Employee:                                 │
│  ├─ ResourceAllocation created                               │
│  ├─ product_id: "MacBook Pro M2"                             │
│  ├─ employee_id: "John Smith"                                │
│  ├─ department_id: "IT Department"                           │
│  ├─ allocation_date: "2026-05-15"                            │
│  ├─ status: "allocated"                                      │
│  ├─ is_returned: false                                       │
│  │                                                            │
│  │ Product Update:                                            │
│  │ qty_available: 2 → 1                                      │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ MAY 20 - NOV 20, 2026 ────────────────────────────────────────┐
│                                                                │
│  John Smith uses the MacBook Pro for 6 months                │
│  (allocation remains active)                                  │
│                                                                │
│  System displays in Allocations tab as "Active"               │
│  Product qty_available: 1 (reserved for John)                │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ NOV 20, 2026 ─────────────────────────────────────────────────┐
│                                                                │
│  John returns the MacBook Pro                                 │
│  Admin in Allocations tab clicks "Return" button              │
│  │                                                            │
│  ├─ Selects condition: "Good"                                │
│  ├─ Adds remark: "Excellent condition, works perfectly"      │
│  │                                                            │
│  ResourceAllocation Updated:                                  │
│  ├─ return_date: "2026-11-20"                                │
│  ├─ condition_on_return: "good"                              │
│  ├─ employee_remark: "Excellent condition..."                │
│  ├─ is_returned: true                                        │
│  ├─ status: "returned"                                       │
│  ├─ duration_days: 189 (calculated)                          │
│  │                                                            │
│  Product Update:                                              │
│  qty_available: 1 → 2 (back in stock)                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ AFTER RETURN ─────────────────────────────────────────────────┐
│                                                                │
│  Admin can view in History tab:                               │
│  ├─ Product: "MacBook Pro M2"                                │
│  ├─ Employee: "John Smith"                                   │
│  ├─ Department: "IT Department"                              │
│  ├─ Allocated: "2026-05-15"                                  │
│  ├─ Returned: "2026-11-20"                                   │
│  ├─ Condition: "Good ✅"                                      │
│  ├─ Remark: "Excellent condition, works perfectly"           │
│  └─ Duration: 189 days                                       │
│                                                                │
│  MacBook now available for next allocation                    │
│  qty_available: 2 (can allocate both units again)            │
│                                                                │
└────────────────────────────────────────────────────────────────┘

┌─ LATER (Damaged Return Scenario) ──────────────────────────────┐
│                                                                │
│  If instead John returned damaged:                            │
│  ├─ Condition: "Damaged ⚠️"                                   │
│  ├─ Remark: "Screen has cracks"                              │
│  │                                                            │
│  ResourceAllocation Updated:                                  │
│  ├─ is_returned: true                                        │
│  ├─ condition_on_return: "damaged"                           │
│  ├─ status: "damaged"                                        │
│  │                                                            │
│  Product NOT restored:                                        │
│  qty_available: 1 (remains at 1)                             │
│  Product marked in database as damaged                        │
│                                                                │
│  Admin must manually update product status to "damaged"       │
│  and qty_available to 0 until repaired                        │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🎯 User Journey - Admin's Perspective

```
Admin Opens /admin/bookings
         │
         ▼
   ┌─────────────────┐
   │ Resource Registry│
   │  Landing Page   │
   └────────┬────────┘
         │
    ┌────┼────┬─────┬────────┬──────┐
    ▼    ▼    ▼     ▼        ▼      ▼
  Products Depts Alloc History Bookings
    │      │     │      │        │
    ├───┬──┴──┬──┴──┬──┴──┐     │
    │   │     │     │     │     │
    ▼   ▼     ▼     ▼     ▼     ▼
  Create View Return View Legacy
  Product Depts Product History Bookings
  Add     Manage Allocate Track
  Assets  Dept   Products  Returns
          Managers to Emp
```

---

## 💾 Database Relationships

```
Company
  │
  ├─ ResourceProduct (Products)
  │   │name, category, qty_total, qty_available, cost...
  │   │
  │   └─ Referenced by:
  │       └─ ResourceAllocation (many allocations per product)
  │
  └─ ResourceDepartment (Departments)
      │ name, manager_id, budget...
      │
      └─ Referenced by:
          └─ ResourceAllocation (many allocations per dept)
                │
                ├─ References: ResourceProduct
                ├─ References: User (employee)
                └─ Tracks: allocation_date, return_date, condition
```

---

## 🔐 Access Control

```
┌──────────────────────────────────┐
│ User Authentication (JWT Token)  │
└────────┬───────────────────────  ┘
         │
    ┌────▼─────┐
    │ Extract   │
    │ user_id  │
    │company_id│
    └────┬─────┘
         │
    ┌────▼─────┐
    │ Check Auth│
    │ Middleware│
    └────┬─────┘
         │
    ┌────▼──────────────────────────┐
    │ All queries filtered by:       │
    │ company_id: req.user.company_id│
    │ (User only sees own company)   │
    └───────────────────────────────┘
```

---

## 📱 UI Component Hierarchy

```
ResourceRegistryPage
  │
  ├─ Header
  │  └─ "Resource Registry" + Description
  │
  ├─ Tab Navigation
  │  ├─ Products
  │  ├─ Departments
  │  ├─ Allocations
  │  ├─ History
  │  └─ Bookings
  │
  └─ Content Section (changes with tab)
     │
     ├─ Products Tab
     │  ├─ Search Bar
     │  ├─ Add Product Button
     │  ├─ Product Form (if creating)
     │  └─ Products Grid
     │     └─ ProductCard (repeating)
     │
     ├─ Departments Tab
     │  ├─ Search Bar
     │  ├─ Add Department Button
     │  ├─ Department Form (if creating)
     │  └─ Department List
     │     └─ DepartmentCard (repeating)
     │
     ├─ Allocations Tab
     │  ├─ Search Bar + Filter Dropdown
     │  ├─ Allocate Product Button
     │  ├─ Allocation Form (if creating)
     │  ├─ Allocations Table
     │  │  └─ AllocationRow (repeating)
     │  └─ Return Form (if returning)
     │
     ├─ History Tab
     │  ├─ Search Bar
     │  └─ History Cards
     │     └─ HistoryCard (repeating)
     │
     └─ Bookings Tab
        └─ (Legacy system, maintained for backward compatibility)
```

---

## 🚀 Performance Optimizations

### Database Indexes
```typescript
// Fast company lookups
resourceProductSchema.index({ company_id: 1, category: 1 });

// Fast employee lookups
resourceAllocationSchema.index({ company_id: 1, employee_id: 1 });

// Fast product availability checks
resourceAllocationSchema.index({ company_id: 1, is_returned: 1 });

// Fast historical queries
resourceAllocationSchema.index({ allocation_date: 1 });
```

### Query Optimization
- Company-level data isolation prevents cross-company data leaks
- Lean queries for list operations (no full document load)
- Indexed lookups for common filters
- Denormalized fields (product_name, employee_name) prevent JOIN operations

---

## 📈 Scalability Considerations

- **Vertical**: Can handle thousands of products and employees per company
- **Horizontal**: Company-based sharding possible for multi-tenant scaling
- **Document Size**: Average allocation ~500 bytes, supports millions
- **Query Speed**: Indexed lookups typically <50ms on healthy MongoDB

---

**Architecture Version:** 1.0.0
**Status:** Production Ready ✅
