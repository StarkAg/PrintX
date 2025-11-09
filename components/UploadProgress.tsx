import React, { useState, useEffect } from 'react';

interface UploadProgressProps {
  isUploading: boolean;
  totalFiles: number;
  currentProgress?: {
    uploaded: number;
    total: number;
    chunk: number;
    totalChunks: number;
  };
  onComplete?: () => void;
}

export default function UploadProgress({
  isUploading,
  totalFiles,
  currentProgress,
  onComplete,
}: UploadProgressProps) {
  const [optimisticProgress, setOptimisticProgress] = useState(0);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!isUploading) {
      if (displayProgress > 0) {
        // Complete the progress bar
        setDisplayProgress(100);
        setIsComplete(true);
        setTimeout(() => {
          setOptimisticProgress(0);
          setDisplayProgress(0);
          setIsComplete(false);
          onComplete?.();
        }, 500);
      }
      return;
    }

    // Reset on new upload
    setOptimisticProgress(0);
    setDisplayProgress(0);
    setIsComplete(false);

    // Optimistic progress: Start fast, then slow down
    let intervalId: NodeJS.Timeout;
    const startTime = Date.now();
    const duration = 1500; // 1.5 seconds for initial burst

    const updateOptimisticProgress = () => {
      const elapsed = Date.now() - startTime;
      let newOptimisticProgress = 0;
      
      // Fast initial progress (0-75% in first 1.5 seconds)
      if (elapsed < duration) {
        newOptimisticProgress = 75 * (elapsed / duration);
      } else {
        // Slower progress (75-92% over next 4 seconds)
        const slowProgress = 75 + 17 * Math.min((elapsed - duration) / 4000, 1);
        newOptimisticProgress = Math.min(slowProgress, 92);
      }

      setOptimisticProgress(newOptimisticProgress);

      // Update display progress smoothly
      setDisplayProgress((prev) => {
        const diff = newOptimisticProgress - prev;
        return prev + diff * 0.15; // Smooth interpolation
      });
    };

    intervalId = setInterval(updateOptimisticProgress, 30); // Update every 30ms for smooth animation

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isUploading, onComplete]);

  // Update display progress based on actual progress
  useEffect(() => {
    if (currentProgress && isUploading) {
      const actualProgress = (currentProgress.uploaded / currentProgress.total) * 100;
      
      // Blend optimistic and actual progress (take the higher value for smooth experience)
      // But don't let it go backwards
      setDisplayProgress((prev) => {
        const targetProgress = Math.max(prev, Math.max(optimisticProgress, actualProgress));
        const diff = targetProgress - prev;
        return prev + diff * 0.25; // Smooth transition to target
      });
    }
  }, [currentProgress, optimisticProgress, isUploading]);

  if (!isUploading && !isComplete) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-block mb-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-white/30 rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-white rounded-full border-t-transparent animate-spin"
                style={{ animationDuration: '1s' }}
              ></div>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {isComplete ? 'Upload Complete!' : 'Uploading Files'}
          </h3>
          <p className="text-white/90 text-sm">
            {isComplete
              ? 'Processing your order...'
              : currentProgress
              ? `Uploading ${currentProgress.uploaded} of ${currentProgress.total} files (Chunk ${currentProgress.chunk}/${currentProgress.totalChunks})`
              : `Preparing to upload ${totalFiles} file${totalFiles !== 1 ? 's' : ''}...`}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-white/80 mb-2">
            <span>Progress</span>
            <span>{Math.round(displayProgress)}%</span>
          </div>
          <div className="w-full bg-black/50 rounded-full h-3 overflow-hidden">
            {/* Background gradient */}
            <div className="h-full bg-black relative">
              {/* Progress fill with animated gradient */}
              <div
                className="h-full bg-gradient-to-r from-white via-gray-200 to-white transition-all duration-300 ease-out relative overflow-hidden"
                style={{
                  width: `${Math.min(displayProgress, 100)}%`,
                }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>
        </div>

        {/* File count indicator */}
        {currentProgress && (
          <div className="flex items-center justify-center space-x-2 text-sm text-white/80">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>
              {currentProgress.uploaded} / {currentProgress.total} files uploaded
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

