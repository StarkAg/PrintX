# ⚠️ IMPORTANT: Update Vercel Environment Variable

## New Apps Script URL

You've created a new Apps Script deployment with a new URL:

```
https://script.google.com/macros/s/AKfycbzNxmeUhEl5TZFcFpBCVZawaQzT8y3hTvgdpQAQ5Bl8sR-u5yZhBuo1_FSgw5QOw1A/exec
```

## ✅ Verification

I can see the Apps Script is working correctly - it's returning the expected JSON response:
```json
{
  "status": "ok",
  "service": "PrintX Drive Upload",
  "timestamp": "2025-11-07T22:14:33.864Z",
  "cors": "enabled",
  "message": "If you see this, Apps Script is working. Make sure deployment is set to \"Anyone\" access for CORS."
}
```

This means your Apps Script is deployed with "Anyone" access! ✅

## 🔧 Next Step: Update Vercel

You **MUST** update the environment variable in Vercel with this new URL:

### Steps:

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Select your `printx-simple` project

2. **Navigate to Environment Variables**
   - Go to **Settings** → **Environment Variables**

3. **Update the Variable**
   - Find `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL`
   - Click **Edit** (or delete and recreate)
   - Update the value to:
     ```
     https://script.google.com/macros/s/AKfycbzNxmeUhEl5TZFcFpBCVZawaQzT8y3hTvgdpQAQ5Bl8sR-u5yZhBuo1_FSgw5QOw1A/exec
     ```
   - Make sure **Production**, **Preview**, and **Development** are all selected
   - Click **Save**

4. **Redeploy**
   - Go to **Deployments** tab
   - Click the **three dots** (⋯) on the latest deployment
   - Click **Redeploy**
   - Or push a new commit to trigger auto-deploy

5. **Test**
   - Wait for deployment to complete
   - Visit your Vercel site
   - Try uploading a file
   - CORS error should be gone! ✅

## 📝 Quick Copy-Paste

**Environment Variable Name:**
```
NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL
```

**Environment Variable Value:**
```
https://script.google.com/macros/s/AKfycbzNxmeUhEl5TZFcFpBCVZawaQzT8y3hTvgdpQAQ5Bl8sR-u5yZhBuo1_FSgw5QOw1A/exec
```

## ✅ Checklist

- [x] Apps Script deployed with "Anyone" access (verified - URL works!)
- [ ] Vercel environment variable updated with new URL
- [ ] Vercel app redeployed
- [ ] Test file upload on Vercel

## 🎯 Expected Result

After updating Vercel:
- ✅ No CORS errors
- ✅ Files upload successfully
- ✅ Orders logged to Google Sheets
- ✅ Everything works! 🎉

