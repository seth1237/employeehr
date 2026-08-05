# Resource Registry - Quick Start Guide for Users

## What is Resource Registry?

**Resource Registry** is your company's central hub for managing all assets, equipment, and products. It replaces the old "Resource Bookings" system with a complete, modern solution.

Instead of just booking resources, you can now:
- 📦 Manage a complete inventory of company assets
- 👥 Organize assets by department
- 👤 Allocate products to specific employees
- 📊 Track who has what and when it's returned
- 📋 Keep detailed history of all transactions

---

## Getting Started (3 Steps)

### Step 1: Add Your Products/Assets 📦
1. Go to **Admin Dashboard → Bookings**
2. You're now in **Resource Registry**
3. Click the **"Products"** tab (first tab, should be active)
4. Click **"Add Product"** button

**Fill in the form:**
- **Product Name**: e.g., "MacBook Pro", "Office Chair", "Company Vehicle"
- **Category**: e.g., "Laptop", "Furniture", "Vehicle" (you define these!)
- **Description**: Optional details about the product
- **Total Quantity**: How many do you have? (e.g., 5 laptops)
- **Cost**: Purchase price (helps track value)
- **Purchase Date**: When was it bought (optional)

Click **"Save Product"** ✅

**Repeat for all your assets.**

Example: You might add Laptops, Chairs, Projectors, Vehicles, Software Licenses, etc.

---

### Step 2: Setup Departments 🏢
1. Click the **"Departments"** tab
2. Click **"Add Department"** button

**Fill in the form:**
- **Department Name**: e.g., "IT Department", "Finance", "Sales"
- **Description**: What does this department do? (optional)
- **Department Manager**: Who manages this department? (select from employee list)

Click **"Save Department"** ✅

**Note:** Departments help organize your allocations. When you give a laptop to someone, you say "This laptop goes to John in IT Department."

---

### Step 3: Allocate Products to Employees 👤
1. Click the **"Allocations"** tab
2. Click **"Allocate Product"** button

**Fill in the form:**
- **Select Product**: Choose which product (Laptop, Chair, etc.)
  - Only shows products with available quantity
- **Select Department**: Which department?
- **Select Employee**: Which employee gets it?

Click **"Allocate"** ✅

**That's it! The allocation is instant.** The employee now has the product.

---

## Day-to-Day Operations

### View Current Allocations
In **"Allocations"** tab, you see:
- **Product Name**: What item is allocated
- **Employee Name**: Who has it
- **Department**: Which department
- **Allocation Date**: When was it given
- **Status**: "Active" = employee has it, "Returned" = back in inventory

### Employee Returns a Product
When an employee gives back a product:

1. In **"Allocations"** tab, find the active allocation
2. Click the **"Return"** button
3. Select **condition on return**:
   - ✅ **Good**: Product is fine, can be used again
   - ⚠️ **Damaged**: Product is damaged but may be fixable
   - ❌ **Lost**: Product is missing
4. Add **Employee Remark** (optional): "Minor scratch on screen but works fine"
5. Click **"Confirm Return"** ✅

**What happens next:**
- If "Good" → Product goes back to available inventory
- If "Damaged" or "Lost" → Product is removed from available (but kept in history)

### View Product History
Click **"History"** tab to see:
- All returned products
- Who had them
- How long they had them
- What condition they returned in
- Employee remarks
- Timeline of all transactions

---

## Common Scenarios

### Scenario 1: New Employee Joins
1. Add them to Employees (if not already in system)
2. Go to Allocations tab
3. Allocate them a Laptop, Monitor, Chair from relevant department
4. Done! They're all set up

### Scenario 2: Employee Gets Promoted to New Department
1. Employee returns their current items (go to Allocations, click Return)
2. Reallocate to new department
3. History shows the complete journey

### Scenario 3: Equipment Needs Maintenance
1. Go to Products tab
2. Mark product status as "Damaged" or "Inactive"
3. Product won't be offered in allocations until marked "Active" again

### Scenario 4: Asset Depreciation Review
1. Go to History tab
2. See all products that have been used
3. Track wear and tear through employee remarks
4. Make decisions about replacing equipment

---

## Tips & Best Practices

✅ **DO:**
- Give products meaningful names ("MacBook Pro 13-inch M2" not just "Laptop")
- Keep categories consistent ("Laptop", "Chair", "Vehicle" not "Computers", "Furniture", "Cars")
- Record condition on return - helps track product lifespan
- Add remarks when returning damaged items
- Review history regularly for maintenance needs

❌ **DON'T:**
- Mark quantity as 1 if you have 10 - helps with allocation limits
- Forget to process returns - keeps inventory accurate
- Mix company and personal assets
- Leave remarks empty - these help manage future allocations

---

## Understanding the Ecosystem

```
Your Company
│
├─ Products (What you have)
│  └─ Laptop, Chair, Projector, etc.
│
├─ Departments (How it's organized)
│  └─ IT, Finance, Sales, etc.
│
└─ Allocations (Who has what)
   ├─ John (IT) → Laptop until 6/2026
   ├─ Sarah (Finance) → Chair until returned
   └─ Mike (Sales) → Projector (returned 5/20/2026)
```

**The beauty:** You can see the complete lifecycle of every asset!

---

## Key Advantages of This System

| Before | Now |
|--------|-----|
| Just approving booking requests | Managing complete asset inventory |
| No tracking of returns | Complete return history with condition |
| Manual spreadsheets | Automated, searchable database |
| Lost assets | Detailed audit trail of who has what |
| No department linking | Department-based organization |

---

## Troubleshooting

**Q: Why can't I allocate a product?**
- A: The product might have 0 available quantity. Check if others have it allocated.

**Q: How do I see who currently has a laptop?**
- A: Go to Allocations tab, search for "Laptop", filter by "Active". Shows all in-use items.

**Q: Can I change an allocation after creating it?**
- A: Return the item (condition good) and re-allocate to someone else.

**Q: How long can someone keep a product?**
- A: No time limit! System works until you process a return.

---

## Admin vs User View

### Company Admin
✅ Can see all products, departments, allocations, and history
✅ Can create, edit, delete anything
✅ Can process returns
✅ Can view complete company asset picture

### Regular Employee
🔒 Can currently see (restricted - future feature)
- Only their own allocations
- Only their department's products
- Cannot delete or modify

---

## Quick Keys

- **📦 Products Tab** = See all company assets
- **🏢 Departments Tab** = See all departments
- **🔄 Allocations Tab** = Current allocation tracking
- **📋 History Tab** = Past allocations and returns
- **Clock Icon in Bookings Tab** = Legacy resource booking (old system)

---

## Next Steps

1. ✅ Create your products
2. ✅ Setup departments
3. ✅ Start allocating to employees
4. ✅ Track returns and conditions
5. ✅ Review history monthly

**Your resource management just got 10x easier!** 🎉

---

## Support

Need help? Contact your system administrator or check the detailed guide:
📖 **RESOURCE_REGISTRY_GUIDE.md** in documentation

---

**Welcome to Resource Registry!** 
Make asset management simple, transparent, and complete.
