import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import path from 'path';
import fs from 'fs';
import React from 'react';

const FileThumbnail = ({ file }: { file: OrderFile }) => {
  const [imageError, setImageError] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);
  
  // Ensure this only renders on client to avoid hydration mismatch
  React.useEffect(() => {
    setIsClient(true);
  }, []);
  
  // During SSR, always show icon to avoid hydration mismatch
  if (!isClient) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return (
        <span className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-md bg-black border border-white text-xs font-bold text-white">
          PDF
        </span>
      );
    }
    return (
      <span className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-md bg-black border border-gray-600 text-xs font-semibold text-white">
        IMG
      </span>
    );
  }
  
  // Client-side rendering with thumbnail support
  // Priority: Proxy thumbnail URL > Google Drive thumbnail URL > local thumbnail path > fallback icon
  if (file.driveId && !imageError) {
    // Use proxy endpoint for thumbnails (more reliable)
    const proxyThumbnailUrl = `/api/thumbnail/${file.driveId}?size=w200-h200`;
    return (
      <img
        src={proxyThumbnailUrl}
        alt={file.name}
        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md border border-gray-600"
        onError={() => {
          console.warn(`Failed to load thumbnail for ${file.name}, falling back to icon`);
          setImageError(true);
        }}
      />
    );
  }
  
  if (file.thumbnailUrl && !imageError) {
    // Fallback: Use direct Google Drive thumbnail URL
    return (
      <img
        src={file.thumbnailUrl}
        alt={file.name}
        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md border border-gray-600"
        onError={() => {
          console.warn(`Failed to load direct thumbnail for ${file.name}, falling back to icon`);
          setImageError(true);
        }}
      />
    );
  }

  if (file.thumbnailPath && !imageError) {
    // Fallback: local thumbnail path (for local dev)
    return (
      <img
        src={`/${file.thumbnailPath}`}
        alt={file.name}
        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md border border-gray-600"
        onError={() => setImageError(true)}
      />
    );
  }

  // Fallback: Show icon based on file type
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
      return (
        <span className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-md bg-black border border-white text-xs font-bold text-white">
          PDF
        </span>
      );
    }

  return (
    <span className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-md bg-black border border-gray-600 text-xs font-semibold text-white">
      IMG
    </span>
  );
};

interface OrderFile {
  name: string;
  options: {
    format: string;
    color: string;
    paperGSM: string;
    binding?: string;
  };
  driveId: string;
  thumbnailPath?: string; // Local thumbnail path (for local dev)
  thumbnailUrl?: string | null; // Google Drive thumbnail URL
  webViewLink?: string; // Google Drive view link
}

interface Order {
  orderId: string;
  files: OrderFile[];
  total: number;
  vpa: string;
  paymentScreenshotDriveId: string;
  paymentScreenshotPath?: string;
  createdAt: string;
  status: 'Pending' | 'Fulfilled';
}

interface OrderStatusProps {
  orderId: string;
  order: Order | null;
}

export default function OrderStatus({ orderId, order }: OrderStatusProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>Order #{orderId} - PrintX</title>
        <meta name="description" content="PrintX order status" />
      </Head>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-12 max-w-4xl space-y-6 sm:space-y-8">
        {/* Success Header */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 sm:p-10 text-center space-y-4 sm:space-y-6">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-white flex items-center justify-center bg-black/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white w-8 h-8 sm:w-10 sm:h-10"
              >
                <path d="m5 12 5 5L20 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-white">
                Order In Processing
              </h1>
              <p className="text-white/90 text-sm sm:text-base px-2">
                Thank you! Your order has been received and is currently being
                processed.
              </p>
            </div>
          </div>

          {/* Order ID Card */}
          <div className="bg-black border border-gray-600 rounded-lg p-4 sm:p-6 w-full sm:w-auto">
            <p className="text-xs sm:text-sm text-white/70 mb-1">Order ID</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-mono font-bold text-white break-all">
              {orderId}
            </p>
          </div>

          {/* Back Button */}
          <div className="pt-4 sm:pt-6">
            <Link
              href="/"
              className="inline-block bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-all transform hover:scale-105 shadow-lg border-2 border-white hover:border-gray-200 text-sm sm:text-base w-full sm:w-auto"
            >
              Go Back to Home
            </Link>
          </div>
        </div>

        {/* Order Details */}
        {order ? (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 sm:p-6 md:p-8 space-y-6">
            <h2 className="text-xl sm:text-2xl font-semibold text-white">
              Order Details
            </h2>

            {/* Order Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-xs sm:text-sm text-white/80 mb-1">Status</p>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      order.status === 'Fulfilled'
                        ? 'bg-black text-white border border-gray-600'
                        : 'bg-black text-white border border-white/50'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-white/80 mb-1">
                    Placed On
                  </p>
                  <p className="text-white text-sm sm:text-base">
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-xs sm:text-sm text-white/80 mb-1">Total</p>
                  <p className="text-white text-xl sm:text-2xl font-bold">
                    ₹{order.total.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-white/80 mb-1">VPA</p>
                  <p className="text-white text-sm sm:text-base font-mono break-all">
                    {order.vpa}
                  </p>
                </div>
              </div>
            </div>

            {/* Files Section */}
            <div className="space-y-4">
              <h3 className="text-lg sm:text-xl font-semibold text-white">
                Files ({order.files.length})
              </h3>
              <div className="space-y-3">
                {order.files.map((file, index) => (
                  <div
                    key={`${file.name}-${file.driveId}`}
                    className="border border-gray-600 rounded-lg p-3 sm:p-4 bg-black"
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0">
                        <FileThumbnail file={file} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm sm:text-base truncate mb-2">
                          {file.name}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-white/90">
                          <span className="bg-gray-800/30 px-2 py-1 rounded border border-gray-600">
                            {file.options.format}
                          </span>
                          <span className="bg-gray-800/30 px-2 py-1 rounded border border-gray-600">
                            {file.options.color}
                          </span>
                          <span className="bg-gray-800/30 px-2 py-1 rounded border border-gray-600">
                            {file.options.paperGSM}
                          </span>
                          {file.options.binding && file.options.binding !== 'None' && (
                            <span className="bg-gray-800/30 px-2 py-1 rounded border border-gray-600">
                              {file.options.binding}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Screenshot */}
            {order.paymentScreenshotPath && (
              <div className="space-y-3">
                <h3 className="text-lg sm:text-xl font-semibold text-white">
                  Payment Screenshot
                </h3>
                <div className="border border-gray-600 rounded-lg p-2 bg-black">
                  {/* Payment screenshot can be a Google Drive URL or local path */}
                  {order.paymentScreenshotPath.startsWith('http') ? (
                    <img
                      src={order.paymentScreenshotPath}
                      alt="Payment screenshot"
                      className="rounded-lg w-full h-auto max-h-64 sm:max-h-96 object-contain"
                      onError={(e) => {
                        // If Drive URL fails, try thumbnail URL
                        const target = e.target as HTMLImageElement;
                        if (order.paymentScreenshotDriveId) {
                          target.src = `https://drive.google.com/thumbnail?id=${order.paymentScreenshotDriveId}&sz=w800`;
                        }
                      }}
                    />
                  ) : (
                    <img
                      src={`/${order.paymentScreenshotPath}`}
                      alt="Payment screenshot"
                      className="rounded-lg w-full h-auto max-h-64 sm:max-h-96 object-contain"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 sm:p-8 text-center">
            <p className="text-white/90 text-sm sm:text-base">
              We could not find details for this order yet. Please refresh in a
              moment or contact support if the issue persists.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<OrderStatusProps> = async (
  context
) => {
  const orderId = String(context.params?.orderId || '');
  let order: Order | null = null;

  try {
    // Fetch from API endpoint (which fetches from Google Sheets via Apps Script)
    // Use absolute URL for server-side fetch
    const protocol = context.req.headers['x-forwarded-proto'] || 'http';
    const host = context.req.headers.host || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    
    try {
      const apiUrl = `${baseUrl}/api/order/${orderId}`;
      console.log(`[Order Page] Fetching order from: ${apiUrl}`);
      
      const apiResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (apiResponse.ok) {
        order = await apiResponse.json();
        console.log(`[Order Page] Successfully fetched order ${orderId} from API`);
      } else if (apiResponse.status === 404) {
        console.log(`[Order Page] Order ${orderId} not found in Google Sheets (404)`);
        // Order not found - will show "not found" message
      } else {
        const errorText = await apiResponse.text().catch(() => '');
        console.error(`[Order Page] API returned ${apiResponse.status}:`, errorText);
        // Fall back to local file if API fails
      }
    } catch (apiError) {
      console.error('[Order Page] Error fetching from API:', apiError);
      // Fall back to local file if API call fails
    }

    // Fallback: Try to load from local JSON file (for local development)
    // This won't work on Vercel (read-only filesystem), but it's useful for local dev
    if (!order) {
      try {
        const ordersPath = path.join(process.cwd(), 'data', 'orders.json');
        if (fs.existsSync(ordersPath)) {
          const fileData = fs.readFileSync(ordersPath, 'utf-8');
          const orders: Order[] = JSON.parse(fileData);
          order = orders.find((o) => o.orderId === orderId) || null;
          if (order) {
            console.log(`[Order Page] Found order ${orderId} in local file`);
          }
        }
      } catch (fileError) {
        console.error('[Order Page] Error loading from local file:', fileError);
        // This is expected on Vercel (read-only filesystem)
      }
    }
  } catch (error) {
    console.error('[Order Page] Error loading order data:', error);
  }

  return {
    props: {
      orderId,
      order,
    },
  };
};
