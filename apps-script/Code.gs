// === PrintX Apps Script: Drive Upload + Optional Sheet Logging ===
// Safely handles multi-file uploads (base64), size validation, and optional logging.
// Execute as "Me" and allow "Anyone" access for testing.

const FOLDER_ID = '1M21jnE7SEm-81HUufhnas24q42nrmM2K'; // your Drive folder
const SHEET_ID  = '19pxCvykhIsTDZOFYpCcaVu8To1lRDfP6-OF_NsiqdNo'; // your Sheet (optional)

const MAX_FILE_SIZE = 25 * 1024 * 1024;  // 25 MB max per decoded file (matches Next.js limit)
const MAX_TOTAL_SIZE = 45 * 1024 * 1024; // 45 MB total decoded per request (matches Next.js limit, safe for Apps Script)
const MAX_FILES = 10; // matches Next.js client-side limit

// --- CORS preflight handler ---
function doOptions(e) {
  return createResponse(200, { ok: true, method: 'OPTIONS' });
}

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

    // --- optional Sheet logging ---
    if (SHEET_ID && SHEET_ID.trim() !== '' && SHEET_ID !== 'YOUR_SHEET_ID_HERE' && orderData) {
      try {
        logToSheet(orderData, uploadedFiles, errors);
      } catch (sheetErr) {
        console.error('Sheet log error:', sheetErr);
        // Don't fail the request if sheet logging fails
      }
    }

    return createResponse(200, {
      success: true,
      files: uploadedFiles,
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

// --- Log orders to Sheet ---
function logToSheet(orderData, uploadedFiles, errors) {
  try {
    // Double-check SHEET_ID is valid (should be checked before calling, but be safe)
    if (!SHEET_ID || SHEET_ID.trim() === '' || SHEET_ID === 'YOUR_SHEET_ID_HERE') {
      return; // Silent return if sheet logging is not configured
    }
    
    const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(['Timestamp','Order ID','Total','VPA','Files Count','File IDs','File Names','Errors']);
    }

    const timestamp = new Date().toISOString();
    const orderId = orderData.orderId || '';
    const total = orderData.total || 0;
    const vpa = orderData.vpa || '';
    const fileIds = uploadedFiles.map(f => f.fileId).join(', ');
    const fileNames = uploadedFiles.map(f => f.name).join(', ');
    const errMsg = errors.length ? errors.map(e => (e.name?e.name+': ':'') + (e.error||'')).join('; ') : 'None';

    sheet.appendRow([timestamp, orderId, total, vpa, uploadedFiles.length, fileIds, fileNames, errMsg]);
  } catch (err) {
    console.error('logToSheet error:', err);
    // Don't throw - sheet logging failures shouldn't break file uploads
  }
}

// --- JSON response helper (with CORS headers) ---
function createResponse(statusCode, data) {
  const out = ContentService.createTextOutput(JSON.stringify(data));
  out.setMimeType(ContentService.MimeType.JSON);
  // Note: Apps Script automatically handles CORS for Web Apps deployed with "Anyone" access
  return out;
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