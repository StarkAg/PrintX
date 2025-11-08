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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[${new Date().toISOString()}] ❌ Apps Script batch upload failed: ${errorMessage}`
    );
    throw new Error(`Failed to upload files via Apps Script: ${errorMessage}`);
  }
}

/**
 * Client-side: Batch upload multiple files to Google Drive via Apps Script
 * Uses NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL for direct client-side uploads (bypasses Vercel 4.5MB limit)
 * 
 * Implements chunking to handle large payloads (Apps Script limit: ~45MB per request)
 * Files are grouped into chunks so each request stays under the limit
 */
export async function uploadBatchToDriveViaAppsScript(
  files: Array<{ 
    file: File; 
    orderId?: string; 
    options?: Record<string, unknown>; 
    isPaymentScreenshot?: boolean;
  }>,
  orderData?: {
    orderId: string;
    total: number;
    vpa: string;
  },
  onProgress?: (progress: { uploaded: number; total: number; chunk: number; totalChunks: number }) => void
): Promise<UploadResult[]> {
  // Use Vercel proxy to handle CORS (Apps Script doesn't return CORS headers for POST from browsers)
  // The proxy forwards to Apps Script server-to-server (no CORS needed)
  // We still chunk files to stay under Vercel's limits per request
  const proxyUrl = '/api/proxy-upload';
  const appsScriptUrl = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL)
    : undefined;

  if (!appsScriptUrl) {
    const errorMsg = 'NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL not configured. Please set it in .env.local and restart the dev server.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  console.log(`[Upload] Using Vercel proxy: ${proxyUrl} (handles CORS, forwards to Apps Script)`);

  try {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] Starting batch upload via Apps Script: ${files.length} file(s)${orderData?.orderId ? ` [Order: ${orderData.orderId}]` : ''}`
    );

    // Convert all files to base64 (with metadata)
    interface FileData {
      name: string;
      data: string;
      mimeType: string;
      size: number;
      isPaymentScreenshot: boolean;
      options?: Record<string, unknown>;
    }

    const filesData: FileData[] = await Promise.all(
      files.map(async (f) => ({
        name: f.file.name,
        data: await fileToBase64(f.file),
        mimeType: f.file.type || 'application/octet-stream',
        size: f.file.size,
        isPaymentScreenshot: f.isPaymentScreenshot || false,
        options: f.options,
      }))
    );

    // Vercel proxy limit: 4.5MB per request (but we can send multiple chunks)
    // Apps Script can handle larger requests, but Vercel proxy limits us
    // Chunk size: 3MB per chunk (becomes ~4MB when base64 encoded in JSON) to stay under 4.5MB
    const MAX_CHUNK_SIZE = 3 * 1024 * 1024; // 3MB per chunk (becomes ~4MB when base64 encoded in JSON)
    
    // Group files into chunks
    interface Chunk {
      files: FileData[];
      size: number;
    }
    
    const chunks: Chunk[] = [];
    let currentChunk: FileData[] = [];
    let currentChunkSize = 0;
    
    // Estimate size of orderData in JSON
    const orderDataSize = orderData ? JSON.stringify(orderData).length : 0;
    const baseOverhead = 1000; // Base JSON overhead (brackets, keys, etc.)
    
    for (const fileData of filesData) {
      // Estimate file entry size in JSON (name, data, mimeType, size, etc.)
      const fileEntrySize = JSON.stringify({
        name: fileData.name,
        data: fileData.data.substring(0, 100), // Sample
        mimeType: fileData.mimeType,
        size: fileData.size,
        isPaymentScreenshot: fileData.isPaymentScreenshot,
        options: fileData.options
      }).length;
      // Actual size will be larger due to full base64 data
      const estimatedSize = fileData.data.length + fileEntrySize;
      
      // Check if adding this file would exceed chunk size
      const wouldExceed = (currentChunkSize + estimatedSize + orderDataSize + baseOverhead) > MAX_CHUNK_SIZE;
      
      if (wouldExceed && currentChunk.length > 0) {
        // Save current chunk and start new one
        chunks.push({ files: [...currentChunk], size: currentChunkSize });
        currentChunk = [fileData];
        currentChunkSize = estimatedSize;
      } else {
        // Add to current chunk
        currentChunk.push(fileData);
        currentChunkSize += estimatedSize;
      }
    }
    
    // Add remaining chunk
    if (currentChunk.length > 0) {
      chunks.push({ files: currentChunk, size: currentChunkSize });
    }
    
    console.log(`[Upload] Split ${files.length} file(s) into ${chunks.length} chunk(s) for upload`);

    // Upload chunks sequentially
    const allResults: UploadResult[] = [];
    let uploadedCount = 0;
    
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      console.log(`[Upload] Uploading chunk ${chunkIndex + 1}/${chunks.length} (${chunk.files.length} file(s))...`);
      
      // Prepare request for this chunk
      const requestData = {
        files: chunk.files.map(f => ({
          name: f.name,
          data: f.data,
          mimeType: f.mimeType,
          size: f.size,
          isPaymentScreenshot: f.isPaymentScreenshot,
          options: f.options,
        })),
        orderData: orderData
          ? {
              orderId: orderData.orderId,
              total: orderData.total,
              vpa: orderData.vpa,
              timestamp: new Date().toISOString(),
              chunkIndex: chunkIndex + 1,
              totalChunks: chunks.length,
            }
          : undefined,
      };

      // Check payload size before sending
      const payloadString = JSON.stringify(requestData);
      const payloadSizeMB = payloadString.length / (1024 * 1024);
      console.log(`[Upload] Chunk ${chunkIndex + 1} payload size: ${payloadSizeMB.toFixed(2)}MB`);
      
      if (payloadString.length > MAX_CHUNK_SIZE * 1.5) {
        console.warn(`[Upload] Warning: Chunk ${chunkIndex + 1} payload is large (${payloadSizeMB.toFixed(2)}MB). Vercel proxy limit is 4.5MB.`);
      }

      // Send to Vercel proxy (handles CORS, forwards to Apps Script server-to-server)
      const requestStartTime = Date.now();
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: payloadString,
      });

      const requestDuration = Date.now() - requestStartTime;
      console.log(`[Upload] Chunk ${chunkIndex + 1} completed in ${requestDuration}ms, status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`[Upload] Error response for chunk ${chunkIndex + 1} (${response.status}):`, errorText);
        
        let errorMessage = `Upload failed (${response.status}): ${response.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.message || errorData.details || errorMessage;
          
          // Detect quota errors
          if (errorMessage.includes('QuotaExceeded') || errorMessage.includes('Service invoked too many times')) {
            errorMessage = 'Google Apps Script quota exceeded. Please try again later or reduce the number of files.';
          }
          
          // Detect file size errors
          if (errorMessage.includes('too large') || errorMessage.includes('File too large')) {
            errorMessage = 'File size exceeds Apps Script limit. Please compress files or split into smaller batches.';
          }
          
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
      console.log(`[Upload] Chunk ${chunkIndex + 1} response:`, {
        success: result.success,
        uploadedCount: result.uploadedCount,
        totalCount: result.totalCount,
        errors: result.errors?.length || 0
      });

      if (!result.success) {
        const errorMsg = result.errors?.map((e) => e.error || `${e.name || `File ${e.index}`}: ${e.error}`).join(', ') 
          || 'Apps Script batch upload failed';
        throw new Error(errorMsg);
      }

      if (result.errors && result.errors.length > 0) {
        console.error(`[Upload] Chunk ${chunkIndex + 1} errors (some files may have failed):`, result.errors);
        // Still continue if some files succeeded
      }

      // Collect results
      const chunkResults = result.files.map((f) => ({
        fileId: f.fileId,
        fileName: f.name,
        webViewLink: f.webViewLink,
        webContentLink: f.webContentLink || f.webViewLink,
      }));
      
      allResults.push(...chunkResults);
      uploadedCount += result.uploadedCount;
      
      // Report progress
      if (onProgress) {
        onProgress({
          uploaded: uploadedCount,
          total: files.length,
          chunk: chunkIndex + 1,
          totalChunks: chunks.length,
        });
      }
    }

    console.log(
      `[${timestamp}] ✅ Batch upload completed: ${uploadedCount}/${files.length} file(s) uploaded in ${chunks.length} chunk(s)${orderData?.orderId ? ` [Order: ${orderData.orderId}]` : ''}`
    );

    return allResults;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(
      `[${new Date().toISOString()}] ❌ Apps Script batch upload failed: ${errorMessage}`
    );
    
    // Check if it's a CORS error
    if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      throw new Error(`CORS error: Make sure Apps Script is deployed with "Anyone" access. Error: ${errorMessage}`);
    }
    
    // Check for quota errors
    if (errorMessage.includes('QuotaExceeded') || errorMessage.includes('Service invoked too many times')) {
      throw new Error('Google Apps Script quota exceeded. Please try again later or reduce the number of files.');
    }
    
    throw new Error(`Failed to upload files via Apps Script: ${errorMessage}`);
  }
}

