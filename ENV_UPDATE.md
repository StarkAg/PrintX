# Update Environment Variable in Vercel

## Steps to Update NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL

### 1. Get Your New Apps Script Web App URL
After redeploying, copy the Web App URL from Apps Script (should look like):
```
https://script.google.com/macros/s/YOUR_NEW_WEB_APP_ID/exec
```

### 2. Update in Vercel Dashboard
1. Go to: https://vercel.com/starkags-projects/printx-simple/settings/environment-variables
2. Find `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL`
3. Click **Edit** (or add it if it doesn't exist)
4. Paste your new Web App URL
5. Make sure it's enabled for:
   - ✅ Production
   - ✅ Preview
   - ✅ Development
6. Click **Save**

### 3. Redeploy Your Vercel App
1. Go to: https://vercel.com/starkags-projects/printx-simple/deployments
2. Click the **three dots** (⋯) on your latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (~1-2 minutes)

### 4. Test the Integration
1. Visit your production site: https://printx-simple.vercel.app
2. Try uploading a file
3. Check browser console for any errors
4. Check your Google Drive folder for uploaded files
5. Check your Google Sheet for order data

## Verification

### Test Apps Script URL Directly
Visit your Web App URL in a browser:
```
https://script.google.com/macros/s/YOUR_NEW_URL/exec
```

Should return:
```json
{"status":"ok","service":"PrintX Drive Upload","timestamp":"...","cors":"enabled"}
```

### Test CORS
Open browser console and run:
```javascript
fetch('https://script.google.com/macros/s/YOUR_NEW_URL/exec', {
  method: 'GET',
  mode: 'cors'
}).then(r => r.json()).then(console.log).catch(console.error);
```

Should return the status JSON without CORS errors.

## Troubleshooting

### Still getting CORS errors?
1. **Wait 1-2 minutes**: CORS changes can take time to propagate
2. **Clear browser cache**: Old CORS errors might be cached
3. **Test in incognito mode**: Rules out browser extensions
4. **Verify deployment settings**: Must be "Anyone" (not "Anyone with Google account")
5. **Check the URL**: Make sure it ends in `/exec` (not `/dev`)

### Environment variable not working?
1. **Check variable name**: Must be exactly `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL`
2. **Check it's enabled**: Make sure it's enabled for Production/Preview/Development
3. **Redeploy**: Environment variables only apply after redeploy
4. **Check build logs**: Look for the variable in Vercel build logs

### Files not uploading?
1. **Check browser console**: Look for error messages
2. **Check Apps Script execution logs**: Go to Apps Script → Executions
3. **Check Drive folder**: Make sure files are appearing
4. **Check Sheet**: Make sure orders are being logged

## Current Configuration

- **Drive Folder ID**: `1M21jnE7SEm-81HUufhnas24q42nrmM2K`
- **Sheet ID**: `19pxCvykhIsTDZOFYpCcaVu8To1lRDfP6-OF_NsiqdNo`
- **Web App URL**: Update this in Vercel environment variables

## Next Steps

After updating the environment variable:
1. ✅ Test file upload from production site
2. ✅ Verify files appear in Google Drive
3. ✅ Verify orders appear in Google Sheet
4. ✅ Test with different file sizes (up to 100MB)
5. ✅ Test with multiple files (up to 20 files)

