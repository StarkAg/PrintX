import React, { useMemo, useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import FileUploader from '../components/FileUploader';
import PriceCalculator, {
  calculateTotal,
  FileWithOptions,
  FileOptions,
} from '../components/PriceCalculator';
import QRCodeDisplay from '../components/QRCodeDisplay';
import PapersBackground from '../components/PapersBackground';
import UploadProgress from '../components/UploadProgress';

type FlowStage = 'hero' | 'upload' | 'payment';

export default function Home() {
  const [stage, setStage] = useState<FlowStage>('hero');
  const [files, setFiles] = useState<FileWithOptions[]>([]);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    uploaded: number;
    total: number;
    chunk: number;
    totalChunks: number;
  } | null>(null);

  const router = useRouter();

  const vpaDisplay = '8709964141@ptyes';

  const calculatedTotal = useMemo(() => calculateTotal(files), [files]);

  // Calculate total upload size (files + payment screenshot)
  const totalUploadSize = useMemo(() => {
    const filesSize = files.reduce((sum, f) => sum + f.file.size, 0);
    const screenshotSize = paymentScreenshot?.size || 0;
    return filesSize + screenshotSize;
  }, [files, paymentScreenshot]);

  // Vercel proxy limit: 4.5MB per request
  // Max file size: 2.5MB per file (becomes ~4MB when base64+JSON encoded)
  const maxTotalSize = 500 * 1024 * 1024; // 500MB total (theoretical, but limited by 2.5MB per file)

  const upiPayload = useMemo(() => {
    const amount = calculatedTotal > 0 ? calculatedTotal.toFixed(2) : undefined;
    const basePayload = `upi://pay?pa=${encodeURIComponent(
      vpaDisplay
    )}&pn=${encodeURIComponent('PrintX Orders')}&cu=INR`;
    return amount ? `${basePayload}&am=${amount}` : basePayload;
  }, [calculatedTotal, vpaDisplay]);

  useEffect(() => {
    if (orderSubmitted && orderId) {
      const timer = setTimeout(() => {
        router.push(`/order/${orderId}`);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [orderSubmitted, orderId, router]);

  const handleApplyToAll = (options: FileOptions) => {
    const updatedFiles = files.map((fileWithOptions) => ({
      ...fileWithOptions,
      options,
    }));
    setFiles(updatedFiles);
  };

  const handleProceedToPayment = () => {
    if (files.length === 0) {
      alert('Please upload at least one file');
      return;
    }
    setStage('payment');
  };

  const handlePaymentScreenshotChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        setPaymentScreenshot(file);
      } else {
        alert('Please upload an image file (PNG or JPEG)');
      }
    }
  };

  const handleConfirmOrder = async () => {
    if (!paymentScreenshot) {
      setError('Please upload a payment screenshot');
      return;
    }

    // Check file count limit (Apps Script can handle up to 50 files)
    const maxFiles = 50;
    if (files.length > maxFiles) {
      setError(
        `Maximum ${maxFiles} files allowed per order. Please remove ${files.length - maxFiles} file(s) and try again.`
      );
      return;
    }

    // Check file sizes before uploading
    // Vercel proxy limit: 4.5MB per request
    // With base64 encoding (1.33x) and JSON overhead (1.2x), max file size ≈ 2.8MB per file
    // We use 2.5MB as the limit to stay safely under 4.5MB when chunked
    // Larger files will be rejected with a clear error message
    const maxFileSize = 2.5 * 1024 * 1024; // 2.5MB per file (becomes ~4MB when base64+JSON encoded)
    const maxTotalSize = 500 * 1024 * 1024; // 500MB total (theoretical, but limited by chunking)

    // Check individual file sizes
    for (const fileWithOptions of files) {
      if (fileWithOptions.file.size > maxFileSize) {
      setError(
        `File "${fileWithOptions.file.name}" is too large (${(
          fileWithOptions.file.size /
          (1024 * 1024)
        ).toFixed(2)}MB). Maximum file size is 2.5MB per file when uploading through Vercel. Please compress your files or split them into smaller files.`
      );
        return;
      }
    }

    // Check payment screenshot size
    if (paymentScreenshot.size > maxFileSize) {
      setError(
        `Payment screenshot is too large (${(
          paymentScreenshot.size /
          (1024 * 1024)
        ).toFixed(2)}MB). Maximum file size is 2.5MB. Please compress the screenshot.`
      );
      return;
    }

    // Check total size (files + payment screenshot)
    const filesSize = files.reduce((sum, f) => sum + f.file.size, 0);
    const totalSize = filesSize + paymentScreenshot.size;

    if (totalSize > maxTotalSize) {
      const filesSizeMB = (filesSize / (1024 * 1024)).toFixed(2);
      const screenshotSizeMB = (paymentScreenshot.size / (1024 * 1024)).toFixed(2);
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
      setError(
        `Total size exceeds limit. Files: ${filesSizeMB}MB + Payment screenshot: ${screenshotSizeMB}MB = ${totalSizeMB}MB. Individual files are limited to 2.5MB each due to Vercel's 4.5MB request limit. Please compress files or split them into smaller files.`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Generate order ID: PX-<timestamp>-<4hex>
      const timestamp = Date.now();
      const hex = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
      const orderId = `PX-${timestamp}-${hex}`;
      
      // Step 1: Send metadata to /api/metadata (without file bytes)
      console.log(`[Order] Step 1: Sending metadata for order ${orderId}...`);
      
      const filesMeta = files.map(f => ({
        name: f.file.name,
        size: f.file.size,
        mimeType: f.file.type || 'application/octet-stream',
        options: f.options,
      }));

      const metadataResponse = await fetch('/api/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          total: calculatedTotal,
          vpa: vpaDisplay,
          filesMeta,
        }),
      });

      if (!metadataResponse.ok) {
        const errorData = await metadataResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Metadata API returned ${metadataResponse.status}`);
      }

      console.log(`✅ Metadata saved for order ${orderId}`);

      // Step 2: Upload files directly to Apps Script (bypasses Vercel 4.5MB limit!)
      // Apps Script can handle up to 75MB per file when uploaded directly
      console.log(`[Order] Step 2: Uploading files directly to Apps Script...`);
      
      const { uploadBatchToDriveViaAppsScript } = await import('../lib/apps-script');

      // Prepare files for upload (including payment screenshot)
      const allFiles: Array<{ 
        file: File; 
        options?: Record<string, unknown>; 
        isPaymentScreenshot?: boolean;
        orderId?: string;
      }> = [
        ...files.map(f => ({ file: f.file, options: f.options as unknown as Record<string, unknown>, orderId })),
        { file: paymentScreenshot, isPaymentScreenshot: true, orderId },
      ];

      // Prepare order data
      const orderData = {
        orderId,
        total: calculatedTotal,
        vpa: vpaDisplay,
      };

      // Upload directly to Apps Script (no Vercel proxy, no 4.5MB limit!)
      // Chunking is handled automatically if payload exceeds 30MB
      console.log(`[Upload] Starting direct upload to Apps Script (bypassing Vercel)...`);
      console.log(`[Upload] Total files: ${allFiles.length}, Total size: ${(allFiles.reduce((sum, f) => sum + f.file.size, 0) / 1024 / 1024).toFixed(2)}MB`);
      
      const uploadResult = await uploadBatchToDriveViaAppsScript(
        allFiles, 
        orderData,
        (progress) => {
          console.log(`[Upload] Progress: ${progress.uploaded}/${progress.total} files (chunk ${progress.chunk}/${progress.totalChunks})`);
          setUploadProgress(progress);
        }
      );
      
      if (!uploadResult || uploadResult.length === 0) {
        throw new Error('File upload failed. No files were uploaded.');
      }

      console.log(`✅ Successfully uploaded ${uploadResult.length} file(s) to Google Drive`);

      // Payment screenshot is handled by Apps Script and stored in Google Sheets
      // Order is already created with all file information in Apps Script/Sheets

      setOrderId(orderId);
      setOrderSubmitted(true);
      setUploadProgress(null);
      console.log('Order submitted:', { orderId, uploadedFiles: uploadResult.length });
    } catch (error) {
      console.error('❌ Error submitting order:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      
      // Show detailed error message with helpful hints
      let errorMessage = error instanceof Error ? error.message : 'Failed to submit order';
      
      // Add helpful hints based on error type
      if (errorMessage.includes('CORS')) {
        errorMessage += '\n\nFix: Make sure Apps Script is deployed with "Anyone" access.';
      } else if (errorMessage.includes('413') || errorMessage.includes('too large')) {
        errorMessage += '\n\nFix: Reduce file sizes or upload fewer files.';
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        errorMessage += '\n\nFix: Check your internet connection and Apps Script URL.';
      } else if (errorMessage.includes('not configured') || errorMessage.includes('NEXT_PUBLIC_APPS_SCRIPT')) {
        errorMessage += '\n\nFix: Set NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL in .env.local and restart dev server.';
      } else if (errorMessage.includes('quota') || errorMessage.includes('QuotaExceeded')) {
        errorMessage += '\n\nFix: Google Apps Script quota exceeded. Please try again later or reduce the number of files.';
      }
      
      setError(errorMessage);
      setUploadProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSubmitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-10 max-w-md text-center space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center animate-pulse">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white w-12 h-12"
              >
                <path d="m5 12 5 5L20 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Order Placed!</h1>
            <p className="text-white/90">
              We received your files and payment details. Hang tight while we
              prepare your confirmation.
            </p>
            {orderId && (
              <p className="text-white/70 text-sm">
                Generating order ID <span className="text-white font-semibold">{orderId}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative">
      <Head>
        <title>PrintX</title>
        <meta name="description" content="Order prints easily with PrintX" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>

      {/* Papers Background Animation */}
      {stage === 'hero' && <PapersBackground />}

      {/* Upload Progress Overlay */}
      <UploadProgress
        isUploading={isSubmitting}
        totalFiles={files.length + (paymentScreenshot ? 1 : 0)}
        currentProgress={uploadProgress || undefined}
        onComplete={() => setUploadProgress(null)}
      />

      <main className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {stage === 'hero' && (
          <>
            {/* Hero Section */}
            <div className="min-h-screen flex items-center justify-center relative z-10">
              <div className="text-center relative">
                <div className="relative">
                  <h1 className="text-7xl md:text-9xl lg:text-[12rem] font-bold mb-8 text-white tracking-tight leading-none" style={{ 
                    fontFamily: '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, Arial, sans-serif',
                    fontWeight: 900,
                    letterSpacing: '-0.02em',
                    textTransform: 'uppercase'
                  }}>
                    PRINTX
                  </h1>
                  <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto font-light tracking-wide">
                    Professional printing services made simple. Upload your files,
                    choose your options, and get high-quality prints delivered.
                  </p>
                  <button
                    onClick={() => setStage('upload')}
                    className="bg-white text-black px-12 py-6 rounded-none text-xl font-bold hover:bg-white/90 transition-all border-2 border-white uppercase tracking-wider"
                    style={{ fontFamily: '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Ubuntu, Arial, sans-serif' }}
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </div>

            {/* Info Section 1 - Always visible */}
            <div className="py-20">
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h2 className="text-4xl font-bold mb-6 text-white">
                      Why Choose PrintX?
                    </h2>
                    <ul className="space-y-4 text-white/90">
                      <li className="flex items-start">
                        <span className="text-white mr-3 text-xl">
                          ✓
                        </span>
                        <span>
                          <strong className="text-white">
                            High-Quality Prints:
                          </strong>{' '}
                          Professional-grade printing with multiple paper
                          options
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-white mr-3 text-xl">
                          ✓
                        </span>
                        <span>
                          <strong className="text-white">
                            Flexible Options:
                          </strong>{' '}
                          Choose between Color or B&W, multiple paper weights,
                          and binding options
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-white mr-3 text-xl">
                          ✓
                        </span>
                        <span>
                          <strong className="text-white">
                            Easy Upload:
                          </strong>{' '}
                          Support for PDF, PNG, JPG, and JPEG files
                        </span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-white mr-3 text-xl">
                          ✓
                        </span>
                        <span>
                          <strong className="text-white">
                            Secure Payment:
                          </strong>{' '}
                          Pay securely via UPI with instant order confirmation
                        </span>
                      </li>
                    </ul>
                  </div>
                  <div className="bg-black rounded-lg p-6 border border-gray-800">
                    <h3 className="text-2xl font-bold mb-4 text-white">
                      Quick Start
                    </h3>
                    <ol className="space-y-3 text-white/90 list-decimal list-inside">
                      <li>Click the Get Started button to begin</li>
                      <li>Upload your files (PDF, images)</li>
                      <li>Configure print options for each file</li>
                      <li>Review pricing and proceed to payment</li>
                      <li>Complete payment via UPI</li>
                      <li>Receive your order confirmation</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Section 2 - Pricing Information */}
            <div className="py-20">
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-8 md:p-12">
                <h2 className="text-4xl font-bold mb-8 text-center text-white">
                  Transparent Pricing
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-black rounded-lg p-6 border border-gray-800">
                    <h3 className="text-2xl font-bold mb-4 text-white">
                      Base Pricing
                    </h3>
                    <div className="space-y-3 text-white/90">
                      <div className="flex justify-between">
                        <span>B&W Print (A4)</span>
                        <span className="text-white font-semibold">₹5/page</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Color Print (A4)</span>
                        <span className="text-white font-semibold">
                          ₹15/page
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-black rounded-lg p-6 border border-gray-800">
                    <h3 className="text-2xl font-bold mb-4 text-white">
                      Additional Options
                    </h3>
                    <div className="space-y-3 text-white/90">
                      <div className="flex justify-between">
                        <span>55gsm Paper</span>
                        <span className="text-white font-semibold">
                          +₹2/page
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>White Binding</span>
                        <span className="text-white font-semibold">
                          +₹20
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Blue Binding</span>
                        <span className="text-white font-semibold">
                          +₹25
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Section 3 - Features */}
            <div className="py-20">
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-8 md:p-12">
                <h2 className="text-4xl font-bold mb-8 text-center text-white">
                  Features
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="bg-black rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 border-2 border-gray-800">
                      <span className="text-4xl">📄</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">
                      Multiple Formats
                    </h3>
                    <p className="text-white/80">
                      Support for PDF, PNG, JPG, and JPEG files
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-black rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 border-2 border-gray-800">
                      <span className="text-4xl">⚙️</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">
                      Custom Options
                    </h3>
                    <p className="text-white/80">
                      Configure print settings for each file individually
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-black rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 border-2 border-gray-800">
                      <span className="text-4xl">💳</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">
                      Easy Payment
                    </h3>
                    <p className="text-white/80">
                      Quick UPI payment with QR code scanning
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="py-20">
              <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-12 text-center">
                <h2 className="text-4xl font-bold mb-6 text-white">
                  Ready to Print?
                </h2>
                <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                  Get started now with our simple and efficient printing
                  service. Upload your files and place your order in minutes.
                </p>
                <button
                  onClick={() => setStage('upload')}
                  className="bg-white text-black px-12 py-6 rounded-none text-2xl font-bold hover:bg-white/90 transition-all border-2 border-white uppercase tracking-wider"
                >
                  Start Printing Now
                </button>
              </div>
            </div>
          </>
        )}

        {stage === 'upload' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold text-white">Upload Files</h1>
              <button
                onClick={() => {
                  setStage('hero');
                  setFiles([]);
                }}
                className="text-white/70 hover:text-white transition-colors"
              >
                ← Back
              </button>
            </div>

            <FileUploader
              files={files}
              onFilesChange={setFiles}
              onApplyToAll={handleApplyToAll}
            />

            {files.length > 0 && (
              <div className="space-y-6">
                <PriceCalculator files={files} />

                <div className="flex justify-end">
                  <button
                    onClick={handleProceedToPayment}
                    className="bg-white text-black px-8 py-3 rounded-none font-bold hover:bg-white/90 transition-all border-2 border-white uppercase tracking-wider"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {stage === 'payment' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h1 className="text-4xl font-bold text-white">Payment & Order Review</h1>
              <button
                onClick={() => setStage('upload')}
                className="text-white/70 hover:text-white transition-colors"
              >
                ← Back
              </button>
            </div>

            {/* Order Summary */}
            <PriceCalculator files={files} />

            {/* Payment QR Code */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-white">
                Scan to Pay
              </h2>
              <div className="flex flex-col items-center space-y-4">
                <QRCodeDisplay
                  payload={upiPayload}
                  displayValue={vpaDisplay}
                  size={256}
                />
                <p className="text-white text-sm text-center">
                  Amount: ₹{calculatedTotal.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Payment Screenshot Upload */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-white">
                Upload Payment Screenshot
              </h2>
              <label 
                htmlFor="payment-screenshot-input"
                className="block text-sm text-white/90 mb-2"
              >
                Select payment confirmation screenshot
              </label>
              <input
                id="payment-screenshot-input"
                name="paymentScreenshot"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handlePaymentScreenshotChange}
                className="block w-full text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-sm file:font-semibold file:bg-white file:text-black hover:file:bg-white/90"
                aria-label="Upload payment screenshot"
              />
              {paymentScreenshot && (
                <div className="mt-2">
                  <p className="text-white/90">
                    ✓ Screenshot selected: {paymentScreenshot.name}
                  </p>
                  <p className="text-xs text-white/70 mt-1">
                    Size: {(paymentScreenshot.size / (1024 * 1024)).toFixed(2)}MB
                    {paymentScreenshot.size > 2.5 * 1024 * 1024 && (
                      <span className="text-red-400 ml-2 font-semibold">
                        (Too large! Max 2.5MB)
                      </span>
                    )}
                  </p>
                </div>
              )}
              <p className="text-xs text-white/70 mt-2">
                Maximum file size: 2.5MB per file
              </p>
            </div>

            {/* File Count & Size Info */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/70">Files:</span>
                <span
                  className={`font-semibold ${
                    files.length > 50 ? 'text-red-400' : 'text-white'
                  }`}
                >
                  {files.length} / 50
                </span>
              </div>
              {files.length > 50 && (
                <p className="text-red-400 text-xs">
                  ⚠ Maximum 50 files per order. Please remove{' '}
                  {files.length - 50} file(s).
                </p>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/70">Files size:</span>
                <span className="font-semibold text-white">
                  {(files.reduce((sum, f) => sum + f.file.size, 0) / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
              {paymentScreenshot && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-white/70">Payment screenshot:</span>
                  <span className="font-semibold text-white">
                    {(paymentScreenshot.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm border-t border-gray-800 pt-2">
                <span className="text-white/70">Total upload size:</span>
                <span
                  className={`font-semibold ${
                    totalUploadSize > maxTotalSize
                      ? 'text-red-400'
                      : 'text-white'
                  }`}
                >
                  {(totalUploadSize / (1024 * 1024)).toFixed(2)} MB / 500MB
                </span>
              </div>
              {totalUploadSize > maxTotalSize && (
                <p className="text-red-400 text-xs">
                  ⚠ Total size exceeds limit (including payment screenshot). Please compress files or remove some files.
                </p>
              )}
              {!paymentScreenshot && files.length > 0 && (
                <p className="text-white/70 text-xs">
                  ℹ Payment screenshot will be added to total size
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-950 border border-red-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-red-400 w-5 h-5 flex-shrink-0 mt-0.5"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-400 font-semibold mb-1">Error</p>
                    <p className="text-white/90 text-sm whitespace-pre-line">{error}</p>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-300"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Confirm Button */}
            <div className="flex justify-end">
              <button
                onClick={handleConfirmOrder}
                disabled={
                  isSubmitting ||
                  !paymentScreenshot ||
                  files.length > 50 ||
                  totalUploadSize > maxTotalSize ||
                  files.some((f) => f.file.size > 2.5 * 1024 * 1024) ||
                  (paymentScreenshot &&
                    paymentScreenshot.size > 2.5 * 1024 * 1024)
                }
                className="bg-white text-black px-8 py-3 rounded-none font-bold hover:bg-white/90 transition-all border-2 border-white uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Proceed'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


