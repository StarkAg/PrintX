import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get('title') || 'PrintX';
    const description = searchParams.get('description') || 'Professional Printing Services Made Simple';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '120px',
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                marginBottom: '40px',
                lineHeight: 1,
              }}
            >
              PRINTX
            </div>
            <div
              style={{
                fontSize: '32px',
                color: '#ffffff',
                opacity: 0.9,
                fontWeight: 300,
                letterSpacing: '0.05em',
                marginTop: '20px',
              }}
            >
              Professional Printing Services
            </div>
            <div
              style={{
                fontSize: '24px',
                color: '#ffffff',
                opacity: 0.7,
                fontWeight: 300,
                marginTop: '30px',
                maxWidth: '800px',
              }}
            >
              Upload your files, choose your options, and get high-quality prints delivered.
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}

