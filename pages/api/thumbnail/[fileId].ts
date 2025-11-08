import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * Proxy endpoint to fetch Google Drive thumbnails
 * 
 * This endpoint fetches thumbnails from Google Drive and serves them to the client.
 * This helps avoid CORS issues and provides authenticated access to thumbnails.
 */

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).json({ error: `Method ${req.method} not allowed` });
    return;
  }

  const fileId = req.query.fileId as string;
  const size = req.query.size as string || 'w200-h200';

  if (!fileId) {
    res.status(400).json({ error: 'File ID is required' });
    return;
  }

  try {
    // Try multiple thumbnail URL formats for maximum compatibility
    const thumbnailUrls = [
      `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}`,
      `https://drive.google.com/uc?export=view&id=${fileId}`,
      `https://lh3.googleusercontent.com/d/${fileId}=w200-h200`, // Alternative thumbnail URL
    ];

    let lastError: Error | null = null;

    // Try each URL until one works
    for (const thumbnailUrl of thumbnailUrls) {
      try {
        const response = await fetch(thumbnailUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/*',
          },
          redirect: 'follow',
        });

        if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
          // Success! Forward the image
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
          res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS
          
          const imageBuffer = await response.arrayBuffer();
          res.status(200).send(Buffer.from(imageBuffer));
          return;
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Continue to next URL
        continue;
      }
    }

    // All URLs failed
    console.error(`[Thumbnail API] All thumbnail URLs failed for file ${fileId}`, lastError);
    res.status(404).json({ 
      error: 'Thumbnail not found',
      message: 'File may not be publicly accessible or thumbnail not available'
    });
  } catch (error) {
    console.error('[Thumbnail API] Error fetching thumbnail:', error);
    res.status(500).json({
      error: 'Failed to fetch thumbnail',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

