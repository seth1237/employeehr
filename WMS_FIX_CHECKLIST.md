# WMS Integration Fix - Implementation Checklist

## Overview
This checklist outlines the exact code changes needed to make the WMS functional. Each item includes file paths, line numbers, and code examples.

---

## ✅ PHASE 1: Connect Canvas to Save API

### 1.1 Fix: Implement Save API Call
**File:** `/components/admin/stock/warehouse-management.tsx`  
**Current Code (Lines 1149-1152):**
```typescript
const handleSave = () => {
  onSave?.(objects);
  setSavedAt(new Date());
};
```

**Required Change:**
```typescript
const handleSave = async () => {
  if (!warehouse?._id) {
    console.error("No warehouse selected");
    return;
  }
  
  try {
    const response = await fetch(`/api/stock/warehouses/${warehouse._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ layoutObjects: objects }),
    });
    
    const result = await response.json();
    if (result.success) {
      setSavedAt(new Date());
      // Call parent callback if provided
      onSave?.(objects);
      // Toast notification (implement if available)
      console.log("✓ Warehouse layout saved");
    } else {
      console.error("Save failed:", result.message);
    }
  } catch (error) {
    console.error("Save error:", error);
    // Show error toast
  }
};
```

**Impact:** ⭐⭐⭐ CRITICAL - Makes designs actually persist

---

## ✅ PHASE 2: Connect Warehouse Selector

### 2.1 Add Warehouse Loading to Stock Manager
**File:** `/components/admin/stock/stock-manager-content.tsx`  
**Location:** Around line 4133-4139

**Add State for Selected Warehouse:**
```typescript
// Add to component state (line ~210-220)
const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
const [warehouses, setWarehouses] = useState([]);

// Add to fetchAll function (line ~358)
const warehousesRes = await fetch("/api/stock/warehouses", { headers });
const warehousesData = await warehousesRes.json();
if (warehousesData.success) {
  setWarehouses(warehousesData.data);
}

// Add selected warehouse lookup
const selectedWarehouse = warehouses.find(w => w._id === selectedWarehouseId);
```

**Update WMS View:**
Replace this (lines 4133-4139):
```typescript
{view === "wms" && (
  <WarehouseManagement
    branches={branches}
    products={products}
    warehouseLocations={warehouseLocations}
    onRefreshLocations={fetchAll}
  />
)}
```

With this:
```typescript
{view === "wms" && (
  <div className="space-y-4">
    {/* Warehouse Selector */}
    <div className="p-4 bg-white rounded-lg border border-slate-200">
      <label className="block text-sm font-medium mb-2">Select Warehouse</label>
      <select
        value={selectedWarehouseId || ""}
        onChange={(e) => setSelectedWarehouseId(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
      >
        <option value="">-- Choose Warehouse --</option>
        {warehouses.map((w) => (
          <option key={w._id} value={w._id}>
            {w.name} ({w.cols}×{w.rows} cells)
          </option>
        ))}
      </select>
    </div>
    
    {/* WMS Canvas */}
    {selectedWarehouse ? (
      <WarehouseManagement
        warehouse={selectedWarehouse}
        products={products}
        warehouseLocations={warehouseLocations}
        onRefreshLocations={fetchAll}
        onSave={fetchAll} // Refresh after save
      />
    ) : (
      <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-500">
        Select a warehouse to begin design
      </div>
    )}
  </div>
)}
```

**Impact:** ⭐⭐⭐ CRITICAL - Users can now load warehouses

---

## ✅ PHASE 3: Update Component Props

### 3.1 Accept Additional Props
**File:** `/components/admin/stock/warehouse-management.tsx`  
**Current (Line 903-913):**
```typescript
export function WarehouseCanvas({
  warehouse,
  initialObjects,
  products = [],
  onSave,
}: {
  warehouse?: Warehouse;
  initialObjects?: CanvasObject[];
  products?: Product[];
  onSave?: (objects: CanvasObject[]) => void;
})
```

**Change To (add these props):**
```typescript
export function WarehouseCanvas({
  warehouse,
  initialObjects,
  products = [],
  onSave,
  warehouseLocations,
  onRefreshLocations,
}: {
  warehouse?: Warehouse;
  initialObjects?: CanvasObject[];
  products?: Product[];
  onSave?: (objects: CanvasObject[]) => void;
  warehouseLocations?: any[];
  onRefreshLocations?: () => void;
})
```

**Impact:** ⭐ MINOR - Makes component signature compatible

---

## ✅ PHASE 4: Add Create Warehouse Form

### 4.1 Create New Modal Component
**File:** Create `/components/admin/stock/create-warehouse-dialog.tsx`

```typescript
import { useState } from "react";

export function CreateWarehouseDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (warehouse: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    rows: 10,
    cols: 10,
    cellPrefix: "",
  });

  const handleCreate = async () => {
    try {
      const response = await fetch("/api/stock/warehouses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (result.success) {
        onCreated(result.data);
        setFormData({ name: "", description: "", rows: 10, cols: 10, cellPrefix: "" });
        onClose();
      }
    } catch (error) {
      console.error("Failed to create warehouse:", error);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Create Warehouse</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Warehouse"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Rows</label>
              <input
                type="number"
                value={formData.rows}
                onChange={(e) => setFormData({ ...formData, rows: Number(e.target.value) })}
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Columns</label>
              <input
                type="number"
                value={formData.cols}
                onChange={(e) => setFormData({ ...formData, cols: Number(e.target.value) })}
                min="1"
                max="50"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Impact:** ⭐⭐ IMPORTANT - Users can create new warehouses

---

### 4.2 Add Dialog to Stock Manager
**File:** `/components/admin/stock/stock-manager-content.tsx`

Add imports and state:
```typescript
import { CreateWarehouseDialog } from "./create-warehouse-dialog";

// Add state (line ~220)
const [showCreateWarehouseDialog, setShowCreateWarehouseDialog] = useState(false);

// In WMS view, add button before selector:
{view === "wms" && (
  <div className="space-y-4">
    <div className="flex gap-2">
      <button
        onClick={() => setShowCreateWarehouseDialog(true)}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        + Create Warehouse
      </button>
    </div>
    
    {/* ... rest of warehouse selector ... */}
  </div>
)}

{/* Dialog */}
<CreateWarehouseDialog
  open={showCreateWarehouseDialog}
  onClose={() => setShowCreateWarehouseDialog(false)}
  onCreated={() => {
    setShowCreateWarehouseDialog(false);
    fetchAll(); // Refresh warehouse list
  }}
/>
```

**Impact:** ⭐⭐ IMPORTANT - Complete user workflow

---

## ✅ PHASE 5: Fix Warehouse Model Type

### 5.1 Strengthen Type Safety
**File:** `/server/src/models/Warehouse.ts`

Current:
```typescript
interface IWarehouse {
  // ...
  layoutObjects?: any[]
}
```

Change to:
```typescript
import type { CanvasObject } from "../types/warehouse";

interface IWarehouse {
  // ...
  layoutObjects?: CanvasObject[]
}
```

Create `/server/src/types/warehouse.ts`:
```typescript
export interface CanvasObject {
  id: string;
  type: "wall" | "door" | "zone" | "rack" | "shelf" | "bin" | "aisle" | "walkway" | "loading-dock" | "office" | "cold-room" | "charging" | "label";
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
  locked?: boolean;
  hidden?: boolean;
  rotation?: number;
  meta?: Record<string, string | number | boolean>;
}
```

**Impact:** ⭐ POLISH - Better type safety

---

## ✅ PHASE 6: Add Validation

### 6.1 Validate Layout Objects
**File:** `/server/src/controllers/warehouseController.ts`

In `updateWarehouse()` method, add validation:
```typescript
static async updateWarehouse(req: AuthenticatedRequest, res: Response) {
  try {
    // ... existing validation ...

    // NEW: Validate layoutObjects
    if (req.body.layoutObjects) {
      const layouts = Array.isArray(req.body.layoutObjects) ? req.body.layoutObjects : [];
      
      for (const obj of layouts) {
        if (!obj.id || !obj.type || typeof obj.x !== "number" || typeof obj.y !== "number") {
          return res.status(400).json({
            success: false,
            message: "Invalid layoutObjects structure",
          });
        }
      }
    }

    // ... rest of update ...
  }
}
```

**Impact:** ⭐ SAFETY - Prevents corrupt data

---

## Testing Checklist

After implementing fixes, verify:

- [ ] User can see warehouse dropdown in WMS view
- [ ] User can click "Create Warehouse" and form appears
- [ ] New warehouse is created and appears in dropdown
- [ ] User can select warehouse and canvas loads
- [ ] User can draw/edit objects on canvas
- [ ] User clicks "Save" and gets success feedback
- [ ] Page refresh shows same layout (data persisted)
- [ ] Products can be attached to bins
- [ ] Network tab shows PUT request to `/api/stock/warehouses/{id}`
- [ ] Response shows `success: true` and updated warehouse

---

## Priority Order

1. **Fix #1 (handleSave API call)** - 30 min - Makes save work
2. **Fix #2 (Warehouse selector)** - 30 min - Loads existing warehouses
3. **Fix #4 (Create warehouse form)** - 45 min - Completes workflow
4. **Fix #3 (Update props)** - 15 min - Compatibility
5. **Fix #5 (Type safety)** - 15 min - Code quality
6. **Fix #6 (Validation)** - 15 min - Data integrity

**Total Estimated Time: ~2.5 hours**

---

## Deployment Notes

After implementing:
1. No database migrations needed (schema already supports layoutObjects)
2. No API changes needed (endpoints already exist)
3. Build and test locally first
4. Monitor browser console for API errors
5. Check network tab for failed requests

---

## Success Indicator

When complete, the user journey should be:

```
1. Click "Create Warehouse" → Form opens
2. Fill in details → Click Create
3. Select warehouse from dropdown
4. Canvas loads previous design (or default if new)
5. Draw on canvas
6. Click Save
7. See "✓ Saved at 3:45 PM" indicator
8. Refresh page → Design still there ✅
```
