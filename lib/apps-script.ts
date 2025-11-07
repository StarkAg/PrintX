/**
 * Google Apps Script Integration for PrintX
 * 
 * This module handles file uploads via Google Apps Script Web App.
 * Much simpler than Google Cloud OAuth - no credentials needed!
 * 
 * Setup:
 * 1. Deploy Apps Script as Web App (see APPS_SCRIPT_SETUP.md)
 * 2. Set APPS_SCRIPT_WEB_APP_URL in .env.local
 * 3. Files will be uploaded to your configured Drive folder
 */

interface UploadResult {
  fileId: string;
  fileName: string;
  webViewLink?: string;
  webContentLink?: string;
}

interface AppsScriptResponse {
  success: boolean;
  files: Array<{
    name: string;
    fileId: string;
    webViewLink: string;
    webContentLink?: string; // Optional - may not be available for all file types
    size: number;
    mimeType: string;
  }>;
  errors?: Array<{
    index: number;
    name?: string;
    error: string;
  }>;
  uploadedCount: number;
  totalCount: number;
}

/**
 * Converts File object to base64 string (client-side)
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Converts Buffer to base64 string (server-side)
 */
function bufferToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

/**
 * Uploads a single file to Google Drive via Apps Script
 */
export async function uploadToDriveViaAppsScript(
  file: File,
  orderId?: string
): Promise<UploadResult> {
  const webAppUrl = process.env.APPS_SCRIPT_WEB_APP_URL;
  
  if (!webAppUrl) {
    console.warn('APPS_SCRIPT_WEB_APP_URL not configured. Using placeholder.');
    return {
      fileId: `placeholder_${Date.now()}_${file.name}`,
      fileName: file.name,
    };
  }

  try {
    const timestamp = new Date().toISOString();
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    
    console.log(
      `[${timestamp}] Uploading to Apps Script: ${file.name} (${fileSizeMB}MB)${orderId ? ` [Order: ${orderId}]` : ''}`
    );

    // Convert file to base64
    const base64Data = await fileToBase64(file);

    // Prepare request
    const requestData = {
      files: [
        {
          name: file.name,
          data: base64Data,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
        },
      ],
      orderData: orderId
        ? {
            orderId,
            timestamp: new Date().toISOString(),
          }
        : undefined,
    };

    // Send to Apps Script
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`Apps Script returned ${response.status}: ${response.statusText}`);
    }

    const result: AppsScriptResponse = await response.json();

    if (!result.success) {
      throw new Error('Apps Script upload failed');
    }

    if (result.errors && result.errors.length > 0) {
      console.error('Apps Script upload errors:', result.errors);
    }

    if (result.files.length === 0) {
      throw new Error('No files were uploaded');
    }

    const uploadedFile = result.files[0];

    console.log(
      `[${timestamp}] ✅ Apps Script upload successful: ${uploadedFile.name} (ID: ${uploadedFile.fileId})${orderId ? ` [Order: ${orderId}]` : ''}`
    );

    return {
      fileId: uploadedFile.fileId,
      fileName: uploadedFile.name,
      webViewLink: uploadedFile.webViewLink,
      webContentLink: uploadedFile.webContentLink || uploadedFile.webViewLink,
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    console.error(
      `[${new Date().toISOString()}] ❌ Apps Script upload failed: ${file.name} - ${errorMessage}`
    );
    throw new Error(`Failed to upload file via Apps Script: ${errorMessage}`);
  }
}

/**
 * Server-side: Upload files from buffers to Google Drive via Apps Script
 */
export async function uploadBuffersToDriveViaAppsScript(
  files: Array<{
    buffer: Buffer;
    filename: string;
    mimeType: string;
    size: number;
  }>,
  orderData?: {
    orderId: string;
    total: number;
    vpa: string;
  }
): Promise<UploadResult[]> {
  const webAppUrl = process.env.APPS_SCRIPT_WEB_APP_URL;

  if (!webAppUrl) {
    console.warn('APPS_SCRIPT_WEB_APP_URL not configured. Using placeholders.');
    return files.map((f) => ({
      fileId: `placeholder_${Date.now()}_${f.filename}`,
      fileName: f.filename,
    }));
  }

  try {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] Starting batch upload via Apps Script: ${files.length} file(s)${orderData?.orderId ? ` [Order: ${orderData.orderId}]` : ''}`
    );

    // Convert all buffers to base64
    const filesData = files.map((f) => ({
      name: f.filename,
      data: bufferToBase64(f.buffer),
      mimeType: f.mimeType,
      size: f.size,
    }));

    // Prepare request
    const requestData = {
      files: filesData,
      orderData: orderData
        ? {
            orderId: orderData.orderId,
            total: orderData.total,
            vpa: orderData.vpa,
            timestamp: new Date().toISOString(),
          }
        : undefined,
    };

    // Send to Apps Script
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error(`Apps Script returned ${response.status}: ${response.statusText}`);
    }

    const result: AppsScriptResponse = await response.json();

    if (!result.success) {
      throw new Error('Apps Script batch upload failed');
    }

    if (result.errors && result.errors.length > 0) {
      console.error('Apps Script upload errors:', result.errors);
    }

    console.log(
      `[${timestamp}] ✅ Batch upload completed: ${result.uploadedCount}/${result.totalCount} file(s)${orderData?.orderId ? ` [Order: ${orderData.orderId}]` : ''}`
    );

    // Map results (handle optional webContentLink)
    return result.files.map((f) => ({
      fileId: f.fileId,
      fileName: f.name,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink || f.webViewLink, // Fallback to webViewLink if not available
    }));
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    console.error(
      `[${new Date().toISOString()}] ❌ Apps Script batch upload failed: ${errorMessage}`
    );
    throw new Error(`Failed to upload files via Apps Script: ${errorMessage}`);
  }
}

/**
 * Client-side: Batch upload multiple files to Google Drive via Apps Script
 * Uses NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL for direct client-side uploads (bypasses Vercel 4.5MB limit)
 */
export async function uploadBatchToDriveViaAppsScript(
  files: Array<{ file: File; orderId?: string; options?: any; isPaymentScreenshot?: boolean }>,
  orderData?: {
    orderId: string;
    total: number;
    vpa: string;
  }
): Promise<UploadResult[]> {
  // Use public env var for client-side access (direct upload, no Vercel limit!)
  const webAppUrl = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL || process.env.APPS_SCRIPT_WEB_APP_URL)
    : process.env.APPS_SCRIPT_WEB_APP_URL;

  if (!webAppUrl) {
    const errorMsg = 'NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL not configured. Please set it in .env.local and restart the dev server.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  console.log(`[Upload] Using Apps Script URL: ${webAppUrl.substring(0, 50)}... (direct upload, bypassing Vercel)`);

  try {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] Starting batch upload via Apps Script: ${files.length} file(s)${orderData?.orderId ? ` [Order: ${orderData.orderId}]` : ''}`
    );

    // Convert all files to base64
    const filesData = await Promise.all(
      files.map(async (f) => ({
        name: f.file.name,
        data: await fileToBase64(f.file),
        mimeType: f.file.type || 'application/octet-stream',
        size: f.file.size,
        isPaymentScreenshot: f.isPaymentScreenshot || false,
        options: f.options,
      }))
    );

    // Prepare request
    const requestData = {
      files: filesData,
      orderData: orderData
        ? {
            orderId: orderData.orderId,
            total: orderData.total,
            vpa: orderData.vpa,
            timestamp: new Date().toISOString(),
          }
        : undefined,
    };

    // Send to Apps Script (direct upload, bypasses Vercel 4.5MB limit!)
    console.log(`[Upload] Sending ${files.length} file(s) to Apps Script...`);
    const requestStartTime = Date.now();
    
    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const requestDuration = Date.now() - requestStartTime;
    console.log(`[Upload] Request completed in ${requestDuration}ms, status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[Upload] Error response (${response.status}):`, errorText);
      
      let errorMessage = `Upload failed (${response.status}): ${response.statusText}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorData.message || errorData.details || errorMessage;
        
        // Add more context if available
        if (errorData.details) {
          errorMessage += ` - ${errorData.details}`;
        }
      } catch {
        if (errorText) {
          errorMessage = errorText.length > 200 ? errorText.substring(0, 200) + '...' : errorText;
        }
      }
      throw new Error(errorMessage);
    }

    const result: AppsScriptResponse = await response.json();
    console.log(`[Upload] Response received:`, {
      success: result.success,
      uploadedCount: result.uploadedCount,
      totalCount: result.totalCount,
      errors: result.errors?.length || 0
    });

    if (!result.success) {
      const errorMsg = result.errors?.map((e: any) => e.error || `${e.name || `File ${e.index}`}: ${e.error}`).join(', ') 
        || 'Apps Script batch upload failed';
      throw new Error(errorMsg);
    }

    if (result.errors && result.errors.length > 0) {
      console.error('Apps Script upload errors (some files may have failed):', result.errors);
      // Still continue if some files succeeded
    }

    console.log(
      `[${timestamp}] ✅ Batch upload completed: ${result.uploadedCount}/${result.totalCount} file(s)${orderData?.orderId ? ` [Order: ${orderData.orderId}]` : ''}`
    );

    // Map results (handle optional webContentLink)
    return result.files.map((f) => ({
      fileId: f.fileId,
      fileName: f.name,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink || f.webViewLink, // Fallback to webViewLink if not available
    }));
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    console.error(
      `[${new Date().toISOString()}] ❌ Apps Script batch upload failed: ${errorMessage}`
    );
    
    // Check if it's a CORS error
    if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      throw new Error(`CORS error: Make sure Apps Script is deployed with "Anyone" access. Error: ${errorMessage}`);
    }
    
    throw new Error(`Failed to upload files via Apps Script: ${errorMessage}`);
  }
}

