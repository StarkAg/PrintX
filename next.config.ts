import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // File upload limits are handled in pages/api/order.ts via formidable
  
  // Content Security Policy headers
  // Note: PDF.js requires 'unsafe-eval' for some operations
  // This is a known limitation when using PDF.js in the browser
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for PDF.js
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "font-src 'self' data:",
              "worker-src 'self' blob:",
              "connect-src 'self' https://script.google.com https://*.googleapis.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
