# Testing Guide for PrintX Apps Script Integration

## ✅ Setup Complete

1. **Environment Variable Added:**
   - `APPS_SCRIPT_WEB_APP_URL` is now set in `.env.local`
   - Your Apps Script Web App URL is configured

2. **Dev Server:**
   - Server is running on http://localhost:3000
   - Restart if needed: `npm run dev`

## 🧪 Test the Integration

### Step 1: Test File Upload

1. **Open your browser:**
   - Go to http://localhost:3000

2. **Start an order:**
   - Click "Start Printing Now"
   - Upload 1-2 test files (PDF or images)
   - Configure print options
   - Click "Proceed to Payment"

3. **Complete payment:**
   - Scan or view the QR code
   - Upload a payment screenshot (or use a test image)
   - Click "Confirm & Proceed"

4. **Verify:**
   - You should see "Order Placed!" animation
   - You'll be redirected to order status page
   - Note the Order ID

### Step 2: Check Google Drive

1. **Open Google Drive:**
   - Go to https://drive.google.com/
   - Navigate to your folder (ID: `1M21jnE7SEm-81HUufhnas24q42nrmM2K`)
   - **Verify:** Your uploaded files should appear here

### Step 3: Check Google Sheet (Optional)

1. **Open Google Sheets:**
   - Go to https://sheets.google.com/
   - Open your sheet (ID: `19pxCvykhIsTDZOFYpCcaVu8To1lRDfP6-OF_NsiqdNo`)
   - **Verify:** Order details should be logged with:
     - Timestamp
     - Order ID
     - Total amount
     - VPA
     - File count
     - File IDs
     - File names

### Step 4: Check Admin Dashboard

1. **View orders:**
   - Go to http://localhost:3000/admin
   - **Verify:** Your test order appears in the list
   - Check that file thumbnails display correctly

## 🔍 Debugging

### Check Console Logs

**Browser Console:**
- Open DevTools (F12)
- Check for any errors
- Look for Apps Script upload logs

**Server Logs:**
- Check terminal where `npm run dev` is running
- Look for:
  - `✅ Apps Script upload successful`
  - `❌ Apps Script upload failed` (if errors)

### Common Issues

**Files not uploading?**
- Check `.env.local` has the correct URL
- Verify Apps Script is deployed with "Anyone" access
- Check browser console for CORS errors

**403/401 errors?**
- Re-authorize Apps Script
- Check deployment settings

**Files not in Drive?**
- Verify folder ID is correct
- Check Apps Script execution logs
- Ensure folder is accessible

### Apps Script Execution Logs

1. Go to https://script.google.com/
2. Open your PrintX project
3. Click "Executions" (clock icon)
4. Check recent executions for errors

## ✅ Success Indicators

- ✅ Files appear in Google Drive folder
- ✅ Order appears in admin dashboard
- ✅ Order details logged in Google Sheet
- ✅ File thumbnails display correctly
- ✅ No errors in console

## 🚀 Next Steps

Once testing is successful:
1. Deploy to Vercel
2. Add the same environment variable in Vercel
3. Test in production
4. Monitor usage and quotas

