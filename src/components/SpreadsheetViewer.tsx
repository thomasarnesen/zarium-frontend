import React, { useEffect, useState, useRef } from 'react';
import { Download } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

interface SpreadsheetViewerProps {
  previewImage: string | null;
  isGenerating: boolean;
  generationStatus: string;
  formatting?: {
    hasChart: boolean;
    downloadUrl: string;
  } | null;
  planType?: string;
}

export function SpreadsheetViewer({ 
  previewImage, 
  isGenerating, 
  generationStatus,
  formatting,
  planType 
}: SpreadsheetViewerProps) {
  const { user } = useAuthStore();
  const token = user?.token;
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.85);

  // Add custom style for the slider thumb
  useEffect(() => {
    // Add a style element to the document head
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .slider-thumb::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #059669;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
      
      .slider-thumb::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #059669;
        cursor: pointer;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
    `;
    document.head.appendChild(styleElement);
    
    // Clean up the style element on component unmount
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Log when preview image changes
  useEffect(() => {
    if (previewImage) {
      console.log("Preview image received, length:", previewImage.length);
      setImageError(false);
    } else {
      console.log("No preview available");
    }
  }, [previewImage]);

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setScale(newValue / 100);
    console.log("Zoom changed to:", newValue);
  };

  const handleZoomClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
  };

  const handleDownload = async () => {
    if (!formatting?.downloadUrl) {
      console.error("No download URL available");
      return;
    }
   
    try {
      console.log("Downloading from:", formatting.downloadUrl);
      const response = await api.fetch(formatting.downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed with status:', response.status, errorText);
        throw new Error('Download failed');
      }
     
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'generated-excel.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      console.log("Download completed successfully");
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'Processing':
        return "Processing your request...";
      case 'Thinking':
        return "Setting up and structuring your document...";
      case 'Generating':
        return "Creating your spreadsheet..."; 
      case 'Finalizing':
        return "Finalizing your document...\nPlease be patient";
      case 'Analyzing your requirements...':
        return "Analyzing your requirements...";
      case 'Designing spreadsheet structure...':
        return "Designing spreadsheet structure...";
      case 'Generating Excel file...':
        return "Generating Excel file...";
      case 'Complete':
        return "Generation complete!";
      default:
        return status || "Processing your request...";
    }
  };

  return (
    <div className="relative">
      <div className="flex items-start">
        {/* Main spreadsheet viewer container with fixed size */}
        <div className="flex flex-col"> 
          <div 
            className="overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-sm relative"
            style={{ 
              width: '1088px', 
              height: '648px'
            }} 
          >
            {isGenerating && (
              <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-sm mx-4">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-10 w-10 border-2 border-emerald-500 border-t-transparent" />
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-lg font-medium text-emerald-600 dark:text-emerald-400">
                        {getStatusDescription(generationStatus)}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            )}
           
            {/* Content container with built-in overflow scrolling */}
            <div
              ref={containerRef}
              className="w-full h-full overflow-auto"
              style={{ pointerEvents: isGenerating ? 'none' : 'auto' }}
            >
              <div className="min-w-full min-h-full">
                {previewImage ? (
                  <div 
                    style={{
                      transform: `scale(${scale})`,
                      transition: 'transform 0.1s ease-out',
                      cursor: 'grab',
                      transformOrigin: 'top left',
                      width: `${100 / scale}%`,  /* Make content wider when zoomed in */
                      height: `${100 / scale}%`, /* Make content taller when zoomed in */
                      minHeight: '648px',        /* Ensure minimum size matches container */
                      minWidth: '1088px'         /* Ensure minimum size matches container */
                    }}
                  >
                    <img
                      src={previewImage || ''}
                      alt="Excel preview"
                      className="max-w-none"
                      style={{
                        imageRendering: '-webkit-optimize-contrast',
                        display: 'block'
                      }}
                      onError={() => {
                        console.error("Image failed to load");
                        setImageError(true);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-400">
                      {imageError ? "Failed to load preview" : "No preview available"}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right side controls (download and zoom) - positioned closer to the viewer */}
        <div className="ml-2 flex flex-col items-center">
          {/* Download Button at the top right - width matching height */}
          {formatting?.downloadUrl && (
            <button
              onClick={planType === 'Demo' ? undefined : handleDownload}
              className={`inline-flex items-center justify-center p-2 w-10 h-10 ${
                planType === 'Demo'
                  ? 'bg-gray-200 dark:bg-gray-700 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-800 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 cursor-pointer'
              } rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800 shadow-sm`}
              title={planType === 'Demo'
                ? 'Upgrade to Basic or higher to download files'
                : 'Download Excel File'
              }
              disabled={planType === 'Demo'}
            >
              <Download className={`h-5 w-5 ${
                planType === 'Demo'
                  ? 'text-gray-400' 
                  : ''
              }`} />
            </button>
          )}
          
          {/* Zoom control further below download button */}
          <div className="mt-16 pl-2">
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-3">
                {Math.round(scale * 100)}%
              </span>
              <div className="rotate-90 h-32 flex items-center">
                <input
                  id="zoom-slider"
                  type="range"
                  min="50"
                  max="150"
                  value={Math.round(scale * 100)}
                  onChange={handleZoomChange}
                  onClick={handleZoomClick}
                  title="Zoom level"
                  className="w-32 h-1 appearance-none cursor-pointer bg-emerald-600 dark:bg-emerald-400 rounded-lg opacity-70 slider-thumb"
                  style={{ 
                    direction: 'rtl',
                    accentColor: '#059669'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}