// === PrintX Apps Script: Drive Upload + Optional Sheet Logging ===
// Safely handles multi-file uploads (base64), size validation, and optional logging.
// Execute as "Me" and allow "Anyone" access for testing.

const FOLDER_ID = '1M21jnE7SEm-81HUufhnas24q42nrmM2K'; // your Drive folder
const SHEET_ID  = '19pxCvykhIsTDZOFYpCcaVu8To1lRDfP6-OF_NsiqdNo'; // your Sheet (optional)

// Google Drive limits: 5TB per file, 750GB/day upload quota
// Apps Script limits: 6 min execution, 50MB response, 100MB request
// For safety, we'll use reasonable limits that work well
const MAX_FILE_SIZE = 100 * 1024 * 1024;  // 100 MB max per file (well under Drive's 5TB limit)
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500 MB total per request (safe for Apps Script, under 6 min execution)
const MAX_FILES = 20; // Increased limit for better flexibility

// --- CORS preflight handler ---
// Note: Google Apps Script Web Apps automatically handle CORS when deployed correctly
// This function is here for explicit handling, but may not be called by Apps Script

// --- Health check ---
function doGet(e) {
  return createResponse(200, {
    status: 'ok',
    service: 'PrintX Drive Upload',
    timestamp: new Date().toISOString()
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
          errors.push({ index: i, name: f.name, error: `Decoded file too large (> ${MAX_FILE_SIZE} bytes)` });
          continue;
        }
        if (decodedTotalBytes > MAX_TOTAL_SIZE) {
          errors.push({ index: i, name: f.name, error: `Total decoded payload too large (exceeds ${MAX_TOTAL_SIZE} bytes)` });
          continue;
        }

        const blob = Utilities.newBlob(bytes, f.mimeType || 'application/octet-stream', safeName);
        const driveFile = folder.createFile(blob);

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
        errors.push({ index: i, name: f.name, error: innerErr.toString() });
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
        orderRowNumber = logToSheet(orderDataWithScreenshot, regularFiles, errors);
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
    return createResponse(500, { error: 'Internal server error', details: err.toString() });
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
function logToSheet(orderData, uploadedFiles, errors) {
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
    const fileData = uploadedFiles.map(f => ({
      name: f.name,
      fileId: f.fileId,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink,
      size: f.size,
      mimeType: f.mimeType,
      options: orderData.files && orderData.files.find(ff => ff.name === f.name)?.options || {}
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
  
  // Explicitly set CORS headers (though Apps Script should handle this automatically)
  // These headers help ensure CORS works properly
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