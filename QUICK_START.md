# PrintX - Quick Start Guide

## 🚀 Get Up and Running in 5 Minutes

### Step 1: Set Up Apps Script (2 minutes)

1. **Copy the Apps Script code:**
   - Open `apps-script/Code.gs`
   - Copy all the code

2. **Create Apps Script project:**
   - Go to https://script.google.com/
   - Click "+ New project"
   - Paste the code
   - Update `FOLDER_ID` with your Drive folder ID
   - (Optional) Update `SHEET_ID` for order logging

3. **Deploy as Web App:**
   - Click "Deploy" → "New deployment"
   - Select "Web app"
   - Execute as: **"Me"**
   - Who has access: **"Anyone"**
   - Click "Deploy"
   - **Copy the Web App URL**

### Step 2: Configure Environment (1 minute)

Create `.env.local` in your project root:

```env
APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec
```

Replace `YOUR_WEB_APP_ID` with the ID from your Web App URL.

### Step 3: Test (2 minutes)

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Upload a test file:**
   - Go to http://localhost:3000
   - Click "Start Printing Now"
   - Upload a file
   - Complete the order flow

3. **Check your Drive folder:**
   - Files should appear in your configured Drive folder
   - (If enabled) Check your Google Sheet for order logs

## ✅ That's it!

Your PrintX app is now connected to Google Drive via Apps Script.

## Troubleshooting

**Files not uploading?**
- Check that `APPS_SCRIPT_WEB_APP_URL` is set correctly
- Verify the Apps Script is deployed and accessible
- Check browser console for errors

**403/401 errors?**
- Make sure Apps Script is deployed with "Anyone" access
- Re-authorize the Apps Script if needed

**Files not in Drive?**
- Verify the `FOLDER_ID` is correct
- Check Apps Script execution logs in the Apps Script editor

## Next Steps

- Test with multiple files
- Check order logs in Google Sheet (if enabled)
- Deploy to Vercel for production

