import type { NextApiRequest, NextApiResponse } from 'next';

// This API route acts as a proxy to Google Apps Script
// It handles CORS and forwards requests to Apps Script
// Note: This still has Vercel's 4.5MB limit, but we'll use it for order metadata
// and let Apps Script handle the actual file uploads

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Vercel's max limit
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers explicitly
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Use server-side environment variable (not NEXT_PUBLIC_)
  const appsScriptUrl = process.env.APPS_SCRIPT_WEB_APP_URL;

  if (!appsScriptUrl) {
    console.error('APPS_SCRIPT_WEB_APP_URL not configured in Vercel environment variables');
    res.status(500).json({ 
      error: 'Apps Script URL not configured',
      message: 'Please set APPS_SCRIPT_WEB_APP_URL in Vercel environment variables'
    });
    return;
  }
  
  console.log(`[Proxy] Forwarding request to Apps Script: ${appsScriptUrl.substring(0, 50)}...`);

  try {
    // Forward the request to Apps Script (server-to-server, no CORS needed)
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[Proxy] Apps Script returned ${response.status}:`, errorText);
      res.status(response.status).json({
        error: 'Apps Script request failed',
        status: response.status,
        details: errorText
      });
      return;
    }

    const data = await response.json();
    console.log(`[Proxy] Successfully forwarded request, received response with ${data.files?.length || 0} files`);

    // Forward the response with CORS headers already set
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('[Proxy] Error forwarding request:', error);
    res.status(500).json({
      error: 'Failed to proxy request to Apps Script',
      message: error?.message || 'Unknown error',
    });
  }
}

