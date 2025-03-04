import React from 'react';

interface GenerationProgressProps {
  status: string;
  isGenerating: boolean;
}

export function GenerationProgress({ status, isGenerating }: GenerationProgressProps) {
  if (!isGenerating) return null;

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-emerald-100 dark:border-emerald-800">
      {/* Progress bar */}
      <div className="w-full max-w-md bg-emerald-100 dark:bg-emerald-900/30 rounded-full h-2 mb-6 overflow-hidden">
        <div 
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ 
            width: '50%',
            animation: 'progress 2s ease-in-out infinite'
          }}
        />
      </div>

      {/* Status message */}
      <div className="text-center">
        <h3 className="text-lg font-medium text-emerald-800 dark:text-emerald-200 mb-2">
          {status || 'Generating your spreadsheet...'}
        </h3>
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          This may take a few moments
        </p>
      </div>
    </div>
  );
}
