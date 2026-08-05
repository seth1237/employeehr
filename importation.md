Overview
Create a new IMPORTATION section in the admin stock management area with two major features:

Source Management - Create and manage manufacturers/suppliers
Product-Manufacturer Linking - Link products to manufacturers with dropdown selection


Phase 1: Database Schema & API
1.1 Add MongoDB Models
File: server/models/ImportationSource.ts

Create Importer model with fields:

_id, org_id, sourceType ('importer' or 'supplier')
companyName, country, contactPerson, phoneNumber
comment, isActive, createdAt, updatedAt



1.2 Update Product Model

Add manufacturerId field to Product model to link to ImportationSource
Add manufacturer object reference for display

1.3 Create API Endpoints
File: server/src/controllers/importationController.ts

POST /api/importation/sources - Create new source
GET /api/importation/sources - List all sources (filtered by org_id)
PUT /api/importation/sources/:id - Update source
DELETE /api/importation/sources/:id - Delete source
PUT /api/stock/products/:id/manufacturer - Link product to manufacturer
GET /api/stock/products - Updated to include manufacturer data


Phase 2: Frontend Pages & Components
2.1 Create Routes

/admin/stock/importation - Main IMPORTATION page
/admin/stock/importation/sources - Source management (create/edit)

2.2 Main Component: Importation Manager
File: components/admin/stock/importation-manager.tsx

Tabs for "Sources" and "Product Linking"
Manages state for importation data, forms, and UI

2.3 Source Management Component
File: components/admin/stock/source-manager.tsx

Two buttons: "Add Importer" | "Add Supplier"
Forms for each source type (conditionally rendered)
Importer fields: Company Name, Country, Contact Person, Phone, Comment
Supplier fields: Company Name, Location, Contact Person, Phone, Comment
Table/list display of saved sources
Edit/Delete actions for each source

2.4 Product-Manufacturer Linking Component
File: components/admin/stock/product-manufacturer-linking.tsx

Search/select product from dropdown
"Action" button → "Update Manufacturer"
Dropdown to select manufacturer from saved sources
Save button with validation
Display current manufacturer (if any)


Phase 3: UI/UX Integration
3.1 Navigation Update

Update components/admin/sidebar.tsx
Add IMPORTATION menu item under INVENTORY MANAGER section
Use appropriate icon (Package or Box icon)

3.2 Styling & Branding

Use existing Tailwind + shadcn/ui components
Apply company branding colors from theme provider
Use Card, Button, Input, Select, Dialog components
Consistent spacing and typography

3.3 Form Interactions

Source Type toggle buttons (Importer/Supplier)
Dynamic field rendering based on source type
Validation for required fields
Toast notifications for success/error states
Form reset after submission


Phase 4: Data Flow
Flow 1: Create Source
User clicks "Add Importer" → Form opens → Fills Company Name, Country, Contact Person, Phone, Comment → Clicks Save → API POST → Success toast → Table updates → Form clears
Flow 2: Update Product Manufacturer
Admin selects product → Clicks "Action" → Chooses "Update Manufacturer" → Dropdown shows all sources → Selects manufacturer → Clicks Save → API PUT → Success toast → Page refreshes

Key Constraints

Multi-tenancy: All queries must include org_id isolation
Branding: Use dynamic colors from useTheme() or CSS variables
Validation: Client-side for UX, server-side for security
Error Handling: Toast notifications for all API responses
Accessibility: Proper labels, ARIA attributes, keyboard navigation


Files to Create

/server/models/ImportationSource.ts - Mongoose model
/server/src/controllers/importationController.ts - Backend API logic
/server/src/routes/importation.routes.ts - API routes
/app/admin/stock/importation/page.tsx - Main page
/components/admin/stock/importation-manager.tsx - Main manager component
/components/admin/stock/source-manager.tsx - Source creation/editing
/components/admin/stock/product-manufacturer-linking.tsx - Product linking

Files to Update

/components/admin/sidebar.tsx - Add navigation link
/server/models/Product.ts - Add manufacturerId field
/server/src/controllers/stockController.ts - Update product endpoints
/server/src/routes/stock.routes.ts - Add new routes


Priority Order

Create MongoDB models and API endpoints (Phase 1)
Create source management component (Phase 2)
Add navigation link (Phase 3)
Create product-manufacturer linking component (Phase 2)
Test and refine UI/UX