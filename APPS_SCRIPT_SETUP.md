# Google Apps Script Setup Guide for PrintX

This guide will help you set up Google Apps Script to handle file uploads to Google Drive. This is **much simpler** than Google Cloud Console setup - no OAuth tokens needed!

## Why Apps Script?

✅ **No OAuth setup required**  
✅ **No credentials to manage**  
✅ **Free and easy to deploy**  
✅ **Built-in Drive and Sheets integration**  
✅ **Perfect for MVP**

## Step 1: Create Google Apps Script Project

1. Go to [Google Apps Script](https://script.google.com/)
2. Click **"+ New project"**
3. Name it: `PrintX Drive Upload`
4. Delete the default `myFunction` code
5. Copy the entire content from `apps-script/Code.gs` and paste it into the editor
6. Click **"Save"** (💾 icon) or press `Cmd+S` / `Ctrl+S`

## Step 2: Create a Drive Folder

1. Go to [Google Drive](https://drive.google.com/)
2. Create a new folder named `PrintX Orders` (or any name you prefer)
3. Right-click the folder and select **"Share"**
4. Make it accessible to your Google account (or "Anyone with the link" if needed)
5. Copy the folder ID from the URL:
   - URL format: `https://drive.google.com/drive/folders/FOLDER_ID_HERE`
   - The `FOLDER_ID_HERE` is what you need
6. In your Apps Script, replace `YOUR_DRIVE_FOLDER_ID_HERE` with your actual folder ID

## Step 3: (Optional) Create Google Sheet for Logging

1. Go to [Google Sheets](https://sheets.google.com/)
2. Create a new spreadsheet named `PrintX Orders Log`
3. Copy the Sheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`
   - The `SHEET_ID_HERE` is what you need
4. In your Apps Script, replace `YOUR_SHEET_ID_HERE` with your actual Sheet ID
5. **Or** leave it as `YOUR_SHEET_ID_HERE` to disable sheet logging

## Step 4: Configure the Script

In `Code.gs`, update these values:

```javascript
const FOLDER_ID = 'your_actual_folder_id_here';
const SHEET_ID = 'your_actual_sheet_id_here'; // Or leave as is to disable
```

## Step 5: Deploy as Web App

1. In Apps Script editor, click **"Deploy"** > **"New deployment"**
2. Click the gear icon (⚙️) next to **"Select type"**
3. Choose **"Web app"**
4. Configure:
   - **Description**: `PrintX File Upload Service`
   - **Execute as**: **"Me"** (your account)
   - **Who has access**: **"Anyone"** (or "Anyone with Google account" for more security)
5. Click **"Deploy"**
6. **Authorize the app**:
   - Click **"Authorize access"**
   - Choose your Google account
   - Click **"Advanced"** > **"Go to [Project Name] (unsafe)"**
   - Click **"Allow"**
7. **Copy the Web App URL** - You'll need this for your Next.js app

## Step 6: Test the Deployment

1. Open the Web App URL in your browser
2. You should see: `{"status":"ok","service":"PrintX Drive Upload",...}`
3. If you see an error, check the authorization and try again

## Step 7: Update Your Next.js App

1. Create `.env.local` file (if not exists):
   ```env
   APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/YOUR_WEB_APP_ID/exec
   ```

2. Replace `YOUR_WEB_APP_ID` with the ID from your Web App URL

## Step 8: Test File Upload

1. Restart your Next.js dev server: `npm run dev`
2. Upload a file through PrintX
3. Check your Drive folder - the file should appear!
4. (If enabled) Check your Google Sheet for the order log

## Troubleshooting

### "Script function not found" error
- Make sure you saved the `Code.gs` file
- Redeploy the web app after making changes

### "Access denied" error
- Check that "Who has access" is set to "Anyone" (or your account has access)
- Re-authorize the app if needed

### Files not appearing in Drive
- Verify the folder ID is correct
- Check that the folder exists and is accessible
- Check Apps Script execution logs: **"Executions"** tab in Apps Script editor

### "Quota exceeded" error
- Apps Script has daily quotas (6 minutes execution time, 20,000 API calls/day)
- For production, consider upgrading or using Google Cloud

## Quota Limits

**Apps Script Free Tier:**
- 6 minutes execution time per request
- 20,000 API calls per day
- 100MB total request size

**Your app is configured to:**
- Max 10 files per request
- Max 50MB per file
- Max 100MB total per request

This should handle **hundreds of orders per day** easily!

## Security Notes

⚠️ **Important:**
- The Web App URL is public - anyone with the URL can upload files
- For production, consider:
  - Using "Anyone with Google account" access
  - Adding API key authentication
  - Implementing rate limiting
  - Moving to Google Cloud Functions for better security

## Next Steps

1. Monitor usage in Apps Script: **"Executions"** tab
2. Set up email alerts for errors (optional)
3. Organize files by date in Drive (modify script)
4. Add file validation (file types, sizes)
5. Consider upgrading to Google Cloud for production scale

## Support

- Apps Script Documentation: https://developers.google.com/apps-script
- Drive API: https://developers.google.com/drive/api
- Check execution logs in Apps Script editor for detailed errors

