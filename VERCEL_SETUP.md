# Vercel Deployment Checklist

## ✅ Code Changes Pushed
All changes have been committed and pushed to GitHub. Vercel should automatically deploy.

## 🔧 Required Vercel Environment Variables

Make sure these are set in your Vercel project settings:

### Required:
1. **NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL**
   - Value: `https://script.google.com/macros/s/YOUR_URL/exec`
   - **Important**: Must have `NEXT_PUBLIC_` prefix for client-side access
   - Required for: Direct file uploads to Apps Script (bypasses Vercel 4.5MB limit)

### Optional (if using server-side):
2. **APPS_SCRIPT_WEB_APP_URL**
   - Value: Same as above
   - Required for: Server-side operations (if any)

## 📋 How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Key**: `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL`
   - **Value**: Your Apps Script Web App URL
   - **Environments**: Select all (Production, Preview, Development)
4. Click **Save**
5. **Redeploy** your application (or wait for auto-deploy)

## 🚀 After Deployment

1. **Check deployment status** in Vercel dashboard
2. **Test file upload** on your Vercel domain
3. **Check browser console** for any errors
4. **Verify Apps Script** is receiving files

## 🔍 Important Notes

- **File limits on Vercel**:
  - Direct uploads bypass Vercel's 4.5MB limit
  - Files go directly to Apps Script (up to 75MB per file)
  - Total: 500MB per request, 50 files max

- **CSP Headers**:
  - Configured in `next.config.ts`
  - Allows PDF.js to work (requires `unsafe-eval`)
  - Allows connections to Apps Script and Google APIs

- **Apps Script Deployment**:
  - Must be deployed with "Anyone" access for CORS to work
  - Execute as: Me
  - Who has access: Anyone

## 🐛 Troubleshooting

If uploads fail after deployment:

1. **Check environment variables** are set correctly
2. **Verify Apps Script URL** is correct
3. **Check Vercel logs** for errors
4. **Check browser console** for CORS errors
5. **Verify Apps Script** deployment settings

## 📝 Deployment URL

Your Vercel deployment URL should be:
- `https://your-project.vercel.app`

Test the upload functionality on this URL!

