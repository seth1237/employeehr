# Branding Settings - Quick Reference Card

## What Was Fixed

| Issue | Status | Root Cause | Solution |
|-------|--------|-----------|----------|
| CSS variables not applying | ✅ FIXED | Function signature mismatch | Refactored to accept data object |
| Changes not persisting | ✅ FIXED | Calling undefined function | Use new applyCssVarsFromApi() |
| Font family not applied | ✅ FIXED | Not included in function | Added fontFamily extraction & application |
| Advanced branding not saving | ✅ FIXED | Stale closure variables | Use fresh data from API response |
| Layout scrolling too much | ✅ FIXED | Sections defaulting to open | Changed defaultOpen to false |

## Key Changes at a Glance

### File: `app/admin/settings/company/page.tsx`

**Line 201-271**: `applyCssVarsFromApi()` function
```typescript
// BEFORE: function(pc, sc, ac, bgc, tc, br, logo) - only 7 params
// AFTER:  function(brandingData) - entire object
// WHY: All 24 fields now available with proper scope
```

**Line 190**: `loadBranding()` call
```typescript
// BEFORE: applyCssVarsFromApi(res.data.primaryColor, res.data.secondaryColor, ...)
// AFTER:  applyCssVarsFromApi(res.data)
// WHY: Cleaner, all data included
```

**Line 413**: `saveBranding()` CSS application
```typescript
// BEFORE: setTimeout(() => { applyCssVars(); }, 0)
// AFTER:  applyCssVarsFromApi(res.data)
// WHY: Function now exists and properly handles all fields
```

**Line 789**: Departments section
```typescript
// BEFORE: <Collapsible defaultOpen>
// AFTER:  <Collapsible defaultOpen={false}>
// WHY: Reduce vertical scroll, improve UX
```

## Testing Checklist (5 min)

- [ ] Change primary color to #FF0000
- [ ] Save and see success toast
- [ ] Check `<html>` style in DevTools
- [ ] Look for `--brand-primary: #FF0000`
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Color persists? ✅

## Debugging Commands

```javascript
// Check if CSS variable is applied
document.documentElement.style.getPropertyValue('--brand-primary')

// Check all variables
document.documentElement.getAttribute('style')

// Check state from page (if accessible)
window.__debugBranding = {
  primaryColor,
  // ... other state
}
```

## API Endpoints

| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/api/company/branding` | Load current branding |
| POST | `/api/company/branding` | Save branding changes |

Both endpoints return complete object with all 24 fields.

## CSS Variable Map

**Core Colors**:
```css
--brand-primary: <primaryColor>
--primary: <primaryColor>
--brand-secondary: <secondaryColor>
--brand-accent: <accentColor>
--accent: <accentColor>
--brand-background: <backgroundColor>
--brand-text: <textColor>
--background: <backgroundColor>
--foreground: <textColor>
```

**Typography**:
```css
--brand-font: <fontFamily>
--brand-radius: <borderRadius>
--radius: <borderRadius>
```

**Advanced Effects** (all 16 advanced fields set as CSS vars):
```css
--glass-enabled: <0 or 1>
--glass-opacity: <0-100%>
--glass-blur: <0-40px>
--glass-tint: <value>
--button-shadow: <value>
--hover-animation: <value>
--gradient-enabled: <0 or 1>
--glow-effect: <value>
--transparency: <0-40%>
--ripple-enabled: <0 or 1>
--animation-duration: <milliseconds>
--card-style: <value>
--sidebar-style: <value>
--border-style: <value>
--corner-style: <value>
--page-background: <value>
--icon-style: <value>
--button-size: <value>
--button-padding: <value>
--nav-animation: <value>
--theme-preset: <value>
```

## All 24 Fields

1. `primaryColor` - Main brand color
2. `secondaryColor` - Secondary brand color
3. `accentColor` - Accent/highlight color
4. `backgroundColor` - Page background
5. `textColor` - Default text color
6. `borderRadius` - Border radius value
7. `fontFamily` - Font family
8. `buttonStyle` - Button style preset
9. `glassEnabled` - Enable glass morphism
10. `glassOpacity` - Glass opacity (0-100)
11. `glassBlur` - Glass blur (0-40px)
12. `glassTint` - Glass tint color
13. `buttonShadow` - Button shadow style
14. `hoverAnimation` - Hover animation type
15. `buttonGradient` - Enable button gradient
16. `glowEffect` - Glow effect intensity
17. `transparency` - Overall transparency (0-40)
18. `rippleEffect` - Enable ripple effect
19. `animationSpeed` - Global animation speed
20. `cardStyle` - Card component style
21. `sidebarStyle` - Sidebar style
22. `borderStyle` - Border style
23. `cornerStyle` - Corner radius style
24. `pageBackground` - Page background pattern

Plus additional fields: `logo`, `country`, `state`, `city`, `countryCode`

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Changes don't persist | Hard refresh (Ctrl+Shift+R) to clear cache |
| CSS vars not visible | Check Network tab - did API return `success: true`? |
| Color not updating | Check DevTools - is CSS var set on `<html>`? |
| Font not changing | Check if fontFamily value is valid |
| Toast doesn't appear | Check browser console for errors |
| Advanced settings don't save | Ensure all 24 fields included in request |

## Performance Notes

- ✅ No additional API calls
- ✅ CSS variables apply synchronously
- ✅ No render lag
- ✅ All changes are memory-efficient
- ✅ Works with 20+ branding fields without slowdown

## Files Structure

```
employeehr/
├── app/
│   └── admin/settings/company/
│       └── page.tsx                    ← MAIN FILE CHANGED
├── lib/
│   └── api.ts                          ← No changes needed
├── components/admin/
│   └── advanced-branding-settings.tsx  ← No changes needed
└── server/src/
    ├── controllers/
    │   └── companyController.ts        ← No changes needed
    ├── models/
    │   └── Company.ts                  ← Already has all fields
    └── routes/
        └── company.routes.ts           ← No changes needed
```

## Success Indicators

After fix is deployed:
- ✅ Save button works
- ✅ Colors persist through refresh
- ✅ CSS variables visible in DevTools
- ✅ All 24 fields in database
- ✅ No console errors
- ✅ Toast notifications appear
- ✅ Advanced settings apply immediately

## Rollback Plan

If issues occur:
1. Revert `app/admin/settings/company/page.tsx` to previous version
2. Clear browser cache
3. Hard refresh (Ctrl+Shift+R)
4. Check if old behavior restored

(No database rollback needed - data structure unchanged)

## Contact / Issues

If you encounter problems:
1. Check BRANDING_TEST_GUIDE.md for detailed testing
2. Check BRANDING_FLOW_DIAGRAM.md for data flow
3. Check console logs and Network tab
4. Check BRANDING_FIXES_SUMMARY.md for technical details
