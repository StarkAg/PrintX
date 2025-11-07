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

  const router = useRouter();

  const vpaDisplay = '8709964141@ptyes';

  const calculatedTotal = useMemo(() => calculateTotal(files), [files]);

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
      alert('Please upload a payment screenshot');
      return;
    }

    setIsSubmitting(true);

    try {
      const total = calculatedTotal;
      const formData = new FormData();

      // Add files
      files.forEach((fileWithOptions) => {
        formData.append('files', fileWithOptions.file);
      });

      // Add payment screenshot
      formData.append('paymentScreenshot', paymentScreenshot);

      // Add order data with thumbnail data URLs
      const orderData = {
        files: files.map((f) => ({
          name: f.file.name,
          options: f.options,
          thumbnail: f.preview, // Include thumbnail data URL
        })),
        total: calculatedTotal,
        vpa: vpaDisplay,
      };
      formData.append('orderData', JSON.stringify(orderData));

      const response = await fetch('/api/order', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit order');
      }

      const result = await response.json();
      setOrderId(result.orderId);
      setOrderSubmitted(true);
      console.log('Order submitted:', result);
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSubmitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-card border border-gray rounded-lg p-10 max-w-md text-center space-y-6">
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
            <p className="text-gray-300">
              We received your files and payment details. Hang tight while we
              prepare your confirmation.
            </p>
            {orderId && (
              <p className="text-gray-400 text-sm">
                Generating order ID <span className="text-white">{orderId}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Head>
        <title>PrintX - Simple Print Ordering</title>
        <meta name="description" content="Order prints easily with PrintX" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {stage === 'hero' && (
          <>
            {/* Hero Section */}
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-6xl md:text-8xl font-bold mb-8">
                  PrintX
                </h1>
                <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
                  Professional printing services made simple. Upload your files,
                  choose your options, and get high-quality prints delivered.
                </p>
                <button
                  onClick={() => setStage('upload')}
                  className="bg-white text-black px-12 py-6 rounded-lg text-2xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl border-2 border-white hover:border-gray-300"
                >
                  Get Started
                </button>
              </div>
            </div>

            {/* Info Section 1 - Always visible */}
            <div className="py-20">
              <div className="bg-card border border-gray rounded-lg p-8 md:p-12">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    <h2 className="text-4xl font-bold mb-6 text-white">
                      Why Choose PrintX?
                    </h2>
                    <ul className="space-y-4 text-gray-300">
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
                  <div className="bg-card-hover rounded-lg p-6">
                    <h3 className="text-2xl font-bold mb-4 text-white">
                      Quick Start
                    </h3>
                    <ol className="space-y-3 text-gray-300 list-decimal list-inside">
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
              <div className="bg-card border border-gray rounded-lg p-8 md:p-12">
                <h2 className="text-4xl font-bold mb-8 text-center text-white">
                  Transparent Pricing
                </h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-card-hover rounded-lg p-6">
                    <h3 className="text-2xl font-bold mb-4 text-white">
                      Base Pricing
                    </h3>
                    <div className="space-y-3 text-gray-300">
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
                  <div className="bg-card-hover rounded-lg p-6">
                    <h3 className="text-2xl font-bold mb-4 text-white">
                      Additional Options
                    </h3>
                    <div className="space-y-3 text-gray-300">
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
              <div className="bg-card border border-gray rounded-lg p-8 md:p-12">
                <h2 className="text-4xl font-bold mb-8 text-center text-white">
                  Features
                </h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="bg-card-hover rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">📄</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">
                      Multiple Formats
                    </h3>
                    <p className="text-gray-300">
                      Support for PDF, PNG, JPG, and JPEG files
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-card-hover rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">⚙️</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">
                      Custom Options
                    </h3>
                    <p className="text-gray-300">
                      Configure print settings for each file individually
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="bg-card-hover rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <span className="text-4xl">💳</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-white">
                      Easy Payment
                    </h3>
                    <p className="text-gray-300">
                      Quick UPI payment with QR code scanning
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="py-20">
              <div className="bg-card border border-gray rounded-lg p-12 text-center">
                <h2 className="text-4xl font-bold mb-6 text-white">
                  Ready to Print?
                </h2>
                <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                  Get started now with our simple and efficient printing
                  service. Upload your files and place your order in minutes.
                </p>
                <button
                  onClick={() => setStage('upload')}
                  className="bg-white text-black px-12 py-6 rounded-lg text-2xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-xl border-2 border-white hover:border-gray-300"
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
              <h1 className="text-4xl font-bold">Upload Files</h1>
              <button
                onClick={() => {
                  setStage('hero');
                  setFiles([]);
                }}
                className="text-gray-400 hover:text-white"
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
                    className="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg border-2 border-white hover:border-gray-300"
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
              <h1 className="text-4xl font-bold">Payment & Order Review</h1>
              <button
                onClick={() => setStage('upload')}
                className="text-gray-400 hover:text-white"
              >
                ← Back
              </button>
            </div>

            {/* Order Summary */}
            <PriceCalculator files={files} />

            {/* Payment QR Code */}
            <div className="bg-card border border-gray rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-white">
                Scan to Pay
              </h2>
              <div className="flex flex-col items-center space-y-4">
                <QRCodeDisplay
                  payload={upiPayload}
                  displayValue={vpaDisplay}
                  size={256}
                />
                <p className="text-gray-300 text-sm text-center">
                  Amount: ₹{calculatedTotal.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Payment Screenshot Upload */}
            <div className="bg-card border border-gray rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 text-white">
                Upload Payment Screenshot
              </h2>
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handlePaymentScreenshotChange}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white file:text-black hover:file:bg-gray-200"
              />
              {paymentScreenshot && (
                <p className="mt-2 text-green-400">
                  ✓ Screenshot selected: {paymentScreenshot.name}
                </p>
              )}
            </div>

            {/* Confirm Button */}
            <div className="flex justify-end">
              <button
                onClick={handleConfirmOrder}
                disabled={isSubmitting || !paymentScreenshot}
                className="bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg border-2 border-white hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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

