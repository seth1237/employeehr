# 📦 Stock Management Module Documentation

## Overview
This document describes the design and implementation of the **Stock Management Module** to be integrated into an existing system built with:

- Node.js (Backend)
- React (Frontend)
- MongoDB (Database)

The module enables administrators to manage products, categories, stock levels, sales, and alerts, while allowing assigned users (staff) to perform sales operations.

---

# 🎯 Objectives

- Allow admin to create and manage products and categories
- Enable stock tracking (add/remove)
- Allow staff to record sales
- Track who sold each product
- Trigger alerts when stock is low
- Provide visibility into stock levels and sales history

---

# 🧱 System Components

## 1. Categories

Admins can create categories to organize products.

### Fields
- name (string)
- description (optional)
- createdBy (userId)

---

## 2. Products

Products belong to categories and track stock levels.

### Fields
- name (string)
- category (ObjectId → Category)
- startingPrice (number)
- sellingPrice (number)
- minAlertQuantity (number)
- currentQuantity (number)
- createdBy (userId)
- timestamps

---

## 3. Stock Entries

Tracks all stock additions for auditing purposes.

### Fields
- productId (ObjectId)
- quantityAdded (number)
- addedBy (userId)
- createdAt

---

## 4. Sales

Tracks all product sales.

### Fields
- productId (ObjectId)
- quantitySold (number)
- soldPrice (number)
- soldBy (userId, optional)
- isSalesCompany (boolean)
- createdAt

---

## 5. Users & Roles

### Roles
- Admin
  - Full access
- Staff
  - Can record sales

---

# 🔄 Core Workflows

## 1. Create Category

Admin creates a category.

### Flow
1. Admin submits category form
2. Backend validates input
3. Category saved in DB

---

## 2. Create Product

Admin creates a product and selects a category.

### Flow
1. Admin fills:
   - name
   - category (dropdown)
   - Buying Price
   - selling price
   - min alert quantity
2. Product saved with currentQuantity = 0

---

## 3. Add Stock

Admin increases product quantity.

### Flow
1. Select product
2. Enter quantity
3. Update:
   currentQuantity += quantity
4. Save stock entry record

---

## 4. Record Sale

Admin or Staff records a sale.

### Flow
1. Select product
2. Enter quantity and sold price
3. Choose if sales company:
   - If YES → select employee
   - If NO → proceed
4. Validate stock availability
5. Update:
   currentQuantity -= quantity
6. Save sale record
7. Check for low stock alert

---

## 5. Low Stock Alert 🚨

Triggered after stock update.

### Logic
If:
currentQuantity <= minAlertQuantity

Then:
- Send email notification
- Include product name and remaining quantity

---

# 🔐 Role-Based Access Control

## Admin Permissions
- Create categories
- Create products
- Add stock
- View all sales
- Assign users

## Staff Permissions
- View products
- Record sales

---

# 🌐 API Endpoints

## Categories
- POST /api/categories
- GET /api/categories

## Products
- POST /api/products
- GET /api/products
- PUT /api/products/:id

## Stock
- POST /api/stock/add

## Sales
- POST /api/sales
- GET /api/sales

---

# 🧠 Business Logic

## Stock Update

On stock addition:
```
product.currentQuantity += quantity
```

On sale:
```
product.currentQuantity -= quantity
```

---

## Validation Rules

- Cannot sell more than available stock
- soldBy required if isSalesCompany = true
- Prices must be positive numbers

---

# 📧 Email Notification

### Trigger
- When stock <= minimum threshold

### Example

Subject: Low Stock Alert

Product: [Product Name]
Remaining Quantity: [X]

Action: Please restock.

---

# 🖥️ Frontend Structure (React)

## Admin Views

### Category Management
- Create category
- List categories

### Product Management
- Create product
- Select category (dropdown)
- View products

### Stock Management
- Add stock

### Sales Dashboard
- View sales
- Filter by user/product/date

---

## Staff Views

### Sales Page
- Select product
- Enter quantity
- Submit sale

---

# 📊 Optional Enhancements

- Sales reports (daily/monthly)
- Profit tracking
- Charts dashboard
- SMS alerts
- Multi-branch stock

---

# ⚙️ Implementation Notes

## Backend
- Use Mongoose models
- Use middleware for auth (JWT)
- Use service layer for business logic

## Suggested Structure

```
/models
  Product.js
  Category.js
  Sale.js
  StockEntry.js

/controllers
/services
/routes
```

---

# ✅ Summary

This module introduces:
- Structured product management
- Category assignment
- Stock tracking
- Sales tracking with user attribution
- Automated low-stock alerts

It integrates cleanly into your existing Node + React + MongoDB system.

---

If needed, next steps can include:
- Full Mongoose schemas
- Express controller code
- React UI components
- Email service setup

---

# ✅ Implementation in This Repository

The stock module has been implemented for this multi-tenant system with tenant isolation via authenticated `org_id` context.

## Backend Files Added

- `server/src/models/StockCategory.ts`
- `server/src/models/StockProduct.ts`
- `server/src/models/StockEntry.ts`
- `server/src/models/StockSale.ts`
- `server/src/controllers/stockController.ts`
- `server/src/routes/stock.routes.ts`

Route mount:
- `server/src/index.ts` → `app.use("/api/stock", stockRoutes)`

## Frontend Pages Added

- `app/admin/stock/page.tsx` (admin stock management workspace)
- `app/employee/stock/page.tsx` (assigned user stock/sales workspace)

Navigation links added:
- `components/admin/sidebar.tsx`
- `components/employee/sidebar.tsx`

## Implemented API Surface

Base: `/api/stock`

- `POST /categories`
- `GET /categories`
- `POST /products`
- `GET /products`
- `PUT /products/:id`
- `POST /add`
- `GET /entries`
- `POST /sales`
- `GET /sales`

## Multi-Tenant & Role Behavior

- All stock endpoints are protected with auth + tenant isolation middleware.
- Admin/HR can create categories/products and update products.
- Product-level assignment is supported via `assignedUsers`.
- Non-admin users can only add stock/sales for products assigned to them.
- Sales are tracked with seller identity, optional selected "sales company" employee, sold price, quantity, and remaining stock.

## Low Stock Alert

- Trigger condition: `currentQuantity <= minAlertQuantity`
- Trigger points: after stock add and after sale record
- Alert target: active `company_admin` and `hr` users in the same tenant
- Delivery: tenant-aware email service with restock advice message

