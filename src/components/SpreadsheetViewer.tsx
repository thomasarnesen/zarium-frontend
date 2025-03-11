import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  
  // Add refs and state for panning functionality
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.85); // Start with a zoomed out view

  useEffect(() => {
    if (previewImage) {
      console.log("Preview image received, length:", previewImage.length);
      setImageError(false);
      // Reset pan position when new image loads
      setPanPosition({ x: 0, y: 0 });
    } else {
      console.log("No preview image available");
    }
  }, [previewImage]);

  useEffect(() => {
    if (previewImage) {
      console.log("Preview image received:", previewImage.substring(0, 50) + "...");
    } else if (!isGenerating) {
      console.log("No preview image received and not generating");
    }
    
    if (formatting) {
      console.log("Formatting received:", formatting);
    }
  }, [previewImage, formatting, isGenerating]);

  // Handle mouse events for panning
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) { // Left mouse button
      setIsPanning(true);
      setStartPanPosition({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y
      });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning) return;
    
    // Calculate new position with limits to prevent excessive dragging
    const newX = e.clientX - startPanPosition.x;
    const newY = e.clientY - startPanPosition.y;
    
    // Apply some boundaries to prevent dragging too far
    const container = containerRef.current;
    const maxDragX = container ? container.offsetWidth * 0.5 : 200;
    const maxDragY = container ? container.offsetHeight * 0.5 : 200;
    
    const boundedX = Math.max(-maxDragX, Math.min(maxDragX, newX));
    const boundedY = Math.max(-maxDragY, Math.min(maxDragY, newY));
    
    setPanPosition({
      x: boundedX,
      y: boundedY
    });
  }, [isPanning, startPanPosition]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Clean up event listeners
  useEffect(() => {
    if (isPanning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanning, handleMouseMove, handleMouseUp]);

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
    <div className="relative w-full">
      <div className="flex items-start gap-2">
        {/* Increased container size */}
        <div 
          className="flex-grow overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-sm relative"
          style={{ height: '700px' }} // Increased height from 600px to 700px
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
         
          {/* Content container with ref for panning */}
          <div
            ref={containerRef}
            className="w-full h-full overflow-hidden"
            style={{ pointerEvents: isGenerating ? 'none' : 'auto' }}
            onMouseDown={handleMouseDown}
          >
            <div
              className="relative w-full h-full flex items-center justify-center"
            >
              {previewImage ? (
                <div 
                  className="transform-container"
                  style={{
                    transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${scale})`,
                    transition: isPanning ? 'none' : 'transform 0.1s ease-out',
                    cursor: isPanning ? 'grabbing' : 'grab',
                    transformOrigin: 'center center'
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
                <div className="flex items-center justify-center h-full w-full">
                  <p className="text-gray-400">
                    {imageError ? "Failed to load preview" : "No preview available"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
       
        {/* Zoom controls */}
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setScale(prev => Math.min(prev + 0.1, 1.5))}
            className="inline-flex items-center justify-center p-2 bg-white dark:bg-gray-800 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800 shadow-sm"
            title="Zoom in"
          >
            +
          </button>
          
          <button
            onClick={() => setScale(prev => Math.max(prev - 0.1, 0.5))}
            className="inline-flex items-center justify-center p-2 bg-white dark:bg-gray-800 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800 shadow-sm"
            title="Zoom out"
          >
            -
          </button>
          
          <button
            onClick={() => {
              setScale(0.85);
              setPanPosition({ x: 0, y: 0 });
            }}
            className="inline-flex items-center justify-center p-2 bg-white dark:bg-gray-800 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800 shadow-sm"
            title="Reset view"
          >
            ↺
          </button>
          
          {formatting?.downloadUrl && (
            <button
              onClick={planType === 'Demo' ? undefined : handleDownload}
              className={`inline-flex items-center justify-center p-2 ${
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
      </div>
      
      {/* Optional instructions if needed */}
      <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
        Drag to pan view • Use + and - buttons to zoom • Click ↺ to reset view
      </div>
    </div>
  );
}