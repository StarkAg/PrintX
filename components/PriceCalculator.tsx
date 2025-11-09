import React from 'react';

export interface FileOptions {
  format: string;
  color: 'Color' | 'B&W';
  paperGSM: '40gsm' | '55gsm';
  binding?: 'None' | 'White binding' | 'Blue binding';
}

export interface FileWithOptions {
  file: File;
  options: FileOptions;
  preview?: string;
  pageCount?: number;
}

export interface PricingDetails {
  basePrice: number;
  paperSurcharge: number;
  bindingSurcharge: number;
  subtotal: number;
}

const PDF_ICON = (
  <div className="w-10 h-10 bg-black flex items-center justify-center rounded-md border border-gray-300 text-xs font-bold text-gray-300">
    PDF
  </div>
);

const GENERIC_ICON = (
  <div className="w-10 h-10 bg-black flex items-center justify-center rounded-md border border-gray-600 text-xs font-semibold text-white">
    FILE
  </div>
);

const FilePreview: React.FC<{ fileWithOptions: FileWithOptions }> = ({
  fileWithOptions,
}) => {
  const { file, preview } = fileWithOptions;

  // Show real thumbnail if available (for both images and PDFs)
  if (preview) {
    return (
      <img
        src={preview}
        alt={file.name}
        className="w-12 h-12 rounded-md object-cover border border-gray-600"
      />
    );
  }

  // Fallback icons if no preview available
  if (file.type === 'application/pdf') {
    return PDF_ICON;
  }

  return GENERIC_ICON;
};

/**
 * Calculate price for a single file based on options
 */
export function calculateFilePrice(
  options: FileOptions,
  pageCount: number = 1
): PricingDetails {
  // Base pricing
  const basePricePerPage = options.color === 'Color' ? 15 : 5;
  const basePrice = basePricePerPage * pageCount;

  // Paper surcharge
  const paperSurcharge = options.paperGSM === '55gsm' ? 2 * pageCount : 0;

  // Binding surcharge (only for PDFs)
  let bindingSurcharge = 0;
  if (options.binding) {
    if (options.binding === 'White binding') {
      bindingSurcharge = 20;
    } else if (options.binding === 'Blue binding') {
      bindingSurcharge = 25;
    }
  }

  const subtotal = basePrice + paperSurcharge + bindingSurcharge;

  return {
    basePrice,
    paperSurcharge,
    bindingSurcharge,
    subtotal,
  };
}

/**
 * Calculate total price for all files
 */
export function calculateTotal(files: FileWithOptions[]): number {
  return files.reduce((total, fileWithOptions) => {
    const pricing = calculateFilePrice(
      fileWithOptions.options,
      fileWithOptions.pageCount || 1
    );
    return total + pricing.subtotal;
  }, 0);
}

interface PriceCalculatorProps {
  files: FileWithOptions[];
}

export default function PriceCalculator({ files }: PriceCalculatorProps) {
  const total = calculateTotal(files);

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
      <h2 className="text-2xl font-bold mb-4 text-white">Order Summary</h2>
      
      <div className="space-y-3 mb-4">
        {files.map((fileWithOptions, index) => {
          const pricing = calculateFilePrice(
            fileWithOptions.options,
            fileWithOptions.pageCount || 1
          );
          
          return (
            <div
              key={index}
              className="flex justify-between items-center gap-6 py-2 border-b border-gray-600"
            >
              <div className="flex items-center gap-3 min-w-0">
                <FilePreview fileWithOptions={fileWithOptions} />
                <span className="text-white/90 truncate">
                  {fileWithOptions.file.name}
                </span>
              </div>
              <span className="text-gray-300 font-semibold">
                ₹{pricing.subtotal}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-4 border-t-2 border-white">
        <span className="text-xl font-bold text-white">Total</span>
        <span className="text-2xl font-bold text-gray-300">₹{total}</span>
      </div>
    </div>
  );
}

