import type { NextApiRequest, NextApiResponse } from 'next';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';
import type { File as FormidableFile } from 'formidable';
import { uploadToDrive } from '../../lib/drive';
import { uploadBuffersToDriveViaAppsScript } from '../../lib/apps-script';

// Disable default body parser to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

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
    thumbnailPath?: string;
  }>;
  total: number;
  vpa: string;
  paymentScreenshotDriveId: string;
  paymentScreenshotPath?: string;
  createdAt: string;
  status: 'Pending' | 'Fulfilled';
}

function getOrdersFilePath(): string {
  return path.join(process.cwd(), 'data', 'orders.json');
}

function getUploadsDir(): string {
  return path.join(process.cwd(), 'public', 'uploads', 'payments');
}

function getThumbnailsDir(): string {
  return path.join(process.cwd(), 'public', 'uploads', 'thumbnails');
}

function ensureDirectories(): void {
  try {
    const ordersFilePath = getOrdersFilePath();
    const uploadsDir = getUploadsDir();
    const thumbnailsDir = getThumbnailsDir();
    
    if (!fs.existsSync(path.dirname(ordersFilePath))) {
      fs.mkdirSync(path.dirname(ordersFilePath), { recursive: true });
    }
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(thumbnailsDir)) {
      fs.mkdirSync(thumbnailsDir, { recursive: true });
    }
  } catch (error) {
    console.error('Error ensuring directories:', error);
  }
}

function readOrders(): Order[] {
  try {
    const ordersFilePath = getOrdersFilePath();
    if (!fs.existsSync(ordersFilePath)) {
      return [];
    }
    const data = fs.readFileSync(ordersFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading orders:', error);
    return [];
  }
}

function writeOrders(orders: Order[]) {
  try {
    const ordersFilePath = getOrdersFilePath();
    fs.writeFileSync(ordersFilePath, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error('Error writing orders:', error);
    throw error;
  }
}

function generateOrderId(): string {
  return Math.floor(10000 + Math.random() * 90000).toString();
}

// GET handler - return all orders
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Ensure directories exist on every request (idempotent)
  ensureDirectories();

  if (req.method === 'GET') {
    try {
      const orders = readOrders();
      res.status(200).json(orders);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ 
        error: 'Failed to fetch orders',
        message: error?.message || 'Unknown error'
      });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      // Configure formidable for file uploads
      // Vercel free tier limit: 50MB total request body
      const uploadsDir = getUploadsDir();
      const form = formidable({
        uploadDir: uploadsDir,
        keepExtensions: true,
        maxFileSize: 25 * 1024 * 1024, // 25MB per file (to stay well under 50MB total)
        maxTotalFileSize: 45 * 1024 * 1024, // 45MB total files (safety margin for Vercel free tier)
        multiples: true, // Allow multiple files
      });

      // Parse the form - this will consume the request stream
      const [fields, files] = await form.parse(req);
      
      // Type assertion for formidable files and fields
      const typedFields = fields as Record<string, string[]>;
      const typedFiles = files as Record<
        string,
        FormidableFile | FormidableFile[]
      >;

      // Parse order data from form fields
      const parsedOrderData = JSON.parse(
        typedFields.orderData?.[0] || '{}'
      );
      const paymentScreenshotField = typedFiles.paymentScreenshot;
      const paymentScreenshot = Array.isArray(paymentScreenshotField)
        ? paymentScreenshotField[0]
        : paymentScreenshotField;

      // Handle file uploads
      const filesField = typedFiles.files;
      const uploadedFiles = Array.isArray(filesField)
        ? filesField
        : filesField
        ? [filesField]
        : [];
      const fileData = parsedOrderData.files || [];

      // Generate order ID first (needed for Apps Script logging)
      const orderId = generateOrderId();

      // Upload files to Drive via Apps Script (preferred) or fallback to direct Drive API
      const useAppsScript = !!process.env.APPS_SCRIPT_WEB_APP_URL;
      let filesWithDriveIds: Array<{
        name: string;
        options: {
          format: string;
          color: string;
          paperGSM: string;
          binding?: string;
        };
        driveId: string;
        thumbnailPath?: string;
      } | null>;

      if (useAppsScript) {
        // Use Apps Script for upload (simpler, no OAuth needed)
        try {
          // Prepare files for Apps Script upload
          const filesForUpload = uploadedFiles
            .map((uploadedFile, index) => {
              const fileInfo = fileData[index];
              if (!fileInfo || !uploadedFile) return null;

              const filepath = uploadedFile.filepath;
              if (!filepath || !fs.existsSync(filepath)) return null;

              const fileBuffer = fs.readFileSync(filepath);
              const originalFilename = uploadedFile.originalFilename || fileInfo.name;

              return {
                buffer: fileBuffer,
                filename: originalFilename,
                mimeType: uploadedFile.mimetype || 'application/octet-stream',
                size: fileBuffer.length,
                fileInfo,
              };
            })
            .filter((f) => f !== null) as Array<{
            buffer: Buffer;
            filename: string;
            mimeType: string;
            size: number;
            fileInfo: any;
          }>;

          if (filesForUpload.length === 0) {
            throw new Error('No valid files to upload');
          }

          // Upload via Apps Script
          const orderDataForUpload = {
            orderId,
            total: parsedOrderData.total || 0,
            vpa: parsedOrderData.vpa || 'printx@yourbank',
          };

          const driveResults = await uploadBuffersToDriveViaAppsScript(
            filesForUpload.map((f) => ({
              buffer: f.buffer,
              filename: f.filename,
              mimeType: f.mimeType,
              size: f.size,
            })),
            orderDataForUpload
          );

          // Map results back to files with thumbnails
          filesWithDriveIds = await Promise.all(
            uploadedFiles.map(async (uploadedFile, index) => {
              const fileInfo = fileData[index];
              if (!fileInfo || !uploadedFile) return null;

              try {
                const filepath = uploadedFile.filepath;
                const originalFilename = uploadedFile.originalFilename || null;

                if (!filepath) {
                  console.error(`File ${index} has no filepath`);
                  return null;
                }

                const driveResult = driveResults[index];
                if (!driveResult) {
                  console.error(`No drive result for file ${index}`);
                  return null;
                }

                // Save thumbnail (from client-side generated data URL)
                const fileBuffer = fs.readFileSync(filepath);
                let thumbnailPath: string | undefined;
                const fileExt = path.extname(originalFilename || fileInfo.name).toLowerCase();
                const isImage = ['.png', '.jpg', '.jpeg'].includes(fileExt);
                const isPDF = fileExt === '.pdf';

                if (fileInfo.thumbnail && (isImage || isPDF)) {
                  try {
                    const thumbnailsDir = getThumbnailsDir();
                    const thumbnailExt = isPDF ? '.png' : fileExt;
                    const thumbnailFilename = `${uuidv4()}_thumb${thumbnailExt}`;
                    thumbnailPath = path.join('uploads', 'thumbnails', thumbnailFilename);
                    const fullThumbnailPath = path.join(process.cwd(), 'public', thumbnailPath);

                    if (fileInfo.thumbnail.startsWith('data:')) {
                      const base64Data = fileInfo.thumbnail.split(',')[1];
                      const thumbnailBuffer = Buffer.from(base64Data, 'base64');
                      fs.writeFileSync(fullThumbnailPath, thumbnailBuffer);
                    } else {
                      fs.writeFileSync(fullThumbnailPath, fileBuffer);
                    }
                  } catch (thumbError) {
                    console.error(`Error saving thumbnail for file ${index}:`, thumbError);
                  }
                } else if (isImage) {
                  try {
                    const thumbnailsDir = getThumbnailsDir();
                    const thumbnailFilename = `${uuidv4()}_thumb${fileExt}`;
                    thumbnailPath = path.join('uploads', 'thumbnails', thumbnailFilename);
                    const fullThumbnailPath = path.join(process.cwd(), 'public', thumbnailPath);
                    fs.writeFileSync(fullThumbnailPath, fileBuffer);
                  } catch (thumbError) {
                    console.error(`Error generating thumbnail for file ${index}:`, thumbError);
                  }
                }

                // Clean up temp file
                if (fs.existsSync(filepath)) {
                  fs.unlinkSync(filepath);
                }

                return {
                  name: fileInfo.name,
                  options: fileInfo.options,
                  driveId: driveResult.fileId,
                  thumbnailPath,
                };
              } catch (error) {
                console.error(`Error processing file ${index}:`, error);
                if (uploadedFile.filepath && fs.existsSync(uploadedFile.filepath)) {
                  try {
                    fs.unlinkSync(uploadedFile.filepath);
                  } catch (unlinkError) {
                    console.error('Error cleaning up file:', unlinkError);
                  }
                }
                return null;
              }
            })
          );
        } catch (appsScriptError: any) {
          console.error('Apps Script upload failed, falling back to placeholder:', appsScriptError);
          // Fallback to placeholder mode
          filesWithDriveIds = uploadedFiles.map((uploadedFile, index) => {
            const fileInfo = fileData[index];
            if (!fileInfo || !uploadedFile) return null;
            return {
              name: fileInfo.name,
              options: fileInfo.options,
              driveId: `error_${Date.now()}_${fileInfo.name}`,
              thumbnailPath: undefined,
            };
          });
        }
      } else {
        // Fallback: Use direct Drive API or placeholder
        filesWithDriveIds = (await Promise.all(
          uploadedFiles.map(async (uploadedFile, index) => {
            const fileInfo = fileData[index];
            if (!fileInfo || !uploadedFile) return null as any;

            try {
              const filepath = uploadedFile.filepath;
              const originalFilename = uploadedFile.originalFilename || null;

              if (!filepath) {
                console.error(`File ${index} has no filepath`);
                return null;
              }

              const fileBuffer = fs.readFileSync(filepath);
              const driveResult = await uploadToDrive(
                fileBuffer,
                originalFilename || fileInfo.name,
                orderId
              );

              // Save thumbnail (from client-side generated data URL)
              let thumbnailPath: string | undefined;
              const fileExt = path.extname(originalFilename || fileInfo.name).toLowerCase();
              const isImage = ['.png', '.jpg', '.jpeg'].includes(fileExt);
              const isPDF = fileExt === '.pdf';

              if (fileInfo.thumbnail && (isImage || isPDF)) {
                try {
                  const thumbnailsDir = getThumbnailsDir();
                  const thumbnailExt = isPDF ? '.png' : fileExt;
                  const thumbnailFilename = `${uuidv4()}_thumb${thumbnailExt}`;
                  thumbnailPath = path.join('uploads', 'thumbnails', thumbnailFilename);
                  const fullThumbnailPath = path.join(process.cwd(), 'public', thumbnailPath);

                  if (fileInfo.thumbnail.startsWith('data:')) {
                    const base64Data = fileInfo.thumbnail.split(',')[1];
                    const thumbnailBuffer = Buffer.from(base64Data, 'base64');
                    fs.writeFileSync(fullThumbnailPath, thumbnailBuffer);
                  } else {
                    fs.writeFileSync(fullThumbnailPath, fileBuffer);
                  }
                } catch (thumbError) {
                  console.error(`Error saving thumbnail for file ${index}:`, thumbError);
                }
              } else if (isImage) {
                try {
                  const thumbnailsDir = getThumbnailsDir();
                  const thumbnailFilename = `${uuidv4()}_thumb${fileExt}`;
                  thumbnailPath = path.join('uploads', 'thumbnails', thumbnailFilename);
                  const fullThumbnailPath = path.join(process.cwd(), 'public', thumbnailPath);
                  fs.writeFileSync(fullThumbnailPath, fileBuffer);
                } catch (thumbError) {
                  console.error(`Error generating thumbnail for file ${index}:`, thumbError);
                }
              }

              // Clean up temp file
              if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
              }

              return {
                name: fileInfo.name,
                options: fileInfo.options,
                driveId: driveResult.fileId,
                thumbnailPath,
              };
            } catch (error) {
              console.error(`Error processing file ${index}:`, error);
              if (uploadedFile.filepath && fs.existsSync(uploadedFile.filepath)) {
                try {
                  fs.unlinkSync(uploadedFile.filepath);
                } catch (unlinkError) {
                  console.error('Error cleaning up file:', unlinkError);
                }
              }
              return null as any;
            }
          })
        )) as Array<{
          name: string;
          options: {
            format: string;
            color: string;
            paperGSM: string;
            binding?: string;
          };
          driveId: string;
          thumbnailPath?: string;
        } | null>;
      }

      // Handle payment screenshot
      let paymentScreenshotDriveId = 'placeholder';
      let paymentScreenshotPath: string | undefined;

      if (paymentScreenshot && paymentScreenshot.filepath) {
        try {
          const screenshotBuffer = fs.readFileSync(paymentScreenshot.filepath);
          
          // Save to public directory for admin to view
          const screenshotFilename = `${uuidv4()}_${paymentScreenshot.originalFilename || 'payment.png'}`;
          paymentScreenshotPath = path.join('uploads', 'payments', screenshotFilename);
          const fullScreenshotPath = path.join(
            process.cwd(),
            'public',
            paymentScreenshotPath
          );
          fs.writeFileSync(fullScreenshotPath, screenshotBuffer);

          // Upload to Drive (or get placeholder)
          const driveResult = await uploadToDrive(
            screenshotBuffer,
            paymentScreenshot.originalFilename || 'payment.png'
          );
          paymentScreenshotDriveId = driveResult.fileId;

          // Clean up temp file
          if (fs.existsSync(paymentScreenshot.filepath)) {
            fs.unlinkSync(paymentScreenshot.filepath);
          }
        } catch (error) {
          console.error('Error processing payment screenshot:', error);
        }
      }

      // Create order
      const order: Order = {
        orderId,
        files: filesWithDriveIds.filter((f) => f !== null) as Order['files'],
        total: parsedOrderData.total || 0,
        vpa: parsedOrderData.vpa || 'printx@yourbank',
        paymentScreenshotDriveId,
        paymentScreenshotPath,
        createdAt: new Date().toISOString(),
        status: 'Pending',
      };

      // Save order
      const orders = readOrders();
      orders.push(order);
      writeOrders(orders);

      res.status(200).json({ success: true, orderId: order.orderId });
    } catch (error: any) {
      console.error('Error creating order:', error);
      if (error?.httpCode === 413 || error?.code === 1009) {
        res
          .status(413)
          .json({
            error: 'File size limit exceeded',
            message:
              'Uploaded files exceed the allowed size limit. Maximum: 25MB per file, 45MB total. Please compress your files or upload fewer files at a time.',
          });
        return;
      }
      res.status(500).json({
        error: 'Failed to create order',
        message: error?.message || 'Unknown error',
      });
    }
    return;
  }

  if (req.method === 'PATCH') {
    try {
      // PATCH requests need body parsing, but we disabled it globally
      // So we need to parse it manually for PATCH
      let body: { orderId?: string; status?: string } = {};
      
      // Read the request body
      const chunks: Buffer[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks).toString();
      
      if (data) {
        body = JSON.parse(data);
      }

      const { orderId, status } = body;

      if (!orderId || !status) {
        res.status(400).json({ error: 'Missing orderId or status' });
        return;
      }

      // Validate status
      if (status !== 'Pending' && status !== 'Fulfilled') {
        res.status(400).json({ error: 'Invalid status. Must be "Pending" or "Fulfilled"' });
        return;
      }

      const orders = readOrders();
      const orderIndex = orders.findIndex((o) => o.orderId === orderId);

      if (orderIndex === -1) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      orders[orderIndex].status = status as 'Pending' | 'Fulfilled';
      writeOrders(orders);

      res.status(200).json({ success: true, order: orders[orderIndex] });
    } catch (error: any) {
      console.error('Error updating order:', error);
      res.status(500).json({ 
        error: 'Failed to update order',
        message: error?.message || 'Unknown error'
      });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH']);
  res.status(405).json({ error: `Method ${req.method} not allowed` });
}

