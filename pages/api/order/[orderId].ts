import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Get order by ID from Google Sheets via Apps Script
 * 
 * This endpoint fetches order data from Google Sheets by calling Apps Script's doGet function.
 */

interface Order {
  orderId: string;
  files: Array<{
    name: string;
    options: {
      format: string;
      color: string;
      paperGSM: string;
      binding?: string;
    };
    driveId: string;
    webViewLink?: string;
    thumbnailUrl?: string | null; // Google Drive thumbnail URL
  }>;
  total: number;
  vpa: string;
  paymentScreenshotDriveId: string;
  paymentScreenshotPath?: string;
  createdAt: string;
  status: 'Pending' | 'Fulfilled';
}

interface AppsScriptResponse {
  success: boolean;
  order?: Order;
  error?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Order | { error: string; message?: string }>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return;
  }

  const orderId = req.query.orderId as string;

  if (!orderId) {
    res.status(400).json({ error: 'Order ID is required' });
    return;
  }

  try {
    // Get Apps Script URL from environment variable
    const appsScriptUrl = process.env.APPS_SCRIPT_WEB_APP_URL || process.env.NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL;

    if (!appsScriptUrl) {
      res.status(500).json({
        error: 'Apps Script URL not configured',
        message: 'Please set APPS_SCRIPT_WEB_APP_URL or NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL in environment variables'
      });
      return;
    }

    // Call Apps Script doGet with orderId parameter
    const url = new URL(appsScriptUrl);
    url.searchParams.set('orderId', orderId);

    console.log(`[Order API] Fetching order ${orderId} from Apps Script...`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[Order API] Apps Script returned ${response.status}:`, errorText);
      
      if (response.status === 404) {
        res.status(404).json({
          error: 'Order not found',
          message: `Order with ID ${orderId} was not found in Google Sheets`
        });
        return;
      }

      res.status(response.status).json({
        error: 'Failed to fetch order',
        message: errorText || `Apps Script returned ${response.status}`
      });
      return;
    }

    const data: AppsScriptResponse = await response.json();

    if (!data.success || !data.order) {
      res.status(404).json({
        error: 'Order not found',
        message: data.message || `Order with ID ${orderId} was not found`
      });
      return;
    }

    console.log(`[Order API] Successfully fetched order ${orderId}`);

    // Return the order
    res.status(200).json(data.order);
  } catch (error) {
    console.error('[Order API] Error fetching order:', error);
    res.status(500).json({
      error: 'Failed to fetch order',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

