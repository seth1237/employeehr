# Branding Settings - Data Flow & Architecture

## Complete Save & Apply Flow

```
USER CHANGES BRANDING
        ↓
    [Form State Updates]
   (React useState hooks)
        ↓
   User Clicks "Save Changes"
        ↓
  saveBranding() function
        ↓
  api.company.updateBranding({...all 24 fields...})
        ↓
   [API Client - lib/api.ts]
   - Accepts all 24 fields
   - Sends POST to /api/company/branding
   - Includes FormData if logo file present
        ↓
   [Backend - Express Server]
   - Route: POST /api/company/branding
   - Middleware: authMiddleware, orgMiddleware, roleMiddleware
   - Handler: CompanyController.updateBranding()
   - Validates all 24 fields
   - Saves to MongoDB
   - Returns complete document with all 24 fields
        ↓
   [API Response Received]
   - res.data contains all 24 branding fields
   - res.success = true
        ↓
   [Frontend Processing]
   1. Log success to console
   2. Update React state with res.data values
   3. Update logo display
   4. Call applyCssVarsFromApi(res.data) ← KEY FIX
        ↓
  applyCssVarsFromApi(brandingData)
        ↓
  Extract all 24 values from brandingData object
        ↓
  For each of 24 fields:
    - Set CSS variable on document.documentElement
    - Set corresponding style properties
        ↓
  Example: Primary Color
    - document.documentElement.style.setProperty("--brand-primary", "#FF0000")
    - document.documentElement.style.setProperty("--primary", "#FF0000")
        ↓
  [CSS Variables Now Active]
  <html style="--brand-primary: #FF0000; --primary: #FF0000; ...">
        ↓
  [UI Updates Immediately]
  All elements using var(--brand-primary) show new color
        ↓
  Success Toast Shown
  "✓ Branding saved successfully! All changes have been applied."
        ↓
  COMPLETE ✅
```

## The Fix Explained

### BEFORE (Broken):
```
saveBranding()
    ↓
Save to database ✅
    ↓
Try to call applyCssVars()
    ↓
Function doesn't exist ❌
    OR
    ↓
Call applyCssVarsFromApi(pc, sc, ac, bgc, tc, br, logo)
    ↓
Function tries to use closure variables
(glassOpacity, buttonShadow, etc.)
    ↓
Those variables not in function scope ❌
    ↓
CSS vars either not applied or partially applied ❌
```

### AFTER (Fixed):
```
saveBranding()
    ↓
Save to database ✅
    ↓
Get res.data with all 24 fields ✅
    ↓
Call applyCssVarsFromApi(res.data) ✅
    ↓
Function extracts all 24 values directly from parameter
    ↓
All CSS variables properly set ✅
    ↓
UI updates immediately ✅
```

## Component Architecture

```
┌─────────────────────────────────────────────────────┐
│        CompanySettingsPage                          │
│        (app/admin/settings/company/page.tsx)       │
├─────────────────────────────────────────────────────┤
│                                                      │
│  State (24 fields):                                 │
│  ├─ primaryColor, secondaryColor, accentColor      │
│  ├─ backgroundColor, textColor, borderRadius       │
│  ├─ fontFamily, buttonStyle, logo                  │
│  ├─ glassEnabled, glassOpacity, glassBlur          │
│  ├─ glassTint, buttonShadow, hoverAnimation        │
│  ├─ buttonGradient, glowEffect, transparency       │
│  ├─ rippleEffect, animationSpeed                   │
│  ├─ cardStyle, sidebarStyle, borderStyle           │
│  ├─ cornerStyle, pageBackground, iconStyle         │
│  └─ buttonSize, buttonPadding, navigationAnimation │
│     themePreset                                     │
│                                                      │
│  Functions:                                         │
│  ├─ loadBranding()       → Loads from API         │
│  │   └─ applyCssVarsFromApi(res.data)             │
│  │       └─ Sets all 24 CSS variables on <html>   │
│  │                                                  │
│  ├─ saveBranding()       → Saves to API           │
│  │   └─ api.company.updateBranding({...})         │
│  │       └─ Updates state from response           │
│  │           └─ applyCssVarsFromApi(res.data)     │
│  │               └─ Sets all 24 CSS variables     │
│  │                                                  │
│  ├─ onLogoFile()         → Handle file upload     │
│  │   └─ Preview image                              │
│  │                                                  │
│  └─ applyCssVarsFromApi(brandingData)             │
│      └─ Sets document.documentElement.style        │
│          for all 24 CSS variables                  │
│                                                      │
│  UI Components:                                     │
│  ├─ Basic Branding Section (8 fields)              │
│  │   ├─ Logo upload                                │
│  │   ├─ Color pickers (primary, secondary, etc)   │
│  │   ├─ Font family selector                       │
│  │   └─ Button style selector                      │
│  │                                                  │
│  ├─ Advanced Branding Settings                     │
│  │   ├─ Glass Effect (4 fields)                   │
│  │   ├─ Buttons (3 fields)                         │
│  │   ├─ Effects (3 fields)                         │
│  │   ├─ Components (2 fields)                      │
│  │   ├─ Sizing (2 fields)                          │
│  │   ├─ Animations (2 fields)                      │
│  │   └─ Other (2 fields)                           │
│  │                                                  │
│  └─ Departments & KPIs (collapsible sections)     │
│                                                      │
└─────────────────────────────────────────────────────┘
         ↓
  Passes props to AdvancedBrandingSettings component
  (receives all 24 setters)
```

## Data Flow from Database to UI

```
MongoDB Company Document
┌─────────────────────────────────────┐
│  {                                  │
│    _id: "...",                      │
│    primaryColor: "#FF0000",         │
│    secondaryColor: "#059669",       │
│    ... (all 24 fields)              │
│    updatedAt: "2024-01-01T..."      │
│  }                                  │
└─────────────────────────────────────┘
         ↓ GET /api/company/branding
    [Backend Controller]
         ↓ Validates, builds response
    [API Response]
         ↓ 
┌─────────────────────────────────────┐
│  {                                  │
│    success: true,                   │
│    data: {                          │
│      primaryColor: "#FF0000",       │
│      ... (all 24 fields)            │
│      logo: "https://..."            │
│    }                                │
│  }                                  │
└─────────────────────────────────────┘
         ↓ Frontend receives
    [loadBranding / saveBranding]
         ↓
  React setState for each field
         ↓
  applyCssVarsFromApi(res.data)
         ↓
┌─────────────────────────────────────────────────┐
│  document.documentElement.style                 │
│  ┌────────────────────────────────────────────┐ │
│  │ --brand-primary: #FF0000                   │ │
│  │ --primary: #FF0000                         │ │
│  │ --brand-secondary: #059669                 │ │
│  │ ... (all 24 CSS variables)                 │ │
│  │                                             │ │
│  │ Also direct styles:                         │ │
│  │ backgroundColor: "#FF0000"                  │ │
│  │ fontFamily: "system-ui"                     │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
         ↓
  Browser renders with CSS variables
         ↓
┌─────────────────────────────────────┐
│  All UI using var(--brand-primary)  │
│  now displays #FF0000                │
│                                      │
│  All UI using --fontFamily applied   │
│                                      │
│  All 24 advanced effects applied     │
└─────────────────────────────────────┘
```

## CSS Variable Application Detailed

```
For each of 24 branding fields:

1. primaryColor → #FF0000
   ├─ document.documentElement.style.setProperty("--brand-primary", "#FF0000")
   └─ document.documentElement.style.setProperty("--primary", "#FF0000")

2. fontFamily → "Georgia, serif"
   ├─ document.documentElement.style.setProperty("--brand-font", "Georgia, serif")
   └─ document.documentElement.style.fontFamily = "Georgia, serif"

3. glassOpacity → 50
   └─ document.documentElement.style.setProperty("--glass-opacity", "50%")

4. animationSpeed → "slow"
   ├─ speed maps to "0.5s"
   └─ document.documentElement.style.setProperty("--animation-duration", "0.5s")

... (and 20 more variables)

Result:
<html style="
  --brand-primary: #FF0000;
  --primary: #FF0000;
  --brand-secondary: #059669;
  --brand-accent: #f59e0b;
  --accent: #f59e0b;
  --brand-background: #ffffff;
  --brand-text: #1f2937;
  --brand-font: Georgia, serif;
  --brand-radius: 0.5rem;
  --glass-opacity: 50%;
  --animation-duration: 0.5s;
  ... (and 13 more)
" style="fontFamily: Georgia, serif; backgroundColor: #ffffff; ...">
```

## Error Prevention

```
BEFORE - Multiple Failure Points:

applyCssVarsFromApi(pc, sc, ac, bgc, tc, br, logo)
    ↓
Function uses closure variable: glassOpacity
    ↓
But glassOpacity not defined in function scope
    ↓
Undefined value used
    ↓
CSS variable not set or set to "undefined"
    ↓
UI doesn't update
    ↓
User confused ❌

AFTER - No Failure Points:

applyCssVarsFromApi(brandingData)
    ↓
Extract: glassOpacityVal = brandingData.glassOpacity ?? 15
    ↓
Always has a value (API value or default)
    ↓
CSS variable set correctly
    ↓
UI updates immediately
    ↓
User sees changes ✅
```

## Testing Flow

```
1. User Changes Color to #FF0000
   └─ React state updated: setPrimaryColor("#FF0000")

2. User Clicks "Save Changes"
   └─ saveBranding() called

3. API Request Sent
   └─ POST /api/company/branding with { primaryColor: "#FF0000", ... }

4. Backend Processes
   └─ MongoDB Company.findByIdAndUpdate() with all 24 fields

5. Response Returned
   └─ { success: true, data: { primaryColor: "#FF0000", ...all 24 fields... } }

6. Frontend Processes Response
   ├─ State updated from response
   ├─ applyCssVarsFromApi(res.data) called
   └─ All 24 CSS variables set on <html>

7. Immediate Visual Update
   └─ All elements using var(--brand-primary) show red

8. Toast Success Message
   └─ "✓ Branding saved successfully!"

9. User Hard Refreshes
   ├─ Page loads fresh from server
   ├─ loadBranding() fetches from API
   ├─ applyCssVarsFromApi(res.data) called again
   └─ Color persists ✅
```

This diagram shows that all 24 fields flow correctly from save through to CSS application, with no missing data or scope issues.
