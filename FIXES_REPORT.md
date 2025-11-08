# PrintX Fixes Report

## Overview
This document summarizes the fixes applied to the PrintX Next.js application to resolve runtime/compile/CSP/CORS/upload issues and ensure the app works end-to-end with the intended architecture.

## Architecture
- **Static UI on Vercel**: Frontend hosted on Vercel
- **Direct Browser → Apps Script Uploads**: Files uploaded directly from browser to Google Apps Script (bypasses Vercel 4.5MB limit)
- **Vercel API for Metadata Only**: `/api/metadata` endpoint accepts only metadata (no file bytes)

## Files Changed

### 1. `pages/api/metadata.ts` (NEW)
- **Summary**: New API route for accepting order metadata (orderId, total, vpa, filesMeta[])
- **Key Features**:
  - Handles OPTIONS preflight requests with proper CORS headers
  - Rejects requests containing file bytes (returns 400)
  - Validates request body size (4.5MB limit)
  - Returns 413 if metadata exceeds size limit
  - Proper error handling and validation

### 2. `lib/apps-script.ts`
- **Summary**: Updated upload function to use direct Apps Script uploads with chunking
- **Key Changes**:
  - Removed Vercel proxy dependency for file uploads
  - Implemented automatic chunking for large payloads (30MB per chunk)
  - Uses `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` for client-side access
  - Added progress callback support
  - Improved error handling for quota and file size errors
  - Fixed TypeScript errors (replaced `any` with proper types)

### 3. `pages/index.tsx`
- **Summary**: Updated upload flow to use metadata API first, then direct uploads
- **Key Changes**:
  - Generate order ID: `PX-<timestamp>-<4hex>`
  - Step 1: Send metadata to `/api/metadata` (without file bytes)
  - Step 2: Upload files directly to Apps Script (bypasses Vercel)
  - Updated file size limits: 75MB per file, 500MB total, 50 files max
  - Improved error messages with helpful hints
  - Fixed TypeScript errors

### 4. `components/FileUploader.tsx`
- **Summary**: Updated file limits and fixed TypeScript errors
- **Key Changes**:
  - Updated file size limits: 75MB per file, 500MB total
  - Fixed PDF.js render method type errors
  - Removed unused `useEffect` import
  - Updated UI messages to reflect new limits

### 5. `pages/api/proxy-upload.ts`
- **Summary**: Fixed TypeScript errors (replaced `any` with proper types)
- **Note**: This proxy is no longer used for file uploads (files go directly to Apps Script), but kept for potential future use

### 6. `lib/drive.ts`
- **Summary**: Fixed TypeScript errors (replaced `any` with proper types)
- **Key Changes**:
  - Improved error type handling
  - Better quota error detection

### 7. `next.config.ts`
- **Summary**: CSP configuration (already correct, no changes needed)
- **Current CSP**:
  - `script-src 'self' 'unsafe-inline'` (no `unsafe-eval` - PDF.js configured without eval)
  - `worker-src 'self' blob:` (for PDF.js workers)
  - `connect-src 'self' https://script.google.com https://*.googleapis.com` (for Apps Script)

### 8. `scripts/test-metadata.js` (NEW)
- **Summary**: Test script for metadata API endpoint
- **Tests**:
  - OPTIONS preflight request
  - POST with valid metadata
  - POST with file bytes (should be rejected)
  - POST with oversized metadata (should be rejected)

### 9. `.env.local.example` (NEW)
- **Summary**: Example environment variable file
- **Variables**:
  - `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL`: Apps Script Web App URL
  - `ALLOWED_ORIGIN` (optional): Allowed origin for CORS

## Top 5 Errors Encountered and Fixes

### 1. TypeScript Error: `RenderTask` to `Promise<void>` conversion
- **Error**: `Conversion of type 'RenderTask' to type 'Promise<void>' may be a mistake`
- **Fix**: Updated PDF.js render method to use `renderTask.promise` instead of casting
- **File**: `components/FileUploader.tsx`

### 2. TypeScript Error: `FileOptions` to `Record<string, unknown>` conversion
- **Error**: `Index signature for type 'string' is missing in type 'FileOptions'`
- **Fix**: Cast through `unknown` first: `f.options as unknown as Record<string, unknown>`
- **File**: `pages/index.tsx`

### 3. TypeScript Error: `any` type usage
- **Error**: Multiple `Unexpected any` lint errors
- **Fix**: Replaced `any` with proper types (`unknown`, `Record<string, unknown>`, `Error`)
- **Files**: `lib/apps-script.ts`, `lib/drive.ts`, `pages/api/proxy-upload.ts`

### 4. Build Error: Missing `canvas` property in PDF.js render
- **Error**: `Property 'canvas' is missing in type`
- **Fix**: Added `canvas` property to render parameters
- **File**: `components/FileUploader.tsx`

### 5. Architecture Issue: Files going through Vercel proxy (4.5MB limit)
- **Error**: File size limit exceeded errors
- **Fix**: Implemented direct browser → Apps Script uploads with chunking
- **Files**: `lib/apps-script.ts`, `pages/index.tsx`

## Commands to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Environment Variables
Create `.env.local` file:
```bash
NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_APPS_SCRIPT_WEB_APP_ID/exec
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

### 5. Run Linter
```bash
npm run lint
```

### 6. Test Metadata API
```bash
node scripts/test-metadata.js
```

## Environment Variables

### Required
- `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL`: Google Apps Script Web App URL (client-side access)

### Optional
- `ALLOWED_ORIGIN`: Allowed origin for CORS (defaults to `*` if not set)

### Vercel Environment Variables
Set the following in Vercel dashboard:
- `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL`: Your Apps Script Web App URL

## Smoke Test Plan

### 1. Test Metadata API

#### OPTIONS Request (Preflight)
```bash
curl -X OPTIONS http://localhost:3000/api/metadata \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected**: Status 200, CORS headers present

#### POST Request (Valid Metadata)
```bash
curl -X POST http://localhost:3000/api/metadata \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "orderId": "PX-1234567890-abcd",
    "total": 100.50,
    "vpa": "test@bank",
    "filesMeta": [
      {
        "name": "test.pdf",
        "size": 1024,
        "mimeType": "application/pdf",
        "options": {
          "format": "A4",
          "color": "B&W",
          "paperGSM": "40gsm"
        }
      }
    ]
  }'
```

**Expected**: Status 200, `{"ok": true, "orderId": "PX-1234567890-abcd"}`

#### POST Request (With File Bytes - Should be Rejected)
```bash
curl -X POST http://localhost:3000/api/metadata \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{
    "orderId": "PX-1234567890-efgh",
    "total": 100.50,
    "vpa": "test@bank",
    "filesMeta": [],
    "files": [{
      "name": "test.pdf",
      "data": "base64encodeddata...",
      "mimeType": "application/pdf",
      "size": 1024
    }]
  }'
```

**Expected**: Status 400, `{"error": "File bytes detected", "message": "Send files directly to APPS_SCRIPT_URL..."}`

### 2. Test Apps Script Direct Upload

#### Test in Browser Console
```javascript
// Test direct upload to Apps Script
const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
const { uploadBatchToDriveViaAppsScript } = await import('./lib/apps-script');

const result = await uploadBatchToDriveViaAppsScript(
  [{ file: testFile }],
  {
    orderId: 'PX-test-1234',
    total: 100,
    vpa: 'test@bank'
  }
);

console.log('Upload result:', result);
```

**Expected**: Files uploaded successfully, returns array of `UploadResult`

### 3. Browser Checklist

- [ ] Open http://localhost:3000
- [ ] Upload a file (PDF or image)
- [ ] Configure print options
- [ ] Proceed to payment
- [ ] Upload payment screenshot
- [ ] Confirm order
- [ ] Verify order ID format: `PX-<timestamp>-<4hex>`
- [ ] Check browser console for upload progress
- [ ] Verify files are uploaded to Google Drive
- [ ] Check Google Sheets for order log entry

## File Size Limits

### Client-Side Validation
- **Per File**: 75MB
- **Total**: 500MB
- **Max Files**: 50 files per order

### Apps Script Limits
- **Per File**: 75MB (decoded), ~100MB (base64 encoded)
- **Per Request**: ~45MB (handled by chunking)
- **Total**: 500MB (Google Drive limit)

### Vercel API Limits
- **Metadata API**: 4.5MB (metadata only, no file bytes)
- **Proxy Upload**: 50MB (not used for file uploads)

## Chunking Strategy

Files are automatically chunked when the payload exceeds 30MB:
- **Chunk Size**: 30MB per chunk (becomes ~40MB when base64 encoded in JSON)
- **Chunking Logic**: Groups files into chunks based on estimated payload size
- **Upload Strategy**: Sequential uploads (one chunk at a time)
- **Progress Tracking**: Progress callback reports uploaded/total files and chunk progress

## Error Handling

### Quota Errors
- **Detection**: Checks for `QuotaExceeded` or `Service invoked too many times`
- **Message**: "Google Apps Script quota exceeded. Please try again later or reduce the number of files."

### File Size Errors
- **Detection**: Checks for `too large` or `File too large`
- **Message**: "File size exceeds Apps Script limit. Please compress files or split into smaller batches."

### CORS Errors
- **Detection**: Checks for `CORS`, `Failed to fetch`, or `NetworkError`
- **Message**: "CORS error: Make sure Apps Script is deployed with 'Anyone' access."

### Network Errors
- **Detection**: Checks for `Failed to fetch` or `NetworkError`
- **Message**: "Check your internet connection and Apps Script URL."

## Notes

1. **Thumbnails**: Thumbnails are generated client-side and shown temporarily. They are NOT stored permanently (only in browser memory).

2. **Order Storage**: Order data is stored in Google Sheets via Apps Script. The `/api/metadata` endpoint currently just validates and returns success (TODO: integrate with database/Sheets).

3. **CORS**: Apps Script must be deployed with "Anyone" access for direct browser uploads to work.

4. **Environment Variables**: `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` must be set for client-side uploads to work.

5. **PDF.js**: Configured with `isEvalSupported: false` to avoid CSP `eval` issues.

## TODO / Future Improvements

1. **Database Integration**: Store metadata in database (Vercel Postgres, MongoDB, or Google Sheets)
2. **Progress UI**: Add visual progress indicator for chunked uploads
3. **Retry Logic**: Implement retry logic for failed uploads
4. **Error Recovery**: Better error recovery for partial uploads
5. **Rate Limiting**: Add rate limiting for API endpoints
6. **Validation**: Add more comprehensive validation for file types and sizes

## Conclusion

All critical issues have been fixed:
- ✅ Build compiles successfully
- ✅ TypeScript errors resolved
- ✅ CORS configured properly
- ✅ CSP configured properly (no `eval` issues)
- ✅ Direct uploads to Apps Script implemented
- ✅ Chunking for large files implemented
- ✅ Metadata API created and tested
- ✅ Error handling improved
- ✅ File size limits updated to match Apps Script limits

The application is now ready for deployment and testing.

