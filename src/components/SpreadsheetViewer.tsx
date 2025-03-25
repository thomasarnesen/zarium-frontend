import React, { useEffect, useState, useRef, MouseEvent } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
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
  visible?: boolean; // New prop to control visibility
}

// New base dimensions - increased width by 200px
const BASE_WIDTH = 1288; // Original 1088 + 200
const BASE_HEIGHT = 648;

// Constants for the grid
const CELL_HEIGHT = 6; // 1.5rem (6 in tailwind units)
const CELL_WIDTH = 24; // 6rem (24 in tailwind units)
const HEADER_HEIGHT = 8; // 2rem (8 in tailwind units)
const TRIPLE_WIDTH = CELL_WIDTH * 3; // Triple width for columns (18rem or 72 in tailwind)
const ROW_COUNT = 100; // Number of rows
const A_Z_COUNT = 26; // A-Z columns
const AA_BA_COUNT = 27; // AA-BA columns (27 combinations)
const TOTAL_COLUMNS = A_Z_COUNT + AA_BA_COUNT; // Total column count

export const SpreadsheetViewer: React.FC<SpreadsheetViewerProps> = ({
  previewImage,
  isGenerating,
  generationStatus,
  formatting,
  planType,
  visible = true // Default to visible if not specified
}) => {
  // Don't render anything if not visible
  if (!visible && !previewImage && !isGenerating) {
    return null;
  }
  const { user } = useAuthStore();
  const token = user?.token;
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.65);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

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
      // Remove the direct modification of isGenerating state
      // setIsGenerating(false); - This is causing the error
    } else {
      console.log("No preview available");
    }
  }, [previewImage]); // Remove setIsGenerating from dependencies

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sliderValue = parseFloat(e.target.value);
    
    // If showing the Excel grid (no preview image), limit minimum zoom to 60%
    if (!previewImage && !imageError && sliderValue < 80) {
      setScale(0.8); // Set minimum zoom to 60% for Excel grid
      return;
    }
    
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
        return "Processing your request...\nGeneration time depends on complexity";
      case 'Thinking':
        return "Charts and graphs may appear over data in the preview...\nThis can be adjustet when downloading xlsx file";
      case 'Generating':
        return "Charts and graphs may appear over data in the preview...\nThis can be adjustet when downloading xlsx file"; 
      case 'Finalizing':
        return "Finalizing your document...\nAlmost there!";
      case 'Analyzing your requirements...':
        return "Tip: Don't miss the Quick Start Guide in your downloaded Excel file\nit contains important setup instructions for optimal use.";
      case 'Designing spreadsheet structure...':
        return "Designing spreadsheet structure...";
      case 'Generating Excel file...':
        return "Charts and graphs may appear over data in the preview...\nThis can be adjustet when downloading xlsx file";
      case 'Complete':
        return "Generation complete!";
      default:
        return status || "Processing your request...";
    }
  };


  // Handle mouse down event to start dragging
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current!.offsetLeft);
    setStartY(e.pageY - containerRef.current!.offsetTop);
    setScrollLeft(containerRef.current!.scrollLeft);
    setScrollTop(containerRef.current!.scrollTop);
    e.preventDefault();
    document.body.style.userSelect = 'none'; // Prevent text selection during drag
  };

  // Handle mouse move event to perform dragging
  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const x = e.pageX - containerRef.current!.offsetLeft;
    const y = e.pageY - containerRef.current!.offsetTop;
    const walkX = (x - startX) * 1.5; // Multiply for faster scroll
    const walkY = (y - startY) * 1.5;
    containerRef.current!.scrollLeft = scrollLeft - walkX;
    containerRef.current!.scrollTop = scrollTop - walkY;
  };

  // Handle mouse up event to stop dragging
  const handleMouseUp = () => {
    setIsDragging(false);
    document.body.style.userSelect = ''; // Re-enable text selection
  };

  // Clean up event listeners when component unmounts
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.userSelect = '';
      }
    };

    // Add global event listener to handle mouse up outside the component
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging]);

  // Get the minimum zoom value for the slider based on content type
  const getMinZoomValue = () => {
    // If showing the Excel grid (no preview image and no error), limit to 60%
    if (!previewImage && !imageError) {
      return 60;
    }
    // Otherwise use the default minimum zoom of 50%
    return 50;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium text-gray-700 dark:text-gray-200">Excel Spreadsheet</span>
        </div>
        {formatting && formatting.downloadUrl && (
          <a 
            href={formatting.downloadUrl}
            download
            className="flex items-center px-3 py-1 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
          >
            <Download className="w-4 h-4 mr-1" />
            {planType === 'Demo' ? 'Download (Upgrade to Save)' : 'Download'}
          </a>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {isGenerating ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            {/* Add the Z logo animation here */}
            <div className="zarium-loading mb-4">
              <div className="z-logo"></div>
            </div>
            
            {/* Status message */}
            <div className="text-emerald-700 dark:text-emerald-300 mt-4">
              {generationStatus}
            </div>
            
            {/* Status description */}
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 whitespace-pre-line">
              {getStatusDescription(generationStatus)}
            </div>
          </div>
        ) : previewImage ? (
          <div className="flex justify-center">
            <img 
              src={previewImage} 
              alt="Spreadsheet Preview" 
              className="max-w-full rounded shadow-sm border border-gray-200 dark:border-gray-700" 
            />
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            Enter a prompt to generate your Excel spreadsheet.
          </div>
        )}
      </div>
    </div>
  );
};
