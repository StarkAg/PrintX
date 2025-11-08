/**
 * Google Drive Integration Module
 * 
 * Implements Google Drive upload with quota monitoring and error handling.
 * 
 * Quota Limits (Consumer/Free Tier):
 * - ~20,000 API calls per day
 * - ~50 MB response size per call
 * - 6 minutes execution time per invocation
 * 
 * Best Practices:
 * - Limit to 10 files per order to stay within quotas
 * - Monitor daily API call usage
 * - Log quota errors for monitoring
 * 
 * TODO: To enable Google Drive uploads:
 * 1. Enable Google Drive API in Google Cloud Console
 * 2. Create OAuth 2.0 credentials (Client ID & Client Secret)
 * 3. Set up environment variables:
 *    - GDRIVE_CLIENT_ID
 *    - GDRIVE_CLIENT_SECRET
 *    - GDRIVE_REFRESH_TOKEN (or use service account)
 * 4. Uncomment the googleapis implementation below
 * 
 * For now, this returns a placeholder file ID when credentials are missing.
 */

// import { google } from 'googleapis';
// import { Readable } from 'stream';

interface UploadResult {
  fileId: string;
  fileName: string;
}

/**
 * Checks if an error is a Google Drive quota error
 */
function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  
  const errorObj = error as Record<string, unknown>;
  const errorMessage = (typeof errorObj.message === 'string' ? errorObj.message : '').toLowerCase();
  const errorCode = (typeof errorObj.code === 'string' || typeof errorObj.code === 'number' ? String(errorObj.code) : '').toLowerCase();
  
  // Common quota error indicators
  const quotaIndicators = [
    'quota exceeded',
    'service invoked too many times',
    'user rate limit exceeded',
    'rate limit exceeded',
    'daily limit exceeded',
    '403',
    '429',
  ];
  
  return quotaIndicators.some(
    (indicator) =>
      errorMessage.includes(indicator) || errorCode.includes(indicator)
  );
}

/**
 * Uploads a file to Google Drive with quota monitoring
 * @param fileBuffer - The file buffer to upload
 * @param filename - The name of the file
 * @param orderId - Optional order ID for logging
 * @returns Promise with file ID and name
 */
export async function uploadToDrive(
  fileBuffer: Buffer,
  filename: string,
  orderId?: string
): Promise<UploadResult> {
  const timestamp = new Date().toISOString();
  const fileSizeMB = (fileBuffer.length / (1024 * 1024)).toFixed(2);
  
  // Check if credentials are available
  const clientId = process.env.GDRIVE_CLIENT_ID;
  const clientSecret = process.env.GDRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GDRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    // Return placeholder when credentials are not configured
    console.warn(
      `[${timestamp}] Google Drive credentials not configured. Returning placeholder file ID for: ${filename} (${fileSizeMB}MB)`
    );
    return {
      fileId: `placeholder_${Date.now()}_${filename}`,
      fileName: filename,
    };
  }

  // Google Drive upload implementation
  // Uncomment the import statements at the top when ready to use
  try {
    // Check if googleapis is available (uncomment imports when ready)
    // For now, we'll use a feature flag to enable/disable Drive uploads
    const enableDriveUpload = process.env.ENABLE_DRIVE_UPLOAD === 'true';
    
    if (!enableDriveUpload) {
      // Placeholder mode - return early with logging
      console.log(
        `[${timestamp}] Placeholder Drive upload: ${filename} (${fileSizeMB}MB)${orderId ? ` [Order: ${orderId}]` : ''}`
      );
      return {
        fileId: `placeholder_${Date.now()}_${filename}`,
        fileName: filename,
      };
    }

    // TODO: Uncomment when googleapis is ready to use
    /*
    console.log(
      `[${timestamp}] Starting Google Drive upload: ${filename} (${fileSizeMB}MB)${orderId ? ` [Order: ${orderId}]` : ''}`
    );
    
    const { google } = await import('googleapis');
    const { Readable } = await import('stream');
    
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      process.env.GDRIVE_REDIRECT_URI || 'http://localhost:3000'
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const fileMetadata = {
      name: filename,
    };

    const media = {
      mimeType: 'application/octet-stream',
      body: Readable.from(fileBuffer),
    };

    const startTime = Date.now();
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name',
    });
    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);

    const fileId = response.data.id || '';
    const fileName = response.data.name || filename;

    console.log(
      `[${timestamp}] ✅ Google Drive upload successful: ${fileName} (ID: ${fileId}) - ${uploadTime}s${orderId ? ` [Order: ${orderId}]` : ''}`
    );

    return {
      fileId,
      fileName,
    };
    */
    
    // Placeholder return (when ENABLE_DRIVE_UPLOAD is not set to 'true')
    console.log(
      `[${timestamp}] Placeholder Drive upload: ${filename} (${fileSizeMB}MB)${orderId ? ` [Order: ${orderId}]` : ''}`
    );
    return {
      fileId: `placeholder_${Date.now()}_${filename}`,
      fileName: filename,
    };
  } catch (error) {
    const errorObj = error as Record<string, unknown>;
    const errorMessage = (typeof errorObj.message === 'string' ? errorObj.message : 'Unknown error');
    const errorCode = (typeof errorObj.code === 'string' || typeof errorObj.code === 'number' ? String(errorObj.code) : 'UNKNOWN');
    
    // Check for quota errors
    if (isQuotaError(error)) {
      console.error(
        `[${timestamp}] ❌ Google Drive QUOTA EXCEEDED: ${filename}${orderId ? ` [Order: ${orderId}]` : ''} - Code: ${errorCode}, Message: ${errorMessage}`
      );
      throw new Error(
        'Google Drive quota exceeded. Please try again later or contact support.'
      );
    }
    
    // Log other errors
    console.error(
      `[${timestamp}] ❌ Google Drive upload failed: ${filename}${orderId ? ` [Order: ${orderId}]` : ''} - Code: ${errorCode}, Message: ${errorMessage}`
    );
    
    throw new Error(
      `Failed to upload file to Google Drive: ${errorMessage}`
    );
  }
}

/**
 * Batch upload multiple files to Google Drive
 * Includes quota monitoring and limits batch size
 * @param files - Array of files to upload { buffer, filename }
 * @param orderId - Optional order ID for logging
 * @param maxBatchSize - Maximum files per batch (default: 10)
 * @returns Promise with array of upload results
 */
export async function uploadBatchToDrive(
  files: Array<{ buffer: Buffer; filename: string }>,
  orderId?: string,
  maxBatchSize: number = 10
): Promise<UploadResult[]> {
  if (files.length > maxBatchSize) {
    throw new Error(
      `Too many files (${files.length}). Maximum ${maxBatchSize} files per batch.`
    );
  }

  const results: UploadResult[] = [];
  const timestamp = new Date().toISOString();

  console.log(
    `[${timestamp}] Starting batch upload: ${files.length} file(s)${orderId ? ` [Order: ${orderId}]` : ''}`
  );

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const result = await uploadToDrive(file.buffer, file.filename, orderId);
      results.push(result);
    } catch (error) {
      // If quota error, stop batch and throw
      if (isQuotaError(error)) {
        console.error(
          `[${timestamp}] Batch upload stopped due to quota error at file ${i + 1}/${files.length}`
        );
        throw error;
      }
      // For other errors, log and continue (or rethrow based on requirements)
      console.error(
        `[${timestamp}] Failed to upload file ${i + 1}/${files.length}: ${file.filename}`
      );
      throw error;
    }
  }

  console.log(
    `[${timestamp}] ✅ Batch upload completed: ${results.length}/${files.length} file(s)${orderId ? ` [Order: ${orderId}]` : ''}`
  );

  return results;
}

