import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (previewImage) {
      console.log("Preview image received, length:", previewImage.length);
      setImageError(false);
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
      <div className="flex items-start gap-2">
       
        <div className="flex-grow overflow-hidden bg-white dark:bg-gray-800 rounded-lg shadow-sm relative">
          
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
         
         
          <div
            className="w-full h-[600px] overflow-x-auto overflow-y-auto"
            style={{ pointerEvents: isGenerating ? 'none' : 'auto' }}
          >
            <div
              className="relative"
              style={{
                minWidth: 'max-content',
                minHeight: 'max-content',
                backgroundColor: 'white'
              }}
            >
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="Excel preview"
                  className="w-auto h-auto block"
                  style={{
                    imageRendering: '-webkit-optimize-contrast',
                    display: 'block'
                  }}
                  onError={(e) => {
                    console.error("Image failed to load");
                    setImageError(true);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-[600px]">
                  <p className="text-gray-400">
                    {imageError ? "Failed to load preview" : "No preview available"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
       
        
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
  );
}