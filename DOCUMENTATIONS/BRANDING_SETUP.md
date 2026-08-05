# Branding System with File Upload Setup Guide

## What Has Been Implemented

### 1. **File Upload with Multer**
- Created `/server/src/middleware/upload.middleware.ts` for handling logo uploads
- Configured to store files in `/server/uploads/logos` directory
- Supports PNG, JPG, SVG, WebP formats (5MB limit)

### 2. **Backend Changes**
- **Routes** (`server/src/routes/company.routes.ts`):
  - Updated POST `/api/company/branding` to accept multipart/form-data with multer
  
- **Controller** (`server/src/controllers/companyController.ts`):
  - `getBranding()`: Returns logo with full URL constructed from filename
  - `updateBranding()`: Handles both file uploads and external logo URLs
  - Saves only filename to database (not base64)

- **Static File Serving** (`server/src/index.ts`):
  - Configured Express to serve `/uploads` directory statically
  - Logo files accessible at: `http://localhost:5010/uploads/logos/{filename}`

### 3. **Frontend Changes**
- **API Client** (`lib/api.ts`):
  - Updated `companyApi.updateBranding()` to detect when file is provided
  - Automatically sends FormData for files, JSON for URL-only updates
  - Handles multipart requests without Content-Type header (browser sets it)

- **Company Settings Page** (`app/admin/settings/company/page.tsx`):
  - Added `logoFile` state to track selected file
  - File input shows preview via DataURL
  - Server response updates logo display with full URL
  - Clears file input after successful save

### 4. **Database**
- Company model stores logo as filename string (e.g., `"logo-1702756200123.png"`)
- All other branding data (colors, fonts, styles) stored in MongoDB
- Persists across all users in the organization

## How to Use

### Start Servers

**Terminal 1 - Backend:**
```bash
cd /home/seth/Documents/deployed/employeehr/server
pnpm dev
# Should print: "Server running on port 5010"
```

**Terminal 2 - Frontend:**
```bash
cd /home/seth/Documents/deployed/employeehr
npm run dev
# Should print: "Ready in X seconds"
```

### Test File Upload

1. **Login as Admin** at `http://localhost:3000`
2. **Navigate** to `/admin/settings/company`
3. **Upload Logo**:
   - Click "Upload Logo" button
   - Select a PNG/JPG/SVG file
   - Preview appears instantly
4. **Change Colors** (optional):
   - Adjust primary, secondary, accent, background colors
   - Change fonts, border radius, etc.
5. **Save**: Click "Save Changes"
   - ✓ File uploaded to `/server/uploads/logos/`
   - ✓ Filename saved to MongoDB
   - ✓ Full URL returned and displayed
   - ✓ All employees see new branding on refresh

### File Structure
```
/server/uploads/
└── logos/
    ├── logo-1702756200123.png
    ├── logo-1702756245567.jpg
    └── ...
```

## API Endpoints

### GET /api/company/branding
Returns current branding for organization:
```json
{
  "success": true,
  "data": {
    "logo": "http://localhost:5010/uploads/logos/logo-1702756200123.png",
    "primaryColor": "#2563eb",
    "secondaryColor": "#059669",
    "accentColor": "#f59e0b",
    "backgroundColor": "#ffffff",
    "textColor": "#1f2937",
    "borderRadius": "0.5rem",
    "fontFamily": "system-ui",
    "buttonStyle": "rounded",
    "name": "Your Company"
  }
}
```

### POST /api/company/branding
**With File Upload** (multipart/form-data):
```
logo: <file>
primaryColor: #2563eb
secondaryColor: #059669
... (other color/style fields)
```

**With URL Only** (application/json):
```json
{
  "logoUrl": "https://external-cdn.com/logo.png",
  "primaryColor": "#2563eb",
  ...
}
```

## Key Features

✅ **Database Persistence**: All branding stored in MongoDB
✅ **Organization-Wide Sync**: All employees see new branding on refresh
✅ **File Storage**: Logos stored on server, not as base64
✅ **Static Serving**: Files accessible via HTTP
✅ **Mixed Uploads**: Support both uploaded files and external URLs
✅ **Type Safety**: Full TypeScript support
✅ **Error Handling**: File validation and error messages
✅ **Performance**: Only filename stored in DB (not image data)

## Testing Persistence

1. **Change branding** in admin panel
2. **Login as employee** in incognito window
3. ✓ New branding appears (fetched from `/api/company/branding`)
4. **Refresh page**
5. ✓ Branding persists (from MongoDB)

## Troubleshooting

**Port Already in Use**:
```bash
lsof -i :5010 | grep node | awk '{print $2}' | xargs kill -9
```

**Missing Uploads Directory**:
- Auto-created on first upload
- Location: `/server/uploads/logos/`

**File Not Showing**:
- Check Network tab in browser DevTools
- Verify file was uploaded: `ls /server/uploads/logos/`
- Confirm DB has filename: `db.companies.findOne()`
