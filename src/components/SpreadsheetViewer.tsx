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
    const sliderValue = parseFloat(e.target.value);
    // Map slider value 50-150 to actual scale 0.3-1.5
    const actualScale = 0.3 + (sliderValue - 50) * 0.012;
    setScale(actualScale);
    console.log("Slider value:", sliderValue, "Actual scale:", actualScale);
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
        <div className="relative"> 
          <div 
            className="overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-sm"
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
                      width: `${Math.min(1425, Math.max(1088, 1088 / scale))}px`,
                      height: `${Math.min(755, Math.max(648, 648 / scale))}px`,
                      maxWidth: '1425px',  /* Maximum width when fully zoomed in */
                      maxHeight: '755px',  /* Maximum height when fully zoomed in */
                      minHeight: '648px',  /* Ensure minimum size matches container */
                      minWidth: '1088px'   /* Ensure minimum size matches container */
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
                  <div className="h-full w-full bg-white">
                    {/* Excel-like grid header */}
                    <div className="flex border-b border-gray-200">
                      <div className="w-10 h-8 bg-gray-100 border-r border-gray-200 flex items-center justify-center"></div>
                      {/* Column headers A-Z */}
                      {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map((letter, index) => (
                        <div 
                          key={letter}
                          className="w-24 h-8 bg-gray-100 border-r border-gray-200 flex items-center justify-center text-sm text-gray-600 font-medium"
                        >
                          {letter}
                        </div>
                      ))}
                    </div>
                    
                    {/* Excel-like grid rows */}
                    {Array.from({ length: 100 }, (_, i) => i + 1).map(rowNum => (
                      <div key={rowNum} className="flex border-b border-gray-200">
                        {/* Row number */}
                        <div className="w-10 h-6 bg-gray-100 border-r border-gray-200 flex items-center justify-center text-sm text-gray-600 font-medium">
                          {rowNum}
                        </div>
                        
                        {/* Row cells */}
                        {Array.from({ length: 26 }, (_, i) => i).map(cellIndex => (
                          <div 
                            key={cellIndex}
                            className="w-24 h-6 border-r border-gray-200"
                          ></div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Absolute-positioned controls */}
          <div className="absolute" style={{ right: '-36px', top: 0 }}>
            {/* Download Button - smaller size */}
            {formatting?.downloadUrl && (
              <button
                onClick={planType === 'Demo' ? undefined : handleDownload}
                className={`inline-flex items-center justify-center p-1.5 w-8 h-8 ${
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
          </div>
          
          {/* Vertically centered zoom control - moved slightly to the left */}
          <div className="absolute" style={{ right: '-32px', top: 'calc(50% - 80px)' }}>
            <div className="flex flex-col items-center">
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-2">
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
                  title = "Zoom"
                  className="w-40 h-1 appearance-none cursor-pointer bg-emerald-600 dark:bg-emerald-400 rounded-lg opacity-70 slider-thumb"
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