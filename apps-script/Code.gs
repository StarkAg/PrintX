// === PrintX Apps Script: Drive Upload + Optional Sheet Logging ===
// Safely handles multi-file uploads (base64), size validation, and optional logging.
// Execute as "Me" and allow "Anyone" access for testing.

const FOLDER_ID = '1M21jnE7SEm-81HUufhnas24q42nrmM2K'; // your Drive folder
const SHEET_ID  = '19pxCvykhIsTDZOFYpCcaVu8To1lRDfP6-OF_NsiqdNo'; // your Sheet (optional)

// Google Drive limits: 5TB per file, 750GB/day upload quota
// Apps Script limits: 6 min execution, 50MB response, 100MB request (but we can push higher)
// Increasing limits for larger files - Apps Script can handle up to 100MB request size
// For base64 encoding, 75MB file = ~100MB encoded, so we set MAX_FILE_SIZE to 75MB raw
const MAX_FILE_SIZE = 75 * 1024 * 1024;   // 75 MB max per file (becomes ~100MB when base64 encoded)
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500 MB total per request (safe for Apps Script execution time)
const MAX_FILES = 50; // Increased limit for more files

// --- CORS preflight handler ---
// Note: Google Apps Script Web Apps automatically handle CORS when deployed correctly
// This function is here for explicit handling, but may not be called by Apps Script

// --- Health check / Get order by ID ---
function doGet(e) {
  // Check if this is a health check or order lookup
  const orderId = e?.parameter?.orderId;
  
  // If orderId is provided, fetch order from Sheet
  if (orderId) {
    try {
      const order = getOrderFromSheet(orderId);
      if (order) {
        return createResponse(200, {
          success: true,
          order: order
        });
      } else {
        return createResponse(404, {
          success: false,
          error: 'Order not found',
          message: `Order with ID ${orderId} not found in Google Sheets`
        });
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      return createResponse(500, {
        success: false,
        error: 'Failed to fetch order',
        details: err.toString()
      });
    }
  }
  
  // Default: health check
  return createResponse(200, {
    status: 'ok',
    service: 'PrintX Drive Upload',
    timestamp: new Date().toISOString(),
    cors: 'enabled',
    message: 'If you see this, Apps Script is working. Make sure deployment is set to "Anyone" access for CORS.'
  });
}

// --- Main upload handler ---
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createResponse(400, { error: 'Invalid request: no postData' });
    }

    let requestData;
    try {
      requestData = JSON.parse(e.postData.contents);
    } catch (err) {
      return createResponse(400, { error: 'Invalid JSON payload', details: err.toString() });
    }

    const files = Array.isArray(requestData.files) ? requestData.files : [];
    const orderData = requestData.orderData || {};
    
    // Extract file options from the files array (they're included in each file object)
    // Store them in a map for easy lookup when logging to Sheet
    const fileOptionsMap = {};
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.name && f.options) {
        fileOptionsMap[f.name] = f.options;
      }
    }

    if (files.length === 0) {
      return createResponse(400, { error: 'No files provided' });
    }
    if (files.length > MAX_FILES) {
      return createResponse(400, { error: `Too many files. Max ${MAX_FILES}` });
    }

    let decodedTotalBytes = 0;
    const folder = getOrCreateFolder(FOLDER_ID);
    if (!folder) {
      return createResponse(500, { error: 'Failed to access/create Drive folder' });
    }

    const uploadedFiles = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f || !f.name || !f.data) {
        errors.push({ index: i, error: 'Missing file name or base64 data' });
        continue;
      }

      // --- sanitize filename ---
      let safeName = (f.name || 'file').toString().trim();
      safeName = safeName.replace(/[^a-zA-Z0-9._\- ]/g, '_');
      if (safeName.length === 0) safeName = 'file';

      try {
        // strip data URL prefix if present
        let b64 = f.data;
        if (b64.indexOf('base64,') !== -1) {
          b64 = b64.split('base64,')[1];
        }

        const bytes = Utilities.base64Decode(b64);
        const decodedSize = bytes.length;

        decodedTotalBytes += decodedSize;
        if (decodedSize > MAX_FILE_SIZE) {
          const fileSizeMB = (decodedSize / (1024 * 1024)).toFixed(2);
          const maxSizeMB = (MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
          errors.push({ index: i, name: f.name, error: `File too large: ${fileSizeMB}MB (max ${maxSizeMB}MB per file)` });
          continue;
        }
        if (decodedTotalBytes > MAX_TOTAL_SIZE) {
          const totalSizeMB = (decodedTotalBytes / (1024 * 1024)).toFixed(2);
          const maxTotalMB = (MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(0);
          errors.push({ index: i, name: f.name, error: `Total size too large: ${totalSizeMB}MB (max ${maxTotalMB}MB total)` });
          continue;
        }
        
        console.log(`Uploading file ${i + 1}/${files.length}: ${safeName} (${(decodedSize / 1024 / 1024).toFixed(2)}MB)`);

        const blob = Utilities.newBlob(bytes, f.mimeType || 'application/octet-stream', safeName);
        const driveFile = folder.createFile(blob);
        console.log(`✅ Successfully uploaded: ${safeName} (ID: ${driveFile.getId()})`);

        const fileId = driveFile.getId();
        const webViewLink = driveFile.getUrl();
        // Get download URL (may be null for some file types)
        let webContentLink = null;
        try {
          webContentLink = driveFile.getDownloadUrl();
        } catch (dlErr) {
          // Some file types don't support direct download URLs
          webContentLink = webViewLink;
        }

        uploadedFiles.push({
          name: safeName,
          fileId: fileId,
          webViewLink: webViewLink,
          webContentLink: webContentLink || webViewLink,
          size: decodedSize,
          mimeType: f.mimeType || 'application/octet-stream'
        });

      } catch (innerErr) {
        console.error(`Error uploading file ${i} (${f.name}):`, innerErr);
        console.error('Error details:', {
          message: innerErr.toString(),
          name: innerErr.name,
          line: innerErr.lineNumber
        });
        errors.push({ 
          index: i, 
          name: f.name, 
          error: innerErr.toString() || 'Unknown error during file upload'
        });
      }
    }

    // --- Identify payment screenshot and separate from regular files ---
    let paymentScreenshotFile = null;
    const regularFiles = [];
    
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const originalFile = files[i];
      // Check if this is the payment screenshot (by checking isPaymentScreenshot flag or name pattern)
      if (originalFile && (originalFile.isPaymentScreenshot === true || file.name.toLowerCase().includes('payment') || file.name.toLowerCase().includes('screenshot'))) {
        paymentScreenshotFile = file;
      } else {
        regularFiles.push(file);
      }
    }

    // --- Store order data in Sheet (includes payment screenshot if provided) ---
    let orderRowNumber = null;
    if (SHEET_ID && SHEET_ID.trim() !== '' && SHEET_ID !== 'YOUR_SHEET_ID_HERE' && orderData) {
      try {
        // Include payment screenshot info if found
        const orderDataWithScreenshot = {
          ...orderData,
          paymentScreenshotDriveId: paymentScreenshotFile ? paymentScreenshotFile.fileId : '',
          paymentScreenshotPath: paymentScreenshotFile ? paymentScreenshotFile.webViewLink : '',
          status: orderData.status || 'Pending'
        };
        // Use regular files (not payment screenshot) for order logging
        // Pass fileOptionsMap so we can store file options in the Sheet
        orderRowNumber = logToSheet(orderDataWithScreenshot, regularFiles, errors, fileOptionsMap);
      } catch (sheetErr) {
        console.error('Sheet log error:', sheetErr);
        // Don't fail the request if sheet logging fails
      }
    }

    return createResponse(200, {
      success: true,
      orderId: orderData?.orderId || '',
      orderRowNumber: orderRowNumber,
      files: regularFiles, // Return only regular files (not payment screenshot)
      paymentScreenshot: paymentScreenshotFile ? {
        fileId: paymentScreenshotFile.fileId,
        webViewLink: paymentScreenshotFile.webViewLink,
        name: paymentScreenshotFile.name
      } : null,
      errors: errors.length ? errors : undefined,
      uploadedCount: uploadedFiles.length,
      totalCount: files.length
    });

  } catch (err) {
    console.error('doPost fatal error:', err);
    console.error('Error stack:', err.stack);
    console.error('Error details:', JSON.stringify({
      message: err.toString(),
      name: err.name,
      line: err.lineNumber
    }));
    return createResponse(500, { 
      error: 'Internal server error', 
      details: err.toString(),
      message: 'Failed to process upload. Check Apps Script logs for details.'
    });
  }
}

// --- Get or create Drive folder ---
function getOrCreateFolder(folderId) {
  try {
    // If folder ID is provided and valid, use it
    if (folderId && folderId.trim() !== '' && folderId !== 'YOUR_DRIVE_FOLDER_ID_HERE') {
      return DriveApp.getFolderById(folderId);
    }
    // Otherwise, create or find "PrintX Orders" folder
    const root = DriveApp.getRootFolder();
    const name = 'PrintX Orders';
    const it = root.getFoldersByName(name);
    if (it.hasNext()) return it.next();
    return root.createFolder(name);
  } catch (err) {
    console.error('getOrCreateFolder error:', err);
    // Try to create folder in root as fallback
    try {
      return DriveApp.getRootFolder().createFolder('PrintX Orders');
    } catch (fallbackErr) {
      console.error('Fallback folder creation failed:', fallbackErr);
      return null;
    }
  }
}

// --- Store full order data in Sheet ---
function logToSheet(orderData, uploadedFiles, errors, fileOptionsMap) {
  try {
    // Double-check SHEET_ID is valid (should be checked before calling, but be safe)
    if (!SHEET_ID || SHEET_ID.trim() === '' || SHEET_ID === 'YOUR_SHEET_ID_HERE') {
      return; // Silent return if sheet logging is not configured
    }
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    
    // Initialize headers if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Timestamp',
        'Order ID',
        'Status',
        'Total',
        'VPA',
        'Files Count',
        'File Data (JSON)',
        'Payment Screenshot Drive ID',
        'Payment Screenshot Path',
        'Errors'
      ]);
    }

    const timestamp = new Date().toISOString();
    const orderId = orderData.orderId || '';
    const total = orderData.total || 0;
    const vpa = orderData.vpa || '';
    const status = orderData.status || 'Pending';
    
    // Store full file data as JSON for complete order information
    // Use fileOptionsMap to get options for each file
    const fileData = uploadedFiles.map(f => ({
      name: f.name,
      fileId: f.fileId,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink,
      size: f.size,
      mimeType: f.mimeType,
      options: (fileOptionsMap && fileOptionsMap[f.name]) || {
        format: 'A4',
        color: 'B&W',
        paperGSM: '40gsm',
        binding: 'None'
      }
    }));
    
    const fileDataJson = JSON.stringify(fileData);
    const paymentScreenshotDriveId = orderData.paymentScreenshotDriveId || '';
    const paymentScreenshotPath = orderData.paymentScreenshotPath || '';
    const errMsg = errors.length ? errors.map(e => (e.name?e.name+': ':'') + (e.error||'')).join('; ') : 'None';

    sheet.appendRow([
      timestamp,
      orderId,
      status,
      total,
      vpa,
      uploadedFiles.length,
      fileDataJson,
      paymentScreenshotDriveId,
      paymentScreenshotPath,
      errMsg
    ]);
    
    // Return the row number for reference
    return sheet.getLastRow();
  } catch (err) {
    console.error('logToSheet error:', err);
    // Don't throw - sheet logging failures shouldn't break file uploads
    return null;
  }
}

// --- JSON response helper (with explicit CORS headers) ---
function createResponse(statusCode, data) {
  const out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  
  // Note: Apps Script automatically adds CORS headers when deployed with "Anyone" access
  // This function is called by doGet and doPost which Apps Script handles
  return out;
}

// --- Handle CORS preflight requests explicitly ---
// Google Apps Script should handle this automatically, but we'll make it explicit
function doOptions(e) {
  // Return a simple response for OPTIONS requests
  // Apps Script will automatically add CORS headers when deployed as "Anyone"
  return ContentService.createTextOutput('')
    .setMimeType(ContentService.MimeType.TEXT);
}

// --- Get order from Sheet by Order ID ---
function getOrderFromSheet(orderId) {
  try {
    // Check if SHEET_ID is configured
    if (!SHEET_ID || SHEET_ID.trim() === '' || SHEET_ID === 'YOUR_SHEET_ID_HERE') {
      console.log('Sheet ID not configured, cannot fetch order');
      return null;
    }
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    const data = sheet.getDataRange().getValues();
    
    // First row is headers
    if (data.length < 2) {
      return null; // No orders in sheet
    }
    
    // Find header row
    const headers = data[0];
    const orderIdColIndex = headers.indexOf('Order ID');
    
    if (orderIdColIndex === -1) {
      console.error('Order ID column not found in sheet');
      return null;
    }
    
    // Find the row with matching order ID
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[orderIdColIndex] === orderId) {
        // Found the order - construct order object
        const timestampColIndex = headers.indexOf('Timestamp');
        const statusColIndex = headers.indexOf('Status');
        const totalColIndex = headers.indexOf('Total');
        const vpaColIndex = headers.indexOf('VPA');
        const fileDataColIndex = headers.indexOf('File Data (JSON)');
        const paymentScreenshotDriveIdColIndex = headers.indexOf('Payment Screenshot Drive ID');
        const paymentScreenshotPathColIndex = headers.indexOf('Payment Screenshot Path');
        
        // Parse file data from JSON
        let files = [];
        try {
          if (fileDataColIndex !== -1 && row[fileDataColIndex]) {
            files = JSON.parse(row[fileDataColIndex]);
          }
        } catch (parseErr) {
          console.error('Error parsing file data:', parseErr);
          files = [];
        }
        
        // Construct order object
        const order = {
          orderId: orderId,
          files: files.map((f) => ({
            name: f.name || '',
            options: f.options || {
              format: 'A4',
              color: 'B&W',
              paperGSM: '40gsm',
              binding: 'None'
            },
            driveId: f.fileId || '',
            webViewLink: f.webViewLink || '',
          })),
          total: totalColIndex !== -1 ? (parseFloat(row[totalColIndex]) || 0) : 0,
          vpa: vpaColIndex !== -1 ? (row[vpaColIndex] || '') : '',
          paymentScreenshotDriveId: paymentScreenshotDriveIdColIndex !== -1 ? (row[paymentScreenshotDriveIdColIndex] || '') : '',
          paymentScreenshotPath: paymentScreenshotPathColIndex !== -1 ? (row[paymentScreenshotPathColIndex] || '') : '',
          createdAt: timestampColIndex !== -1 ? (row[timestampColIndex] || new Date().toISOString()) : new Date().toISOString(),
          status: statusColIndex !== -1 ? (row[statusColIndex] || 'Pending') : 'Pending'
        };
        
        return order;
      }
    }
    
    // Order not found
    return null;
  } catch (err) {
    console.error('getOrderFromSheet error:', err);
    return null;
  }
}

// --- Local test runner (run in Apps Script IDE) ---
function testUpload() {
  const testData = {
    files: [{
      name: 'test.txt',
      data: Utilities.base64Encode('Hello, PrintX!'),
      mimeType: 'text/plain',
      size: 15
    }],
    orderData: { orderId: 'TEST123', total: 100, vpa: 'test@upi' }
  };
  const mockEvent = { postData: { contents: JSON.stringify(testData) } };
  const result = doPost(mockEvent);
  console.log(result.getContent());
}