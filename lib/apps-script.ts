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

    // Vercel proxy limit: 4.5MB per request (hard limit)
    // Base64 encoding increases size by ~33%, and JSON adds overhead
    // Conservative chunk size: 2.5MB raw file data per chunk
    // This becomes ~3.3MB base64 + JSON overhead ≈ ~4MB total, safely under 4.5MB
    const MAX_RAW_FILE_SIZE_PER_CHUNK = 2.5 * 1024 * 1024; // 2.5MB raw file data per chunk
    const MAX_JSON_PAYLOAD_SIZE = 4.5 * 1024 * 1024; // 4.5MB absolute limit for JSON payload
    
    // Group files into chunks based on actual file sizes (not base64)
    interface Chunk {
      files: FileData[];
      rawSize: number; // Raw file size (before base64 encoding)
    }
    
    const chunks: Chunk[] = [];
    let currentChunk: FileData[] = [];
    let currentChunkRawSize = 0;
    
    for (const fileData of filesData) {
      const fileRawSize = fileData.size; // Raw file size
      
      // Estimate JSON payload size for this chunk if we add this file
      // Base64 size = rawSize * 4/3, plus JSON overhead (keys, structure, etc.)
      // Conservative estimate: base64 size + 20% for JSON overhead
      const estimatedBase64Size = fileRawSize * 1.33; // Base64 encoding
      const estimatedJsonOverhead = estimatedBase64Size * 0.2; // JSON structure overhead
      const estimatedTotalSize = estimatedBase64Size + estimatedJsonOverhead;
      
      // Check if adding this file would exceed the limit
      // Calculate total estimated size for current chunk + this file + orderData
      const orderDataSize = orderData ? JSON.stringify(orderData).length : 0;
      const currentChunkEstimatedSize = currentChunkRawSize * 1.33 * 1.2; // Current chunk estimated size
      const totalEstimatedSize = currentChunkEstimatedSize + estimatedTotalSize + orderDataSize + 500; // 500 bytes buffer
      
      // If this single file exceeds the limit, it's too large to upload
      if (estimatedTotalSize > MAX_JSON_PAYLOAD_SIZE) {
        throw new Error(`File "${fileData.name}" is too large (${(fileRawSize / (1024 * 1024)).toFixed(2)}MB). Maximum file size is approximately ${(MAX_JSON_PAYLOAD_SIZE / 1.33 / 1.2 / (1024 * 1024)).toFixed(1)}MB per file when uploaded through Vercel.`);
      }
      
      // If adding this file would exceed chunk limit, start a new chunk
      if (totalEstimatedSize > MAX_JSON_PAYLOAD_SIZE && currentChunk.length > 0) {
        // Save current chunk and start new one
        chunks.push({ files: [...currentChunk], rawSize: currentChunkRawSize });
        currentChunk = [fileData];
        currentChunkRawSize = fileRawSize;
      } else {
        // Add to current chunk
        currentChunk.push(fileData);
        currentChunkRawSize += fileRawSize;
      }
    }
    
    // Add remaining chunk
    if (currentChunk.length > 0) {
      chunks.push({ files: currentChunk, rawSize: currentChunkRawSize });
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
      const payloadSizeBytes = payloadString.length;
      const payloadSizeMB = payloadSizeBytes / (1024 * 1024);
      console.log(`[Upload] Chunk ${chunkIndex + 1} payload size: ${payloadSizeMB.toFixed(2)}MB (${chunk.files.length} file(s))`);
      
      // Vercel hard limit: 4.5MB
      if (payloadSizeBytes > MAX_JSON_PAYLOAD_SIZE) {
        const errorMsg = `Chunk ${chunkIndex + 1} payload size (${payloadSizeMB.toFixed(2)}MB) exceeds Vercel's 4.5MB limit. This should not happen - please report this issue.`;
        console.error(`[Upload] ${errorMsg}`);
        throw new Error(errorMsg);
      }
      
      if (payloadSizeMB > 4.0) {
        console.warn(`[Upload] Warning: Chunk ${chunkIndex + 1} payload is large (${payloadSizeMB.toFixed(2)}MB). Close to Vercel's 4.5MB limit.`);
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

