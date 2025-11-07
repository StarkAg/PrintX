# CORS Error Fix Guide

## ❌ Error You're Seeing

```
Access to fetch at 'https://script.google.com/macros/s/.../exec' from origin 'https://printx-simple.vercel.app' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔧 Fix: Update Apps Script Deployment

The issue is that your Apps Script Web App is **not deployed with "Anyone" access**. Here's how to fix it:

### Step 1: Open Apps Script Editor

1. Go to [script.google.com](https://script.google.com)
2. Open your PrintX Apps Script project

### Step 2: Update Deployment Settings

1. Click **Deploy** → **Manage deployments**
2. Click the **pencil icon** (edit) next to your active deployment
3. Or click **New deployment** if you don't have one yet

### Step 3: Configure Deployment

1. Click the **gear icon** (⚙️) next to "Web app"
2. Set these settings:
   - **Execute as**: `Me` (your account)
   - **Who has access**: `Anyone` ⚠️ **THIS IS CRITICAL!**
3. Click **Deploy**
4. **Copy the new Web App URL** (it might be the same or different)

### Step 4: Update Environment Variable in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` with the new URL
3. **Redeploy** your Vercel app (or wait for auto-deploy)

### Step 5: Test

1. Try uploading a file again
2. The CORS error should be gone!

## 🔍 Verify Deployment Settings

After deploying, you can verify the settings by:

1. Opening the deployment settings again
2. Checking that "Who has access" shows **"Anyone"**
3. The URL should end with `/exec`

## ⚠️ Important Notes

- **You MUST redeploy Apps Script** after changing "Who has access" to "Anyone"
- Just saving the code is NOT enough - you need to create a new deployment or update the existing one
- Each time you update the deployment, you get a new URL (sometimes it's the same)

## 🐛 Still Not Working?

If you still get CORS errors after following these steps:

1. **Double-check the deployment settings** - make sure "Anyone" is selected
2. **Clear browser cache** - hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
3. **Test the Apps Script URL directly** - visit it in a browser, should return JSON
4. **Check Vercel environment variable** - make sure it matches your Apps Script URL exactly
5. **Wait a few minutes** - sometimes it takes a moment for the changes to propagate

## 📝 Quick Checklist

- [ ] Apps Script deployed with "Anyone" access
- [ ] Apps Script redeployed after changing settings
- [ ] Vercel environment variable updated with correct URL
- [ ] Vercel app redeployed
- [ ] Browser cache cleared
- [ ] Tested file upload

## 🎯 Expected Result

After fixing:
- ✅ No CORS errors
- ✅ Files upload successfully to Google Drive
- ✅ Orders logged to Google Sheets
- ✅ Success message shown to user
