# Troubleshooting: 413 Error on File Upload

## Problem
Getting a `413 (Payload Too Large)` error when uploading files through `/api/proxy-upload`.

## Cause
The code is still using the old Vercel proxy which has a 4.5MB limit, instead of uploading directly to Apps Script.

## Solution

### 1. Set Environment Variable

Make sure `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` is set in `.env.local`:

```bash
NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_URL/exec
```

**Important**: The `NEXT_PUBLIC_` prefix is required for client-side access!

### 2. Restart Dev Server

After updating `.env.local`, **restart your dev server**:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### 3. Clear Browser Cache

The browser may have cached the old JavaScript bundle. Do a **hard refresh**:

- **Chrome/Edge**: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows) or `Cmd+Shift+R` (Mac)
- Or open DevTools → Network tab → Check "Disable cache"

### 4. Verify It's Working

Check the browser console. You should see:

```
[Upload] Starting direct upload to Apps Script (bypassing Vercel proxy)...
[Upload] Using Apps Script URL: https://script.google.com/macros/s/... (direct upload, bypassing Vercel)
```

If you still see `/api/proxy-upload` in the Network tab, the cache hasn't cleared yet.

### 5. For Vercel Deployment

If you're deploying to Vercel, you need to set the environment variable in Vercel's dashboard:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add: `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` = `https://script.google.com/macros/s/YOUR_URL/exec`
4. **Redeploy** your application

### 6. Verify Apps Script Deployment

Make sure Apps Script is deployed with:
- **Execute as**: Me
- **Who has access**: Anyone (required for CORS)

### 7. Check File Sizes

Even with direct upload, Apps Script has limits:
- **Per file**: 100MB max
- **Total per request**: 500MB max
- **Files per order**: 20 files max

## Still Not Working?

1. **Check browser console** for detailed error messages
2. **Check Network tab** to see which URL is being called
3. **Verify environment variable** is set: `echo $NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` (won't work in browser, but check server logs)
4. **Check Apps Script URL** is correct and accessible
5. **Test Apps Script directly**: Visit the URL in your browser - should return JSON with `{"status":"ok",...}`

## Expected Behavior

After fixing:
- ✅ Files upload directly to Apps Script (no Vercel proxy)
- ✅ Files up to 100MB can be uploaded
- ✅ No 413 errors
- ✅ Network tab shows requests to `script.google.com`, not `/api/proxy-upload`

