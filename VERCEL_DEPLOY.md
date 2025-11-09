# Vercel Deployment Guide

## ✅ Build Status
- Build completed successfully
- All TypeScript errors resolved
- All components optimized for production

## 🚀 Quick Deploy to Vercel

### Option 1: Deploy via Vercel CLI
```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
cd printx-simple
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No (or Yes if you have one)
# - Project name? printx-simple (or your preferred name)
# - Directory? ./ (current directory)
# - Override settings? No
```

### Option 2: Deploy via GitHub
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Configure project settings (see below)
6. Click "Deploy"

## 🔧 Required Environment Variables

Set these in your Vercel project settings (Settings → Environment Variables):

### Required:
- **NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL**
  - Value: Your Google Apps Script Web App URL
  - Format: `https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec`
  - **Important**: Must have `NEXT_PUBLIC_` prefix for client-side access
  - Environments: Production, Preview, Development

### Optional (if using server-side operations):
- **APPS_SCRIPT_WEB_APP_URL**
  - Value: Same as above (without NEXT_PUBLIC_ prefix)
  - Environments: Production, Preview, Development

## 📋 Project Configuration

### Build Settings (Auto-detected by Vercel)
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Node Version**: 18.x or higher

### Vercel Configuration (`vercel.json`)
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

## 🎨 New Features Deployed

### 1. Papers Background Animation
- Canvas-based floating papers animation
- Optimized for performance (12 papers max)
- Subtle opacity for readability
- No additional dependencies required

### 2. Upload Progress Bar
- Optimistic progress updates (feels faster)
- Real-time file upload tracking
- Smooth animations with shimmer effect
- Modal overlay during uploads

## 🔍 Post-Deployment Checklist

1. ✅ **Verify Build Success**
   - Check Vercel deployment logs
   - Ensure build completed without errors

2. ✅ **Set Environment Variables**
   - Add `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` in Vercel dashboard
   - Redeploy if variables were added after deployment

3. ✅ **Test Application**
   - Visit your Vercel deployment URL
   - Test home page (papers animation should work)
   - Test file upload (progress bar should appear)
   - Verify uploads reach Google Drive

4. ✅ **Check Browser Console**
   - No CORS errors
   - No CSP violations
   - Canvas animations working

5. ✅ **Verify Apps Script**
   - Apps Script deployed with "Anyone" access
   - Execute as: Me
   - Who has access: Anyone

## 🐛 Troubleshooting

### Build Fails
- Check Node.js version (18.x or higher)
- Verify all dependencies are in `package.json`
- Check TypeScript errors locally first

### Canvas Animation Not Working
- Check browser console for errors
- Verify CSP headers allow canvas (default: allowed)
- Test in different browsers

### Upload Progress Not Showing
- Verify `NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL` is set
- Check browser console for errors
- Verify upload callback is being called

### CORS Errors
- Verify Apps Script is deployed with "Anyone" access
- Check Apps Script URL is correct
- Verify environment variable is set correctly

## 📝 Notes

- **File Size Limits**: 
  - Vercel proxy: 4.5MB per request
  - Direct uploads: Up to 75MB per file (via Apps Script)
  - Total: 500MB per request, 50 files max

- **Performance**:
  - Papers animation: Optimized for 60fps
  - Progress bar: Smooth animations with optimistic updates
  - Canvas: Efficient rendering with requestAnimationFrame

- **Browser Support**:
  - Modern browsers (Chrome, Firefox, Safari, Edge)
  - Canvas API support required
  - ES6+ JavaScript required

## 🔗 Useful Links

- [Vercel Dashboard](https://vercel.com/dashboard)
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Apps Script Setup Guide](./APPS_SCRIPT_SETUP.md)

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify environment variables are set
4. Test locally first with `npm run build`

---

**Last Updated**: After adding papers background animation and upload progress bar
**Build Status**: ✅ Passing
**Ready for Deployment**: ✅ Yes

