# Vercel Deployment Checklist

## ✅ Current Status
- ✅ Code committed to Git
- ✅ Changes pushed to GitHub (commit: `4922ec1`)
- ✅ Build passes locally
- ✅ Vercel configuration exists (`vercel.json`)

## 🔍 Check Vercel Deployment

### 1. Check Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Find your `printx-simple` project
3. Check the latest deployment status
4. Verify it's deploying from the `main` branch

### 2. Verify Environment Variables
**Required Environment Variable:**
- `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` - Your Google Apps Script Web App URL

**To Set/Update:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add or update:
   - **Key**: `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL`
   - **Value**: `https://script.google.com/macros/s/YOUR_APPS_SCRIPT_WEB_APP_ID/exec`
   - **Environment**: Production, Preview, Development (select all)
3. Click "Save"
4. **Important**: Redeploy after adding/updating environment variables

### 3. Trigger a New Deployment (if needed)
If the deployment didn't trigger automatically:

**Option 1: Push an empty commit**
```bash
git commit --allow-empty -m "Trigger Vercel deployment"
git push
```

**Option 2: Redeploy from Vercel Dashboard**
1. Go to Vercel Dashboard → Your Project → Deployments
2. Click "..." on the latest deployment
3. Click "Redeploy"

### 4. Verify Deployment Success
1. Check deployment logs in Vercel Dashboard
2. Look for:
   - ✅ Build successful
   - ✅ No errors
   - ✅ Routes configured correctly

### 5. Test the Deployment
Once deployed, test:

1. **Metadata API**:
   ```bash
   curl -X OPTIONS https://your-project.vercel.app/api/metadata -v
   ```
   Should return 200 with CORS headers

2. **Homepage**:
   - Visit: `https://your-project.vercel.app`
   - Should load without errors
   - Check browser console for any errors

3. **File Upload**:
   - Upload a test file
   - Check browser console for upload progress
   - Verify files are uploaded to Google Drive

## 🐛 Troubleshooting

### Deployment Fails
1. Check build logs in Vercel Dashboard
2. Verify all dependencies are in `package.json`
3. Check for TypeScript errors: `npm run build` locally

### Environment Variables Not Working
1. Verify variable name is exactly: `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL`
2. Check it's set for all environments (Production, Preview, Development)
3. Redeploy after adding/updating variables
4. Clear browser cache and hard refresh

### CORS Errors
1. Verify Apps Script is deployed with "Anyone" access
2. Check `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` is set correctly
3. Verify Apps Script URL is accessible

### File Upload Fails
1. Check browser console for errors
2. Verify `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` is set
3. Check Apps Script logs for errors
4. Verify file size limits (75MB per file, 500MB total)

## 📋 Quick Commands

```bash
# Check Git status
git status

# Push to trigger deployment
git push

# Check recent commits
git log --oneline -5

# Trigger new deployment (empty commit)
git commit --allow-empty -m "Trigger Vercel deployment" && git push

# Build locally to verify
npm run build

# Test metadata API locally
node scripts/test-metadata.js
```

## 🔗 Useful Links
- Vercel Dashboard: https://vercel.com/dashboard
- Deployment Logs: Vercel Dashboard → Project → Deployments → Click deployment
- Environment Variables: Vercel Dashboard → Project → Settings → Environment Variables

## 📝 Notes
- Vercel automatically deploys on push to `main` branch
- Environment variables changes require a redeploy
- Build logs are available in Vercel Dashboard
- Check deployment URL in Vercel Dashboard → Project → Deployments

