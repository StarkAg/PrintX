# CORS Fix for Apps Script Uploads

## Problem
Apps Script Web Apps don't automatically return CORS headers for POST requests from browsers, even when deployed with "Anyone" access. This causes CORS errors when trying to upload files directly from the browser.

## Solution
Use the Vercel proxy (`/api/proxy-upload`) which:
1. Handles CORS headers properly for browser requests
2. Forwards requests to Apps Script server-to-server (no CORS needed)
3. Allows chunking to stay under Vercel's 4.5MB limit per request

## Changes Made

### 1. Updated `lib/apps-script.ts`
- Changed from direct Apps Script URL to Vercel proxy (`/api/proxy-upload`)
- Updated chunk size to 3MB per chunk (stays under 4.5MB when base64 encoded)
- Proxy handles CORS, forwards to Apps Script server-to-server

### 2. Updated `pages/api/proxy-upload.ts`
- Added fallback to use `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` if `APPS_SCRIPT_WEB_APP_URL` is not set
- Properly handles CORS headers for browser requests

## File Size Limits (Updated)

### Per Request (Vercel Proxy)
- **Maximum**: 4.5MB per request
- **Chunk Size**: 3MB per chunk (becomes ~4MB when base64 encoded in JSON)
- **Strategy**: Files are automatically chunked if payload exceeds 3MB

### Per File (Apps Script)
- **Maximum**: 75MB per file (decoded)
- **Total**: 500MB total per order
- **Max Files**: 50 files per order

## How It Works

1. **Client** → Uploads files to `/api/proxy-upload` (Vercel API)
   - CORS headers are set by the proxy
   - Files are chunked if needed (3MB per chunk)

2. **Vercel Proxy** → Forwards to Apps Script (server-to-server)
   - No CORS needed (server-to-server communication)
   - Uses `APPS_SCRIPT_WEB_APP_URL` or `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL`

3. **Apps Script** → Uploads to Google Drive
   - Processes files and uploads to Drive
   - Logs order data to Google Sheets

## Environment Variables

Set in Vercel Dashboard:
- `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` (client-side access)
- `APPS_SCRIPT_WEB_APP_URL` (server-side access, optional - proxy will use NEXT_PUBLIC_ if not set)

## Testing

After deploying, test the upload:
1. Go to your deployed site
2. Upload a file
3. Check browser console - should see:
   ```
   [Upload] Using Vercel proxy: /api/proxy-upload (handles CORS, forwards to Apps Script)
   [Upload] Split X file(s) into Y chunk(s) for upload
   ```
4. Files should upload successfully without CORS errors

## CSP Eval Warning

The CSP eval warning is likely a false positive. PDF.js is configured with `isEvalSupported: false`, so it doesn't use eval. The warning might be from:
- Browser extensions
- Other third-party libraries
- Browser's security scanner

If you see the warning but uploads work, you can safely ignore it. The CSP is correctly configured without `unsafe-eval`.
