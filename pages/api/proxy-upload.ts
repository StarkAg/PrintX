import type { NextApiRequest, NextApiResponse } from 'next';

// This API route acts as a proxy to Google Apps Script
// It handles CORS and forwards requests to Apps Script
// Note: This still has Vercel's 4.5MB limit, but we'll use it for order metadata
// and let Apps Script handle the actual file uploads

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb', // Vercel's max, but we'll try to stay under
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_WEB_APP_URL;

  if (!appsScriptUrl) {
    res.status(500).json({ error: 'Apps Script URL not configured' });
    return;
  }

  try {
    // Forward the request to Apps Script
    const response = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Forward the response
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Proxy error:', error);
    res.status(500).json({
      error: 'Failed to proxy request to Apps Script',
      message: error?.message || 'Unknown error',
    });
  }
}

