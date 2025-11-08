import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // File upload limits are handled in pages/api/order.ts via formidable
  
  // Content Security Policy headers
  // Note: We're using PDF.js with isEvalSupported: false to avoid eval
  // QRCode library doesn't use eval, so we can safely restrict it
async headers() {
        return [
          {
            source: '/:path*',
            headers: [
              {
                key: 'Content-Security-Policy',
                value: [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-inline'", // Removed unsafe-eval - PDF.js configured without eval
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: blob: https://drive.google.com https://lh3.googleusercontent.com https://*.googleusercontent.com",
                  "font-src 'self' data:",
                  "worker-src 'self' blob:",
                  "connect-src 'self' https://script.google.com https://*.googleapis.com https://drive.google.com",
                  // Report violations but don't block (for debugging)
                  // "report-uri /api/csp-report",
                ].join('; '),
              },
            ],
          },
        ];
      },
};

export default nextConfig;
