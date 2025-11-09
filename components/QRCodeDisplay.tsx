import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  payload: string;
  displayValue: string;
  size?: number;
}

export default function QRCodeDisplay({
  payload,
  displayValue,
  size = 256,
}: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const generateQR = async () => {
      try {
        const dataUrl = await QRCode.toDataURL(payload, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQR();
  }, [payload, size]);

  if (!qrDataUrl) {
    return (
      <div
        className="bg-white flex items-center justify-center rounded-lg border border-gray-200"
        style={{ width: size, height: size }}
      >
        <span className="text-gray-600 text-sm">Loading QR...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <div
        className="bg-white p-4 rounded-lg border-2 border-gray-300 shadow-lg"
        style={{ width: size + 32, height: size + 32 }}
      >
        <img
          src={qrDataUrl}
          alt="Payment QR Code"
          className="w-full h-full"
        />
      </div>
      <p className="text-[#282828] font-mono text-lg">{displayValue}</p>
    </div>
  );
}

