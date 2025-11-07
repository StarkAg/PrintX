# Quick Fix Guide

## ✅ What I Fixed

1. **Increased Limits**:
   - Per file: **75MB** (becomes ~100MB when base64 encoded - max Apps Script can handle)
   - Total per request: **500MB**
   - Max files: **50 files**

2. **Better Error Logging**:
   - Added detailed error messages
   - Console logs show exactly what's failing
   - Error messages include helpful hints

3. **Thumbnails**:
   - ✅ Already temporary! Thumbnails are only shown in UI (not stored)
   - They're created from File objects using `URL.createObjectURL()` or PDF.js
   - No thumbnails are uploaded to Drive or stored anywhere

## 🔍 Debugging the Upload Failure

Check the browser console for detailed logs:

1. **Look for `[Upload]` logs** - These show the upload process
2. **Check the error message** - It will tell you exactly what failed
3. **Common issues**:
   - **CORS error**: Apps Script not deployed with "Anyone" access
   - **413 error**: File too large (shouldn't happen with new limits)
   - **Network error**: Check internet/Apps Script URL
   - **Missing env var**: `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` not set

## 🚀 Next Steps

1. **Restart dev server** (to load new limits):
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

2. **Clear browser cache** (Cmd+Shift+R or Ctrl+Shift+R)

3. **Check Apps Script deployment**:
   - Open Apps Script editor
   - Deploy → Manage deployments
   - Make sure "Execute as: Me" and "Who has access: Anyone"

4. **Test with a small file first** to verify it works

5. **Check browser console** for detailed error messages

## 📊 Current Limits

- **Per file**: 75MB (becomes ~100MB base64 encoded)
- **Total**: 500MB per request
- **Files**: Up to 50 files per order
- **Storage**: Files go to Google Drive, logs to Google Sheets
- **Thumbnails**: Temporary (only shown in UI, not stored)

