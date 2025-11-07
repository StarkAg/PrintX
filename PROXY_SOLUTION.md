# CORS Solution: Vercel API Proxy

## How It Works

We've implemented a **Vercel API proxy** that solves the CORS issue:

1. **Client** → Sends request to `/api/proxy-upload` (your Vercel domain, no CORS issues)
2. **Vercel Proxy** → Forwards request to Apps Script (server-to-server, no CORS needed)
3. **Apps Script** → Processes files and uploads to Drive
4. **Response** → Flows back through proxy to client

## Why This Works

- ✅ **No CORS issues**: Browser talks to your Vercel domain (same origin)
- ✅ **Server-to-server**: Vercel proxy talks to Apps Script (no CORS needed)
- ✅ **Same functionality**: All files still go to Google Drive via Apps Script

## Current Limitations

⚠️ **Vercel's 4.5MB limit still applies** because requests go through Vercel's API route.

For files under 4.5MB, this solution works perfectly!

## Testing

### 1. Test Apps Script Directly (Optional)
Visit your Apps Script URL:
```
https://script.google.com/macros/s/YOUR_URL/exec
```

Should return:
```json
{"status":"ok","service":"PrintX Drive Upload","timestamp":"...","cors":"enabled"}
```

**Note**: This is just to verify Apps Script is working. CORS on Apps Script itself doesn't matter anymore since we use the proxy.

### 2. Test Through Proxy
1. Upload a file through your Vercel site
2. Check browser console - no CORS errors!
3. Check Google Drive - files should appear
4. Check Google Sheet - order should be logged

## Environment Variables

Make sure you have in Vercel:
- `APPS_SCRIPT_WEB_APP_URL` (server-side, used by proxy)
- Not needed: `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` (we're using proxy now)

## For Larger Files (>4.5MB)

If you need to support files larger than 4.5MB, we'll need to implement:
1. **File chunking**: Split files into smaller chunks
2. **Direct Drive API**: Use Google Drive API with OAuth (more complex)
3. **Resumable uploads**: Use Drive's resumable upload API

But for now, the proxy solution handles CORS perfectly for files under 4.5MB!

