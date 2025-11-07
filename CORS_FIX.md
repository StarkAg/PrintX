# CORS Error Fix for Google Apps Script

## Problem
Getting CORS errors when uploading files from Vercel to Google Apps Script Web App.

## Solution: Redeploy Apps Script with Correct Settings

### Step 1: Update Code.gs
1. Copy the updated `apps-script/Code.gs` to your Apps Script project
2. Save the script

### Step 2: Redeploy the Web App (IMPORTANT!)
1. In Apps Script, click **"Deploy"** → **"Manage deployments"**
2. Click the **pencil icon** (edit) next to your existing deployment
3. OR create a **new deployment**:
   - Click **"New deployment"**
   - Click the gear icon ⚙️ next to "Select type"
   - Choose **"Web app"**

### Step 3: Configure Deployment Settings
**CRITICAL**: Set these exact settings:

- **Execute as**: `Me (your-email@gmail.com)`
- **Who has access**: `Anyone` ⚠️ (NOT "Anyone with Google account")

### Step 4: Deploy
1. Click **"Deploy"**
2. Copy the new **Web App URL**
3. Update `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` in Vercel with the new URL

### Step 5: Test
1. Visit: `https://your-web-app-url/exec` in browser
2. Should see: `{"status":"ok","service":"PrintX Drive Upload",...}`
3. If you see this, CORS is working!

## Why This Happens

Google Apps Script Web Apps automatically handle CORS **only when**:
- Deployed with "Anyone" access (not "Anyone with Google account")
- The script returns proper responses
- The deployment is active and up-to-date

## Alternative: Use a Proxy (if CORS still fails)

If CORS still doesn't work after redeploying, we can create a proxy API route in Vercel that forwards requests to Apps Script. However, this would still be limited by Vercel's 4.5MB limit, so it's not ideal for large files.

## Troubleshooting

### Still getting CORS errors?
1. **Check deployment settings**: Must be "Anyone" (not "Anyone with Google account")
2. **Create new deployment**: Sometimes old deployments have cached CORS settings
3. **Wait a few minutes**: Google's CORS changes can take 1-2 minutes to propagate
4. **Clear browser cache**: Old CORS errors might be cached
5. **Test in incognito mode**: Rules out browser extensions interfering

### Error: "Script function not found"
- Make sure `doPost` function exists in your script
- Save the script before deploying

### Error: "Access denied"
- Check that the deployment is set to "Anyone"
- Make sure you're using the Web App URL (ends in `/exec`)

## Verification

After redeploying, test the endpoint:
```bash
curl -X GET "https://your-web-app-url/exec"
```

Should return:
```json
{"status":"ok","service":"PrintX Drive Upload","timestamp":"...","cors":"enabled"}
```

If this works, CORS is properly configured! 🎉

