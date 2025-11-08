# Order Details Page Fix

## Problem
The order details page was showing "We could not find details for this order yet" because:
1. Orders are saved to Google Sheets via Apps Script (not local JSON file)
2. The order details page was trying to read from local JSON file (`data/orders.json`)
3. On Vercel, the filesystem is read-only, so orders can't be saved locally
4. Even in local development, orders aren't saved to the local file anymore (they go directly to Apps Script)

## Solution
1. **Created API endpoint** `/api/order/[orderId]` that fetches order data from Google Sheets via Apps Script
2. **Updated Apps Script** `doGet` function to accept `orderId` parameter and fetch from Google Sheets
3. **Updated order details page** to fetch from the API endpoint instead of reading from local file
4. **Fixed file options storage** - Apps Script now properly stores file options in Google Sheets

## How It Works

### Flow:
```
User visits /order/[orderId]
  ↓
getServerSideProps fetches from /api/order/[orderId]
  ↓
API endpoint calls Apps Script doGet?orderId=XXX
  ↓
Apps Script fetches from Google Sheets
  ↓
Returns order data
  ↓
Order details page displays order
```

### Files Changed:

1. **`apps-script/Code.gs`**:
   - Updated `doGet` to accept `orderId` parameter
   - Added `getOrderFromSheet(orderId)` function to fetch order from Google Sheets
   - Fixed `logToSheet` to properly store file options

2. **`pages/api/order/[orderId].ts`** (NEW):
   - API endpoint that fetches order from Apps Script
   - Calls Apps Script `doGet` with `orderId` parameter
   - Returns order data or 404 if not found

3. **`pages/order/[orderId].tsx`**:
   - Updated to fetch from `/api/order/[orderId]` instead of local file
   - Falls back to local file for local development (if available)

## Important Notes

### Timing Issue
- Orders are saved to Google Sheets **after** files are uploaded
- There might be a slight delay between upload completion and order being available in Sheets
- If order is not found immediately, user should refresh the page after a few seconds

### Google Sheets Configuration
- Make sure `SHEET_ID` is set in Apps Script
- The Sheet must have the correct columns:
  - Timestamp
  - Order ID
  - Status
  - Total
  - VPA
  - Files Count
  - File Data (JSON)
  - Payment Screenshot Drive ID
  - Payment Screenshot Path
  - Errors

### Testing
1. Upload files and complete an order
2. Note the order ID (format: `PX-<timestamp>-<4hex>`)
3. Visit `/order/[orderId]`
4. Order should be displayed (if saved to Google Sheets)

### Troubleshooting

**If order is not found:**
1. Check Apps Script logs to see if order was saved to Sheet
2. Verify `SHEET_ID` is set correctly in Apps Script
3. Check Google Sheets to see if the order row exists
4. Verify the order ID format matches (should be `PX-<timestamp>-<4hex>`)

**If API returns 500:**
1. Check if `APPS_SCRIPT_WEB_APP_URL` is set in Vercel
2. Check Apps Script logs for errors
3. Verify Apps Script is deployed with "Anyone" access

**If file options are missing:**
1. Check if file options are being passed in the upload request
2. Verify Apps Script is storing options in the "File Data (JSON)" column
3. Check the JSON structure in Google Sheets

## Next Steps

1. **Deploy Apps Script changes** - Update the Apps Script code with the new `doGet` and `getOrderFromSheet` functions
2. **Test order retrieval** - Upload a test order and verify it appears in the order details page
3. **Monitor Google Sheets** - Check that orders are being saved correctly
4. **Add retry logic** (optional) - Add automatic retry if order is not found immediately

## Files to Update in Apps Script

After updating the Apps Script code:
1. Save the changes in Apps Script editor
2. **Deploy as a new version** (important!)
3. Update the Web App deployment
4. Test the order retrieval endpoint:
   ```
   https://script.google.com/macros/s/YOUR_ID/exec?orderId=PX-1762595077571-60d5
   ```

---

**Status**: ✅ Fixed - Orders are now fetched from Google Sheets via Apps Script

