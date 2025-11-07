# 🚀 Update Vercel Environment Variable - URGENT

## New Apps Script URL

Your new Apps Script deployment URL:
```
https://script.google.com/macros/s/AKfycbzNxmeUhEl5TZFcFpBCVZawaQzT8y3hTvgdpQAQ5Bl8sR-u5yZhBuo1_FSgw5QOw1A/exec
```

## ✅ Apps Script Status

✅ **Working correctly!** The URL returns the expected JSON response, which means:
- Apps Script is deployed
- "Anyone" access is enabled (CORS will work)
- Ready to receive file uploads

## 🔧 Update Vercel NOW

### Step 1: Go to Vercel Dashboard
1. Visit [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on your `printx-simple` project

### Step 2: Update Environment Variable
1. Click **Settings** (top menu)
2. Click **Environment Variables** (left sidebar)
3. Find `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL`
4. Click **Edit** (or delete and add new)
5. Update the value to:
   ```
   https://script.google.com/macros/s/AKfycbzNxmeUhEl5TZFcFpBCVZawaQzT8y3hTvgdpQAQ5Bl8sR-u5yZhBuo1_FSgw5QOw1A/exec
   ```
6. Make sure all environments are selected: ✅ Production, ✅ Preview, ✅ Development
7. Click **Save**

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (~1-2 minutes)

### Step 4: Test
1. Visit your Vercel site: `https://printx-simple.vercel.app`
2. Try uploading a file
3. ✅ CORS error should be gone!
4. ✅ Files should upload to Google Drive
5. ✅ Orders should be logged to Google Sheets

## 📋 Quick Checklist

- [ ] Updated `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` in Vercel
- [ ] Selected all environments (Production, Preview, Development)
- [ ] Saved the environment variable
- [ ] Redeployed Vercel app
- [ ] Tested file upload
- [ ] Verified no CORS errors

## 🎯 What Should Happen

After updating:
1. ✅ No CORS errors in browser console
2. ✅ Files upload successfully to Google Drive
3. ✅ Order data saved to Google Sheets
4. ✅ Success message shown to user
5. ✅ Order ID displayed

## 🐛 If Still Not Working

1. **Double-check the URL** - Make sure it matches exactly (copy-paste)
2. **Clear browser cache** - Hard refresh (Cmd+Shift+R)
3. **Check Vercel logs** - Look for any errors
4. **Verify Apps Script** - Visit the URL directly, should see JSON
5. **Wait a minute** - Sometimes takes a moment to propagate

## 📝 Environment Variable Details

**Variable Name:**
```
NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL
```

**Variable Value:**
```
https://script.google.com/macros/s/AKfycbzNxmeUhEl5TZFcFpBCVZawaQzT8y3hTvgdpQAQ5Bl8sR-u5yZhBuo1_FSgw5QOw1A/exec
```

**Environments:**
- ✅ Production
- ✅ Preview  
- ✅ Development

---

**Once you update Vercel, everything should work!** 🎉

