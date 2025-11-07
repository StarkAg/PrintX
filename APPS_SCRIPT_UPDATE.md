# Apps Script Update Guide

## Quick Update Steps

1. **Open your Apps Script project**
   - Go to: https://script.google.com
   - Find your PrintX script project

2. **Replace Code.gs**
   - Copy the entire contents of `apps-script/Code.gs` from this repository
   - Paste into your Apps Script editor
   - Save (Ctrl+S / Cmd+S)

3. **Verify Configuration (Lines 5-6)**
   ```javascript
   const FOLDER_ID = '1M21jnE7SEm-81HUufhnas24q42nrmM2K'; // your Drive folder
   const SHEET_ID  = '19pxCvykhIsTDZOFYpCcaVu8To1lRDfP6-OF_NsiqdNo'; // your Sheet
   ```
   - Make sure these IDs match your existing folder and sheet
   - If different, update them to your actual IDs

4. **Test the Script**
   - Click "Run" → Select `doGet` function
   - Should return: `{"status":"ok","service":"PrintX Drive Upload",...}`
   - If errors, check the execution log

5. **Deploy (if needed)**
   - If you changed the script significantly, you may need to create a new deployment
   - Go to "Deploy" → "Manage deployments"
   - Create new version or update existing
   - Make sure Web App is set to "Execute as: Me" and "Who has access: Anyone"

## What Changed

### New Features
- ✅ Increased file limits: 100MB per file, 500MB total, 20 files
- ✅ Stores full order data in Google Sheets (not just logs)
- ✅ Handles payment screenshots separately
- ✅ Returns order ID and row number for tracking

### Sheet Structure
The updated script stores orders in your Google Sheet with these columns:
- Timestamp
- Order ID
- Status
- Total
- VPA
- Files Count
- File Data (JSON) - Full file information with options
- Payment Screenshot Drive ID
- Payment Screenshot Path
- Errors

## Troubleshooting

### Files not uploading?
- Check that `FOLDER_ID` is correct
- Verify the folder exists and has write permissions
- Check execution logs for errors

### Orders not saving to Sheet?
- Check that `SHEET_ID` is correct
- Verify the sheet exists and is accessible
- Check execution logs for errors

### Need to change folder or sheet?
1. Update `FOLDER_ID` or `SHEET_ID` in Code.gs
2. Save the script
3. Test with a small upload

## Important Notes

- **Your existing folder and sheet IDs are already in the updated code**
- **No data will be lost** - files still go to the same folder
- **Orders are now stored fully in Sheets** - check your sheet for complete order data
- **Higher limits** - you can now upload up to 100MB files and 500MB total

