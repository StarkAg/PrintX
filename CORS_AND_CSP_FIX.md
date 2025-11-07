# ✅ CORS and CSP Fix - Using Vercel Proxy

## 🔧 Solution Implemented

### 1. **CORS Fix: Using Vercel Proxy**
- ✅ Changed from direct upload to Apps Script → now using `/api/proxy-upload`
- ✅ Proxy adds proper CORS headers (`Access-Control-Allow-Origin`, etc.)
- ✅ Proxy forwards requests to Apps Script server-to-server (no CORS needed)
- ✅ Handles preflight (OPTIONS) requests properly

### 2. **CSP Fix: Removed unsafe-eval**
- ✅ Removed `unsafe-eval` from CSP headers
- ✅ PDF.js is configured with `isEvalSupported: false` (no eval needed)
- ✅ QRCode library doesn't use eval
- ✅ CSP now more secure while still functional

## 📋 What Changed

### Files Modified:
1. **`lib/apps-script.ts`**
   - Now uses `/api/proxy-upload` instead of direct Apps Script URL
   - Proxy handles CORS, forwards to Apps Script

2. **`pages/api/proxy-upload.ts`**
   - Enhanced CORS headers
   - Better error handling
   - Proper preflight request handling

3. **`next.config.ts`**
   - Removed `unsafe-eval` from CSP
   - More secure Content Security Policy

## 🚀 How It Works Now

```
Client (Browser)
  ↓
  POST /api/proxy-upload (same origin, no CORS issues)
  ↓
Vercel API Route (adds CORS headers)
  ↓
  POST Apps Script (server-to-server, no CORS needed)
  ↓
Apps Script (processes files, uploads to Drive)
  ↓
Response flows back through proxy to client
```

## ⚠️ Important: File Size Limit

**Vercel Proxy Limit: 4.5MB request size**

- Base64 encoding increases file size by ~33%
- Effective limit: ~3.4MB per file (becomes ~4.5MB when base64 encoded)
- Total request limit: 4.5MB (all files combined)

### Current Limits:
- **Per file**: 3.4MB (becomes ~4.5MB base64 encoded)
- **Total per request**: 4.5MB (all files + payment screenshot)
- **Files per order**: Up to 50 files (but total must be under 4.5MB)

## 🔧 Vercel Environment Variable

Make sure you have **server-side** environment variable set in Vercel:

**Variable Name:** `APPS_SCRIPT_WEB_APP_URL`
**Variable Value:** `https://script.google.com/macros/s/YOUR_URL/exec`

**Note:** This is server-side only (no `NEXT_PUBLIC_` prefix needed)

## ✅ Benefits

1. **CORS Fixed**: Proxy handles CORS headers properly
2. **CSP Fixed**: No more eval warnings, more secure
3. **Works on Vercel**: Uses Vercel API routes (no external CORS issues)
4. **Better Error Handling**: Detailed error messages
5. **Logging**: Better debugging with console logs

## 🐛 Troubleshooting

### If uploads fail:
1. **Check Vercel logs** - Look for proxy errors
2. **Verify environment variable** - `APPS_SCRIPT_WEB_APP_URL` must be set
3. **Check file sizes** - Must be under 3.4MB per file
4. **Check browser console** - Should see `[Upload] Using Vercel proxy...`

### If CSP warnings appear:
1. **Check PDF.js config** - Make sure `isEvalSupported: false`
2. **Clear browser cache** - Hard refresh (Cmd+Shift+R)
3. **Check next.config.ts** - CSP headers should not include `unsafe-eval`

## 📝 Next Steps

1. ✅ **Update Vercel environment variable**:
   - Set `APPS_SCRIPT_WEB_APP_URL` (server-side, no `NEXT_PUBLIC_` prefix)
   - Use your new Apps Script URL

2. ✅ **Redeploy Vercel**:
   - Changes will auto-deploy from git push
   - Or manually redeploy from Vercel dashboard

3. ✅ **Test**:
   - Upload a file (under 3.4MB)
   - Should work without CORS errors
   - Should work without CSP warnings

## 🎯 Expected Results

- ✅ No CORS errors
- ✅ No CSP eval warnings
- ✅ Files upload successfully
- ✅ Orders logged to Google Sheets
- ✅ Secure and working!

---

**Note:** For files larger than 3.4MB, you would need to implement file chunking, which is more complex. For now, the 3.4MB limit should work for most print files.

