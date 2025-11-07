# File Size Limits

## Current Implementation

Files are now uploaded **directly to Apps Script** from the client, bypassing Vercel's 4.5MB limit.

## Limits

### ✅ What Works Now

- **Per file**: Up to **100MB** (Apps Script limit)
- **Total per request**: Up to **500MB** (Apps Script safe limit)
- **Files per order**: Up to **20 files** (Apps Script limit)

### ⚠️ Previous Limitations (Now Fixed)

- ~~**Vercel proxy limit**: 4.5MB total request size~~ ✅ **BYPASSED**
- ~~**Effective file limit**: ~3.4MB per file (due to base64 encoding + Vercel limit)~~ ✅ **FIXED**

## How It Works

1. **Client** → Uploads files directly to Apps Script (no Vercel proxy)
2. **Apps Script** → Receives files and uploads to Google Drive
3. **No size restrictions** from Vercel (up to Apps Script's limits)

## Setup Required

### 1. Environment Variable

Add to your `.env.local` and Vercel:

```bash
NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_URL/exec
```

**Important**: The `NEXT_PUBLIC_` prefix makes it available on the client side for direct uploads.

### 2. Apps Script Deployment

Make sure Apps Script is deployed with:
- **Execute as**: Me
- **Who has access**: Anyone (required for CORS to work)

### 3. CORS

If you get CORS errors:
1. Check Apps Script deployment settings (must be "Anyone")
2. Redeploy Apps Script after changing settings
3. Clear browser cache

## Testing

Test with files of different sizes:
- ✅ Small files (< 1MB): Should work
- ✅ Medium files (1-10MB): Should work  
- ✅ Large files (10-100MB): Should work
- ❌ Very large files (> 100MB): Will fail (Apps Script limit)

## Base64 Encoding

Files are still base64-encoded before sending (required by Apps Script), but this no longer matters since we're not going through Vercel's 4.5MB limit.

Base64 increases file size by ~33%, so:
- A 75MB file becomes ~100MB when base64-encoded
- This is still within Apps Script's 100MB limit per file

## Future Improvements

For files > 100MB, we could implement:
1. **File chunking**: Split files into smaller chunks
2. **Resumable uploads**: Use Google Drive's resumable upload API
3. **Direct Drive API**: Use OAuth and upload directly to Drive (more complex)

