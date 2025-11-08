import React, { useState, useRef } from 'react';
import {
  FileWithOptions,
  FileOptions,
  calculateFilePrice,
} from './PriceCalculator';

// Initialize PDF.js worker at module level
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((pdfjsLib) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  });
}

interface FileUploaderProps {
  files: FileWithOptions[];
  onFilesChange: (files: FileWithOptions[]) => void;
  onApplyToAll: (options: FileOptions) => void;
}

export default function FileUploader({
  files,
  onFilesChange,
  onApplyToAll,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const acceptedTypes = [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
  ];

  const generatePDFThumbnail = async (file: File): Promise<string> => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      
      // Ensure worker is set to local file (in case module-level init didn't run)
      if (typeof window !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
      }

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: false, // Disable system fonts to avoid eval
        verbosity: 0, // Suppress console warnings
        // Disable features that might use eval
        disableAutoFetch: true,
        disableStream: true,
      });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 0.5 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas context');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // PDF.js render method - returns RenderTask which has a promise property
      const renderTask = page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
      });
      await renderTask.promise;

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating PDF thumbnail:', error);
      // Return empty string if PDF thumbnail generation fails - will fallback to icon
      return '';
    }
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    // Vercel proxy limit: 4.5MB per request
    // Max file size: 2.5MB per file (becomes ~4MB when base64+JSON encoded)
    const maxFileSize = 2.5 * 1024 * 1024; // 2.5MB per file
    const maxFiles = 50; // Max files per order
    const newFiles: FileWithOptions[] = [];
    const skippedFiles: string[] = [];

    // Check total file count limit
    const totalFilesAfterAdd = files.length + selectedFiles.length;
    if (totalFilesAfterAdd > maxFiles) {
      alert(
        `Maximum ${maxFiles} files allowed per order. You currently have ${files.length} file(s) and tried to add ${selectedFiles.length}. Please remove some files or create a new order.`
      );
      return;
    }

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!acceptedTypes.includes(file.type)) {
        skippedFiles.push(`${file.name} (unsupported type)`);
        continue;
      }
      if (file.size > maxFileSize) {
        skippedFiles.push(
          `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB - exceeds 2.5MB limit)`
        );
        continue;
      }

      let preview: string | undefined;
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file);
      } else if (file.type === 'application/pdf') {
        preview = await generatePDFThumbnail(file);
      }

      const isPDF = file.type === 'application/pdf';
      const defaultOptions: FileOptions = {
        format: 'A4',
        color: 'B&W',
        paperGSM: '40gsm',
        ...(isPDF && { binding: 'None' }),
      };

      // TODO: Parse PDF page count
      // For now, assume 1 page per file
      const pageCount = isPDF ? 1 : 1;

      newFiles.push({
        file,
        options: defaultOptions,
        preview,
        pageCount,
      });
    }

    onFilesChange([...files, ...newFiles]);

    // Show warning for skipped files
    if (skippedFiles.length > 0) {
      alert(
        `Some files were skipped:\n${skippedFiles.join('\n')}\n\nMaximum file size is 2.5MB per file. Please compress files or split them into smaller files.`
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  };

  const updateFileOptions = (
    index: number,
    newOptions: Partial<FileOptions>
  ) => {
    const updatedFiles = [...files];
    updatedFiles[index] = {
      ...updatedFiles[index],
      options: {
        ...updatedFiles[index].options,
        ...newOptions,
      },
    };
    onFilesChange(updatedFiles);
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    onFilesChange(updatedFiles);
  };


  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
          dragging
            ? 'border-accent bg-card-hover'
            : 'border-gray bg-card hover:border-white'
        }`}
      >
        <input
          ref={fileInputRef}
          id="file-upload-input"
          name="files"
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
          aria-label="Upload files"
        />
        <p className="text-white text-xl mb-4">
          Drag and drop files here, or click to select
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg border-2 border-white hover:border-gray-300"
        >
          Choose Files
        </button>
        <p className="text-gray-medium text-sm mt-4">
          Accepted: PDF, PNG, JPG, JPEG
        </p>
        <p className="text-gray-500 text-xs mt-2">
          Limits: 2.5MB per file, max 50 files per order (Vercel 4.5MB request limit)
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          {files.map((fileWithOptions, index) => {
            const pricing = calculateFilePrice(
              fileWithOptions.options,
              fileWithOptions.pageCount || 1
            );

            return (
              <div
                key={index}
                className="bg-card border border-gray rounded-lg p-6 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Preview or Icon */}
                    {fileWithOptions.preview ? (
                      <img
                        src={fileWithOptions.preview}
                        alt={fileWithOptions.file.name}
                        className="w-20 h-20 object-cover rounded border border-gray"
                      />
                    ) : fileWithOptions.file.type === 'application/pdf' ? (
                      <div className="w-20 h-20 bg-red-600 flex items-center justify-center rounded border border-red-400">
                        <span className="text-white font-bold text-sm">PDF</span>
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-gray-700 flex items-center justify-center rounded border border-gray-500">
                        <span className="text-white font-semibold text-sm">IMG</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold truncate">
                        {fileWithOptions.file.name}
                      </h3>
                      <p
                        className={`text-sm mt-1 ${
                          fileWithOptions.file.size > 2.5 * 1024 * 1024
                            ? 'text-red-400'
                            : 'text-gray-medium'
                        }`}
                      >
                        {(fileWithOptions.file.size / (1024 * 1024)).toFixed(2)} MB
                        {fileWithOptions.file.size > 2.5 * 1024 * 1024 && (
                          <span className="ml-2 text-red-400">
                            ⚠ Exceeds 2.5MB limit
                          </span>
                        )}
                      </p>
                      <p className="text-white font-bold mt-2">
                        ₹{pricing.subtotal}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-400 hover:text-red-300 px-3 py-1"
                  >
                    Remove
                  </button>
                </div>

                {/* Options Panel */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray">
                  <div>
                    <label 
                      htmlFor={`format-${index}`}
                      className="block text-sm text-gray-medium mb-1"
                    >
                      Format
                    </label>
                    <select
                      id={`format-${index}`}
                      name={`format-${index}`}
                      value={fileWithOptions.options.format}
                      onChange={(e) =>
                        updateFileOptions(index, { format: e.target.value })
                      }
                      className="w-full bg-card-hover border border-gray text-white rounded px-3 py-2"
                      aria-label="Select paper format"
                    >
                      <option value="A4">A4</option>
                    </select>
                  </div>

                  <div>
                    <label 
                      htmlFor={`color-${index}`}
                      className="block text-sm text-gray-medium mb-1"
                    >
                      Color
                    </label>
                    <select
                      id={`color-${index}`}
                      name={`color-${index}`}
                      value={fileWithOptions.options.color}
                      onChange={(e) =>
                        updateFileOptions(index, {
                          color: e.target.value as 'Color' | 'B&W',
                        })
                      }
                      className="w-full bg-card-hover border border-gray text-white rounded px-3 py-2"
                      aria-label="Select color option"
                    >
                      <option value="B&W">B&W</option>
                      <option value="Color">Color</option>
                    </select>
                  </div>

                  <div>
                    <label 
                      htmlFor={`paper-gsm-${index}`}
                      className="block text-sm text-gray-medium mb-1"
                    >
                      Paper GSM
                    </label>
                    <select
                      id={`paper-gsm-${index}`}
                      name={`paper-gsm-${index}`}
                      value={fileWithOptions.options.paperGSM}
                      onChange={(e) =>
                        updateFileOptions(index, {
                          paperGSM: e.target.value as '40gsm' | '55gsm',
                        })
                      }
                      className="w-full bg-card-hover border border-gray text-white rounded px-3 py-2"
                      aria-label="Select paper GSM"
                    >
                      <option value="40gsm">40gsm</option>
                      <option value="55gsm">55gsm</option>
                    </select>
                  </div>

                  {fileWithOptions.file.type === 'application/pdf' && (
                    <div>
                      <label 
                        htmlFor={`binding-${index}`}
                        className="block text-sm text-gray-medium mb-1"
                      >
                        Binding
                      </label>
                      <select
                        id={`binding-${index}`}
                        name={`binding-${index}`}
                        value={fileWithOptions.options.binding || 'None'}
                        onChange={(e) =>
                          updateFileOptions(index, {
                            binding: e.target.value as
                              | 'None'
                              | 'White binding'
                              | 'Blue binding',
                          })
                        }
                        className="w-full bg-card-hover border border-gray text-white rounded px-3 py-2"
                        aria-label="Select binding option"
                      >
                        <option value="None">None</option>
                        <option value="White binding">White binding</option>
                        <option value="Blue binding">Blue binding</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Apply to All Button */}
                <button
                  onClick={() => onApplyToAll(fileWithOptions.options)}
                  className="w-full mt-4 py-2 border border-gray text-white rounded hover:bg-card-hover transition-colors text-sm"
                >
                  Apply this print configuration to all files
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

