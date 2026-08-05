# WMS System Architecture - Visual Diagrams

## 1. Current Architecture (Broken)

```
┌─────────────────────────────────────────────────────────────────┐
│                        WMS PAGE                                 │
│                   /admin/stock/wms                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   StockManagerContent                           │
│              (Main Stock Management Component)                  │
│                                                                 │
│  ✅ Manages: Categories, Products, Inventory, Sales, Analytics │
│                                                                 │
│  For WMS View (line 4133-4139):                                │
│  ├─ ✅ Passes: branches, products, warehouseLocations         │
│  ├─ ❌ Missing: warehouse selection UI                         │
│  ├─ ❌ Missing: onSave prop handler                           │
│  └─ ❌ Missing: warehouse list state                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WarehouseManagement                          │
│                    (= WarehouseCanvas)                          │
│                                                                 │
│  ✅ Expects Props:                                              │
│     - warehouse?: Warehouse (MISSING)                           │
│     - initialObjects?: CanvasObject[] (not used)               │
│     - products?: Product[] (✅ passed)                         │
│     - onSave?: (objects) => void (MISSING)                    │
│                                                                 │
│  ❌ Actually Receives Props:                                    │
│     - branches (unused)                                         │
│     - products (✅ good)                                        │
│     - warehouseLocations (unused)                              │
│     - onRefreshLocations (unused)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   CANVAS COMPONENT UI                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Header: [Icon] Warehouse › Layout › Main floor          │  │
│  │         [Search] [Mode] [Zoom] [SAVE BUTTON]            │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  LEFT PANEL │  │   CANVAS (MAIN)  │  │  RIGHT PANEL    │  │
│  │             │  │                  │  │                 │  │
│  │  Tools:     │  │  [Drawing Area]  │  │ Properties:     │  │
│  │  ├─ Pointer │  │                  │  │ ├─ Label        │  │
│  │  ├─ Hand    │  │  Objects:        │  │ ├─ Position     │  │
│  │  └─ Delete  │  │  ├─ Walls        │  │ ├─ Size         │  │
│  │             │  │  ├─ Zones        │  │ ├─ Color        │  │
│  │  Areas:     │  │  ├─ Aisles       │  │ ├─ Product Link │  │
│  │  ├─ Zone    │  │  ├─ Shelves      │  │ └─ Lock         │  │
│  │  ├─ Wall    │  │  ├─ Bins         │  │                 │  │
│  │  ├─ Door    │  │  └─ Racks        │  │ Stats:          │  │
│  │  └─ ...     │  │                  │  │ ├─ Total: X     │  │
│  │             │  │ Zoom: 100%       │  │ ├─ Zones: X     │  │
│  │  Storage:   │  │ Grid: ON         │  │ └─ Bins: X      │  │
│  │  ├─ Rack    │  │ Pan: Ready       │  │                 │  │
│  │  ├─ Shelf   │  │                  │  │ Mode: Operations│  │
│  │  └─ Bin     │  │                  │  │                 │  │
│  └─────────────┘  └──────────────────┘  └─────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ Footer: [V]select [H]pan [G]grid [Del]delete            │  │
│  │        Status: Designed X objects                        │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                        CLICK "SAVE"
                              │
                              ▼
                    handleSave() function
                   (Line 1149-1152)
                              │
                              ▼
                    onSave?.(objects)
                   (Callback undefined!)
                              │
                              ▼
                    🔴 NO API CALL 🔴
                              │
                              ▼
                    Database: Unchanged
                              │
                              ▼
                    User refreshes page
                              │
                              ▼
                    🔴 Design lost 🔴
```

---

## 2. Required Architecture (Fixed)

```
┌─────────────────────────────────────────────────────────────────┐
│                        WMS PAGE                                 │
│                   /admin/stock/wms                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   StockManagerContent                           │
│              (Main Stock Management Component)                  │
│                                                                 │
│  STATE:                                                         │
│  ├─ [NEW] selectedWarehouseId                                 │
│  ├─ [NEW] warehouses[]                                        │
│  └─ [EXISTING] products, branches, etc.                       │
│                                                                 │
│  EFFECT (on mount):                                            │
│  ├─ fetch /api/stock/warehouses → setWarehouses()            │
│  ├─ fetch /api/stock/products → setProducts()                │
│  └─ fetch /api/stock/branches → setBranches()                │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
    [CREATE]            [SELECTOR]          [REFRESH]
    Warehouse           Dropdown            Locations
    Button              Warehouse A
                       Warehouse B
                       Warehouse C
        │                     │                     │
        ▼                     ▼                     ▼
    Dialog Form         setSelectedWarehouse   fetchAll()
    Opens              Updated
        │
        ▼
    User Submits
        │
        ▼
    fetch POST /api/stock/warehouses
        │
        ▼
    Warehouse Created
        │
        ▼
    Re-fetch list
        │
        ▼
    selectedWarehouse = selectedWarehouses.find()
        │
        ▼
        └──────────────────────┬──────────────────────┘
                              │
                              ▼
                    {selectedWarehouse ? (
                    ├─ ✅ warehouse={selectedWarehouse}
                    ├─ ✅ products={products}
                    ├─ ✅ onSave={fetchAll}
                    └─ ✅ onRefreshLocations={fetchAll}
                    ) : (
                    └─ "Select a warehouse..."
                    )}
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WarehouseManagement                          │
│                    (WarehouseCanvas)                            │
│                                                                 │
│  INIT:                                                          │
│  ├─ warehouse.layoutObjects loaded                            │
│  ├─ products list available                                    │
│  └─ objects state = warehouse.layoutObjects OR defaults       │
│                                                                 │
│  useEffect(() => {                                             │
│    if (warehouse?.layoutObjects?.length) {                    │
│      setObjects(warehouse.layoutObjects)  ✅ LOAD SAVED       │
│    }                                                            │
│  }, [warehouse])                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                        CANVAS UI
                       (Same as before)
                              │
                              ▼
                        USER EDITS
                         OBJECTS
                              │
                              ▼
                    CLICK "SAVE" BUTTON
                              │
                              ▼
                    handleSave() function
                    (FIXED - now with API)
                              │
                              ▼
                    const response = await fetch(
                    `/api/stock/warehouses/${warehouse._id}`, {
                      method: "PUT",
                      body: JSON.stringify({
                        layoutObjects: objects
                      })
                    })
                              │
                              ▼
        ┌─────────────────────┴──────────────────────┐
        │                                            │
        ▼                                            ▼
    API CALL SUCCEEDS                        API CALL FAILS
        │                                            │
        ▼                                            ▼
    result.success === true                    error handling
        │                                            │
        ▼                                            ▼
    ✅ setSavedAt(now)                    ❌ console.error()
    ✅ Toast: "Saved at 3:45 PM"          ❌ Toast: "Save failed"
    ✅ onSave?.(objects) [fetchAll]       (retry or dismiss)
        │
        ▼
    MongoDB Updated:
    Warehouse {
      _id: "abc123",
      layoutObjects: [
        {id, type, x, y, width, height, ...}
      ]
    }
        │
        ▼
    ✅ USER REFRESHES PAGE
        │
        ▼
    ✅ WAREHOUSE RELOADED
        │
        ▼
    ✅ DESIGN PERSISTED ✅
```

---

## 3. Data Models Relationship

### Current (Disconnected):

```
┌──────────────────────┐           ┌──────────────────────┐
│  Warehouse (DB)      │           │  Canvas Objects (UI) │
│                      │           │                      │
│ _id: "123"           │           │ Objects = []         │
│ name: "Main"         │           │                      │
│ rows: 10             │           │ CanvasObject[] {     │
│ cols: 10             │           │   id, type, x, y,    │
│ layoutObjects: [     │           │   width, height,     │
│   {                  │───────X───│   label, color,      │
│     id, type,        │  NO SYNC  │   meta?.productId    │
│     x, y, w, h,      │───────X───│ }                    │
│     label, color,    │           │                      │
│     meta?.product    │           │ ← Never Saved Back   │
│   }                  │           │                      │
│ ]                    │           │                      │
└──────────────────────┘           └──────────────────────┘

        ↓                                    ↓
   
   StockLocation              Never synced with
   (separate system)          Canvas objects
   
   branchId: "123"
   name: "Bin A01"
   code: "A-1"
   x, y, width, height
   
   └─ Created by automatic grid generation
      (rows × cols matrix)
      NOT from canvas design
```

### Required (Unified):

```
┌─────────────────────────────────────────────────────────────┐
│ Warehouse (Master Record)                                   │
│                                                             │
│ _id: "123"                                                  │
│ name: "Main Warehouse"                                      │
│ layoutObjects: CanvasObject[] {                            │
│   ├─ Zone A (x:0, y:0, w:30, h:30)                        │
│   │  └─ meta: {type: "zone"}                              │
│   │                                                        │
│   ├─ Aisle 01 (x:5, y:5, w:20, h:20)                     │
│   │  └─ meta: {type: "aisle", parentId: "zone-a"}        │
│   │                                                        │
│   ├─ Shelf A (x:8, y:8, w:10, h:10)                      │
│   │  └─ meta: {type: "shelf", parentId: "aisle-01"}      │
│   │                                                        │
│   └─ Bin 001 (x:9, y:9, w:3, h:3)                        │
│      └─ meta: {type: "bin", parentId: "shelf-a"}         │
│                                                             │
│ createdAt, updatedAt                                        │
└─────────────────────────────────────────────────────────────┘
           │
           │ (extract bins/locations)
           ▼
┌─────────────────────────────────────────────────────────────┐
│ StockLocation (Synced from Canvas)                         │
│                                                             │
│ branchId: "123" (FK to Warehouse._id)                      │
│ name: "Bin 001"                                            │
│ code: "A-1-001"                                            │
│ locationType: "bin"                                        │
│ parentId: "shelf-a" (hierarchical)                        │
│ x, y, width, height (from canvas)                         │
│                                                             │
│ ← ONE RECORD PER CANVAS BIN                                │
└─────────────────────────────────────────────────────────────┘
           │
           ├─ FK: branchId → Warehouse._id
           │
           └─ (1-to-many) ────┐
                               ▼
                   ┌─────────────────────┐
                   │ StockProductLocation│
                   │                     │
                   │ productId: "456"    │
                   │ locationId: "loc-1" │
                   │ quantity: 50        │
                   │                     │
                   │ ← LINKS Product to  │
                   │   Bin Location      │
                   └─────────────────────┘
```

---

## 4. Data Flow: Save Operation (Fixed)

```
TIME ──────────────────────────────────────────────────────→

User modifies canvas
    │
    │ objects state = [... modified objects ...]
    │
    ▼
Click "Save" Button
    │
    │ onClick → handleSave()
    │
    ▼
VALIDATE warehouse._id exists
    │
    ├─ ✅ ID found → continue
    │
    └─ ❌ No ID → error, exit
    │
    ▼
BUILD REQUEST
    │
    │ Method: PUT
    │ URL: /api/stock/warehouses/123
    │ Headers: Content-Type: application/json
    │          Authorization: Bearer token
    │ Body: {
    │   layoutObjects: [
    │     {id, type, x, y, width, height, ...},
    │     {id, type, x, y, width, height, ...}
    │   ]
    │ }
    │
    ▼
SEND TO SERVER
    │
    │ fetch(...) ────────────────────────────────┐
    │                                           │
    │                                           │
    ▼ (Client waits...)                   (Server processing...)
    │                                           │
    │                                      ▼   │
    │                           WarehouseController.updateWarehouse()
    │                                           │
    │                                      ▼   │
    │                           VALIDATE org_id, warehouseId
    │                                           │
    │                                      ▼   │
    │                           VALIDATE layoutObjects structure
    │                                           │
    │                                      ▼   │
    │                           Warehouse.findOneAndUpdate({
    │                             _id: "123",
    │                             org_id: "org1"
    │                           }, {
    │                             $set: {layoutObjects: [...]}
    │                           })
    │                                           │
    │                                      ▼   │
    │                           MongoDB saves document
    │                                           │
    │                                      ▼   │
    │                           Return: {
    │                             success: true,
    │                             data: updatedWarehouse
    │                           }
    │                                           │
    │◄────────────────────────────────────────────┘
    │
    ▼
RECEIVE RESPONSE
    │
    ├─ response.ok → continue
    │
    └─ response.error → errorHandler()
    │
    ▼
PARSE JSON
    │
    │ const result = await response.json()
    │
    ▼
CHECK SUCCESS
    │
    ├─ ✅ result.success === true
    │   │
    │   ├─ setSavedAt(new Date())
    │   │
    │   ├─ onSave?.(objects) [calls fetchAll if parent provided]
    │   │
    │   └─ Toast: "✓ Saved at 3:45 PM"
    │
    └─ ❌ result.success === false
        │
        ├─ console.error(result.message)
        │
        └─ Toast: "✗ Save failed: {message}"
    │
    ▼
USER SEES FEEDBACK
    │
    ├─ Success: Green toast + timestamp displayed
    │
    └─ Error: Red toast + error message


REFRESH PAGE
    │
    ▼
StockManagerContent fetchAll()
    │
    ├─ GET /api/stock/warehouses → state updated
    │
    └─ select warehouse by id
    │
    ▼
WarehouseCanvas mounts
    │
    │ useEffect(() => {
    │   if (warehouse?.layoutObjects?.length) {
    │     setObjects(warehouse.layoutObjects) ✅ LOADED FROM DB
    │   }
    │ }, [warehouse])
    │
    ▼
CANVAS REDRAWS WITH SAVED LAYOUT ✅
    │
    ▼
✅ PERSISTENCE VERIFIED ✅
```

---

## 5. Component Dependency Tree

```
App (Next.js)
├── page.tsx (/admin/stock/wms)
│   └── StockManagerContent
│       ├── [Fetch hooks]
│       │   ├── fetchAll() ← Loads all data
│       │   │   ├── GET /api/stock/categories
│       │   │   ├── GET /api/stock/products
│       │   │   ├── GET /api/stock/warehouses ← WMS Specific
│       │   │   ├── GET /api/stock/branches
│       │   │   ├── GET /api/stock/sales
│       │   │   └── GET /api/stock/entries
│       │   │
│       │   └── [View Routes]
│       │       ├── view === "add-inventory"
│       │       ├── view === "sales"
│       │       ├── view === "status"
│       │       ├── view === "analytics"
│       │       ├── view === "history"
│       │       ├── view === "outsourced"
│       │       ├── view === "services"
│       │       │
│       │       └── view === "wms" ← OUR FOCUS
│       │           │
│       │           ├─ [NEW] Warehouse Selector Dropdown
│       │           │   ├─ List warehouses[]
│       │           │   ├─ Select warehouse
│       │           │   └─ setState(selectedWarehouseId)
│       │           │
│       │           ├─ [NEW] Create Warehouse Button
│       │           │   └─ CreateWarehouseDialog
│       │           │       ├─ POST /api/stock/warehouses
│       │           │       └─ refresh on success
│       │           │
│       │           └─ WarehouseManagement
│       │               (dynamic import, ssr: false)
│       │               │
│       │               ├── Receives:
│       │               │   ├─ warehouse (selected warehouse)
│       │               │   ├─ products
│       │               │   ├─ onSave (callback to refresh)
│       │               │   └─ onRefreshLocations
│       │               │
│       │               └── WarehouseCanvas component
│       │                   ├── Canvas State
│       │                   │   ├─ objects[]
│       │                   │   ├─ selected
│       │                   │   ├─ activeTool
│       │                   │   ├─ viewport
│       │                   │   └─ mode
│       │                   │
│       │                   ├── Render:
│       │                   │   ├─ Header
│       │                   │   │   ├─ Warehouse name
│       │                   │   │   ├─ Search
│       │                   │   │   ├─ Mode toggle
│       │                   │   │   ├─ Zoom
│       │                   │   │   └─ SAVE BUTTON
│       │                   │   │       └─ handleSave() ✅ FIXED
│       │                   │   │           └─ PUT /api/stock/warehouses/:id
│       │                   │   │
│       │                   │   ├─ Left Panel
│       │                   │   │   └─ Tool Palette
│       │                   │   │
│       │                   │   ├─ Main Canvas
│       │                   │   │   └─ CanvasObjects rendered
│       │                   │   │
│       │                   │   ├─ Right Panel
│       │                   │   │   └─ PropertyPanel
│       │                   │   │
│       │                   │   ├─ MiniMap
│       │                   │   └─ FloatingToolbar
│       │                   │
│       │                   └── Event Handlers
│       │                       ├─ handleSave() ← PRIMARY FIX
│       │                       ├─ handleObjMouseDown()
│       │                       ├─ canvasMouseMove()
│       │                       ├─ canvasMouseUp()
│       │                       ├─ updateObj()
│       │                       ├─ deleteObj()
│       │                       └─ duplicateObj()
│       │
│       └── [Rest of Stock Management Tabs]
│           ├── Products Manager
│           ├── Categories Manager
│           ├── Sales Tracking
│           ├── Analytics
│           └── etc.
│
└── [Other Routes...]
```

---

## 6. API Integration Points

```
╔══════════════════════════════════════════════════════════════╗
║                    API ENDPOINTS MAP                         ║
╚══════════════════════════════════════════════════════════════╝

WAREHOUSE MANAGEMENT
│
├─ POST /api/stock/warehouses
│  ├─ Request: {name, description, rows, cols, cellPrefix}
│  ├─ Response: {success, data: warehouse}
│  └─ Frontend: CreateWarehouseDialog → fetchAll()
│
├─ GET /api/stock/warehouses ✅
│  ├─ Response: {success, data: warehouse[]}
│  └─ Frontend: StockManagerContent.fetchAll()
│
├─ PUT /api/stock/warehouses/:id ← PRIMARY INTEGRATION
│  ├─ Request: {layoutObjects, name, description, ...}
│  ├─ Response: {success, data: updatedWarehouse}
│  └─ Frontend: WarehouseCanvas.handleSave() ✅ FIXED
│
├─ GET /api/stock/warehouses/:id/locations ✅
│  ├─ Response: {success, data: stockLocation[]}
│  └─ Backend: Returns StockLocation records
│
└─ POST /api/stock/warehouses/:id/logo
   └─ Background image upload


PRODUCT LOCATION ASSIGNMENT
│
├─ POST /api/stock/products/:id/locations
│  ├─ Request: {locationId, quantity, notes}
│  ├─ Response: {success, data: productLocation}
│  └─ Creates StockProductLocation junction record
│
└─ GET /api/stock/products/:id/locations
   ├─ Response: {success, data: [{productLocation, location}]}
   └─ Returns product's storage locations with details


SUPPORTING QUERIES
│
├─ GET /api/stock/categories → categories[]
├─ GET /api/stock/products → products[]
├─ GET /api/stock/branches → branches[]
└─ GET /api/stock/inventory → inventory[]
```

---

## 7. State Management Flow

```
INITIAL LOAD
    │
    ▼
StockManagerContent mounts
    │
    ├─ useEffect(() => { fetchAll() }, [])
    │
    ▼
fetchAll() executes
    │
    ├─ setLoading(true)
    │
    ├─ Parallel fetch:
    │  ├─ GET /api/stock/warehouses
    │  │  └─ setWarehouses(data)
    │  ├─ GET /api/stock/products
    │  │  └─ setProducts(data)
    │  ├─ GET /api/stock/branches
    │  │  └─ setBranches(data)
    │  └─ ... other endpoints
    │
    ├─ setLoading(false)
    │
    ▼
COMPONENT RENDERS
    │
    ├─ view === "wms" ?
    │
    ▼ YES
    │
    ├─ [Warehouse Selector Dropdown]
    │  ├─ options = warehouses.map(w => <option>{w.name}</option>)
    │  └─ onChange → setSelectedWarehouseId(value)
    │
    ├─ selectedWarehouse = warehouses.find(w => w._id === selectedWarehouseId)
    │
    ▼
USER SELECTS WAREHOUSE
    │
    └─ setSelectedWarehouseId("warehouse-123")
       │
       └─ WarehouseCanvas receives warehouse prop update
           │
           └─ useEffect(() => {
               setObjects(warehouse.layoutObjects || defaults)
              }, [warehouse])
              │
              └─ Canvas re-renders with loaded design
    │
    ▼
USER EDITS ON CANVAS
    │
    ├─ Mouse events trigger state updates
    │
    ├─ setObjects([...modified objects...])
    │
    └─ Canvas re-renders in real-time
    │
    ▼
USER CLICKS SAVE
    │
    └─ handleSave()
       │
       ├─ Validate warehouse._id
       │
       ├─ PUT /api/stock/warehouses/warehouse-123
       │  └─ body: {layoutObjects: objects}
       │
       ├─ AWS response
       │
       └─ On success:
           ├─ setSavedAt(now)
           ├─ onSave?.(objects) → fetchAll()
           │   │
           │   └─ Re-fetch warehouses to confirm save
           │
           └─ Toast: "Saved at 3:45 PM"
    │
    ▼
VERIFICATION (optional but recommended)
    │
    └─ User presses Refresh
        │
        └─ StockManagerContent.fetchAll() runs again
            │
            ├─ GET /api/stock/warehouses
            │  └─ selectedWarehouse now has updated layoutObjects
            │
            └─ WarehouseCanvas useEffect detects warehouse change
                │
                └─ setObjects(warehouse.layoutObjects)
                    │
                    └─ ✅ Design restored from database
```

---

## 8. Error Handling Flow

```
USER CLICKS SAVE
    │
    ▼
handleSave() executes
    │
    ├─ if (!warehouse?._id) {
    │     console.error("No warehouse selected")
    │     return  ← EXIT
    │  }
    │
    ▼
try {
    │
    ├─ const response = await fetch(...)
    │
    ├─ if (!response.ok)
    │  └─ throw new Error("Network error")  ← CATCH BELOW
    │
    ├─ const result = await response.json()
    │
    ├─ if (!result.success)
    │  └─ console.error("API error:", result.message)
    │     Toast: "Save failed: {result.message}"
    │
    └─ setSavedAt(now)
       Toast: "Saved at 3:45 PM" ✅
│
└─ catch (error) {
     console.error("Save error:", error)
     Toast: "Failed to save warehouse"
     // Optional: show retry button
  }
```

---

This comprehensive visual documentation shows:
- Current broken architecture
- Required fixed architecture  
- Data model relationships
- Complete save operation flow
- Component dependency tree
- API integration points
- State management
- Error handling

Together with the other documents, this should provide complete clarity on the WMS system state and how to fix it.
