import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Metadata API Route
 * 
 * This route accepts ONLY metadata (orderId, total, vpa, filesMeta[])
 * and explicitly rejects requests containing file bytes.
 * 
 * Files should be uploaded directly to Apps Script, not through this endpoint.
 */

interface FilesMeta {
  name: string;
  size: number;
  mimeType: string;
  options?: {
    format: string;
    color: string;
    paperGSM: string;
    binding?: string;
  };
}

interface MetadataRequest {
  orderId: string;
  total: number;
  vpa: string;
  filesMeta: FilesMeta[];
}

// Vercel serverless function body size limit: 4.5MB
const MAX_BODY_SIZE = 4.5 * 1024 * 1024; // 4.5MB in bytes

/**
 * Detects if a request contains file bytes (base64 data or large data strings)
 */
function containsFileBytes(body: unknown): boolean {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const bodyObj = body as Record<string, unknown>;

  // Check if 'files' array contains 'data' fields (base64 encoded)
  if (bodyObj.files && Array.isArray(bodyObj.files)) {
    for (const file of bodyObj.files) {
      if (file && typeof file === 'object') {
        const fileObj = file as Record<string, unknown>;
        // If a file has a 'data' field, it contains base64 encoded bytes
        if (fileObj.data && typeof fileObj.data === 'string') {
          // Check if it's a base64 string (large enough to be actual file data)
          const dataStr = fileObj.data as string;
          // Base64 encoded data is typically > 1000 characters for even small files
          if (dataStr.length > 1000) {
            return true;
          }
        }
      }
    }
  }

  // Check request body size
  const bodyString = JSON.stringify(body);
  if (bodyString.length > MAX_BODY_SIZE) {
    return true;
  }

  return false;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  const origin = req.headers.origin;
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return;
  }

  try {
    // Parse request body
    let body: MetadataRequest;
    try {
      body = req.body as MetadataRequest;
    } catch (error) {
      res.status(400).json({ 
        error: 'Invalid JSON in request body',
        message: 'Request body must be valid JSON'
      });
      return;
    }

    // Check request body size (before processing)
    const bodyString = JSON.stringify(req.body);
    if (bodyString.length > MAX_BODY_SIZE) {
      res.status(413).json({
        error: 'Metadata too large',
        message: `Request body size (${(bodyString.length / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum allowed size (4.5MB). Send files directly to Apps Script or compress metadata.`
      });
      return;
    }

    // Detect and reject file bytes
    if (containsFileBytes(req.body)) {
      res.status(400).json({
        error: 'File bytes detected',
        message: 'Send files directly to APPS_SCRIPT_URL, not to metadata endpoint. This endpoint only accepts metadata (orderId, total, vpa, filesMeta[]).'
      });
      return;
    }

    // Validate required fields
    if (!body.orderId || !body.filesMeta || !Array.isArray(body.filesMeta)) {
      res.status(400).json({
        error: 'Missing required fields',
        message: 'Request must include: orderId (string), filesMeta (array), total (number), vpa (string)'
      });
      return;
    }

    // Validate metadata structure
    if (typeof body.total !== 'number' || body.total < 0) {
      res.status(400).json({
        error: 'Invalid total',
        message: 'total must be a non-negative number'
      });
      return;
    }

    if (!body.vpa || typeof body.vpa !== 'string') {
      res.status(400).json({
        error: 'Invalid VPA',
        message: 'vpa must be a non-empty string'
      });
      return;
    }

    // Validate filesMeta structure
    for (const fileMeta of body.filesMeta) {
      if (!fileMeta.name || typeof fileMeta.name !== 'string') {
        res.status(400).json({
          error: 'Invalid file metadata',
          message: 'Each file in filesMeta must have a name (string)'
        });
        return;
      }
      if (typeof fileMeta.size !== 'number' || fileMeta.size < 0) {
        res.status(400).json({
          error: 'Invalid file metadata',
          message: 'Each file in filesMeta must have a size (non-negative number)'
        });
        return;
      }
    }

    // TODO: Store metadata in database or Google Sheets
    // For now, just return success
    // In production, you might want to:
    // - Store in Google Sheets via Apps Script
    // - Store in Vercel Postgres
    // - Store in MongoDB
    console.log('[Metadata API] Received metadata:', {
      orderId: body.orderId,
      total: body.total,
      vpa: body.vpa,
      fileCount: body.filesMeta.length
    });

    res.status(200).json({ 
      ok: true,
      orderId: body.orderId,
      message: 'Metadata received successfully'
    });
  } catch (error) {
    console.error('[Metadata API] Error processing request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4.5mb', // Match Vercel's limit
    },
  },
};

