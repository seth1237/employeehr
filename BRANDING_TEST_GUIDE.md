# Branding Settings Fix - Testing Guide

## Quick Test Procedure

### Step 1: Navigate to Branding Settings
1. Go to `http://localhost:3000/admin/settings/company`
2. Page should load with current branding settings

### Step 2: Test Simple Color Change
1. Find the "Primary Color" field
2. Change it from default to `#FF0000` (bright red)
3. The page should immediately update to show red branding elements
4. Click "Save Changes" button
5. **VERIFY**: Toast notification should say: 
   ```
   "✓ Branding saved successfully! All changes have been applied."
   ```

### Step 3: Verify CSS Variables Applied
1. Open Browser DevTools (F12)
2. Go to Elements/Inspector tab
3. Find the `<html>` element (usually at top of DOM tree)
4. Expand it to see the `style` attribute
5. **VERIFY**: Should see something like:
   ```html
   <html style="--brand-primary: #FF0000; --primary: #FF0000; --brand-secondary: #059669; ...">
   ```
6. Specifically look for `--brand-primary: #FF0000`

### Step 4: Verify Persistence
1. **Hard Refresh**: Press `Ctrl+Shift+R` (or Cmd+Shift+R on Mac)
2. Wait for page to reload from server
3. **VERIFY**: 
   - Primary color is still red
   - CSS variables are still in `<html>` style attribute
   - DevTools Console should show (with F12):
     ```
     ✓ Branding saved to database: {...}
     Applying CSS variables from saved branding data
     ✓ CSS variables applied from branding data
     ```

### Step 5: Test Advanced Branding
1. Scroll down to "Advanced Branding Settings"
2. Find "Glass Effect" section
3. Enable it (check the checkbox)
4. Change "Opacity" to 50%
5. Click "Save Changes"
6. **VERIFY**:
   - Toast shows success message
   - In DevTools, check `<html>` for: `--glass-opacity: 50%`
   - Hard refresh should maintain the setting

### Step 6: Test Font Family
1. Find "Basic Branding" section
2. Find "Font Family" selector
3. Change it (try "Georgia, serif" or another option)
4. Click "Save Changes"
5. **VERIFY**:
   - Font on entire page should change
   - CSS variable should show: `--brand-font: <your-choice>`
   - Hard refresh should persist the font

### Step 7: Test Layout Improvements
1. Scroll through the page
2. **VERIFY**:
   - "Departments" section is collapsed by default
   - "Department KPIs" section is collapsed by default
   - Page takes up less vertical scroll
   - Clicking "Toggle" opens/closes sections properly

## Console Debugging

### What You Should See in Console

**On Page Load**:
```javascript
✓ Branding saved to database: {
  _id: "...",
  primaryColor: "#FF0000",
  secondaryColor: "#059669",
  ...all 24 fields...
}
```

**When Saving**:
```javascript
✓ Branding saved to database: {...}
Applying CSS variables from saved branding data
✓ CSS variables applied from branding data
```

### If You See These Errors

**Error**: `applyCssVars is not defined`
- **Issue**: Old code path being used
- **Solution**: Verify you're running the updated code

**Error**: `Cannot set property of undefined`
- **Issue**: CSS variables not applying
- **Solution**: Check browser console for stack trace, verify frontend is updated

**Error**: `Failed to save branding`
- **Issue**: API call failing
- **Solution**: Check Network tab in DevTools, look for POST to `/api/company/branding`

## Network Tab Verification

1. Open DevTools → Network tab
2. Click "Save Changes" button
3. **VERIFY**: A POST request should appear:
   - **URL**: `http://localhost:3000/api/company/branding` (or similar)
   - **Status**: Should be `200 OK`
   - **Response**: Should include `"success": true` and full `data` object with all 24 fields

### Request Payload Should Include:
```json
{
  "primaryColor": "#FF0000",
  "secondaryColor": "#...",
  "accentColor": "#...",
  "backgroundColor": "#...",
  "textColor": "#...",
  "borderRadius": "...",
  "fontFamily": "...",
  "buttonStyle": "...",
  "glassEnabled": true/false,
  "glassOpacity": number,
  "glassBlur": number,
  "glassTint": "...",
  "buttonShadow": "...",
  "hoverAnimation": "...",
  "buttonGradient": true/false,
  "glowEffect": "...",
  "transparency": number,
  "rippleEffect": true/false,
  "animationSpeed": "...",
  "cardStyle": "...",
  "sidebarStyle": "...",
  "borderStyle": "...",
  "cornerStyle": "...",
  "pageBackground": "...",
  "iconStyle": "...",
  "buttonSize": "...",
  "buttonPadding": "...",
  "navigationAnimation": "...",
  "themePreset": "..."
}
```

### Response Payload Should Include:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "primaryColor": "#FF0000",
    "secondaryColor": "#...",
    ...all 24 fields...,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

## Database Verification

If you want to verify the data is actually saved in MongoDB:

```bash
# Connect to MongoDB and check the company document
db.companies.findOne({_id: ObjectId("your-company-id")})
```

Should return a document with all 24 branding fields properly set.

## Complete Verification Checklist

- [ ] Color changes immediately on page
- [ ] Save button triggers API call
- [ ] Success toast notification appears
- [ ] CSS variables visible in `<html>` element
- [ ] Hard refresh maintains branding
- [ ] Console shows all three success messages
- [ ] Advanced branding fields save and persist
- [ ] Font family changes apply
- [ ] Departments section defaults to collapsed
- [ ] Department KPIs section defaults to collapsed
- [ ] Page takes up less scroll (layout improvement)
- [ ] Network request shows 200 status
- [ ] Response includes all 24 fields

## Troubleshooting

### Branding not persisting after refresh
1. Check database - is the data actually being saved?
2. Check if API response includes the data
3. Verify `applyCssVarsFromApi()` is being called with full data object

### CSS variables not showing in `<html>`
1. Check if JavaScript is enabled
2. Verify no CSP (Content Security Policy) restrictions
3. Open console and manually check: `document.documentElement.style.getPropertyValue('--brand-primary')`

### Changes not showing on page
1. CSS variables might not be used in the actual CSS
2. Check if component styles are using `var(--brand-primary)` etc.
3. Look for conflicting inline styles

### Toast notification doesn't appear
1. Check if toast component is properly imported
2. Verify `useToast` hook is available
3. Check browser console for errors

## Performance Notes

All changes should be:
- **Instant**: No delay in visual feedback
- **Synchronous**: No async/await issues
- **Persistent**: Survives page refresh and browser restart
- **Global**: Applied to entire application immediately
